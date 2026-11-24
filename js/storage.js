// storage.js — the ONLY place the app (app.js) goes through to save data.
// LOCAL mode: localStorage (below). ONLINE mode: forwards to js/cloud.js (Firebase).
//
// Right now it uses the browser's localStorage, which is free and needs
// no server at all — perfect for getting started or for a single-device demo.
// Its limits: data stays on one device/browser only, so a real shared
// leaderboard or 4v4 matchmaking across different people's phones needs a
// real backend.
//
// UPGRADE PATH (when you're ready for real multi-device accounts & a shared
// leaderboard), both have generous free tiers before you'd ever need to pay:
//   • Firebase (free "Spark" plan): Authentication + Firestore database.
//   • Supabase (free tier): Postgres database + Auth, open-source alternative.
// To switch: turn the functions below into `async` functions that call the
// provider's SDK instead of localStorage, and add `await` to their callers
// in app.js (search for `Store.`). No other file needs to change.
// When your traffic grows past the free tier, both providers let you move to
// a paid plan with no code changes — just a billing upgrade in their console.
//
// Every call is wrapped in try/catch: some browsers (Safari private mode,
// locked-down school devices) throw on localStorage access, and a full
// storage quota throws on write. The app keeps working in memory instead of
// crashing; set() returns false so callers can warn the user if they want.

const Store = (function(){
  const KEYS = { profile:'duel_profile_v2', lang:'duel_lang', rooms:'duel_rooms' };
  const mem = {}; // in-memory fallback when localStorage is unavailable

  function get(k){
    try { const v = localStorage.getItem(k); return v === null ? (k in mem ? mem[k] : null) : v; }
    catch(e){ return k in mem ? mem[k] : null; }
  }
  function set(k, v){
    mem[k] = v;
    try { localStorage.setItem(k, v); return true; }
    catch(e){ console.warn('[Store] could not persist', k, e); return false; }
  }
  function getJSON(k, fallback){
    try { const v = get(k); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  }

  // ONLINE mode (js/cloud.js, when FIREBASE_CONFIG is set): the profile lives
  // in Firestore. Nothing about the account is written to localStorage then —
  // Firebase Auth remembers the login by itself.
  const online = () => typeof Cloud !== 'undefined' && Cloud.enabled;
  const SEEN_CAP = 1500;

  return {
    getProfile(){ return online() ? null : getJSON(KEYS.profile, null); },
    setProfile(p){
      if(online()){ Cloud.saveProfile(p); return true; }
      return set(KEYS.profile, JSON.stringify(p));
    },
    // Called after every score change with the delta that was applied to p.score.
    addScore(p, delta, extra){
      if(online()){ Cloud.addScore(p, delta, extra); return true; }
      return set(KEYS.profile, JSON.stringify(p));
    },
    getLang(){ return get(KEYS.lang); },
    setLang(l){ return set(KEYS.lang, l); },
    // Questions this player has already seen, per subject. Kept on this device AND,
    // when online, in the player's account (Firestore seen/{uid}) so other devices know too.
    getSeen(user,subj){ return new Set(getJSON('duel_seen_'+user+'_'+subj, [])); },
    addSeen(user,subj,id){
      const k='duel_seen_'+user+'_'+subj, arr=getJSON(k, []);
      if(arr.includes(id)) return; arr.push(id);
      const trimmed=arr.length>SEEN_CAP; const keep=arr.slice(-SEEN_CAP);   // cap: oldest ids are forgotten first
      set(k, JSON.stringify(keep));
      if(online()) Cloud.seenAdd(subj, id, trimmed ? keep : null);
    },
    clearSeen(user,subj){ set('duel_seen_'+user+'_'+subj,'[]'); if(online()) Cloud.seenClear(subj); },
    // merge what the account remembers into this device; returns subjects this device knew more about
    mergeSeen(user,cloud){
      const behind={};
      Object.keys(cloud||{}).forEach(subj=>{ if(!Array.isArray(cloud[subj])) return;
        const k='duel_seen_'+user+'_'+subj, local=getJSON(k, []), all=new Set(cloud[subj]);
        let extra=false; local.forEach(id=>{ if(!all.has(id)){ all.add(id); extra=true; } });
        const keep=[...all].slice(-SEEN_CAP); set(k, JSON.stringify(keep)); if(extra) behind[subj]=keep; });
      Object.keys(localStorage).forEach(k=>{ const pre='duel_seen_'+user+'_'; if(k.startsWith(pre)){ const subj=k.slice(pre.length);
        if(!(cloud||{})[subj]){ const local=getJSON(k, []); if(local.length) behind[subj]=local.slice(-SEEN_CAP); } } });
      return behind;
    },
    getTheme(){ return get('duel_theme'); },
    setTheme(v){ return set('duel_theme', v); },
    getBellSeen(){ return +(get('duel_bell')||0); },
    setBellSeen(v){ return set('duel_bell', String(v)); },
    // 4v4 rooms (local-only demo — see README "Known limitations")
    getRooms(){ return getJSON(KEYS.rooms, {}); },
    saveRooms(r){ return set(KEYS.rooms, JSON.stringify(r)); }
  };
})();
