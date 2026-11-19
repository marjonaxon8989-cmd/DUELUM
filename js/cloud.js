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

  function loadScript(src){
    return new Promise((res,rej)=>{
      const s=document.createElement('script'); s.src=src; s.onload=res;
      s.onerror=()=>rej(new Error('sdk-load-failed')); document.head.appendChild(s);
    });
  }
  async function init(){
    if(!enabled) return false;
    if(db) return true;
    await loadScript(FIREBASE_SDK+'firebase-app-compat.js');
    await loadScript(FIREBASE_SDK+'firebase-auth-compat.js');
    await loadScript(FIREBASE_SDK+'firebase-firestore-compat.js');
    firebase.initializeApp(FIREBASE_CONFIG);
    auth=firebase.auth(); db=firebase.firestore(); FV=firebase.firestore.FieldValue;
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
      avatar:d.avatar||null, premium:d.premium||null, loggedIn:true };
  }
  function publicRow(id,d){ const p=toProfile(id,d); return {uid:id,id:p.id,name:p.name,surname:p.surname,score:p.score,monthScore:p.monthScore,avatar:p.avatar}; }

  // Keeps the in-memory profile in sync with the server (other devices, rules).
  function watchMe(){
    if(unsubMe) unsubMe();
    unsubMe=db.collection('users').doc(uid).onSnapshot(s=>{
      if(!s.exists || !current) return;
      const fresh=toProfile(s.id,s.data());
      Object.assign(current,{score:fresh.score,monthScore:fresh.monthScore,monthKey:fresh.monthKey,
        avatar:fresh.avatar,premium:fresh.premium,name:fresh.name,surname:fresh.surname,id:fresh.id});
      if(onProfileCb) onProfileCb(current);
    },()=>{});
  }
  async function loadMe(){
    const s=await db.collection('users').doc(uid).get();
    if(!s.exists) return null;
    current=toProfile(s.id,s.data()); watchMe(); return current;
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
      const user=await new Promise(res=>{ const u=auth.onAuthStateChanged(x=>{ u(); res(x); }); });
      if(!user) return null;
      uid=user.uid; return await loadMe();
    },
    async register({name,surname,digits,pass}){
      await init();
      const cred=await auth.createUserWithEmailAndPassword(emailOf(digits),pass);
      uid=cred.user.uid;
      const publicId=await allocatePublicId();
      const mk=monthKey();
      await db.collection('users').doc(uid).set({name,surname,publicId,score:0,monthScore:0,monthKey:mk,
        avatar:null,premium:null,createdAt:FV.serverTimestamp()});
      return await loadMe();
    },
    async login(digits,pass){
      await init();
      const cred=await auth.signInWithEmailAndPassword(emailOf(digits),pass);
      uid=cred.user.uid;
      const p=await loadMe();
      if(!p) throw Object.assign(new Error('noprofile'),{code:'auth/user-not-found'});
      return p;
    },
    async logout(){ if(unsubMe) unsubMe(); unsubMe=null; current=null; uid=null; if(auth) await auth.signOut(); },
    async changePassword(p){ await auth.currentUser.updatePassword(p); },
    myUid(){ return uid; },

    /* ----- profile writes (called from Store) ----- */
    saveProfile(p){
      if(!uid) return;
      db.collection('users').doc(uid).set({name:p.name,surname:p.surname,avatar:p.avatar||null,premium:p.premium||null},{merge:true})
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
