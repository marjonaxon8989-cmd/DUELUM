// app.js — screens, quiz engine (1v1 duel, logic duel, friend duel, 4v4),
// auth, profiles & follows, friends, notifications bell, theme, premium,
// calculator.
//
// IMPORTANT, read before extending:
//  - Random matchmaking always falls back to an AI opponent after 15 s: there
//    is no live pool of strangers without a matchmaking server (startSearch).
//    Friend duels ARE real (online mode, cloud.js).
//  - 4v4 rooms are local to one browser and teammates/opponents are simulated
//    (simulateAITeamCorrect). Voice chat is a placeholder (needs WebRTC).
//  - Premium is not sold yet: choosing a plan shows "coming soon". When a real
//    gateway (Payme / Click / Stripe) is connected, the server must grant
//    premium — never the browser.
//  - Questions come from questions.js; every question a player has seen is
//    remembered (Store.getSeen/addSeen) so it does not come back to them.

const NAV_SCREENS=['home','rating','friends','profile'];
const ROUND_LIMIT_1V1=10, ROUND_LIMIT_TEAM=50, QUESTION_SECONDS=15, SEARCH_SECONDS=15;

let curSubj='math', qi=0, timer=null, tleft=QUESTION_SECONDS, meScore=0, aiScore=0, fiftyUsed=false, hintUses=0, locked=false, isLogic=false, isTeam=false;
let matchQs=[], matchToken=0, matchDelta=0, teamYouCorrect=0, teamYouWrong=0;
let authMode='register', profile=null, pendingSubj='math', searchInterval=null, searchTimeout=null;
let teamState='hub', teamMode='friends', currentRoomId=null, currentRoomName=null;
let pvp=null, pendingReg=null, tgMode='register', prevScreen='home';

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function genRoomId12(){ let s=String(1+Math.floor(Math.random()*9)); for(let i=0;i<11;i++) s+=Math.floor(Math.random()*10); return s; }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function saveProfile(){ if(profile) Store.setProfile(profile); }
function initials(n,s){ return esc(((n||'?')[0]||'?').toUpperCase()+((s||'')[0]||'').toUpperCase()); }
function avatarHtml(u){ return u && u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : initials(u&&u.name,u&&u.surname); }
function setAv(el,u){ if(el) el.innerHTML=avatarHtml(u); }
const fmtNum=n=>Number(n||0).toLocaleString('ru-RU').replace(/ /g,' ');

/* ---------- leagues ---------- */
function leagueIdx(score){ let idx=0; for(let i=0;i<LEAGUES.length;i++){ if(score>=LEAGUES[i].min) idx=i; } return idx; }
function leagueName(idx){ return t('lg_'+LEAGUES[idx].key); }
function canLoseScore(score){ return leagueIdx(score)>=1; }       // minus points start at Kumush (Silver)
function canPlayStrangers(score){ return leagueIdx(score)>=1; }
function myScore(){ return profile ? (profile.score||0) : 0; }
function monthKeyNow(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function addScore(n){
  if(!profile) return 0;
  if(n<0 && !canLoseScore(myScore())) return 0;
  const before=myScore(); profile.score=Math.max(0,before+n);
  const d=profile.score-before;
  if(d){
    if(!Cloud.enabled){ const mk=monthKeyNow(); if(profile.monthKey!==mk){ profile.monthKey=mk; profile.monthScore=0; } profile.monthScore=Math.max(0,(profile.monthScore||0)+d); }
    Store.addScore(profile,d);
  }
  return d;
}
function leagueBadge(score){ const i=leagueIdx(score); return `<span class="badge"><span class="sw" style="background:${LEAGUES[i].col}"></span>${leagueName(i)}</span>`; }

/* ---------- theme ---------- */
function currentTheme(){ return document.documentElement.dataset.theme==='dark'?'dark':'light'; }
function applyThemeIcons(){
  const dark=currentTheme()==='dark';
  document.querySelectorAll('.themeIcon').forEach(el=>el.innerHTML=icon(dark?'sun':'moon'));
  const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=dark?'#000000':'#ffffff';
}
function toggleTheme(){ const n=currentTheme()==='dark'?'light':'dark'; document.documentElement.dataset.theme=n; Store.setTheme(n); applyThemeIcons(); }

/* ---------- i18n ---------- */
function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>el.placeholder=t(el.dataset.i18nPh));
  const reg=authMode==='register';
  $('authTitle').textContent = reg?t('registerBtn'):t('haveAccBtn');
  $('authSubmit').textContent = reg?t('createAcc'):t('signIn');
  $('pass2Row').style.display = reg?'block':'none';
  $('f_name').style.display = reg?'block':'none';
  $('f_surname').style.display = reg?'block':'none';
  $('f_pass').autocomplete = reg?'new-password':'current-password';
  buildGrid(); renderRating(); renderProfile(); updateTgBanner();
  if($('premium').classList.contains('active')) renderPlans();
  if($('teamBattle').classList.contains('active')) renderTeamContent();
  if($('friends').classList.contains('active')) renderFriends();
}

/* ---------- routing ---------- */
function go(id){
  const cur=document.querySelector('.screen.active');
  if(cur && cur.id!==id && cur.id!=='userProfile') prevScreen=cur.id;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('nav.bn button').forEach(b=>b.classList.toggle('on',b.dataset.s===id));
  $('bottomNav').style.display = NAV_SCREENS.includes(id)||id==='userProfile' ? 'flex' : 'none';
  if(id!=='duel'){ clearInterval(timer); timer=null; matchToken++; }
  if(id!=='searching'){ clearInterval(searchInterval); clearTimeout(searchTimeout); }
  window.scrollTo(0,0);
  if(id==='rating') renderRating();
  if(id==='profile') renderProfile();
  if(id==='friends') renderFriends();
  if(id==='teamBattle'){ teamState='hub'; renderTeamContent(); }
  if(id==='premium') renderPlans();
  if(id!=='duel' && id!=='searching') showPendingChallenge();
}
function upBack(){ go(prevScreen && prevScreen!=='userProfile' ? prevScreen : 'friends'); }

/* ---------- home ---------- */
function subjIcon(s,size){ return `<div class="tile" style="background:${s.col}1f;color:${s.col}">${icon(s.k,size||22)}</div>`; }
function buildGrid(){
  $('grid').innerHTML=subjects.map(s=>`<button class="subj" onclick="openIntro('${s.k}')">
    ${subjIcon(s)}<div><div class="nm">${esc(s.name)}</div>
    <div class="on"><span class="livedot"></span><span id="cnt_${s.k}">${s.on.toLocaleString()}</span> ${t('online')}</div></div></button>`).join('');
}
// "Players online" drift a little so the grid feels alive (decorative, not a real counter).
setInterval(()=>{ subjects.forEach(s=>{ s.on=Math.max(50,s.on+Math.round((Math.random()-0.5)*8)); const el=$('cnt_'+s.k); if(el) el.textContent=s.on.toLocaleString(); }); },3500);
function openIntro(k){
  pendingSubj=k; const s=subjects.find(x=>x.k===k);
  $('introIc').style.background=s.col+'1f'; $('introIc').style.color=s.col; $('introIc').innerHTML=icon(k,40);
  $('introName').textContent=s.name;
  $('introOnline').textContent=s.on.toLocaleString()+' '+t('online');
  go('subjIntro');
}
function startFromIntro(){ startSearch(pendingSubj); }

/* ---------- matchmaking (AI fallback — see top) ---------- */
function startSearch(key){
  let sLeft=SEARCH_SECONDS;
  $('searchTitle').textContent=t('searching'); $('searchTimer').textContent=sLeft;
  go('searching');
  searchInterval=setInterval(()=>{
    sLeft--; $('searchTimer').textContent=Math.max(0,sLeft);
    if(sLeft<=0){ clearInterval(searchInterval); $('searchTitle').textContent=t('foundAI'); searchTimeout=setTimeout(()=>beginDuel(key),900); }
  },1000);
}
function cancelSearch(){
  if(pvp && pvp.state==='waiting'){ Cloud.setChallengeStatus(pvp.id,'cancelled'); stopPvp(); go('friends'); return; }
  go('home');
}

/* ---------- questions: never repeat for the same player ---------- */
function seenKey(){ return profile ? (profile.uid||profile.id||'guest') : 'guest'; }
function buildMatchQuestions(key,count){
  const seen=Store.getSeen(seenKey(),key);
  const {questions,resetPool}=QGen.build(key,count,seen);
  if(resetPool) Store.clearSeen(seenKey(),key);   // whole pool used up -> start a fresh cycle
  return questions;
}
function markSeen(q){ if(q && q.id) Store.addSeen(seenKey(),curSubj,q.id); }

/* ---------- 1v1 / logic / friend duel ---------- */
function resetHelpers(){
  fiftyUsed=false; hintUses=0; $('fiftyBtn').disabled=false;
  const hb=$('hintBtn'); hb.disabled=false; hb.style.display=hasPremium()?'flex':'none'; $('hintCount').textContent=2;
}
function makeSeed(key,count){ return buildMatchQuestions(key,count).map(q=>({id:q.id,q:q.q,o:q.o,c:q.c})); }
function seedToQs(key,seed){
  if(seed.length && seed[0].q) return seed.map(x=>({id:x.id,q:x.q,o:x.o.slice(),c:x.c}));
  const bank = key==='logic' ? logicBank : qbank[key];                     // old challenge format {i,o}
  return seed.map(({i,o})=>{ const it=bank[i]; return {q:it.q,o:o.map(k=>it.o[k]),c:o.indexOf(it.c)}; });
}
function beginDuel(key,presetQs){
  isTeam=false; curSubj=key; isLogic=(key==='logic'); qi=0; matchDelta=0;
  if(!presetQs && pvp) stopPvp();
  matchQs=presetQs || buildMatchQuestions(key,ROUND_LIMIT_1V1);
  $('oppName').textContent = pvp ? pvp.oppName : t('opp');
  $('oppAv').innerHTML = pvp ? avatarHtml(pvp.oppUser||{name:pvp.oppName}) : icon('bot',20);
  setAv($('meAv'),profile);
  meScore=0; aiScore=0; updateScores(); resetHelpers();
  document.querySelector('.vsrow').style.display='flex'; document.querySelector('.bar').style.display='flex';
  $('stickerRow').innerHTML = isLogic ? '' : STICKERS.map(s=>`<button onclick="sendSticker('${s}')">${icon(s,22)}</button>`).join('');
  go('duel'); matchToken++; loadQ();
}
function roundLimit(){ return isTeam?ROUND_LIMIT_TEAM:ROUND_LIMIT_1V1; }
function currentItem(){ return matchQs[qi]; }
function aiCorrectRate(){ return Math.min(0.85,0.55+0.03*leagueIdx(myScore())); }
function updateScores(){
  $('meScore').textContent=meScore; $('aiScore').textContent=aiScore;
  const tot=meScore+aiScore, p=tot?Math.round(100*meScore/tot):50;
  $('barMe').style.width=p+'%'; $('barAi').style.width=(100-p)+'%';
}
function subjName(k){ if(k==='logic') return t('logicTag'); const s=subjects.find(x=>x.k===k); return s?s.name:k; }
function loadQ(){
  if(qi>=matchQs.length || qi>=roundLimit()){ endMatch(); return; }
  locked=false;
  const item=currentItem(); markSeen(item);
  $('subjTag').textContent=subjName(curSubj)+' · '+(qi+1)+'/'+Math.min(roundLimit(),matchQs.length);
  $('qText').textContent=item.q;
  $('opts').innerHTML=item.o.map((tx,i)=>`<div class="opt" data-i="${i}" onclick="answer(${i})"><div class="lt">${'ABCD'[i]}</div><div class="tx">${esc(tx)}</div></div>`).join('');
  tleft=QUESTION_SECONDS; clearInterval(timer);
  $('ring').style.setProperty('--p',100); $('timeLeft').textContent=tleft;
  const token=matchToken;
  timer=setInterval(()=>{
    if(token!==matchToken){ clearInterval(timer); return; }
    tleft--; $('timeLeft').textContent=tleft; $('ring').style.setProperty('--p',Math.round(tleft/QUESTION_SECONDS*100));
    if(tleft<=0){ clearInterval(timer); if(!locked) resolveQuestion(-1); }
  },1000);
}
function resolveQuestion(picked){
  const item=currentItem(), correct=(picked===item.c);
  if(isTeam){ if(correct) teamYouCorrect++; else teamYouWrong++; }
  else {
    if(correct){ meScore++; matchDelta+=addScore(1); } else { matchDelta+=addScore(-1); }
    if(pvp) Cloud.pvpProgress(pvp.id,meScore,qi+1); else aiAnswers();
  }
  lockAndShow(item.c,picked);
}
function aiAnswers(){ if(Math.random()<aiCorrectRate()) aiScore++; updateScores(); }
function answer(i){ if(locked) return; clearInterval(timer); resolveQuestion(i); }
function lockAndShow(correct,picked){
  locked=true;
  document.querySelectorAll('.opt').forEach(el=>{ const idx=+el.dataset.i; el.classList.add('disabled'); if(idx===correct) el.classList.add('correct'); else if(idx===picked) el.classList.add('wrong'); });
  const token=matchToken; setTimeout(()=>{ if(token!==matchToken) return; qi++; loadQ(); },1100);
}
function skipQ(){
  if(locked) return; clearInterval(timer);
  if(pvp) Cloud.pvpProgress(pvp.id,meScore,qi+1); else if(!isTeam) aiAnswers();
  qi++; loadQ();
}
function liveWrongOptions(){ const item=currentItem(); return [0,1,2,3].filter(i=>i!==item.c).filter(i=>{ const el=document.querySelector(`.opt[data-i="${i}"]`); return el && !el.classList.contains('disabled'); }); }
function useFifty(){
  if(fiftyUsed||locked) return; fiftyUsed=true; $('fiftyBtn').disabled=true;
  const live=liveWrongOptions(); shuffle(live).slice(0,Math.max(0,live.length-1)).forEach(i=>document.querySelector(`.opt[data-i="${i}"]`).classList.add('disabled'));
}
function useHint(){
  if(!hasPremium()||hintUses>=2||locked) return;
  const live=liveWrongOptions(); if(!live.length) return;
  hintUses++; $('hintCount').textContent=Math.max(0,2-hintUses);
  document.querySelector(`.opt[data-i="${shuffle(live)[0]}"]`).classList.add('disabled');
  if(hintUses>=2) $('hintBtn').disabled=true;
}
function leaveGame(){
  if(!confirm(t('confirmLeave'))) return;
  clearInterval(timer); matchToken++;
  if(isTeam){ applyTeamResult(false,true); go('teamBattle'); }
  else if(pvp){ Cloud.pvpLeave(pvp.id); addScore(-10); stopPvp(); go('friends'); }
  else { addScore(-10); go('home'); }
  renderRating();
}
function sendSticker(s,fromOpp){
  if(pvp && !fromOpp) Cloud.pvpSticker(pvp.id,s);
  const el=$('stickerToast');
  el.innerHTML = ICON_PATHS[s] ? icon(s,96) : `<span style="font-size:72px">${esc(s)}</span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(sendSticker._t); sendSticker._t=setTimeout(()=>el.classList.remove('show'),900);
}

/* ---------- results ---------- */
function endMatch(){
  clearInterval(timer);
  if(isTeam) finishTeamMatch();
  else if(pvp){ pvp.state='ended'; Cloud.pvpProgress(pvp.id,meScore,roundLimit(),true); renderPvpResult(); }
  else finish1v1Match();
}
function closeResult(){
  $('resultOverlay').classList.remove('on');
  const wasPvp=!!pvp; stopPvp();
  go(isTeam?'teamBattle':(wasPvp?'friends':'home')); renderRating();
}
function deltaLine(d){
  if(d>0) return `<div class="delta-up">+${d} ${t('pointsEarned')}</div>`;
  if(d<0) return `<div class="delta-down">${d} ${t('pointsLost')}</div>`;
  return `<div class="muted" style="margin-top:6px">0 ${t('pointsEarned')}</div>`;
}
function resultFooter(prevLeague){
  const idx=leagueIdx(myScore());
  const promo = idx>prevLeague ? `<div style="color:var(--gold);font-weight:800;margin-top:8px">${t('newRecord')}</div>` : '';
  return `${promo}<div style="margin-top:12px;font-size:14px">${leagueBadge(myScore())} <span class="muted">· ${t('score')}: <b style="color:var(--text)">${fmtNum(myScore())}</b></span></div>
    <button class="btn primary" style="margin-top:18px" onclick="closeResult()">${t('continueBtn')}</button>`;
}
function renderPvpResult(){
  const prevLeague=leagueIdx(myScore()-matchDelta), waiting=!pvp.oppDone;
  const verdict = waiting ? t('waitingOpp') : (pvp.oppLeft || meScore>pvp.oppScore) ? t('youWon') : meScore<pvp.oppScore ? t('youLost') : t('draw');
  $('resultCard').innerHTML=`<h2>${verdict}</h2><div class="big">${meScore} : ${pvp.oppScore}</div>
    <div class="muted small">${t('you')} — ${esc(pvp.oppName)}${pvp.oppLeft?' · '+t('oppLeft'):''}</div>${deltaLine(matchDelta)}${resultFooter(prevLeague)}`;
  $('resultOverlay').classList.add('on');
}
function finish1v1Match(){
  const prevLeague=leagueIdx(myScore()-matchDelta);
  const verdict = meScore>aiScore ? t('youWon') : meScore<aiScore ? t('youLost') : t('draw');
  $('resultCard').innerHTML=`<h2>${verdict}</h2><div class="big">${meScore}/${roundLimit()}</div>
    <div class="muted small">${t('correctCount')} · ${t('opp')}: ${aiScore}</div>${deltaLine(matchDelta)}${resultFooter(prevLeague)}`;
  $('resultOverlay').classList.add('on');
}
// SIMULATION: stands in for the 7 other players until a real backend exists.
function simulateAITeamCorrect(rounds,rate){ let c=0; for(let i=0;i<rounds;i++){ if(Math.random()<rate) c++; } return c; }
function finishTeamMatch(){
  const mateRate=Math.min(0.85,0.45+0.04*leagueIdx(myScore()));
  let yourTotal=teamYouCorrect, oppTotal=0;
  for(let i=0;i<3;i++) yourTotal+=simulateAITeamCorrect(roundLimit(),mateRate);
  for(let i=0;i<4;i++) oppTotal+=simulateAITeamCorrect(roundLimit(),0.5);
  const won=yourTotal>oppTotal, prevLeague=leagueIdx(myScore()), d=applyTeamResult(won,false);
  $('resultCard').innerHTML=`<h2>${won?t('teamWon'):t('teamLost')}</h2><div class="muted small">${t('teamResultBoth')}</div>
    <div class="big" style="font-size:22px">${yourTotal} : ${oppTotal}</div><div class="muted small">${t('you')}: ${teamYouCorrect}/${roundLimit()}</div>
    ${deltaLine(d)}${resultFooter(prevLeague)}`;
  $('resultOverlay').classList.add('on');
}
function applyTeamResult(won,left){
  if(!profile) return 0;
  if(teamMode==='strangers'){ if(left) return addScore(-(teamYouWrong+10)); return won?addScore(teamYouCorrect):addScore(-teamYouWrong); }
  if(left) return addScore(-20);
  return won?addScore(10):addScore(-10);
}

/* ---------- rating ---------- */
function showTab(tb){ ['A','B','C'].forEach(x=>{ $('tab'+x).classList.toggle('on',tb===x); $('pane'+x).classList.toggle('on',tb===x); }); }
let ratingCache={};
function userRow(u,i,val){
  const me=profile && u.uid===profile.uid;
  return `<div class="lbrow${me?' me':''}" onclick="openUser('${esc(u.uid)}')"><div class="lbrank${i<3?' top':''}">${i+1}</div><div class="av">${avatarHtml(u)}</div>
    <div class="info"><b>${esc(u.name+' '+u.surname)}</b><span>${leagueName(leagueIdx(u.score))} · ${fmtNum(u.followers||0)} ${t('followersShort')}</span></div>
    <div class="lbscore">${fmtNum(val)}</div></div>`;
}
async function loadBoard(kind){
  const c=ratingCache[kind]; if(c && Date.now()-c.ts<30000) return c.rows;
  const idx=leagueIdx(myScore());
  const rows = kind==='month' ? await Cloud.topMonth(50) : kind==='all' ? await Cloud.topAllTime(50)
    : await Cloud.topLeague(LEAGUES[idx].min, LEAGUES[idx+1]?LEAGUES[idx+1].min:null, 50);
  ratingCache[kind]={rows,ts:Date.now()}; return rows;
}
async function renderBoards(){
  for(const [kind,el,field] of [['month','listA','monthScore'],['all','listC','score'],['league','listB','score']]){
    const box=$(el); if(!box.innerHTML) box.innerHTML='<div class="note">…</div>';
    try{
      const rows=await loadBoard(kind);
      box.innerHTML = rows.length ? rows.map((u,i)=>userRow(u,i,u[field])).join('') : `<div class="note">${t('ratingEmpty')}</div>`;
      if(kind==='month'){ const r=rows.findIndex(u=>u.uid===profile.uid); $('ratRank').textContent = r>=0 ? '#'+(r+1) : '50+'; }
    }catch(e){ console.warn(e); box.innerHTML=`<div class="note">${t('loadError')}</div>`; }
  }
}
function renderRating(){
  if(!profile) return;
  const online=Cloud.enabled, idx=leagueIdx(myScore()), next=LEAGUES[idx+1];
  ['listA','listB','listC'].forEach(id=>$(id).style.display=online?'flex':'none');
  ['noteA','noteB','noteC'].forEach(id=>$(id).textContent=online?'':t('localRatingNote'));
  if(!online) $('ratRank').textContent='#1'; else if($('rating').classList.contains('active')) renderBoards();
  $('ratName').textContent=profile.name+' '+profile.surname;
  $('ratId').textContent='ID: '+profile.id;
  $('ratScore').textContent=fmtNum(myScore());
  $('ratMonth').textContent=fmtNum(profile.monthKey===monthKeyNow()?(profile.monthScore||0):0);
  $('ratLeague').textContent=leagueName(idx); $('ratLeague2').textContent=leagueName(idx);
  $('ratLeagueBadge').style.background=LEAGUES[idx].col; $('ratLeagueBadge').innerHTML=icon('trophy',30);
  $('ratLeagueDesc').textContent = next ? `${fmtNum(myScore())} / ${fmtNum(next.min)} — ${t('nextLeague')}: ${leagueName(idx+1)}` : fmtNum(myScore())+' '+t('score');
  $('leagueProg').style.width = next ? Math.min(100,Math.round(100*(myScore()-LEAGUES[idx].min)/(next.min-LEAGUES[idx].min)))+'%' : '100%';
  setAv($('ratAv'),profile);
}

/* ---------- my profile ---------- */
function hasPremium(){ return !!(profile && profile.premium && profile.premium.active && Date.now()<profile.premium.expires); }
function renderProfile(){
  if(!profile) return;
  $('pfHandle').textContent=profile.name+' '+profile.surname;
  $('pfName').textContent=profile.name+' '+profile.surname;
  $('pfId').textContent='ID: '+profile.id+(profile.tgUsername?' · @'+profile.tgUsername:'');
  $('pfScore').textContent=fmtNum(myScore());
  $('pfFollowers').textContent=fmtNum(profile.followers||0);
  $('pfFollowing').textContent=fmtNum(profile.following||0);
  $('pfBadges').innerHTML=leagueBadge(myScore())+(hasPremium()?`<span class="badge gold">${icon('crown',14)} Premium</span>`:'');
  setAv($('pfAv'),profile); setAv($('meAv'),profile);
}
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
    img.onerror=()=>alert(t('badImage')); img.src=r.result;
  };
  r.readAsDataURL(f); e.target.value='';
});

/* ---------- other player's profile + follow ---------- */
async function openUser(uid){
  if(!Cloud.enabled) return;
  if(profile && uid===profile.uid){ go('profile'); return; }
  go('userProfile'); $('upContent').innerHTML='<div class="note">…</div>'; $('upTitle').textContent='';
  try{
    const [u,following]=await Promise.all([Cloud.getUser(uid,true),Cloud.isFollowing(uid)]);
    if(!u){ $('upContent').innerHTML=`<div class="note">${t('friendNotFound')}</div>`; return; }
    friendUsers[uid]=u; renderUserProfile(u,following);
  }catch(e){ $('upContent').innerHTML=`<div class="note">${cloudErrText(e)}</div>`; }
}
function friendStatus(uid){ const f=friendsState.find(x=>x.other===uid); return f ? (f.status==='accepted'?'friend':(f.incoming?'incoming':'pending')) : 'none'; }
function renderUserProfile(u,following){
  $('upTitle').textContent=u.name+' '+u.surname;
  const fs=friendStatus(u.uid);
  const friendBtn = fs==='friend' ? `<button class="btn primary sm" onclick="openChallenge('${u.uid}')">${icon('swords',16)} ${t('challengeBtn')}</button>`
    : fs==='incoming' ? `<button class="btn outline sm" onclick="acceptFriendOf('${u.uid}')">${t('accept')}</button>`
    : fs==='pending' ? `<button class="btn outline sm" disabled>${t('reqPendingShort')}</button>`
    : `<button class="btn outline sm" onclick="addFriendUid('${u.uid}')">${icon('userPlus',16)} ${t('addFriendBtn')}</button>`;
  $('upContent').innerHTML=`
    <div class="pfhead"><div class="av xl">${avatarHtml(u)}</div>
      <div class="pfstats"><div><b>${fmtNum(u.score)}</b><span>${t('score')}</span></div>
      <div><b id="upFollowers">${fmtNum(u.followers||0)}</b><span>${t('followers')}</span></div>
      <div><b>${fmtNum(u.following||0)}</b><span>${t('followingLbl')}</span></div></div></div>
    <div class="pfinfo"><div class="pfname">${esc(u.name+' '+u.surname)}</div><div class="muted small">ID: ${esc(u.id)}${u.tgUsername?' · @'+esc(u.tgUsername):''}</div>
      <div class="pfbadges">${leagueBadge(u.score)}</div></div>
    <div class="pfactions">
      <button class="btn ${following?'outline':'primary'}" id="followBtn" onclick="toggleFollow('${u.uid}',${following?1:0})">${following?icon('userCheck',18)+' '+t('followingBtn'):t('followBtn')}</button>
      ${friendBtn}
    </div>`;
}
async function toggleFollow(uid,isF){
  const btn=$('followBtn'); if(btn) btn.disabled=true;
  try{
    if(isF) await Cloud.unfollow(uid); else await Cloud.follow(uid);
    const u=await Cloud.getUser(uid,true); renderUserProfile(u,!isF);
    ratingCache={};
  }catch(e){ console.warn(e); toast(cloudErrText(e)); if(btn) btn.disabled=false; }
}

/* ---------- premium (not on sale yet) ---------- */
function priceLabel(n){ return n.toLocaleString('ru-RU').replace(/ /g,' ')+" so'm"; }
function renderPlans(){
  $('planList').innerHTML=PREMIUM_PLANS.map(p=>{
    const label=t('plan'+p.id.charAt(0).toUpperCase()+p.id.slice(1));
    const orig=p.orig?`<span class="porig">${priceLabel(p.orig)}</span>`:'';
    const badge=p.discount?`<span class="pbadge">-${p.discount}%</span>`:'';
    return `<div class="card planCard"><div class="pinfo"><div class="pname">${label}${badge}</div><div class="pprice">${orig}${priceLabel(p.price)}</div></div>
      <button class="btn primary sm" onclick="selectPlan('${p.id}')">${priceLabel(p.price)}</button></div>`;
  }).join('');
}
// Payments are not connected yet. When a gateway is ready, the SERVER must grant premium.
function selectPlan(){ openModal(`<div class="brandmark big" style="margin:0 auto 12px">${icon('crown',28)}</div><h2>${t('premiumSoonTitle')}</h2>
  <p class="muted" style="margin-top:6px">${t('premiumSoon')}</p><button class="btn primary" style="margin-top:16px" onclick="closeModal()">OK</button>`); }

/* ---------- friends / search ---------- */
function inviteFriends(){
  const link=location.href.split('#')[0].split('?')[0];
  const text = Cloud.enabled && profile ? t('inviteText')+profile.id+'\n'+link : link;
  const fallback=()=>prompt(t('copyManually'),text);
  if(navigator.share){ navigator.share({title:'DUELUM',text}).catch(()=>{}); return; }
  if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(()=>toast(t('copied')),fallback); else fallback();
}
let searchTimer=null, searchSeq=0;
function onSearchInput(v){
  clearTimeout(searchTimer); const q=v.trim();
  if(!q){ $('searchResults').innerHTML=''; return; }
  if(!Cloud.enabled){ $('searchResults').innerHTML=`<div class="note">${t('friendsLocalNote')}</div>`; return; }
  searchTimer=setTimeout(()=>runSearch(q),350);
}
async function runSearch(q){
  const seq=++searchSeq, box=$('searchResults');
  if(!/^\d{8}$/.test(q) && q.length<2) return;
  box.innerHTML='<div class="note">…</div>';
  try{
    const rows = /^\d{8}$/.test(q) ? [await Cloud.findByPublicId(q)].filter(Boolean) : await Cloud.searchByName(q);
    if(seq!==searchSeq) return;
    rows.forEach(u=>friendUsers[u.uid]=u);
    box.innerHTML = rows.length ? `<div class="urows">${rows.map(u=>`<div class="urow" onclick="openUser('${u.uid}')"><div class="av">${avatarHtml(u)}</div>
      <div class="info"><b>${esc(u.name+' '+u.surname)}</b><span>ID ${esc(u.id)} · ${leagueName(leagueIdx(u.score))} · ${fmtNum(u.followers||0)} ${t('followersShort')}</span></div>
      ${icon('chevron',18)}</div>`).join('')}</div>` : `<div class="note">${t('friendNotFound')}</div>`;
  }catch(e){ console.warn(e); if(seq===searchSeq) box.innerHTML=`<div class="note">${cloudErrText(e)}</div>`; }
}
async function addFriendUid(uid){
  try{ const r=await Cloud.sendFriendRequest(uid); toast({self:t('friendSelf'),sent:t('reqSent'),pending:t('reqPending'),accepted:t('reqAccepted'),already:t('alreadyFriends')}[r]); setTimeout(()=>openUser(uid),400); }
  catch(e){ toast(cloudErrText(e)); }
}
async function acceptFriendOf(uid){ const f=friendsState.find(x=>x.other===uid); if(f){ await acceptFriend(f.fid); setTimeout(()=>openUser(uid),400); } }

/* ---------- 4v4 (local demo) ---------- */
function teamBack(){
  if(teamState==='hub') go('friends');
  else if(teamState==='friendsMenu'){ teamState='hub'; renderTeamContent(); }
  else if(teamState==='create'||teamState==='join'){ teamState='friendsMenu'; renderTeamContent(); }
  else if(teamState==='lobby'){ teamState = teamMode==='friends' ? 'friendsMenu' : 'hub'; renderTeamContent(); }
  else { teamState='hub'; renderTeamContent(); }
}
function modeCard(ic,title,sub,onclick,extra){ return `<div class="card modeCard ${extra||''}" ${onclick?`onclick="${onclick}"`:''}>${icon(ic,24)}<div><b>${title}</b>${sub?`<span>${sub}</span>`:''}</div></div>`; }
function renderTeamContent(){
  const el=$('teamContent'); if(!el) return;
  if(teamState==='hub'){
    const lockedS=!canPlayStrangers(myScore());
    el.innerHTML=modeCard('users',t('withFriends'),t('createRoom')+' / '+t('joinRoom'),"teamMode='friends';teamState='friendsMenu';renderTeamContent()")
      +modeCard('globe',t('withStrangers'),lockedS?t('strangersLocked'):t('startBattle'),lockedS?'':"teamMode='strangers';currentRoomId=null;currentRoomName=null;teamState='lobby';renderTeamContent()",lockedS?'locked':'');
  } else if(teamState==='friendsMenu'){
    el.innerHTML=modeCard('plus',t('createRoom'),'',"teamState='create';renderTeamContent()")+modeCard('lock',t('joinRoom'),'',"teamState='join';renderTeamContent()")+`<div class="note">${t('localOnlyNote')}</div>`;
  } else if(teamState==='create'){
    el.innerHTML=`<div class="stack" style="max-width:none"><input class="field" id="roomNameInput" maxlength="30" placeholder="${t('roomName')}">
      <input class="field" id="roomPassInput" maxlength="30" placeholder="${t('roomPassOpt')}"><button class="btn primary" onclick="createRoom()">${t('createRoom')}</button></div>`;
  } else if(teamState==='join'){
    el.innerHTML=`<div class="stack" style="max-width:none"><input class="field" id="roomIdInput" maxlength="12" inputmode="numeric" placeholder="${t('roomIdLbl')}" oninput="this.value=this.value.replace(/\\D/g,'')">
      <div class="err" id="joinErr"></div><button class="btn primary" onclick="findRoom()">${t('findRoom')}</button></div>`;
  } else if(teamState==='lobby') renderLobby(el);
}
function createRoom(){
  const name=($('roomNameInput').value.trim()||t('defaultRoomName')), pass=$('roomPassInput').value.trim();
  const rooms=Store.getRooms(); let id; do { id=genRoomId12(); } while(rooms[id]);
  rooms[id]={name,pass,hostId:profile.id,ts:Date.now()}; Store.saveRooms(rooms);
  currentRoomId=id; currentRoomName=name; teamMode='friends'; alert(t('roomCreated')+id); teamState='lobby'; renderTeamContent();
}
function findRoom(){
  const id=$('roomIdInput').value.trim(), errEl=$('joinErr');
  if(id.length!==12){ errEl.textContent=t('roomIdLen'); return; }
  const room=Store.getRooms()[id]; if(!room){ errEl.textContent=t('roomNotFound'); return; }
  if(room.pass){ const p=prompt(t('enterPassword')); if(p===null) return; if(p!==room.pass){ errEl.textContent=t('wrongPass'); return; } }
  currentRoomId=id; currentRoomName=room.name; teamMode='friends'; alert(t('joinedRoom')); teamState='lobby'; renderTeamContent();
}
function renderLobby(el){
  const opts=subjects.map(s=>`<option value="${s.k}">${esc(s.name)}</option>`).join('')+`<option value="logic">${t('logicTag')}</option>`;
  const info = teamMode==='friends' ? `<div class="note" style="padding:0 0 8px">${t('roomIdLbl')}: <b>${esc(currentRoomId||'—')}</b>${currentRoomName?(' · '+esc(currentRoomName)):''}</div>` : '';
  // PLACEHOLDER: real voice chat needs a WebRTC provider + signaling server.
  el.innerHTML=`${info}<div class="stack" style="max-width:none"><div class="muted small">${t('pickSubjectTeam')}</div>
    <select id="teamSubjSelect" class="field">${opts}</select><div class="muted small">${t('teamRulesNote')}</div>
    <button class="btn primary" onclick="beginTeamMatch($('teamSubjSelect').value)">${t('startBattle')}</button></div>
    <button class="micBtn" title="${t('micLabel')}" onclick="toast(t('micLabel'))">${icon('mic',22)}</button>`;
}
function beginTeamMatch(key){
  isTeam=true; curSubj=key; isLogic=(key==='logic'); qi=0; teamYouCorrect=0; teamYouWrong=0;
  matchQs=buildMatchQuestions(key,ROUND_LIMIT_TEAM); resetHelpers();
  document.querySelector('.vsrow').style.display='none'; document.querySelector('.bar').style.display='none';
  $('stickerRow').innerHTML=''; go('duel'); matchToken++; loadQ();
}

/* ---------- menu, bell ---------- */
function toggleMenu(open){ $('menuOverlay').classList.toggle('on',open); }
function toggleSub(id){ const el=$(id); document.querySelectorAll('.msub').forEach(m=>{ if(m.id!==id) m.classList.remove('on'); }); el.classList.toggle('on'); }
function applyLinks(){ document.querySelectorAll('[data-link]').forEach(a=>{ a.href=TG.links[a.dataset.link]||'#'; }); $('tgChannelBtn').href=TG.links.channel; }
const BELL_EVERY=12*3600*1000;   // the subscribe reminders come back every 12 hours
function bellItems(){
  const items=[];
  const reqs=friendsState.filter(f=>f.incoming).length;
  if(incomingCh.length) items.push({ic:'swords',col:'#e5484d',title:t('pendingChallenges'),sub:incomingCh.length+' ',on:"closeBell();go('friends')"});
  if(reqs) items.push({ic:'userPlus',col:'#6c4bf4',title:t('incomingReqs'),sub:reqs+' ',on:"closeBell();go('friends')"});
  if(Cloud.enabled && profile && !profile.tgUsername && tgEnabled()) items.push({ic:'send',col:'#229ed9',title:t('tgLinkTitle'),sub:t('tgLinkSub'),on:"closeBell();startTgLink()"});
  items.push({ic:'megaphone',col:'#229ed9',title:t('bellChannel'),sub:t('bellChannelSub'),href:TG.links.channel});
  items.push({ic:'play',col:'#ff0000',title:t('bellYoutube'),sub:t('bellYoutubeSub'),href:TG.links.youtube});
  items.push({ic:'bot',col:'#2aabee',title:t('bellBot'),sub:t('bellBotSub'),href:TG.links.bot});
  return items;
}
function openBell(){
  $('bellList').innerHTML=bellItems().map(it=>{
    const inner=`<div class="bi" style="background:${it.col}">${icon(it.ic,20)}</div><div class="bt"><b>${it.title}</b><span>${it.sub}</span></div>${icon('chevron',18)}`;
    return it.href ? `<a class="bellitem" href="${it.href}" target="_blank" rel="noopener">${inner}</a>` : `<div class="bellitem" onclick="${it.on}" style="cursor:pointer">${inner}</div>`;
  }).join('');
  $('bellOverlay').classList.add('on'); Store.setBellSeen(Date.now()); updateBellDot();
}
function closeBell(){ $('bellOverlay').classList.remove('on'); }
function updateBellDot(){
  const due = Date.now()-Store.getBellSeen()>BELL_EVERY;
  const pending = incomingCh.length || friendsState.some(f=>f.incoming);
  $('bellDot').classList.toggle('on', !!(due||pending));
}
setInterval(updateBellDot,60000);

/* ---------- password / logout ---------- */
async function savePassword(){
  const inp=$('newPassInput'), v=inp.value; if(!profile) return;
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

/* ---------- phone input ---------- */
let selectedCountry={iso:'UZ',dial:'998',name:"O'zbekiston"};
function setCountry(c){ selectedCountry={iso:c[0],dial:c[1],name:c[2]}; $('dialBtn').textContent=c[0]+' +'+c[1]; $('f_phone').placeholder=c[2]; updatePhonePreview(); }
function openCountryPicker(){ $('countrySearch').value=''; renderCountryList(''); $('countryOverlay').classList.add('on'); }
function closeCountryPicker(){ $('countryOverlay').classList.remove('on'); }
function renderCountryList(q){
  q=(q||'').toLowerCase().replace('+','').trim();
  const list=COUNTRIES.filter(c=>!q || c[2].toLowerCase().includes(q) || c[1].startsWith(q) || c[0].toLowerCase()===q);
  $('countryList').innerHTML=list.length?list.map(c=>`<div class="countryRow" onclick="pickCountry('${c[0]}')"><span class="cc">${c[0]}</span>${esc(c[2])}<span class="code">+${c[1]}</span></div>`).join(''):'<div class="note">—</div>';
}
function pickCountry(iso){ const c=COUNTRIES.find(x=>x[0]===iso); if(!c) return; setCountry(c); closeCountryPicker(); $('f_phone').focus(); }
function groupDigits(d){ const sizes=selectedCountry.dial==='998'?[2,3,2,2,3]:[3,3,2,2,2]; const parts=[]; let i=0; for(const s of sizes){ if(i>=d.length) break; parts.push(d.slice(i,i+s)); i+=s; } return parts.join(' '); }
function onPhoneInput(el){
  let v=el.value.trim();
  if(v.startsWith('+')){
    const digits=v.slice(1).replace(/\D/g,'');
    const matches=COUNTRIES.filter(c=>digits.startsWith(c[1])).sort((a,b)=>b[1].length-a[1].length);
    const match=matches.find(c=>c[0]===selectedCountry.iso && c[1]===matches[0][1]) || matches[0];
    if(match){ setCountry(match); v=digits.slice(match[1].length); }
    else { el.value = digits.length<4 ? '+'+digits : digits.slice(0,12); return; }
  }
  let d=v.replace(/\D/g,'');
  // typed the country code without "+" (e.g. 998901234567) -> strip it
  if(d.length>9 && d.startsWith(selectedCountry.dial) && selectedCountry.dial==='998') d=d.slice(3);
  el.value=groupDigits(d.slice(0,12)); updatePhonePreview();
}
function localDigits(){ return $('f_phone').value.replace(/\D/g,''); }
function updatePhonePreview(){ const d=localDigits(); $('phonePreview').textContent = d ? (t('phoneWillBe')+' +'+selectedCountry.dial+' '+groupDigits(d)) : ''; }
function togglePw(id,btn){ const el=$(id), show=el.type==='password'; el.type=show?'text':'password'; btn.innerHTML=icon(show?'eyeOff':'eye',20); }
function setPwVisible(id,visible){ const el=$(id), btn=el.nextElementSibling; el.type=visible?'text':'password'; if(btn) btn.innerHTML=icon(visible?'eyeOff':'eye',20); }

/* ---------- auth ---------- */
function selectLang(l){ lang=l; Store.setLang(l); applyLang(); if($('lang').classList.contains('active')) go('authChoice'); }
function openAuth(mode){
  authMode=mode; $('authErr').textContent='';
  ['f_name','f_surname','f_phone','f_pass','f_pass2'].forEach(id=>$(id).value='');
  setPwVisible('f_pass',false); setPwVisible('f_pass2',false);
  setCountry(['UZ','998',"O'zbekiston"]); applyLang(); go('authForm');
}
function submitAuth(){
  const name=$('f_name').value.trim(), surname=$('f_surname').value.trim(), local=localDigits(), pass=$('f_pass').value, pass2=$('f_pass2').value, errEl=$('authErr');
  const digits=selectedCountry.dial+local;
  if(authMode==='register'){
    if(!name||!surname||!local||!pass||!pass2){ errEl.textContent=t('fillAll'); return; }
    if(local.length<7){ errEl.textContent=t('badPhone'); return; }
    if(pass.length<8){ errEl.textContent=t('passTooShort'); return; }
    if(pass!==pass2){ setPwVisible('f_pass',true); setPwVisible('f_pass2',true); errEl.textContent=t('passMismatch'); return; }
    if(Cloud.enabled){
      pendingReg={name,surname,digits,local,dial:selectedCountry.dial,pass};
      if(tgEnabled()){ tgMode='register'; openTgVerify(); return; }
      cloudAuth(()=>Cloud.register(pendingReg)); return;
    }
    const old=Store.getProfile();
    if(old && String(old.phone||'').replace(/\D/g,'')===digits && !confirm(t('overwriteAcc'))) return;
    profile={name,surname,phone:'+'+digits,pass,id:String(Math.floor(10000000+Math.random()*90000000)),avatar:null,score:0,premium:null,loggedIn:true,created:Date.now()};
    saveProfile(); go('home'); applyLang(); return;
  }
  if(!local||!pass){ errEl.textContent=t('fillAll'); return; }
  if(Cloud.enabled){ cloudAuth(()=>Cloud.login(local,selectedCountry.dial,pass)); return; }
  const saved=Store.getProfile();
  if(!saved){ errEl.textContent=t('noAcc'); return; }
  if(String(saved.phone||'').replace(/\D/g,'').slice(-local.length)!==local || saved.pass!==pass){ errEl.textContent=t('wrongLogin'); return; }
  profile=saved; profile.loggedIn=true; saveProfile(); go('home'); applyLang();
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
async function cloudAuth(fn,errBox){
  const btn=$('authSubmit'), errEl=errBox||$('authErr');
  btn.disabled=true; errEl.textContent='…';
  try{ profile=await fn(); errEl.textContent=''; pendingReg=null; startCloud(); go('home'); applyLang(); return true; }
  catch(e){ console.warn(e); errEl.textContent=cloudErrText(e); return false; }
  finally{ btn.disabled=false; }
}

/* ---------- Telegram: confirm + mandatory channel subscription ---------- */
function tgEnabled(){ return typeof TG!=='undefined' && !!TG.loginWidget && !!TG.botUsername && !!TG.apiUrl; }
function tgApi(path,body,ms){
  return Promise.race([
    fetch(TG.apiUrl+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined}).then(r=>r.json()),
    new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms||45000))
  ]);
}
function warmTgServer(){ if(typeof TG!=='undefined' && TG.apiUrl) fetch(TG.apiUrl+'/health').catch(()=>{}); } // wakes the free server early
function openTgVerify(){
  $('tgErr').textContent=''; go('tgVerify');
  const box=$('tgWidget'); box.innerHTML='';
  const s=document.createElement('script');
  s.async=true; s.src='https://telegram.org/js/telegram-widget.js?22';
  s.setAttribute('data-telegram-login',TG.botUsername); s.setAttribute('data-size','large');
  s.setAttribute('data-radius','12'); s.setAttribute('data-request-access','write'); s.setAttribute('data-onauth','onTelegramAuth(user)');
  box.appendChild(s);
  warmTgServer();
}
function startTgLink(){ tgMode='link'; openTgVerify(); }
async function onTelegramAuth(user){
  const err=$('tgErr'); err.textContent=t('tgChecking');
  let res;
  try{ res=await tgApi('/api/verify',{auth:user}); }
  catch(e){
    // server unreachable: don't lock people out — continue without the check
    err.innerHTML=t('tgServerDown')+` <button class="btn outline sm" style="margin:8px auto 0" onclick="finishTgStep(null)">${t('continueBtn')}</button>`; return;
  }
  if(!res || !res.ok){ err.textContent=t('tgAuthFail'); return; }
  if(!res.subscribed){ err.innerHTML=t('tgNotSubscribed')+` <button class="btn outline sm" style="margin:8px auto 0" onclick="onTelegramAuth(window._tgUser)">${t('tgRecheck')}</button>`; window._tgUser=user; return; }
  finishTgStep(user);
}
async function finishTgStep(user){
  const tg = user ? {id:user.id, username:user.username||''} : null;
  if(tgMode==='link'){
    if(tg){ try{ await Cloud.linkTelegram(tg); profile.tgUsername=tg.username; profile.tgId=tg.id; tgApi('/api/notify',{auth:user,event:'link',name:profile.name,surname:profile.surname,publicId:profile.id},20000).catch(()=>{}); toast(t('savedMsg')); }catch(e){ toast(cloudErrText(e)); } }
    updateTgBanner(); go('home'); return;
  }
  if(!pendingReg){ go('authForm'); return; }
  const reg=pendingReg;
  const ok=await cloudAuth(()=>Cloud.register(Object.assign({},reg,{tg})),$('tgErr'));
  if(ok && user) tgApi('/api/notify',{auth:user,event:'register',name:profile.name,surname:profile.surname,publicId:profile.id,country:'+'+reg.dial},20000).catch(()=>{});
}
function updateTgBanner(){ const show=Cloud.enabled && profile && !profile.tgUsername && tgEnabled(); $('tgBanner').style.display=show?'flex':'none'; }

/* ---------- calculator (own arithmetic, no eval) ---------- */
let calcCur='0', calcPrev=null, calcOp=null, calcResetNext=false;
function calcFmt(n){ if(!isFinite(n)) return 'Error'; return String(parseFloat(n.toPrecision(12))); }
function calcRender(){ $('calcDisplay').textContent=calcCur; }
function calcDigit(d){
  if(calcCur==='Error') calcClear();
  if(calcResetNext){ calcCur=(d==='.')?'0.':d; calcResetNext=false; }
  else if(d==='.'){ if(!calcCur.includes('.')) calcCur+='.'; }
  else if(calcCur.replace(/[-.]/g,'').length>=15) return;
  else calcCur=(calcCur==='0')?d:(calcCur==='-0'?'-'+d:calcCur+d);
  calcRender();
}
function calcMath(a,b,op){ a=parseFloat(a); b=parseFloat(b); if(op==='+') return a+b; if(op==='−') return a-b; if(op==='×') return a*b; if(op==='÷') return b===0?NaN:a/b; return b; }
function calcOperator(op){ if(calcCur==='Error') return; if(calcOp && !calcResetNext) calcCur=calcFmt(calcMath(calcPrev,calcCur,calcOp)); calcPrev=calcCur; calcOp=op; calcResetNext=true; calcRender(); }
function calcEquals(){ if(calcOp==null||calcCur==='Error') return; calcCur=calcFmt(calcMath(calcPrev,calcCur,calcOp)); calcOp=null; calcPrev=null; calcResetNext=true; calcRender(); }
function calcClear(){ calcCur='0'; calcPrev=null; calcOp=null; calcResetNext=false; calcRender(); }
function calcSign(){ if(calcCur==='Error') return; calcCur=calcCur.startsWith('-')?calcCur.slice(1):('-'+calcCur); calcResetNext=false; calcRender(); }
function calcPercent(){ if(calcCur==='Error') return; calcCur=calcFmt(parseFloat(calcCur)/100); calcResetNext=true; calcRender(); }

/* ---------- ONLINE: friends, requests, friend duels ---------- */
let friendsState=[], friendUsers={}, incomingCh=[], unsubFriends=null, unsubIncoming=null, shownChallengeId=null;
function startCloud(){
  stopCloudWatchers();
  Cloud.onProfile(()=>{ renderProfile(); updateTgBanner(); if($('rating').classList.contains('active')) renderRating(); });
  unsubFriends=Cloud.watchFriendships(async list=>{
    friendsState=list;
    await Promise.all(list.map(async f=>{ try{ friendUsers[f.other]=await Cloud.getUser(f.other); }catch(e){} }));
    updateFriendsBadge(); if($('friends').classList.contains('active')) renderFriends();
  });
  unsubIncoming=Cloud.watchIncoming(list=>{
    incomingCh=list; updateFriendsBadge();
    if(shownChallengeId && !list.some(c=>c.id===shownChallengeId)) closeModal();
    if($('friends').classList.contains('active')) renderFriends();
    showPendingChallenge();
  });
  clearInterval(startCloud._t); startCloud._t=setInterval(()=>{
    const before=incomingCh.length; incomingCh=incomingCh.filter(c=>Date.now()-Cloud.ms(c.createdAt)<60000);
    if(shownChallengeId && !incomingCh.some(c=>c.id===shownChallengeId)) closeModal();
    if(before!==incomingCh.length){ updateFriendsBadge(); if($('friends').classList.contains('active')) renderFriends(); }
  },5000);
  updateTgBanner();
}
function stopCloudWatchers(){
  if(unsubFriends) unsubFriends(); if(unsubIncoming) unsubIncoming();
  unsubFriends=unsubIncoming=null; friendsState=[]; incomingCh=[]; clearInterval(startCloud._t); updateFriendsBadge(); closeModal();
}
function updateFriendsBadge(){ const n=friendsState.filter(f=>f.incoming).length+incomingCh.length; const b=$('friendsBadge'); b.textContent=n; b.style.display=n?'flex':'none'; updateBellDot(); }
function userLabel(u){ return u?esc(u.name+' '+u.surname):'…'; }
function personRow(u,uid,sub,actions){ return `<div class="urow"><div class="av" onclick="openUser('${uid}')">${avatarHtml(u)}</div><div class="info" onclick="openUser('${uid}')"><b>${userLabel(u)}</b><span>${sub}</span></div><div class="actions">${actions}</div></div>`; }
function renderFriends(){
  const box=$('friendsCloud'); if(!box) return;
  if(!Cloud.enabled){ box.innerHTML=`<div class="note">${t('friendsLocalNote')}</div>`; $('noFriendsNote').style.display='none'; return; }
  $('noFriendsNote').style.display='none';
  const acc=friendsState.filter(f=>f.status==='accepted'), inc=friendsState.filter(f=>f.incoming), out=friendsState.filter(f=>f.status==='pending'&&!f.incoming);
  let h='';
  if(incomingCh.length) h+=`<div class="secTitle">${t('pendingChallenges')}</div><div class="urows">`+incomingCh.map(c=>personRow({name:c.fromName},c.from,subjName(c.subj),
    `<button class="pill soft" onclick="answerChallenge('${c.id}',false)">${icon('x',16)}</button><button class="pill" onclick="answerChallenge('${c.id}',true)">${t('accept')}</button>`)).join('')+'</div>';
  if(inc.length) h+=`<div class="secTitle">${t('incomingReqs')}</div><div class="urows">`+inc.map(f=>{ const u=friendUsers[f.other]; return personRow(u,f.other,'ID '+(u?esc(u.id):''),
    `<button class="pill soft" onclick="removeFriend('${f.fid}',false)">${t('decline')}</button><button class="pill" onclick="acceptFriend('${f.fid}')">${t('accept')}</button>`); }).join('')+'</div>';
  h+=`<div class="secTitle">${t('myFriends')} · ${acc.length}</div><div class="urows">`;
  h+= acc.length ? acc.sort((a,b)=>((friendUsers[b.other]||{}).score||0)-((friendUsers[a.other]||{}).score||0)).map(f=>{ const u=friendUsers[f.other];
      return personRow(u,f.other,u?leagueName(leagueIdx(u.score))+' · '+fmtNum(u.score)+' '+t('score'):'',`<button class="pill" onclick="openChallenge('${f.other}')">${icon('swords',16)}</button>`); }).join('')
    : `<div class="note" style="padding:6px 0">${t('noFriends')}</div>`;
  h+='</div>';
  if(out.length) h+=`<div class="secTitle">${t('outgoingReqs')}</div><div class="urows">`+out.map(f=>{ const u=friendUsers[f.other]; return personRow(u,f.other,t('waitingLbl'),`<button class="pill soft" onclick="removeFriend('${f.fid}',false)">${t('cancel')}</button>`); }).join('')+'</div>';
  box.innerHTML=h;
}
async function acceptFriend(fid){ try{ await Cloud.acceptFriend(fid); }catch(e){ toast(cloudErrText(e)); } }
async function removeFriend(fid,confirmIt){ if(confirmIt && !confirm(t('confirmRemove'))) return; try{ await Cloud.removeFriend(fid); }catch(e){ toast(cloudErrText(e)); } }
function openModal(html){ $('modalCard').innerHTML=html; $('modalOverlay').classList.add('on'); }
function closeModal(){ $('modalOverlay').classList.remove('on'); shownChallengeId=null; }
function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),2600); }
function openChallenge(uid){
  const u=friendUsers[uid]; if(!u) return;
  const opts=subjects.map(s=>`<option value="${s.k}">${esc(s.name)}</option>`).join('')+`<option value="logic">${t('logicTag')}</option>`;
  openModal(`<h2>${t('challengeTitle')}</h2><div class="muted">${userLabel(u)}</div><select id="chSubj" class="field">${opts}</select>
    <div class="row2"><button class="btn outline" onclick="closeModal()">${t('cancel')}</button><button class="btn primary" onclick="sendChallenge('${uid}')">${t('sendChallenge')}</button></div>`);
}
async function sendChallenge(uid){
  const u=friendUsers[uid], subj=$('chSubj').value; closeModal();
  curSubj=subj; const seed=makeSeed(subj,ROUND_LIMIT_1V1);
  let id; try{ id=await Cloud.createChallenge(uid,u.name+' '+u.surname,profile.name+' '+profile.surname,subj,seed); }catch(e){ alert(cloudErrText(e)); return; }
  stopPvp();
  pvp={id,opp:uid,oppName:u.name,oppUser:u,state:'waiting',oppScore:0,oppAnswered:0,oppDone:false,oppLeft:false,subj,seed};
  pvp.unsub=Cloud.watchChallenge(id,onChallengeUpdate);
  let left=60; $('searchTitle').textContent=u.name+' '+t('waitingFor'); $('searchTimer').textContent=left; go('searching');
  searchInterval=setInterval(()=>{ left--; $('searchTimer').textContent=Math.max(0,left);
    if(left<=0 && pvp && pvp.state==='waiting'){ Cloud.setChallengeStatus(id,'expired'); stopPvp(); alert(u.name+' '+t('challengeExpired')); go('friends'); } },1000);
}
function showPendingChallenge(){
  if(!Cloud.enabled || !incomingCh.length || shownChallengeId) return;
  const act=document.querySelector('.screen.active'); if(!act || ['duel','searching','authForm','tgVerify'].includes(act.id)) return;
  const c=incomingCh[0]; shownChallengeId=c.id;
  openModal(`<div class="brandmark big" style="margin:0 auto 12px">${icon('swords',28)}</div><h2>${esc(c.fromName)}</h2><div class="muted">${t('incomingChallenge')}</div>
    <div class="tag" style="margin:12px auto 0">${esc(subjName(c.subj))}</div>
    <div class="row2"><button class="btn outline" onclick="answerChallenge('${c.id}',false)">${t('decline')}</button><button class="btn primary" onclick="answerChallenge('${c.id}',true)">${t('accept')}</button></div>`);
}
async function answerChallenge(id,accept){
  const c=incomingCh.find(x=>x.id===id); closeModal();
  incomingCh=incomingCh.filter(x=>x.id!==id); updateFriendsBadge();
  try{ await Cloud.respondChallenge(id,accept); }catch(e){ alert(cloudErrText(e)); return; }
  if(!accept||!c){ if($('friends').classList.contains('active')) renderFriends(); return; }
  stopPvp();
  pvp={id,opp:c.from,oppName:(c.fromName||'').split(' ')[0],oppUser:friendUsers[c.from],state:'playing',oppScore:0,oppAnswered:0,oppDone:false,oppLeft:false,subj:c.subj,seed:c.qs};
  pvp.unsub=Cloud.watchChallenge(id,onChallengeUpdate);
  curSubj=c.subj; beginDuel(c.subj,seedToQs(c.subj,c.qs));
}
function onChallengeUpdate(ch){
  if(!pvp || ch.id!==pvp.id) return;
  if(pvp.state==='waiting'){
    if(ch.status==='accepted'){ pvp.state='playing'; curSubj=pvp.subj; beginDuel(pvp.subj,seedToQs(pvp.subj,pvp.seed)); }
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
  if(st && st.t!==pvp.lastStk){ pvp.lastStk=st.t; if(pvp.state==='playing' && Date.now()-st.t<10000) sendSticker(st.e,true); }
  if(pvp.state==='ended' && $('resultOverlay').classList.contains('on')) renderPvpResult();
}
function stopPvp(){ if(pvp && pvp.unsub) pvp.unsub(); pvp=null; }

/* ---------- swipe ---------- */
let tsx=0,tsy=0;
$('app').addEventListener('touchstart',e=>{ tsx=e.touches[0].clientX; tsy=e.touches[0].clientY; },{passive:true});
$('app').addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tsx, dy=e.changedTouches[0].clientY-tsy;
  if(Math.abs(dy)>40||Math.abs(dx)<80) return;
  const a=document.querySelector('.screen.active'); if(a && dx<0 && a.id==='duel') leaveGame();
},{passive:true});

/* ---------- boot ---------- */
function boot(){
  hydrateIcons(); applyThemeIcons(); applyLinks();
  const savedLang=Store.getLang(); if(savedLang && I18N[savedLang]) lang=savedLang;
  buildGrid(); warmTgServer();
  const afterAuth=()=>{
    if(profile && profile.loggedIn){ go('home'); applyLang(); }
    else if(savedLang){ go('authChoice'); applyLang(); }
    else { go('lang'); applyLang(); }
    updateBellDot();
  };
  if(!Cloud.enabled){ profile=Store.getProfile(); afterAuth(); return; }
  $('bootMsg').textContent=t('bootLoading'); $('bootRetry').style.display='none'; go('boot');
  const attempt=n=>Cloud.restore().then(p=>{ profile=p; if(p) startCloud(); afterAuth(); })
    .catch(e=>{ console.warn('[boot]',e); if(n<1){ $('bootMsg').textContent=t('bootLoading'); return attempt(n+1); } $('bootMsg').textContent=cloudErrText(e); $('bootRetry').style.display=''; });
  attempt(0);
}
boot();
