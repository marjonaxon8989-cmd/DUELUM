// cloud.js — ONLINE mode (Firebase Auth + Cloud Firestore, free "Spark" plan).
//
// Only active when FIREBASE_CONFIG in js/firebase-config.js is filled in.
// Otherwise Cloud.enabled === false and the whole app runs locally as before.
//
// Data model (all in Firestore — see firestore.rules for who may read/write what):
//   users/{uid}             public profile: name, surname, publicId (8 digits),
//                           score, monthScore, monthKey ("2026-11"), avatar, premium
//                           (the phone number and password are NOT stored here —
//                            Firebase Auth keeps the login, hashed, on Google's side)
//   ids/{publicId}          { uid } — lets friends find you by your 8-digit ID
//   follows/{fromUid_toUid} one doc per follow; users.followers / users.following
//                           are counters kept in step with it by firestore.rules
//   chats/{uidA_uidB}       a conversation: users (sorted), lastText, lastFrom,
//                           lastAt, readAt.{uid}; messages in chats/{id}/messages
//                           (allowed when one follows the other, or they are friends)
//   phones/{sha256(number)} { dial } — remembers the country code of a phone
//                           number, so signing in works even if the wrong country
//                           is selected on the login screen (no number is stored)
//   friendships/{uidA_uidB} { users:[uidA,uidB] (sorted), requester, status:
//                           'pending'|'accepted', createdAt }
//   challenges/{autoId}     a friend duel: from, to, subj, qs (the 10 shared
//                           questions), status 'pending'|'accepted'|'declined'|
//                           'cancelled'|'expired', scores/answered/done/left per uid
//
// Free-tier budget (Spark): 50 000 document reads, 20 000 writes per day.
// One leaderboard view ≈ 50 reads, one match ≈ 10–20 writes — plenty for a
// school-sized audience. Above that, switch the project to "Blaze"
// (pay-as-you-go) in the Firebase console; no code change is needed.
//
// Login uses Email/Password auth under the hood with a synthetic address built
// from the phone number (e.g. 998901234567@phone.1v1duel.app). Real SMS phone
// auth needs reCAPTCHA and SMS costs, so this keeps it free. To switch to SMS
// later, replace register()/login() below with signInWithPhoneNumber.

const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';

const Cloud = (function(){
  const enabled = typeof FIREBASE_CONFIG !== 'undefined' && !!FIREBASE_CONFIG && !!FIREBASE_CONFIG.projectId;
  let auth=null, db=null, FV=null, uid=null, unsubMe=null, onProfileCb=null, current=null;
  const userCache={}; // uid -> {data, ts}

  // Any network step that hangs (slow mobile data, a flaky first connection)
  // is cut off after `ms` so the app can show "Retry" instead of spinning forever.
  function withTimeout(p,ms){
    return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(new Error('timeout'),{code:'auth/network-request-failed'})),ms))]);
  }
  function loadScript(src){
    if(document.querySelector('script[src="'+src+'"]') && window.firebase) return Promise.resolve();
    return new Promise((res,rej)=>{
      const s=document.createElement('script'); s.src=src; s.onload=res;
      s.onerror=()=>rej(new Error('sdk-load-failed')); document.head.appendChild(s);
    });
  }
  async function init(){
    if(!enabled) return false;
    if(db) return true;
    await withTimeout(loadScript(FIREBASE_SDK+'firebase-app-compat.js'),20000);
    await withTimeout(loadScript(FIREBASE_SDK+'firebase-auth-compat.js'),20000);
    await withTimeout(loadScript(FIREBASE_SDK+'firebase-firestore-compat.js'),20000);
    if(!(firebase.apps||[]).length) firebase.initializeApp(FIREBASE_CONFIG);
    auth=firebase.auth(); db=firebase.firestore();
    // Falls back to long-polling on networks/proxies where Firestore's streaming connection stalls.
    try{ db.settings({experimentalAutoDetectLongPolling:true, merge:true}); }catch(e){}
    FV=firebase.firestore.FieldValue;
    return true;
  }

  const monthKey = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };
  const emailOf = digits => digits+'@phone.1v1duel.app';
  const pairId = (a,b) => [a,b].sort().join('_');
  const ms = ts => ts && ts.toMillis ? ts.toMillis() : Date.now(); // serverTimestamp is null until confirmed

  function toProfile(id,d){
    const mk=monthKey();
    return { uid:id, id:d.publicId, name:d.name||'', surname:d.surname||'', score:d.score||0,
      monthKey:mk, monthScore: d.monthKey===mk ? (d.monthScore||0) : 0,
      avatar:d.avatar||null, premium:d.premium||null, followers:d.followers||0, following:d.following||0,
      tgUsername:d.tgUsername||'', tgId:d.tgId||null, loggedIn:true };
  }
  function publicRow(id,d){ const p=toProfile(id,d); return {uid:id,id:p.id,name:p.name,surname:p.surname,score:p.score,monthScore:p.monthScore,
    avatar:p.avatar,followers:p.followers,following:p.following,tgUsername:p.tgUsername}; }
  const lower=s=>String(s||'').trim().toLowerCase();
  async function sha256(text){
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('duelum:'+text));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function rememberDial(local,dial){ // create-only; ignore "already exists"
    try{ await db.collection('phones').doc(await sha256(local)).set({dial}); }catch(e){}
  }

  // Keeps the in-memory profile in sync with the server (other devices, rules).
  function watchMe(){
    if(unsubMe) unsubMe();
    unsubMe=db.collection('users').doc(uid).onSnapshot(s=>{
      if(!s.exists || !current) return;
      const fresh=toProfile(s.id,s.data());
      Object.assign(current,{score:fresh.score,monthScore:fresh.monthScore,monthKey:fresh.monthKey,avatar:fresh.avatar,premium:fresh.premium,
        name:fresh.name,surname:fresh.surname,id:fresh.id,followers:fresh.followers,following:fresh.following,tgUsername:fresh.tgUsername,tgId:fresh.tgId});
      if(onProfileCb) onProfileCb(current);
    },()=>{});
  }
  async function loadMe(){
    const s=await db.collection('users').doc(uid).get();
    if(!s.exists) return null;
    const d=s.data(); current=toProfile(s.id,d); watchMe();
    // older accounts: add the lower-case name fields used by name search
    if(d.nameLower===undefined) db.collection('users').doc(uid).set({nameLower:lower(d.name),surnameLower:lower(d.surname)},{merge:true}).catch(()=>{});
    return current;
  }
  async function allocatePublicId(){
    // ids/{id} can only be CREATED (rules forbid overwrite), so a taken ID fails and we retry.
    for(let i=0;i<8;i++){
      const id=String(Math.floor(10000000+Math.random()*90000000));
      const ref=db.collection('ids').doc(id);
      const s=await ref.get(); if(s.exists) continue;
      try{ await ref.set({uid}); return id; }catch(e){ /* raced, try another */ }
    }
    throw Object.assign(new Error('id'),{code:'id-alloc'});
  }

  return {
    enabled,
    init,
    onProfile(cb){ onProfileCb=cb; },
    // Resolves with the signed-in profile, or null.
    async restore(){
      await init();
      const user=await withTimeout(new Promise(res=>{
        let unsub=null, done=false;
        unsub=auth.onAuthStateChanged(x=>{ if(done) return; done=true; res(x); if(unsub) unsub(); else setTimeout(()=>unsub&&unsub(),0); });
      }),15000);
      if(!user) return null;
      uid=user.uid; return await withTimeout(loadMe(),15000);
    },
    async register({name,surname,digits,local,dial,pass,tg}){
      await init();
      const cred=await auth.createUserWithEmailAndPassword(emailOf(digits),pass);
      uid=cred.user.uid;
      const publicId=await allocatePublicId();
      const doc={name,surname,nameLower:lower(name),surnameLower:lower(surname),publicId,score:0,monthScore:0,monthKey:monthKey(),
        followers:0,following:0,avatar:null,premium:null,createdAt:FV.serverTimestamp()};
      if(tg){ doc.tgId=tg.id; doc.tgUsername=tg.username||''; }
      await db.collection('users').doc(uid).set(doc);
      if(local && dial) rememberDial(local,dial);
      return await loadMe();
    },
    // Tries the remembered country code first, then the selected one, then +998.
    async login(local,dial,pass){
      await init();
      let known=null;
      try{ const s=await db.collection('phones').doc(await sha256(local)).get(); if(s.exists) known=s.data().dial; }catch(e){}
      const dials=[...new Set([known,dial,'998'].filter(Boolean))];
      let cred=null, lastErr=null;
      for(const d of dials){
        try{ cred=await auth.signInWithEmailAndPassword(emailOf(d+local),pass); dial=d; break; }
        catch(e){ lastErr=e; if(!['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials'].includes(e.code)) break; }
      }
      if(!cred) throw lastErr;
      uid=cred.user.uid;
      const p=await loadMe();
      if(!p) throw Object.assign(new Error('noprofile'),{code:'auth/user-not-found'});
      rememberDial(local,dial);
      return p;
    },
    async linkTelegram(tg){ await db.collection('users').doc(uid).set({tgId:tg.id,tgUsername:tg.username||''},{merge:true}); },
    async logout(){ if(unsubMe) unsubMe(); unsubMe=null; current=null; uid=null; if(auth) await auth.signOut(); },
    async changePassword(p){ await auth.currentUser.updatePassword(p); },
    myUid(){ return uid; },

    /* ----- profile writes (called from Store) ----- */
    saveProfile(p){
      if(!uid) return;
      db.collection('users').doc(uid).set({name:p.name,surname:p.surname,nameLower:lower(p.name),surnameLower:lower(p.surname),avatar:p.avatar||null,premium:p.premium||null},{merge:true})
        .catch(e=>console.warn('[Cloud] saveProfile',e));
    },
    // `delta` is the already-clamped change the app applied to p.score.
    addScore(p,delta){
      if(!uid||!delta) return;
      const mk=monthKey(), upd={score:FV.increment(delta)};
      if(p.monthKey!==mk){ p.monthKey=mk; p.monthScore=Math.max(0,delta); upd.monthKey=mk; upd.monthScore=p.monthScore; }
      else { const nm=Math.max(0,(p.monthScore||0)+delta), md=nm-(p.monthScore||0); p.monthScore=nm; if(md) upd.monthScore=FV.increment(md); }
      db.collection('users').doc(uid).update(upd).catch(e=>console.warn('[Cloud] addScore',e));
    },

    /* ----- leaderboards ----- */
    async topAllTime(n){ const q=await db.collection('users').orderBy('score','desc').limit(n).get(); return q.docs.map(d=>publicRow(d.id,d.data())); },
    // needs the composite index in firestore.indexes.json (monthKey ASC, monthScore DESC)
    async topMonth(n){ const q=await db.collection('users').where('monthKey','==',monthKey()).orderBy('monthScore','desc').limit(n).get(); return q.docs.map(d=>publicRow(d.id,d.data())); },
    async topLeague(min,max,n){
      let q=db.collection('users').where('score','>=',min);
      if(max!=null) q=q.where('score','<',max);
      const r=await q.orderBy('score','desc').limit(n).get(); return r.docs.map(d=>publicRow(d.id,d.data()));
    },

    /* ----- search & follows ----- */
    async searchByName(q){
      q=lower(q); const end=q+'\uf8ff', out={};
      const [a,b]=await Promise.all([
        db.collection('users').where('nameLower','>=',q).where('nameLower','<=',end).limit(20).get(),
        db.collection('users').where('surnameLower','>=',q).where('surnameLower','<=',end).limit(20).get()]);
      a.docs.concat(b.docs).forEach(d=>{ out[d.id]=publicRow(d.id,d.data()); });
      return Object.values(out).sort((x,y)=>y.score-x.score);
    },
    async isFollowing(other){ const s=await db.collection('follows').doc(uid+'_'+other).get(); return s.exists; },
    // One atomic batch: the follow doc + both counters (rules check they match).
    async follow(other){
      if(other===uid) return;
      const b=db.batch();
      b.set(db.collection('follows').doc(uid+'_'+other),{from:uid,to:other,createdAt:FV.serverTimestamp()});
      b.update(db.collection('users').doc(other),{followers:FV.increment(1)});
      b.update(db.collection('users').doc(uid),{following:FV.increment(1)});
      await b.commit(); delete userCache[other];
    },
    async unfollow(other){
      const b=db.batch();
      b.delete(db.collection('follows').doc(uid+'_'+other));
      b.update(db.collection('users').doc(other),{followers:FV.increment(-1)});
      b.update(db.collection('users').doc(uid),{following:FV.increment(-1)});
      await b.commit(); delete userCache[other];
    },

    /* ----- direct messages ----- */
    chatIdWith(other){ return pairId(uid,other); },
    // Creates the conversation document if needed (rules require a follow or friendship).
    async ensureChat(other){
      const id=pairId(uid,other), ref=db.collection('chats').doc(id);
      const s=await ref.get();
      if(!s.exists) await ref.set({users:[uid,other].sort(),createdAt:FV.serverTimestamp(),lastAt:FV.serverTimestamp(),lastText:'',lastFrom:'',readAt:{}});
      return id;
    },
    // cb([{id, other, lastText, lastFrom, lastAt(ms), unread}]) newest first
    watchChats(cb){
      return db.collection('chats').where('users','array-contains',uid).limit(100).onSnapshot(q=>{
        cb(q.docs.map(d=>{ const x=d.data(), last=ms(x.lastAt), read=x.readAt&&x.readAt[uid]?ms(x.readAt[uid]):0;
          return {id:d.id, other:x.users.find(u=>u!==uid), lastText:x.lastText||'', lastFrom:x.lastFrom||'', lastAt:last,
            unread: !!x.lastText && x.lastFrom!==uid && last>read+500}; }).filter(c=>c.lastText||c.lastFrom).sort((a,b)=>b.lastAt-a.lastAt));
      },e=>console.warn('[Cloud] chats',e));
    },
    // cb([{id, from, text, at(ms), pending}]) oldest first, last 150
    watchMessages(cid,cb){
      return db.collection('chats').doc(cid).collection('messages').orderBy('at','desc').limit(150).onSnapshot({includeMetadataChanges:true},q=>{
        cb(q.docs.map(d=>{ const x=d.data({serverTimestamps:'estimate'}); return {id:d.id,from:x.from,text:x.text,at:ms(x.at),pending:d.metadata&&d.metadata.hasPendingWrites}; }).reverse());
      },e=>console.warn('[Cloud] messages',e));
    },
    async sendMessage(cid,text){
      text=String(text).trim().slice(0,1000); if(!text) return;
      const chat=db.collection('chats').doc(cid), b=db.batch();
      b.set(chat.collection('messages').doc(),{from:uid,text,at:FV.serverTimestamp()});
      const u={lastText:text.slice(0,120),lastFrom:uid,lastAt:FV.serverTimestamp()}; u['readAt.'+uid]=FV.serverTimestamp();
      b.update(chat,u);
      await b.commit();
    },
    markRead(cid){ const u={}; u['readAt.'+uid]=FV.serverTimestamp(); return db.collection('chats').doc(cid).update(u).catch(()=>{}); },

    /* ----- users / friends ----- */
    async getUser(id,force){
      const c=userCache[id]; if(c && !force && Date.now()-c.ts<20000) return c.data;
      const s=await db.collection('users').doc(id).get();
      const data=s.exists?publicRow(s.id,s.data()):null; userCache[id]={data,ts:Date.now()}; return data;
    },
    async findByPublicId(pid){
      const s=await db.collection('ids').doc(pid).get();
      return s.exists ? await this.getUser(s.data().uid,true) : null;
    },
    // -> 'self' | 'sent' | 'pending' | 'accepted' | 'already'
    async sendFriendRequest(other){
      if(other===uid) return 'self';
      const fid=pairId(uid,other), ref=db.collection('friendships').doc(fid);
      const s=await ref.get();
      if(s.exists){
        const d=s.data();
        if(d.status==='accepted') return 'already';
        if(d.requester===uid) return 'pending';
        await ref.update({status:'accepted'}); return 'accepted';
      }
      await ref.set({users:[uid,other].sort(),requester:uid,status:'pending',createdAt:FV.serverTimestamp()});
      return 'sent';
    },
    acceptFriend(fid){ return db.collection('friendships').doc(fid).update({status:'accepted'}); },
    removeFriend(fid){ return db.collection('friendships').doc(fid).delete(); },
    // cb([{fid, other, status, incoming}])
    watchFriendships(cb){
      return db.collection('friendships').where('users','array-contains',uid).onSnapshot(q=>{
        cb(q.docs.map(d=>{ const x=d.data(); return {fid:d.id, other:x.users.find(u=>u!==uid), status:x.status, incoming:x.status==='pending'&&x.requester!==uid}; }));
      },e=>console.warn('[Cloud] friendships',e));
    },

    /* ----- friend duels ----- */
    async createChallenge(to,toName,fromName,subj,qs){
      const base={}; base[uid]=0; base[to]=0;
      const no={}; no[uid]=false; no[to]=false;
      const ref=await db.collection('challenges').add({from:uid,to,fromName,toName,pair:pairId(uid,to),subj,qs,
        status:'pending',createdAt:FV.serverTimestamp(),scores:base,answered:{...base},done:no,left:{...no}});
      return ref.id;
    },
    watchChallenge(id,cb){ return db.collection('challenges').doc(id).onSnapshot(s=>{ if(s.exists) cb(Object.assign({id:s.id},s.data())); },()=>{}); },
    // pending challenges sent TO me, newer than 60 s (the sender stops waiting after 60 s)
    watchIncoming(cb){
      return db.collection('challenges').where('to','==',uid).where('status','==','pending').onSnapshot(q=>{
        cb(q.docs.map(d=>Object.assign({id:d.id},d.data())).filter(c=>Date.now()-ms(c.createdAt)<60000));
      },e=>console.warn('[Cloud] incoming',e));
    },
    respondChallenge(id,accept){ return db.collection('challenges').doc(id).update({status:accept?'accepted':'declined'}); },
    setChallengeStatus(id,status){ return db.collection('challenges').doc(id).update({status}).catch(()=>{}); },
    pvpProgress(id,score,answered,done){
      const u={}; u['scores.'+uid]=score; u['answered.'+uid]=answered; if(done) u['done.'+uid]=true;
      return db.collection('challenges').doc(id).update(u).catch(e=>console.warn('[Cloud] pvp',e));
    },
    pvpSticker(id,e){ const u={}; u['stk.'+uid]={e,t:Date.now()}; return db.collection('challenges').doc(id).update(u).catch(()=>{}); },
    pvpLeave(id){ const u={}; u['left.'+uid]=true; u['done.'+uid]=true; return db.collection('challenges').doc(id).update(u).catch(()=>{}); },
    ms
  };
})();
