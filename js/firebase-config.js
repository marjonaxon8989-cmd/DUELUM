// firebase-config.js — the ONLY thing you edit to turn on online mode.
//
// While FIREBASE_CONFIG is null the app runs in LOCAL mode (everything stays in
// this browser, exactly like before). Paste your own config below and the app
// switches to ONLINE mode automatically:
//   • a shared leaderboard of everyone who signed up (monthly / all-time / league)
//   • real accounts — log in from any phone with the same number + password
//   • friends: add by 8-digit ID, accept / decline requests
//   • challenge a friend to a real 1v1 duel (both play the same 10 questions,
//     you see each other's score live)
//
// Where to get it (free "Spark" plan, no credit card) — full steps in README:
//   console.firebase.google.com -> your project -> ⚙ Project settings ->
//   General -> "Your apps" -> Web app (</>) -> "SDK setup and configuration" -> Config
//
// These values are NOT secret. Firebase web config is meant to be public; your
// data is protected by the security rules in firestore.rules, not by hiding this.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAhqy3TZTMRsBbycQsKkoeIUKPpZ0tjuig",
  authDomain: "planning-with-ai-a8b9e.firebaseapp.com",
  projectId: "planning-with-ai-a8b9e",
  storageBucket: "planning-with-ai-a8b9e.firebasestorage.app",
  messagingSenderId: "201370611133",
  appId: "1:201370611133:web:f8aeee3bc81b69c33cf6d4"
};

/* Example — replace null above with your own object, e.g.:
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "duel-uz.firebaseapp.com",
  projectId: "duel-uz",
  storageBucket: "duel-uz.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
*/
