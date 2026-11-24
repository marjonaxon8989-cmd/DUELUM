// admin-config.js — who the administrator is.
//
// Signing in with ADMIN.phone uses the Firebase account whose e-mail is ADMIN.email
// (a real Gmail address), so "Forgot password" can send a reset link there.
// Admin rights are granted only after that Gmail address is VERIFIED (link in the
// e-mail Firebase sends on sign-up) — firestore.rules checks the same address.
// If you change the e-mail here, change it in firestore.rules (function isAdmin) too.

const ADMIN = {
  phone: '998774859717',              // +998 77 485 97 17 (digits only, with country code)
  email: 'madam1novde@gmail.com',
  uid: 'c3VHv1uYaLZyXRSDrkG7LeAk10W2' // the admin's account: shown in gold everywhere (display only)
};
