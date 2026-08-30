// Firebase project config for the WEB APP.
// Get these values from: Firebase Console -> Project settings -> "Your apps" -> Web app (</>) -> SDK setup.
// These values are public identifiers (not secrets) - it's normal and safe for them
// to be visible in front-end JS. Real security comes from firestore.rules and the
// Cloud Functions, not from hiding this file.
//
// IMPORTANT: also set "functionsRegion" below to match the region used in
// functions/index.js (currently "europe-west1").

export const firebaseConfig = {
  apiKey: "AIzaSyBKSJFmUF8_eonvQY_H4eFIHRBqgxz-QEQ",
  authDomain: "dfffff-15343.firebaseapp.com",
  projectId: "dfffff-15343",
  storageBucket: "dfffff-15343.firebasestorage.app",
  messagingSenderId: "999499342074",
  appId: "1:999499342074:web:fb5a21ea8bb95d67ae6943",
  measurementId: "G-KX5DW7E1Z0",
};

export const functionsRegion = "europe-west1";

// Only this Google account can sign in to /admin.html (also enforced server-side
// in firestore.rules - changing this constant alone does NOT grant access).
export const ADMIN_EMAIL = "florin390@gmail.com";
