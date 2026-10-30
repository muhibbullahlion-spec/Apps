// ============================================================
//                  Firebase Configuration
//                  আলোর পথ
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

// ⚠️ উপরে আপনার আসল Firebase Config বসান

let firebaseReady = false;
let auth = null;
let db = null;

(function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK লোড হয়নি');
      return;
    }
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('PASTE')) {
      console.warn('⚠️ Firebase Config সেট করা হয়নি');
      return;
    }

    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();   // ⭐ Firestore চালু
    firebaseReady = true;
    console.log('🔥 Firebase initialized');

    // লগইন স্টেট চেঞ্জ হলে ডেটা লোড করবো
    auth.onAuthStateChanged((user) => {
      if (user) {
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userName', user.displayName || '');
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userPhoto', user.photoURL || '');
        console.log('👤 লগইন:', user.displayName);

        // ⭐ লগইন হলে ক্লাউড থেকে ডেটা লোড করি
        syncFromCloud();
      } else {
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPhoto');
      }
      window.dispatchEvent(new CustomEvent('authStateChanged'));
    });

  } catch (error) {
    console.error('❌ Firebase init এরর:', error.message);
    firebaseReady = false;
  }
})();
