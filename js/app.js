// app.js — screen routing, the quiz engine (shared by 1v1 duel, logic duel and
// the 4v4 team battle), auth, profile, premium/payment (demo), and the local
// room system for team battles.
//
// IMPORTANT, read this before wiring up a real backend:
//  - "Searching for an opponent" always falls back to AI after 15s here,
//    because there is no live pool of other real players without a server.
//    -> Replace the body of startSearch() with a call to your matchmaking
//       backend (e.g. a Firestore "queue" collection or Supabase Realtime
//       channel) once one exists.
//  - The AI opponent answers each question correctly with a probability that
//    grows slightly with your league (see aiCorrectRate()). It is simulated.
//  - Team rooms (12-digit ID, password, room name) are stored in this
//    browser's localStorage only (Store.getRooms/saveRooms), so a friend
//    on another phone cannot find your room yet. Swap that for a realtime
//    database (Firebase Realtime DB / Firestore, or Supabase Realtime) to
//    make rooms joinable across devices.
//  - The 4v4 match itself is simulated: your 3 teammates' and the 4
//    opponents' correct-answer counts are generated locally. Replace
//    simulateAITeamCorrect() with real scores coming from other players
//    once a backend exists.
//  - Voice chat (the 🎙️ button) is a placeholder; real voice chat needs a
//    WebRTC service (e.g. Agora, Twilio, LiveKit) with signaling, which only
//    a backend can provide.
//  - The payment screen is a UI demo only. It validates the card fields'
//    *format* so the flow feels real, but never stores or sends the card
//    number anywhere, and no real transaction happens. Before going live,
//    replace submitPayment() with a redirect to a licensed payment gateway
//    (e.g. Payme/Click for Uzbekistan, or Stripe) handled by YOUR backend —
//    never collect real card numbers in a plain client-side form.
//  - Passwords are kept in localStorage in plain text because there is no
//    server. That is acceptable for a single-device demo only; with a real
//    backend use its Auth service (Firebase Auth / Supabase Auth), which
//    hashes passwords server-side, and delete the `pass` field.

const NAV_SCREENS=['home','rating','friends','profile']; // screens that show the bottom nav
const ROUND_LIMIT_1V1=10, ROUND_LIMIT_TEAM=50, QUESTION_SECONDS=15, SEARCH_SECONDS=15;

let curSubj='math', qi=0, timer=null, tleft=QUESTION_SECONDS, meScore=0, aiScore=0, fiftyUsed=false, hintUses=0, locked=false, isLogic=false, isTeam=false;
let matchQs=[];        // shuffled questions for the current match
let matchToken=0;      // bumps on every new match / exit, so stale timeouts do nothing
let matchDelta=0;      // rating points gained (+) / lost (−) in the current 1v1 match
let teamYouCorrect=0, teamYouWrong=0;
let authMode='register';
let profile=null;
let pendingSubj='math';
let searchInterval=null, searchTimeout=null;
let teamState='hub', teamMode='friends', currentRoomId=null, currentRoomName=null;
let selectedPlan=null;
// Friend duel (online mode only): {id, opp, oppName, state:'waiting'|'playing'|'ended', unsub, oppScore, oppAnswered, oppDone, oppLeft}
let pvp=null;

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function genId(){ return String(Math.floor(10000000+Math.random()*90000000)); }       // 8 digits
function genRoomId12(){ let s=String(1+Math.floor(Math.random()*9)); for(let i=0;i<11;i++) s+=Math.floor(Math.random()*10); return s; } // 12 digits, no leading 0
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
// Shuffle an item's options while keeping track of which one is correct.
function shuffleItem(it){
  const order=shuffle([0,1,2,3]);
  return { q:it.q, o:order.map(i=>it.o[i]), c:order.indexOf(it.c) };
}
function saveProfile(){ if(profile) Store.setProfile(profile); }

/* ---------- leagues ---------- */
function leagueIdx(score){ let idx=0; for(let i=0;i<LEAGUES.length;i++){ if(score>=LEAGUES[i].min) idx=i; } return idx; }
function leagueName(idx){ return t('lg_'+LEAGUES[idx].key); }
function canLoseScore(score){ return leagueIdx(score)>=1; }        // minus points start at Kumush (Silver)
function canPlayStrangers(score){ return leagueIdx(score)>=1; }    // strangers mode unlocks at Kumush (Silver)
function myScore(){ return profile ? (profile.score||0) : 0; }
function monthKeyNow(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function addScore(n){                                               // n>0 always applied, n<0 only from Kumush up
  if(!profile) return 0;
  if(n<0 && !canLoseScore(myScore())) return 0;
  const before=myScore();
  profile.score=Math.max(0,before+n);
  const d=profile.score-before;
  if(d){
    if(!Cloud.enabled){ // local mode keeps its own monthly counter; online mode: cloud.js does it
      const mk=monthKeyNow(); if(profile.monthKey!==mk){ profile.monthKey=mk; profile.monthScore=0; }
      profile.monthScore=Math.max(0,(profile.monthScore||0)+d);
    }
    Store.addScore(profile,d);
  }
  return d;
}

/* ---------- i18n ---------- */
function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>el.placeholder=t(el.dataset.i18nPh));
  $('authTitle').textContent = authMode==='register'?t('registerBtn'):t('haveAccBtn');
  $('authSubmit').textContent = authMode==='register'?t('createAcc'):t('signIn');
  const reg = authMode==='register';
  $('f_pass2').parentElement.style.display = reg?'block':'none';
  $('f_name').style.display = reg?'block':'none';
  $('f_surname').style.display = reg?'block':'none';
  $('payBtn').textContent = selectedPlan ? priceLabel(selectedPlan.price) : t('payConfirm');
  buildGrid(); renderRating(); renderProfile();
  if($('premium').classList.contains('active')) renderPlans();
  if($('teamBattle').classList.contains('active')) renderTeamContent();
}

/* ---------- screen routing ---------- */
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('nav.bn button').forEach(b=>b.classList.toggle('on',b.dataset.s===id));
  $('bottomNav').style.display = NAV_SCREENS.includes(id) ? 'flex' : 'none';
  if(id!=='duel'){ clearInterval(timer); timer=null; matchToken++; }
  if(id!=='searching'){ clearInterval(searchInterval); clearTimeout(searchTimeout); }
  window.scrollTo(0,0);
  if(id==='rating') renderRating();
  if(id==='friends') renderFriends(); else friendMsg={text:'',color:''};
  if(id!=='duel' && id!=='searching') showPendingChallenge();
  if(id==='profile') renderProfile();
  if(id==='teamBattle'){ teamState='hub'; renderTeamContent(); }
  if(id==='premium') renderPlans();
  if(id==='aiAssistant') initAI();
}

/* ---------- home / subjects ---------- */
function buildGrid(){
  const g=$('grid');
  g.innerHTML=subjects.map(s=>`<button class="subj" style="background:${s.g}" onclick="openIntro('${s.k}')">
    <div class="ic">${s.ic}</div><div class="nm">${esc(s.name)}</div>
    <div class="pill"><span class="dot"></span><span id="cnt_${s.k}">${s.on.toLocaleString()}</span> ${t('online')}</div></button>`).join('');
}
// "Players online" numbers drift a little every ~3.5s so the grid feels alive.
// They are decorative — there is no server counting real players yet.
setInterval(()=>{
  subjects.forEach(s=>{
    s.on=Math.max(50,s.on+Math.round((Math.random()-0.5)*8));
    const el=$('cnt_'+s.k); if(el) el.textContent=s.on.toLocaleString();
  });
},3500);

function openIntro(k){
  pendingSubj=k; const s=subjects.find(x=>x.k===k);
  $('introIc').style.background=s.g;
  $('introIc').textContent=s.ic;
  $('introName').textContent=s.name;
  $('introOnline').textContent=s.on.toLocaleString()+' '+t('online');
  go('subjIntro');
}
function startFromIntro(){ startSearch(pendingSubj); }

/* ---------- matchmaking ----------
   PLACEHOLDER FOR A REAL SERVER: without a backend there is no pool of live
   players, so after SEARCH_SECONDS this ALWAYS starts a match against the AI.
   With a backend, put the player into a queue here and start the duel when
   the server pairs you with someone. */
function startSearch(key){
  let sLeft=SEARCH_SECONDS;
  $('searchTitle').textContent=t('searching');
  $('searchTimer').textContent=sLeft;
  go('searching');
  searchInterval=setInterval(()=>{
    sLeft--; $('searchTimer').textContent=Math.max(0,sLeft);
    if(sLeft<=0){
      clearInterval(searchInterval);
      $('searchTitle').textContent=t('foundAI');
      searchTimeout=setTimeout(()=>beginDuel(key),900);
    }
  },1000);
}
function cancelSearch(){
  if(pvp && pvp.state==='waiting'){ Cloud.setChallengeStatus(pvp.id,'cancelled'); stopPvp(); go('friends'); return; }
  go('home');
}

/* ---------- 1v1 / logic duel ---------- */
function buildMatchQuestions(key,count){
  const bank = key==='logic' ? logicBank : qbank[key];
  let out=[];
  while(out.length<count) out=out.concat(shuffle(bank).map(shuffleItem)); // bank cycles if smaller than count
  return out.slice(0,count);
}
function resetHelpers(){
  fiftyUsed=false; hintUses=0;
  $('fiftyBtn').disabled=false;
  const hb=$('hintBtn'); hb.disabled=false; hb.style.display=hasPremium()?'flex':'none';
  $('hintCount').textContent=2;
}
// Shared question seed for friend duels: both players get the same questions in the same order.
function makeSeed(key,count){
  const bank = key==='logic' ? logicBank : qbank[key];
  let idx=[]; while(idx.length<count) idx=idx.concat(shuffle(bank.map((_,i)=>i)));
  return idx.slice(0,count).map(i=>({i, o:shuffle([0,1,2,3])}));
}
function seedToQs(key,seed){
  const bank = key==='logic' ? logicBank : qbank[key];
  return seed.map(({i,o})=>{ const it=bank[i]; return {q:it.q, o:o.map(k=>it.o[k]), c:o.indexOf(it.c)}; });
}
function beginDuel(key,presetQs){
  isTeam=false; curSubj=key; isLogic=(key==='logic'); qi=0; matchDelta=0;
  matchQs=presetQs || buildMatchQuestions(key,ROUND_LIMIT_1V1);
  if(!presetQs && pvp) stopPvp();
  $('oppName').textContent = pvp ? pvp.oppName : t('opp');
  $('oppAv').textContent = pvp ? '👤' : '🤖';
  meScore=0; aiScore=0; updateScores(); resetHelpers();
  document.querySelector('.vsrow').style.display='flex';
  document.querySelector('.bar').style.display='flex';
  // Stickers only in regular subject duels (not logic, not team).
  $('stickerRow').innerHTML = isLogic ? '' : STICKERS.map(s=>`<button onclick="sendSticker('${s}')">${s}</button>`).join('');
  go('duel'); matchToken++; loadQ();
}
function roundLimit(){ return isTeam?ROUND_LIMIT_TEAM:ROUND_LIMIT_1V1; }
function currentItem(){ return matchQs[qi]; }
function aiCorrectRate(){ return Math.min(0.85, 0.55+0.03*leagueIdx(myScore())); }

function updateScores(){
  $('meScore').textContent=meScore;
  $('aiScore').textContent=aiScore;
  const tot=meScore+aiScore, p=tot?Math.round(100*meScore/tot):50;
  $('barMe').style.width=p+'%';
  $('barAi').style.width=(100-p)+'%';
}
function subjectLabel(){
  if(isLogic) return t('logicTag');
  const s=subjects.find(x=>x.k===curSubj); return s.ic+' '+s.name;
}
function loadQ(){
  if(qi>=roundLimit()){ endMatch(); return; }
  locked=false;
  const item=currentItem();
  $('subjTag').textContent = isTeam ? subjectLabel()+' — '+t('teamQProgress')+' '+(qi+1)+'/'+roundLimit()
                                    : subjectLabel()+' · '+(qi+1)+'/'+roundLimit();
  $('qText').textContent=item.q;
  $('opts').innerHTML=item.o.map((tx,i)=>`<div class="opt ${letters[i]}" data-i="${i}" onclick="answer(${i})">
    <div class="lt">${letters[i].toUpperCase()}</div><div class="tx">${esc(tx)}</div></div>`).join('');
  tleft=QUESTION_SECONDS; clearInterval(timer);
  $('ring').style.setProperty('--p',100);
  $('timeLeft').textContent=tleft;
  const token=matchToken;
  timer=setInterval(()=>{
    if(token!==matchToken){ clearInterval(timer); return; }
    tleft--; $('timeLeft').textContent=tleft;
    $('ring').style.setProperty('--p',Math.round(tleft/QUESTION_SECONDS*100));
    if(tleft<=0){
      clearInterval(timer);
      if(!locked) resolveQuestion(-1); // time out = wrong answer
    }
  },1000);
}
// picked = option index, or -1 for timeout
function resolveQuestion(picked){
  const item=currentItem();
  const correct=(picked===item.c);
  if(isTeam){
    if(correct) teamYouCorrect++; else teamYouWrong++;
  } else {
    if(correct){ meScore++; matchDelta+=addScore(1); }
    else { matchDelta+=addScore(-1); }
    if(pvp) Cloud.pvpProgress(pvp.id,meScore,qi+1); else aiAnswers();
  }
  lockAndShow(item.c,picked);
}
function aiAnswers(){ if(Math.random()<aiCorrectRate()) aiScore++; updateScores(); }
function answer(i){
  if(locked) return;
  clearInterval(timer);
  resolveQuestion(i);
}
function lockAndShow(correct,picked){
  locked=true;
  document.querySelectorAll('.opt').forEach(el=>{
    const idx=+el.dataset.i; el.classList.add('disabled');
    if(idx===correct) el.classList.add('correct');
    else if(idx===picked) el.classList.add('wrong');
  });
  const token=matchToken;
  setTimeout(()=>{ if(token!==matchToken) return; qi++; loadQ(); },1100);
}
function skipQ(){
  if(locked) return;
  clearInterval(timer);
  if(pvp) Cloud.pvpProgress(pvp.id,meScore,qi+1);
  else if(!isTeam) aiAnswers(); // the AI still answers the question you skipped
  qi++; loadQ();
}
function liveWrongOptions(){
  const item=currentItem();
  return [0,1,2,3].filter(i=>i!==item.c).filter(i=>{
    const el=document.querySelector(`.opt[data-i="${i}"]`); return el && !el.classList.contains('disabled');
  });
}
function useFifty(){
  if(fiftyUsed||locked) return; fiftyUsed=true;
  $('fiftyBtn').disabled=true;
  // leave the correct answer + exactly one wrong answer
  shuffle(liveWrongOptions()).slice(0,Math.max(0,liveWrongOptions().length-1)).forEach(i=>{
    document.querySelector(`.opt[data-i="${i}"]`).classList.add('disabled');
  });
}
function useHint(){
  if(!hasPremium()||hintUses>=2||locked) return;
  const live=liveWrongOptions(); if(!live.length) return;
  hintUses++;
  $('hintCount').textContent=Math.max(0,2-hintUses);
  document.querySelector(`.opt[data-i="${shuffle(live)[0]}"]`).classList.add('disabled');
  if(hintUses>=2) $('hintBtn').disabled=true;
}
function leaveGame(){
  if(!confirm(t('confirmLeave'))) return;
  clearInterval(timer); matchToken++;
  if(isTeam){ applyTeamResult(false,true); go('teamBattle'); }
  else if(pvp){ Cloud.pvpLeave(pvp.id); addScore(-10); stopPvp(); go('friends'); }
  else { addScore(-10); go('home'); }   // −10 only from Kumush up (addScore handles it)
  renderRating();
}
function sendSticker(s,fromOpp){
  if(pvp && !fromOpp) Cloud.pvpSticker(pvp.id,s); // friend duel: the opponent sees it too
  const el=$('stickerToast');
  el.textContent=s; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(sendSticker._t);
  sendSticker._t=setTimeout(()=>el.classList.remove('show'),900);
}

/* ---------- match end / result overlay ---------- */
function endMatch(){
  clearInterval(timer);
  if(isTeam) finishTeamMatch();
  else if(pvp){ pvp.state='ended'; Cloud.pvpProgress(pvp.id,meScore,roundLimit(),true); renderPvpResult(); }
  else finish1v1Match();
}
function closeResult(){
  $('resultOverlay').classList.remove('on');
  const wasPvp=!!pvp; stopPvp();
  go(isTeam?'teamBattle':(wasPvp?'friends':'home'));
  renderRating();
}
function deltaLine(d){
  if(d>0) return `<div style="color:#2ecc71;font-weight:700;margin-top:8px">+${d} ${t('pointsEarned')}</div>`;
  if(d<0) return `<div style="color:#ff6b6b;font-weight:700;margin-top:8px">${d} ${t('pointsLost')}</div>`;
  return `<div style="color:#9a93c9;margin-top:8px">0 ${t('pointsEarned')}</div>`;
}
function resultFooter(prevLeague){
  const idx=leagueIdx(myScore());
  const promo = idx>prevLeague ? `<div style="color:#ffd24a;font-weight:800;margin-top:8px">🎉 ${t('newRecord')}</div>` : '';
  return `${promo}<div style="margin-top:12px;font-size:14px">${t('league')}: <b>${leagueName(idx)}</b> · ${t('score')}: <b>${myScore()}</b></div>
    <button class="wide primary" style="margin-top:18px;max-width:none" onclick="closeResult()">${t('continueBtn')}</button>`;
}
function renderPvpResult(){
  const prevLeague=leagueIdx(myScore()-matchDelta);
  const waiting = !pvp.oppDone;
  const verdict = waiting ? t('waitingOpp')
    : (pvp.oppLeft || meScore>pvp.oppScore) ? t('youWon') : meScore<pvp.oppScore ? t('youLost') : t('draw');
  $('resultCard').innerHTML = `
    <h2>${waiting?'⏳ ':''}${verdict}</h2>
    <div class="big">${meScore} : ${pvp.oppScore}</div>
    <div style="color:#9a93c9;font-size:13px">${t('you')} — ${esc(pvp.oppName)}${pvp.oppLeft?' · '+t('oppLeft'):''}</div>
    ${deltaLine(matchDelta)}
    ${resultFooter(prevLeague)}`;
  $('resultOverlay').classList.add('on');
}
function finish1v1Match(){
  const prevLeague=leagueIdx(myScore()-matchDelta);
  const verdict = meScore>aiScore ? t('youWon') : meScore<aiScore ? t('youLost') : t('draw');
  $('resultCard').innerHTML = `
    <h2>${t('resultTitle')}: ${verdict}</h2>
    <div class="big">${meScore}/${roundLimit()}</div>
    <div style="color:#9a93c9;font-size:13px">${t('correctCount')} · ${t('opp')}: ${aiScore}</div>
    ${deltaLine(matchDelta)}
    ${resultFooter(prevLeague)}`;
  $('resultOverlay').classList.add('on');
}
// SIMULATION: stands in for the 7 other players until a real backend exists.
function simulateAITeamCorrect(rounds,rate){ let c=0; for(let i=0;i<rounds;i++){ if(Math.random()<rate) c++; } return c; }
function finishTeamMatch(){
  const mateRate=Math.min(0.85,0.45+0.04*leagueIdx(myScore()));
  let yourTotal=teamYouCorrect, oppTotal=0;
  for(let i=0;i<3;i++) yourTotal+=simulateAITeamCorrect(roundLimit(),mateRate);
  for(let i=0;i<4;i++) oppTotal+=simulateAITeamCorrect(roundLimit(),0.5);
  const won=yourTotal>oppTotal;
  const prevLeague=leagueIdx(myScore());
  const d=applyTeamResult(won,false);
  $('resultCard').innerHTML = `
    <h2>${won?t('teamWon'):t('teamLost')}</h2>
    <div style="font-size:13px;color:#9a93c9;margin-top:6px">${t('teamResultBoth')}</div>
    <div class="big" style="font-size:21px">${t('yourTeamScoreLbl')}: ${yourTotal} — ${t('oppTeamScoreLbl')}: ${oppTotal}</div>
    <div style="font-size:13px;color:#cfc8ff">${t('you')}: ${teamYouCorrect}/${roundLimit()}</div>
    ${deltaLine(d)}
    ${resultFooter(prevLeague)}`;
  $('resultOverlay').classList.add('on');
}
// Returns the actual score change.
// Friends mode: win +10, loss −10 (Kumush+; 0 in Bronza), leaving −10 extra on top of the loss.
// Strangers mode: win +correct, loss −wrong, leaving −(wrong+10). Minus parts only from Kumush up.
function applyTeamResult(won,left){
  if(!profile) return 0;
  if(teamMode==='strangers'){
    if(left) return addScore(-(teamYouWrong+10));
    return won ? addScore(teamYouCorrect) : addScore(-teamYouWrong);
  }
  if(left) return addScore(-20);
  return won ? addScore(10) : addScore(-10);
}

/* ---------- rating ---------- */
function showTab(tb){
  ['A','B','C'].forEach(x=>{ $('tab'+x).classList.toggle('on',tb===x); $('pane'+x).classList.toggle('on',tb===x); });
}
let ratingCache={};
function rowHtml(u,i,val){
  const me = profile && u.uid===profile.uid;
  const av = u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : '🧑';
  return `<div class="lbrow${me?' me':''}"><div class="lbrank">${i+1}</div><div class="av3">${av}</div>
    <div class="info"><b>${esc(u.name+' '+u.surname)}</b><span>${leagueName(leagueIdx(u.score))} · ID ${esc(u.id)}</span></div>
    <div class="lbscore">${val}</div></div>`;
}
async function loadBoard(kind){
  const c=ratingCache[kind]; if(c && Date.now()-c.ts<30000) return c.rows;
  const idx=leagueIdx(myScore());
  const rows = kind==='month' ? await Cloud.topMonth(50)
    : kind==='all' ? await Cloud.topAllTime(50)
    : await Cloud.topLeague(LEAGUES[idx].min, LEAGUES[idx+1]?LEAGUES[idx+1].min:null, 50);
  ratingCache[kind]={rows,ts:Date.now()}; return rows;
}
async function renderBoards(){
  const panes=[['month','listA','monthScore'],['all','listC','score'],['league','listB','score']];
  for(const [kind,el,field] of panes){
    const box=$(el); if(!box) continue;
    if(!box.innerHTML) box.innerHTML='<div class="note">…</div>';
    try{
      const rows=await loadBoard(kind);
      box.innerHTML = rows.length ? rows.map((u,i)=>rowHtml(u,i,u[field])).join('') : `<div class="note">${t('ratingEmpty')}</div>`;
      if(kind==='month'){ const r=rows.findIndex(u=>u.uid===profile.uid); $('ratRank').textContent = r>=0 ? '#'+(r+1) : '50+'; }
    }catch(e){
      console.warn(e);
      box.innerHTML=`<div class="note">${t('loadError')}${e&&e.code==='failed-precondition'?' — '+t('indexNeeded'):''}</div>`;
    }
  }
}
function renderRating(){
  if(!profile) return;
  const online=Cloud.enabled;
  ['listA','listB','listC'].forEach(id=>$(id).style.display=online?'block':'none');
  ['noteA','noteB','noteC'].forEach(id=>$(id).textContent=online?'':t('localRatingNote'));
  if(!online) $('ratRank').textContent='#1';
  else if($('rating').classList.contains('active')) renderBoards();
  const nm=profile.name+' '+profile.surname;
  const idx=leagueIdx(myScore());
  $('ratName').textContent=nm;
  $('ratId').textContent='ID: '+profile.id;
  $('ratScore').textContent=myScore();
  $('ratMonth').textContent=(profile.monthKey===monthKeyNow()?(profile.monthScore||0):0);
  $('ratLeague').textContent=leagueName(idx);
  $('ratLeague2').textContent=leagueName(idx);
  const next=LEAGUES[idx+1];
  $('ratLeagueDesc').textContent=nm+' • '+myScore()+' '+t('score')+(next?(' • '+t('nextLeague')+' '+leagueName(idx+1)+': '+next.min):'');
  const av = profile.avatar ? '<img src="'+profile.avatar+'" alt="">' : '🧑';
  $('ratAv').innerHTML=av; $('ratAv2').innerHTML=av;
}

/* ---------- profile ---------- */
function hasPremium(){ return !!(profile && profile.premium && profile.premium.active && Date.now()<profile.premium.expires); }
function renderProfile(){
  if(!profile) return;
  $('pfName').textContent=profile.name+' '+profile.surname;
  $('pfId').textContent=t('yourId')+profile.id;
  let badge=$('premBadgeEl');
  if(hasPremium()){
    if(!badge){ badge=document.createElement('div'); badge.id='premBadgeEl'; badge.className='premBadge'; $('pfId').insertAdjacentElement('afterend',badge); }
    badge.textContent='💎 '+t('premiumActive')+' · '+t('premiumUntil')+new Date(profile.premium.expires).toLocaleDateString();
  } else if(badge){ badge.remove(); }
  if(profile.avatar){
    $('pfAvImg').src=profile.avatar;
    $('pfAvImg').style.display='block';
    $('pfAvEmoji').style.display='none';
    $('meAv').innerHTML='<img src="'+profile.avatar+'" alt="">';
  } else {
    $('pfAvImg').style.display='none';
    $('pfAvEmoji').style.display='';
    $('meAv').textContent='🧑';
  }
}
// Avatar: downscaled (256px local, 128px online) JPEG before saving, because localStorage only
// holds ~5 MB and a raw phone photo would exceed it and fail silently.
$('avatarInput').addEventListener('change',function(e){
  const f=e.target.files[0]; if(!f||!profile) return;
  const r=new FileReader();
  r.onload=function(){
    const img=new Image();
    img.onload=function(){
      const S=Cloud.enabled?128:256, c=document.createElement('canvas'); c.width=S; c.height=S;
      const side=Math.min(img.width,img.height);
      c.getContext('2d').drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,S,S);
      profile.avatar=c.toDataURL('image/jpeg',Cloud.enabled?0.8:0.85);
      if(!Store.setProfile(profile)) alert(t('storageFull'));
      renderProfile(); renderRating();
    };
    img.onerror=function(){ alert(t('badImage')); };
    img.src=r.result;
  };
  r.readAsDataURL(f);
  e.target.value=''; // allow picking the same file again
});

/* ---------- premium / payment (demo — see note at top of file) ---------- */
function priceLabel(n){ return n.toLocaleString('ru-RU').replace(/ /g,' ')+" so'm"; }
function renderPlans(){
  const el=$('planList'); if(!el) return;
  el.innerHTML = PREMIUM_PLANS.map(p=>{
    const label=t('plan'+p.id.charAt(0).toUpperCase()+p.id.slice(1));
    const priceStr=priceLabel(p.price);
    const origStr=p.orig? `<span class="porig">${priceLabel(p.orig)}</span>` : '';
    const badge=p.discount? `<span class="pbadge">-${p.discount}% ${t('discountLabel')}</span>` : '';
    return `<div class="planCard">
      <div class="ptop"><div class="pname">${label}</div>${badge}</div>
      <div style="margin-bottom:10px">${origStr}<span style="font-size:15px;font-weight:700">${priceStr}</span></div>
      <button onclick="selectPlan('${p.id}')">${priceStr}</button>
    </div>`;
  }).join('');
}
function selectPlan(id){
  selectedPlan=PREMIUM_PLANS.find(p=>p.id===id);
  $('payPriceLbl').textContent=t('plan'+id.charAt(0).toUpperCase()+id.slice(1))+' — '+priceLabel(selectedPlan.price);
  $('payBtn').textContent=priceLabel(selectedPlan.price);
  $('cc_num').value=''; $('cc_exp').value=''; $('payErr').textContent='';
  go('payment');
}
function onCardInput(el){ el.value=el.value.replace(/\D/g,'').slice(0,16).replace(/(\d{4})(?=\d)/g,'$1 '); }
function onExpInput(el){
  let v=el.value.replace(/\D/g,'').slice(0,4);
  if(v.length>=3) v=v.slice(0,2)+'/'+v.slice(2);
  el.value=v;
}
function submitPayment(){
  const num=$('cc_num').value.replace(/\s/g,'');
  const exp=$('cc_exp').value.trim();
  const errEl=$('payErr');
  const m=/^(\d{2})\/(\d{2})$/.exec(exp);
  if(num.length<16 || !m || +m[1]<1 || +m[1]>12){ errEl.textContent=t('invalidCard'); return; }
  // DEMO ONLY: the card data is checked for format and then discarded —
  // never stored, never sent anywhere. Replace with a real gateway (Payme,
  // Click, Stripe) called from YOUR backend before taking real money.
  $('cc_num').value=''; $('cc_exp').value='';
  const base = hasPremium() ? profile.premium.expires : Date.now(); // buying again extends the period
  profile.premium={ active:true, plan:selectedPlan.id, expires: base+selectedPlan.days*86400000 };
  saveProfile();
  alert(t('paySuccess'));
  go('profile');
}

/* ---------- friends / 4v4 team battle (local room demo — see note at top) ---------- */
function inviteFriends(){
  const link=location.href.split('#')[0];
  const text = Cloud.enabled && profile ? t('inviteText')+profile.id+'\n'+link : link;
  const fallback=()=>prompt(t('copyManually'),text);
  if(navigator.share){ navigator.share({title:'1v1 Duel',text}).catch(()=>{}); return; }
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>alert(t('copied')),fallback);
  } else fallback();
}

function teamBack(){
  if(teamState==='hub') go('friends');
  else if(teamState==='friendsMenu'){ teamState='hub'; renderTeamContent(); }
  else if(teamState==='create'||teamState==='join'){ teamState='friendsMenu'; renderTeamContent(); }
  else if(teamState==='lobby'){ teamState = teamMode==='friends' ? 'friendsMenu' : 'hub'; renderTeamContent(); }
  else { teamState='hub'; renderTeamContent(); }
}
function renderTeamContent(){
  const el=$('teamContent'); if(!el) return;
  if(teamState==='hub'){
    const lockedS=!canPlayStrangers(myScore());
    el.innerHTML=`
      <div class="modeCard" onclick="teamMode='friends';teamState='friendsMenu';renderTeamContent()"><b>👥 ${t('withFriends')}</b><span>${t('createRoom')} / ${t('joinRoom')}</span></div>
      <div class="modeCard ${lockedS?'locked':''}" id="strangersCard"><b>🌐 ${t('withStrangers')}</b><span>${lockedS?t('strangersLocked'):t('startBattle')}</span></div>`;
    $('strangersCard').onclick = lockedS? null : function(){ teamMode='strangers'; currentRoomId=null; currentRoomName=null; teamState='lobby'; renderTeamContent(); };
  } else if(teamState==='friendsMenu'){
    el.innerHTML=`
      <div class="modeCard" onclick="teamState='create';renderTeamContent()"><b>➕ ${t('createRoom')}</b></div>
      <div class="modeCard" onclick="teamState='join';renderTeamContent()"><b>🔑 ${t('joinRoom')}</b></div>
      <div class="note">${t('localOnlyNote')}</div>`;
  } else if(teamState==='create'){
    el.innerHTML=`
      <input class="field" style="max-width:none" id="roomNameInput" maxlength="30" placeholder="${t('roomName')}">
      <input class="field" style="max-width:none" id="roomPassInput" maxlength="30" placeholder="${t('roomPassOpt')}">
      <button class="wide primary" style="max-width:none;margin-top:14px" onclick="createRoom()">${t('createRoom')}</button>`;
  } else if(teamState==='join'){
    el.innerHTML=`
      <input class="field" style="max-width:none" id="roomIdInput" maxlength="12" inputmode="numeric" placeholder="${t('roomIdLbl')}" oninput="this.value=this.value.replace(/\\D/g,'')">
      <div class="err" id="joinErr"></div>
      <button class="wide primary" style="max-width:none;margin-top:10px" onclick="findRoom()">${t('findRoom')}</button>`;
  } else if(teamState==='lobby'){
    renderLobby(el);
  }
}
function createRoom(){
  const name=($('roomNameInput').value.trim()||t('defaultRoomName'));
  const pass=$('roomPassInput').value.trim();
  const rooms=Store.getRooms();
  let id; do { id=genRoomId12(); } while(rooms[id]);
  rooms[id]={name,pass,hostId:profile.id,ts:Date.now()}; Store.saveRooms(rooms);
  currentRoomId=id; currentRoomName=name; teamMode='friends';
  alert(t('roomCreated')+id);
  teamState='lobby'; renderTeamContent();
}
function findRoom(){
  const id=$('roomIdInput').value.trim();
  const errEl=$('joinErr');
  if(id.length!==12){ errEl.textContent=t('roomIdLen'); return; }
  const room=Store.getRooms()[id];
  if(!room){ errEl.textContent=t('roomNotFound'); return; }
  if(room.pass){
    const p=prompt(t('enterPassword'));
    if(p===null) return;
    if(p!==room.pass){ errEl.textContent=t('wrongPass'); return; }
  }
  currentRoomId=id; currentRoomName=room.name; teamMode='friends';
  alert(t('joinedRoom'));
  teamState='lobby'; renderTeamContent();
}
function renderLobby(el){
  const subjOptions=subjects.map(s=>`<option value="${s.k}">${s.ic} ${esc(s.name)}</option>`).join('')+`<option value="logic">${t('logicTag')}</option>`;
  const roomInfo = teamMode==='friends' ? `<div class="note" style="margin-top:0">${t('roomIdLbl')}: <b>${esc(currentRoomId||'—')}</b>${currentRoomName?(' · '+esc(currentRoomName)):''}</div>` : '';
  // 🎙️ PLACEHOLDER: real voice chat needs a WebRTC provider (Agora, Twilio,
  // LiveKit…) plus a signaling server — impossible on a static site alone.
  el.innerHTML=`
    ${roomInfo}
    <div style="font-weight:700;margin:14px 0 8px;font-size:13.5px">${t('pickSubjectTeam')}</div>
    <select id="teamSubjSelect" class="field" style="max-width:none">${subjOptions}</select>
    <div class="note">${t('teamRulesNote')}</div>
    <button class="wide primary" style="max-width:none;margin-top:14px" onclick="startTeamFromLobby()">${t('startBattle')}</button>
    <button class="micBtn" title="${t('micLabel')}" onclick="alert(t('micLabel'))">🎙️</button>`;
}
function startTeamFromLobby(){ beginTeamMatch($('teamSubjSelect').value); }
function beginTeamMatch(key){
  isTeam=true; curSubj=key; isLogic=(key==='logic'); qi=0; teamYouCorrect=0; teamYouWrong=0;
  matchQs=buildMatchQuestions(key,ROUND_LIMIT_TEAM);
  resetHelpers();
  // Both teams' scores stay hidden until the end — only your X/50 progress shows.
  document.querySelector('.vsrow').style.display='none';
  document.querySelector('.bar').style.display='none';
  $('stickerRow').innerHTML='';
  go('duel'); matchToken++; loadQ();
}

/* ---------- hamburger menu ---------- */
function toggleMenu(open){ $('menuOverlay').classList.toggle('on',open); }
function toggleSub(id){
  const el=$(id);
  document.querySelectorAll('.msub').forEach(m=>{ if(m.id!==id) m.classList.remove('on'); });
  el.classList.toggle('on');
}
async function savePassword(){
  const inp=$('newPassInput'), v=inp.value;
  if(!profile) return;
  if(v.length<8){ alert(t('passTooShort')); return; }
  if(Cloud.enabled){
    try{ await Cloud.changePassword(v); inp.value=''; alert(t('savedMsg')); }
    catch(e){ alert(e && e.code==='auth/requires-recent-login' ? t('reloginNeeded') : cloudErrText(e)); }
    return;
  }
  profile.pass=v; saveProfile(); inp.value=''; alert(t('savedMsg'));
}
async function logout(){
  toggleMenu(false);
  if(Cloud.enabled){ stopCloudWatchers(); stopPvp(); try{ await Cloud.logout(); }catch(e){} profile=null; go('authChoice'); return; }
  if(profile){ profile.loggedIn=false; saveProfile(); }
  go('authChoice');
}

/* ---------- phone country-code picker ---------- */
let selectedCountry={iso:'UZ',dial:'998',name:"O'zbekiston"};
// Builds a flag emoji from an ISO2 code: each letter -> its "regional indicator" symbol.
function flagEmoji(iso2){
  return String.fromCodePoint(...iso2.toUpperCase().split('').map(c=>0x1F1E6+c.charCodeAt(0)-65));
}
function setCountry(c){
  selectedCountry={iso:c[0],dial:c[1],name:c[2]};
  $('dialBtn').textContent=flagEmoji(c[0])+' +'+c[1];
  $('f_phone').placeholder=c[2];
}
function openCountryPicker(){
  $('countrySearch').value='';
  renderCountryList('');
  $('countryOverlay').classList.add('on');
}
function closeCountryPicker(){ $('countryOverlay').classList.remove('on'); }
function renderCountryList(q){
  q=(q||'').toLowerCase().replace('+','').trim();
  const list=COUNTRIES.filter(c=> !q || c[2].toLowerCase().includes(q) || c[1].startsWith(q) || c[0].toLowerCase()===q);
  $('countryList').innerHTML=list.length ? list.map(c=>
    `<div class="countryRow" onclick="pickCountry('${c[0]}')">${flagEmoji(c[0])} ${esc(c[2])} <span class="code">+${c[1]}</span></div>`).join('')
    : `<div class="note">—</div>`;
}
function pickCountry(iso){
  const c=COUNTRIES.find(x=>x[0]===iso); if(!c) return;
  setCountry(c); closeCountryPicker(); $('f_phone').focus();
}
// Groups digits for readability: UZ "90 123 45 67", others "701 234 56 78".
function groupDigits(d){
  const sizes = selectedCountry.dial==='998' ? [2,3,2,2,3] : [3,3,2,2,2]; const parts=[]; let i=0;
  for(const s of sizes){ if(i>=d.length) break; parts.push(d.slice(i,i+s)); i+=s; }
  return parts.join(' ');
}
function onPhoneInput(el){
  let v=el.value.trim();
  if(v.startsWith('+')){
    const digits=v.slice(1).replace(/\D/g,'');
    // Dial codes are prefix-free (E.164), so the first code that matches the
    // typed prefix is the right one. If the current country already has that
    // code (e.g. +7 = Kazakhstan AND Russia), keep the user's choice.
    const matches=COUNTRIES.filter(c=>digits.startsWith(c[1])).sort((a,b)=>b[1].length-a[1].length);
    const match=matches.find(c=>c[0]===selectedCountry.iso && c[1]===matches[0][1]) || matches[0];
    if(match){ setCountry(match); v=digits.slice(match[1].length); }
    else { el.value = digits.length<4 ? '+'+digits : digits.slice(0,12); return; } // still typing the code
  }
  el.value=groupDigits(v.replace(/\D/g,'').slice(0,12));
}
function fullPhone(){ return '+'+selectedCountry.dial+' '+$('f_phone').value.trim(); }
function phoneDigits(p){ return String(p||'').replace(/\D/g,''); }

/* ---------- password show/hide ---------- */
function togglePw(id,btn){
  const el=$(id);
  const show=el.type==='password';
  el.type=show?'text':'password';
  btn.textContent=show?'🙈':'👁';
}
function setPwVisible(id,visible){
  const el=$(id); const btn=el.nextElementSibling;
  el.type=visible?'text':'password'; if(btn) btn.textContent=visible?'🙈':'👁';
}

/* ---------- auth ---------- */
function selectLang(l){
  lang=l; Store.setLang(l); applyLang();
  if($('lang').classList.contains('active')) go('authChoice');
}
function openAuth(mode){
  authMode=mode;
  $('authErr').textContent='';
  ['f_name','f_surname','f_phone','f_pass','f_pass2'].forEach(id=>$(id).value='');
  setPwVisible('f_pass',false); setPwVisible('f_pass2',false);
  setCountry(['UZ','998',"O'zbekiston"]);
  applyLang();
  go('authForm');
}
function submitAuth(){
  const name=$('f_name').value.trim();
  const surname=$('f_surname').value.trim();
  const localDigits=phoneDigits($('f_phone').value);
  const phone=fullPhone();
  const pass=$('f_pass').value;
  const pass2=$('f_pass2').value;
  const errEl=$('authErr');
  if(authMode==='register'){
    if(!name||!surname||!localDigits||!pass||!pass2){ errEl.textContent=t('fillAll'); return; }
    if(localDigits.length<5){ errEl.textContent=t('badPhone'); return; }
    if(pass.length<8){ errEl.textContent=t('passTooShort'); return; }
    if(pass!==pass2){
      // show both fields in plain text so the typo is visible immediately
      setPwVisible('f_pass',true); setPwVisible('f_pass2',true);
      errEl.textContent=t('passMismatch'); return;
    }
    if(Cloud.enabled){
      cloudAuth(()=>Cloud.register({name,surname,digits:phoneDigits(phone),pass}));
      return;
    }
    const old=Store.getProfile();
    if(old && phoneDigits(old.phone)===phoneDigits(phone) && !confirm(t('overwriteAcc'))) return;
    profile={name,surname,phone,pass,id:genId(),avatar:null,score:0,premium:null,loggedIn:true,created:Date.now()};
    saveProfile(); go('home'); applyLang();
  } else {
    if(!localDigits||!pass){ errEl.textContent=t('fillAll'); return; }
    if(Cloud.enabled){ cloudAuth(()=>Cloud.login(phoneDigits(phone),pass)); return; }
    const saved=Store.getProfile();
    if(!saved){ errEl.textContent=t('noAcc'); return; }
    if(phoneDigits(saved.phone)!==phoneDigits(phone)||saved.pass!==pass){ errEl.textContent=t('wrongLogin'); return; }
    profile=saved; profile.loggedIn=true; saveProfile(); go('home'); applyLang();
  }
}

function cloudErrText(e){
  const c=(e&&e.code)||'';
  if(c==='auth/email-already-in-use') return t('phoneTaken');
  if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials','auth/invalid-email'].includes(c)) return t('wrongLogin');
  if(c==='auth/network-request-failed'||(e&&e.message==='sdk-load-failed')) return t('netError');
  if(c==='auth/too-many-requests') return t('tooMany');
  if(c==='permission-denied') return t('cloudError')+' (rules)';
  return t('cloudError')+(c?' ('+c+')':'');
}
async function cloudAuth(fn){
  const btn=$('authSubmit'), errEl=$('authErr');
  btn.disabled=true; errEl.textContent='…';
  try{
    profile=await fn(); errEl.textContent='';
    startCloud(); go('home'); applyLang();
  }catch(e){ console.warn(e); errEl.textContent=cloudErrText(e); }
  btn.disabled=false;
}

/* ---------- calculator (own arithmetic, no eval) ---------- */
let calcCur='0', calcPrev=null, calcOp=null, calcResetNext=false;
function calcFmt(n){
  if(!isFinite(n)) return 'Error';
  return String(parseFloat(n.toPrecision(12))); // hides float noise: 0.1+0.2 -> 0.3
}
function calcRender(){ const el=$('calcDisplay'); if(el) el.textContent=calcCur; }
function calcDigit(d){
  if(calcCur==='Error') calcClear();
  if(calcResetNext){ calcCur=(d==='.')?'0.':d; calcResetNext=false; }
  else if(d==='.'){ if(!calcCur.includes('.')) calcCur+='.'; }
  else if(calcCur.replace(/[-.]/g,'').length>=15) return;
  else { calcCur=(calcCur==='0')?d:(calcCur==='-0'?'-'+d:calcCur+d); }
  calcRender();
}
function calcMath(a,b,op){
  a=parseFloat(a); b=parseFloat(b);
  if(op==='+') return a+b; if(op==='−') return a-b; if(op==='×') return a*b;
  if(op==='÷') return b===0?NaN:a/b; return b;
}
function calcOperator(op){
  if(calcCur==='Error') return;
  if(calcOp && !calcResetNext) calcCur=calcFmt(calcMath(calcPrev,calcCur,calcOp));
  calcPrev=calcCur; calcOp=op; calcResetNext=true; calcRender();
}
function calcEquals(){
  if(calcOp==null || calcCur==='Error') return;
  calcCur=calcFmt(calcMath(calcPrev,calcCur,calcOp));
  calcOp=null; calcPrev=null; calcResetNext=true; calcRender();
}
function calcClear(){ calcCur='0'; calcPrev=null; calcOp=null; calcResetNext=false; calcRender(); }
function calcSign(){
  if(calcCur==='Error') return;
  calcCur=calcCur.startsWith('-')?calcCur.slice(1):('-'+calcCur); calcResetNext=false; calcRender();
}
function calcPercent(){ if(calcCur==='Error') return; calcCur=calcFmt(parseFloat(calcCur)/100); calcResetNext=true; calcRender(); }

/* ---------- AI assistant ----------
   Two ways this can answer, tried in order:
   1) AI_PROXY_URL — your OWN backend endpoint (see server/cloudflare-worker.js
      and the README). This is what makes the assistant work on your real
      website. Fill this in once you've deployed that worker.
   2) The "sample" runtime capability — only exists when the page is opened
      as a claude.ai artifact, so it works there without any setup, but NOT
      once exported to your own site.
   If neither is available, a clear explanatory message is shown instead of
   breaking. IMPORTANT: never put a real API key directly in this file or
   anywhere else in client-side code — anyone can read it from the page
   source and spend your API credits. Keep the key only as a secret on
   your backend (step 1). */
const AI_PROXY_URL=''; // e.g. 'https://duel-ai.your-subdomain.workers.dev' once deployed
let aiSampleFn=null, aiChecked=false, aiBusy=false;
async function initAI(){
  if(aiChecked) return; aiChecked=true;
  if(AI_PROXY_URL){ aiAppend('bot',t('aiHello')); return; }
  if(typeof claude==='undefined' || !claude.use){ aiShowUnavailable(); return; }
  try{
    const sample=await claude.use('sample');
    if(!sample){ aiShowUnavailable(); return; }
    aiSampleFn=sample; aiAppend('bot',t('aiHello'));
  } catch(e){ aiShowUnavailable(); }
}
function aiShowUnavailable(){
  $('aiMessages').innerHTML=`<div class="aiMsg bot">${t('aiUnavailable')}</div>`;
  $('aiInputRow').style.display='none';
}
function aiAppend(role,text){
  const el=document.createElement('div'); el.className='aiMsg '+role; el.textContent=text;
  const list=$('aiMessages'); list.appendChild(el); list.scrollTop=list.scrollHeight;
  return el;
}
async function sendAI(){
  if((!AI_PROXY_URL && !aiSampleFn) || aiBusy) return;
  const inp=$('aiInput');
  const msg=inp.value.trim(); if(!msg) return;
  aiAppend('user',msg); inp.value='';
  const botEl=aiAppend('bot',t('aiThinking'));
  aiBusy=true;
  try{
    if(AI_PROXY_URL){
      const r=await fetch(AI_PROXY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,lang})});
      const data=await r.json().catch(()=>({}));
      botEl.textContent=(r.ok && data.text) ? data.text : (data.error ? t('aiError')+' ('+data.error+')' : t('aiError'));
    } else {
      const res=await aiSampleFn(msg);
      botEl.textContent=(res && res.text) || t('aiError');
    }
  } catch(e){ botEl.textContent=t('aiError'); }
  aiBusy=false;
  const list=$('aiMessages'); list.scrollTop=list.scrollHeight;
}

/* ---------- ONLINE: friends, friend requests, friend duels ---------- */
let friendMsg={text:'',color:''};
let friendsState=[], friendUsers={}, incomingCh=[], unsubFriends=null, unsubIncoming=null, shownChallengeId=null;
function startCloud(){
  stopCloudWatchers();
  Cloud.onProfile(()=>{ renderProfile(); if($('rating').classList.contains('active')) renderRating(); });
  unsubFriends=Cloud.watchFriendships(async list=>{
    friendsState=list;
    await Promise.all(list.map(async f=>{ try{ friendUsers[f.other]=await Cloud.getUser(f.other); }catch(e){} }));
    updateFriendsBadge();
    if($('friends').classList.contains('active')) renderFriends();
  });
  unsubIncoming=Cloud.watchIncoming(list=>{
    incomingCh=list; updateFriendsBadge();
    if(shownChallengeId && !list.some(c=>c.id===shownChallengeId)) closeModal(); // sender cancelled / expired
    if($('friends').classList.contains('active')) renderFriends();
    showPendingChallenge();
  });
  // re-filter expired challenges every 5 s
  clearInterval(startCloud._t); startCloud._t=setInterval(()=>{
    const before=incomingCh.length; incomingCh=incomingCh.filter(c=>Date.now()-Cloud.ms(c.createdAt)<60000);
    if(shownChallengeId && !incomingCh.some(c=>c.id===shownChallengeId)) closeModal();
    if(before!==incomingCh.length){ updateFriendsBadge(); if($('friends').classList.contains('active')) renderFriends(); }
  },5000);
}
function stopCloudWatchers(){
  if(unsubFriends) unsubFriends(); if(unsubIncoming) unsubIncoming();
  unsubFriends=unsubIncoming=null; friendsState=[]; incomingCh=[]; clearInterval(startCloud._t);
  updateFriendsBadge(); closeModal();
}
function updateFriendsBadge(){
  const n=friendsState.filter(f=>f.incoming).length+incomingCh.length;
  const b=$('friendsBadge'); b.textContent=n; b.style.display=n?'flex':'none';
}
function userLabel(u){ return u ? esc(u.name+' '+u.surname) : '…'; }
function friendAv(u){ return u && u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : '🧑'; }
function renderFriends(){
  const box=$('friendsCloud'); if(!box) return;
  if(!Cloud.enabled){ box.innerHTML=`<div class="note" style="margin:0 0 6px">${t('friendsLocalNote')}</div>`; $('noFriendsNote').style.display=''; return; }
  $('noFriendsNote').style.display='none';
  const acc=friendsState.filter(f=>f.status==='accepted');
  const inc=friendsState.filter(f=>f.incoming);
  const out=friendsState.filter(f=>f.status==='pending'&&!f.incoming);
  let h=`<div class="mecard" style="padding:14px;text-align:left">
      <div style="font-size:12px;color:#9a93c9;margin-bottom:6px">${t('yourIdIs')} <b style="color:#ffd24a;font-size:15px">${esc(profile.id)}</b></div>
      <div style="display:flex;gap:8px"><input class="field" style="margin:0;max-width:none;flex:1" id="addFriendId" maxlength="8" inputmode="numeric" placeholder="${t('addFriendPh')}" oninput="this.value=this.value.replace(/\\D/g,'')">
      <button class="inv" style="padding:0 14px;border-radius:12px" onclick="addFriend()">${t('addFriendBtn')}</button></div>
      <div class="err" id="addFriendMsg" style="margin-top:6px;color:${friendMsg.color}">${esc(friendMsg.text)}</div></div>`;
  if(incomingCh.length){
    h+=`<div class="secTitle">⚔️ ${t('pendingChallenges')}</div>`+incomingCh.map(c=>`<div class="teamrow">
      <div class="av3">⚔️</div><div class="info"><b>${esc(c.fromName)}</b><span>${subjName(c.subj)}</span></div>
      <button class="inv ghostInv" onclick="answerChallenge('${c.id}',false)">✕</button>
      <button class="inv" onclick="answerChallenge('${c.id}',true)">${t('accept')}</button></div>`).join('');
  }
  if(inc.length){
    h+=`<div class="secTitle">📩 ${t('incomingReqs')}</div>`+inc.map(f=>{ const u=friendUsers[f.other]; return `<div class="teamrow">
      <div class="av3">${friendAv(u)}</div><div class="info"><b>${userLabel(u)}</b><span>ID ${u?esc(u.id):''}</span></div>
      <button class="inv ghostInv" onclick="removeFriend('${f.fid}',false)">${t('decline')}</button>
      <button class="inv" onclick="acceptFriend('${f.fid}')">${t('accept')}</button></div>`; }).join('');
  }
  h+=`<div class="secTitle">👥 ${t('myFriends')} (${acc.length})</div>`;
  h+= acc.length ? acc.sort((a,b)=>((friendUsers[b.other]||{}).score||0)-((friendUsers[a.other]||{}).score||0)).map(f=>{ const u=friendUsers[f.other]; return `<div class="teamrow">
      <div class="av3">${friendAv(u)}</div><div class="info"><b>${userLabel(u)}</b><span>${u?leagueName(leagueIdx(u.score))+' · '+u.score+' '+t('score'):''}</span></div>
      <button class="inv ghostInv" title="${t('removeFriend')}" onclick="removeFriend('${f.fid}',true)">✕</button>
      <button class="inv" onclick="openChallenge('${f.other}')">⚔️ ${t('challengeBtn')}</button></div>`; }).join('')
    : `<div class="note" style="margin-top:4px">${t('noFriends')}</div>`;
  if(out.length){
    h+=`<div class="secTitle">📤 ${t('outgoingReqs')}</div>`+out.map(f=>{ const u=friendUsers[f.other]; return `<div class="teamrow">
      <div class="av3">${friendAv(u)}</div><div class="info"><b>${userLabel(u)}</b><span>${t('waitingLbl')}</span></div>
      <button class="inv ghostInv" onclick="removeFriend('${f.fid}',false)">${t('cancel')}</button></div>`; }).join('');
  }
  box.innerHTML=h;
}
function subjName(k){ if(k==='logic') return t('logicTag'); const s=subjects.find(x=>x.k===k); return s? s.ic+' '+esc(s.name) : esc(k); }
async function addFriend(){
  const id=$('addFriendId').value.trim();
  // the message survives re-renders of the list (they happen on every live update)
  const say=(text,color)=>{ friendMsg={text,color:color||''}; const m=$('addFriendMsg'); if(m){ m.textContent=text; m.style.color=color||''; } };
  if(id.length!==8){ say(t('friendIdLen')); return; }
  say('…');
  try{
    const u=await Cloud.findByPublicId(id);
    if(!u){ say(t('friendNotFound')); return; }
    const r=await Cloud.sendFriendRequest(u.uid);
    friendUsers[u.uid]=u;
    const txt={self:t('friendSelf'),sent:t('reqSent'),pending:t('reqPending'),accepted:t('reqAccepted'),already:t('alreadyFriends')}[r];
    say((r==='self'?'':u.name+': ')+txt, (r==='sent'||r==='accepted') ? '#2ecc71' : '');
    const inp=$('addFriendId'); if(inp) inp.value='';
  }catch(e){ console.warn(e); say(cloudErrText(e)); }
}
async function acceptFriend(fid){ try{ await Cloud.acceptFriend(fid); }catch(e){ alert(cloudErrText(e)); } }
async function removeFriend(fid,confirmIt){
  if(confirmIt && !confirm(t('confirmRemove'))) return;
  try{ await Cloud.removeFriend(fid); }catch(e){ alert(cloudErrText(e)); }
}

/* modal + toast helpers */
function openModal(html){ $('modalCard').innerHTML=html; $('modalOverlay').classList.add('on'); }
function closeModal(){ $('modalOverlay').classList.remove('on'); shownChallengeId=null; }
function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),2600); }

// Sender side: pick a subject, send, then wait on the "searching" screen.
function openChallenge(uid){
  const u=friendUsers[uid]; if(!u) return;
  const opts=subjects.map(s=>`<option value="${s.k}">${s.ic} ${esc(s.name)}</option>`).join('')+`<option value="logic">${t('logicTag')}</option>`;
  openModal(`<h2>⚔️ ${t('challengeTitle')}</h2><div style="color:#cfc8ff;margin:6px 0 12px">${userLabel(u)}</div>
    <div style="font-size:12.5px;color:#9a93c9;text-align:left">${t('pickSubjectTeam')}</div>
    <select id="chSubj" class="field" style="max-width:none">${opts}</select>
    <div class="btnrow" style="max-width:none"><button class="wide ghost" onclick="closeModal()">${t('cancel')}</button>
    <button class="wide primary" onclick="sendChallenge('${uid}')">${t('sendChallenge')}</button></div>`);
}
async function sendChallenge(uid){
  const u=friendUsers[uid], subj=$('chSubj').value; closeModal();
  const seed=makeSeed(subj,ROUND_LIMIT_1V1);
  let id;
  try{ id=await Cloud.createChallenge(uid,u.name+' '+u.surname,profile.name+' '+profile.surname,subj,seed); }
  catch(e){ alert(cloudErrText(e)); return; }
  stopPvp();
  pvp={id,opp:uid,oppName:u.name,state:'waiting',oppScore:0,oppAnswered:0,oppDone:false,oppLeft:false,subj,seed};
  pvp.unsub=Cloud.watchChallenge(id,onChallengeUpdate);
  // waiting screen = the matchmaking screen with a 60 s countdown
  let left=60; $('searchTitle').textContent=u.name+' '+t('waitingFor'); $('searchTimer').textContent=left; go('searching');
  searchInterval=setInterval(()=>{
    left--; $('searchTimer').textContent=Math.max(0,left);
    if(left<=0 && pvp && pvp.state==='waiting'){ Cloud.setChallengeStatus(id,'expired'); stopPvp(); alert(u.name+' '+t('challengeExpired')); go('friends'); }
  },1000);
}
// Receiver side
function showPendingChallenge(){
  if(!Cloud.enabled || !incomingCh.length || shownChallengeId) return;
  const act=document.querySelector('.screen.active'); if(!act || ['duel','searching','payment','authForm'].includes(act.id)) return;
  const c=incomingCh[0]; shownChallengeId=c.id;
  openModal(`<div style="font-size:40px">⚔️</div><h2>${esc(c.fromName)}</h2>
    <div style="color:#cfc8ff;margin:6px 0">${t('incomingChallenge')}</div><div class="tag" style="margin:10px auto">${subjName(c.subj)}</div>
    <div class="btnrow" style="max-width:none"><button class="wide ghost" onclick="answerChallenge('${c.id}',false)">${t('decline')}</button>
    <button class="wide primary" onclick="answerChallenge('${c.id}',true)">${t('accept')}</button></div>`);
}
async function answerChallenge(id,accept){
  const c=incomingCh.find(x=>x.id===id); closeModal();
  incomingCh=incomingCh.filter(x=>x.id!==id); updateFriendsBadge();
  try{ await Cloud.respondChallenge(id,accept); }catch(e){ alert(cloudErrText(e)); return; }
  if(!accept || !c){ if($('friends').classList.contains('active')) renderFriends(); return; }
  stopPvp();
  pvp={id,opp:c.from,oppName:(c.fromName||'').split(' ')[0],state:'playing',oppScore:0,oppAnswered:0,oppDone:false,oppLeft:false,subj:c.subj,seed:c.qs};
  pvp.unsub=Cloud.watchChallenge(id,onChallengeUpdate);
  beginDuel(c.subj,seedToQs(c.subj,c.qs));
}
function onChallengeUpdate(ch){
  if(!pvp || ch.id!==pvp.id) return;
  if(pvp.state==='waiting'){
    if(ch.status==='accepted'){ pvp.state='playing'; beginDuel(pvp.subj,seedToQs(pvp.subj,pvp.seed)); }
    else if(ch.status==='declined'){ const n=pvp.oppName; stopPvp(); go('friends'); alert(n+' '+t('challengeDeclined')); }
    return;
  }
  const o=pvp.opp, wasLeft=pvp.oppLeft;
  pvp.oppScore=(ch.scores&&ch.scores[o])||0; pvp.oppAnswered=(ch.answered&&ch.answered[o])||0;
  pvp.oppDone=!!(ch.done&&ch.done[o]); pvp.oppLeft=!!(ch.left&&ch.left[o]);
  aiScore=pvp.oppScore; updateScores();
  $('oppName').textContent=pvp.oppName+' · '+pvp.oppAnswered+'/'+ROUND_LIMIT_1V1;
  if(pvp.oppLeft && !wasLeft) toast(pvp.oppName+': '+t('oppLeft'));
  const st=ch.stk&&ch.stk[o];
  if(st && st.t!==pvp.lastStk){ pvp.lastStk=st.t; if(pvp.state==='playing' && Date.now()-st.t<10000){ sendSticker(st.e,true); toast(pvp.oppName+' '+st.e); } }
  if(pvp.state==='ended' && $('resultOverlay').classList.contains('on')) renderPvpResult();
}
function stopPvp(){ if(pvp && pvp.unsub) pvp.unsub(); pvp=null; }

/* ---------- swipe navigation ---------- */
// Swipe right on Home -> quick logic duel; swipe left in a duel -> back home.
let tsx=0,tsy=0;
$('app').addEventListener('touchstart',e=>{ tsx=e.touches[0].clientX; tsy=e.touches[0].clientY; },{passive:true});
$('app').addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tsx, dy=e.changedTouches[0].clientY-tsy;
  if(Math.abs(dy)>40||Math.abs(dx)<80) return;
  const active=document.querySelector('.screen.active'); if(!active) return;
  if(dx>0 && active.id==='home'){ startSearch('logic'); }
  else if(dx<0 && active.id==='duel'){ leaveGame(); }
},{passive:true});

/* ---------- boot ---------- */
function boot(){
  const savedLang=Store.getLang();
  if(savedLang && I18N[savedLang]) lang=savedLang;
  buildGrid();
  const afterAuth=()=>{
    if(profile && profile.loggedIn){ go('home'); applyLang(); }
    else if(savedLang){ go('authChoice'); applyLang(); }
    else { go('lang'); applyLang(); }
  };
  if(!Cloud.enabled){ profile=Store.getProfile(); afterAuth(); return; }
  // ONLINE mode: wait for Firebase to restore the saved login.
  $('bootMsg').textContent=t('bootLoading'); $('bootRetry').style.display='none'; go('boot');
  // One automatic retry first (the very first connection is sometimes slow), then a Retry button.
  const attempt=(n)=>Cloud.restore().then(p=>{ profile=p; if(p) startCloud(); afterAuth(); })
    .catch(e=>{
      console.warn('[boot]',e);
      if(n<1){ $('bootMsg').textContent=t('bootLoading'); return attempt(n+1); }
      $('bootMsg').textContent=cloudErrText(e); $('bootRetry').style.display='';
    });
  attempt(0);
}
boot();
