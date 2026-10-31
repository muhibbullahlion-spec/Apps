// ============================================================
//                  Firebase Configuration
//                  আলোর পথ (Fixed)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBvHitrDMDcNoBcRKoiMYXHm8h6SB9UCh0",
  authDomain: "alor-poth-96000.firebaseapp.com",
  projectId: "alor-poth-96000",
  storageBucket: "alor-poth-96000.firebasestorage.app",
  messagingSenderId: "100151142626",
  appId: "1:100151142626:web:3f11c344a28a01244e16bb",
  measurementId: "G-5K7F066G6H"
};

let firebaseReady = false;
let auth = null;
let db = null;

(function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK লোড হয়নি');
      return;
    }

    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;
    console.log('🔥 Firebase initialized');

    // ⭐ লগইন স্টেট চেঞ্জ
    auth.onAuthStateChanged((user) => {
      if (user) {
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userName', user.displayName || '');
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userPhoto', user.photoURL || '');
        console.log('👤 লগইন:', user.displayName);

        // ⭐ শুধু প্রথমবার সিঙ্ক করবো (sessionStorage চেক হবে ভেতরে)
        syncFromCloud();
        
      } else {
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPhoto');
        
        // ⭐ লগআউট হলে সেশন ফ্ল্যাগ ক্লিয়ার
        sessionStorage.removeItem('hasSyncedThisSession');
        console.log('👤 লগইন নেই');
      }
      window.dispatchEvent(new CustomEvent('authStateChanged'));
    });

  } catch (error) {
    console.error('❌ Firebase init এরর:', error.message);
    firebaseReady = false;
  }
})();
