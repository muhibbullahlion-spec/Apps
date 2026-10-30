// ============================================================
//                  Firebase Auth + Cloud Sync
//                  আলোর পথ
// ============================================================

// ============================================================
//  🔐 Google Login
// ============================================================
async function signInWithGoogle() {
  if (!firebaseReady || !auth) {
    showMessage('⚠️ Firebase লোড হয়নি (firebase-auth.js)');
    return null;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    localStorage.setItem('userId', user.uid);
    localStorage.setItem('userName', user.displayName || '');
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userPhoto', user.photoURL || '');

    showMessage('✅ লগইন সফল');
    return user;
  } catch (error) {
    console.error('❌ Login:', error);
    if (error.code === 'auth/popup-blocked') {
      showMessage('❌ পপআপ ব্লক হয়েছে');
    } else if (error.code === 'auth/unauthorized-domain') {
      showMessage('❌ ডোমেইন অনুমোদিত নয় (Firebase Console চেক করুন)');
    } else if (error.code === 'auth/popup-closed-by-user') {
      // ইউজার নিজে বন্ধ করেছে
    } else {
      showMessage('❌ লগইন ব্যর্থ: ' + error.message);
    }
    return null;
  }
}

// ============================================================
//  🚪 Logout
// ============================================================
async function signOutUser() {
  if (firebaseReady && auth) {
    try { await auth.signOut(); } catch (e) {}
  }
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userPhoto');
  showMessage('👋 লগআউট সম্পন্ন');
}

function getCurrentUser() {
  return {
    uid: localStorage.getItem('userId') || null,
    name: localStorage.getItem('userName') || null,
    email: localStorage.getItem('userEmail') || null,
    photo: localStorage.getItem('userPhoto') || null
  };
}

function isLoggedIn() {
  return !!getCurrentUser().uid;
}

// ============================================================
//  ☁️ CLOUD SYNC
// ============================================================

// ⬆️ লোকাল ডেটা ক্লাউডে সেভ করা
async function syncToCloud() {
  if (!firebaseReady || !db || !auth) return;
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDoc = db.collection('users').doc(user.uid);
    const dataToSave = {
      timerRunning:        localStorage.getItem('timerRunning'),
      timerStartTime:      localStorage.getItem('timerStartTime'),
      currentTimerSeconds: localStorage.getItem('currentTimerSeconds'),
      lastUpdateTime:      localStorage.getItem('lastUpdateTime'),
      shownMilestones:     localStorage.getItem('shownMilestones'),
      reports:             localStorage.getItem('reports'),
      myNotes:             localStorage.getItem('myNotes'),
      quizUnlocked:        localStorage.getItem('quizUnlocked'),
      firstOpenDate:       localStorage.getItem('firstOpenDate'),
      lastSyncedAt:        new Date().toISOString()
    };

    await userDoc.set(dataToSave, { merge: true });
    console.log('☁️ ক্লাউডে সেভ হয়েছে');
  } catch (error) {
    console.error('❌ Cloud Save Error:', error);
  }
}

// ⬇️ ক্লাউড থেকে ডেটা নিয়ে লোকালস্টোরেজে সেভ
let isSyncingFromCloud = false;
async function syncFromCloud() {
  if (!firebaseReady || !db || !auth) return;
  const user = auth.currentUser;
  if (!user) return;
  if (isSyncingFromCloud) return;
  isSyncingFromCloud = true;

  try {
    const userDoc = db.collection('users').doc(user.uid);
    const docSnap = await userDoc.get();

    if (docSnap.exists) {
      const data = docSnap.data();

      // লোকালে ডেটা আছে কিনা চেক (কনফ্লিক্ট এড়াতে)
      const hasLocalData = localStorage.getItem('currentTimerSeconds');

      if (!hasLocalData) {
        for (const key in data) {
          if (data[key] !== null && data[key] !== undefined) {
            localStorage.setItem(key, data[key]);
          }
        }
        console.log('✅ ক্লাউড থেকে ডেটা রিস্টোর হয়েছে');
        showMessage('✅ আপনার পুরনো ডেটা ফিরে এসেছে');
        setTimeout(() => location.reload(), 1500);
      }
    }
  } catch (error) {
    console.error('❌ Cloud Load Error:', error);
  } finally {
    isSyncingFromCloud = false;
  }
}

// ============================================================
//  🔔 Toast মেসেজ
// ============================================================
function showMessage(msg) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window._msgTimer);
    window._msgTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  } else {
    console.log('[MSG]', msg);
  }
}

// ============================================================
//  🌍 এক্সপোর্ট
// ============================================================
window.FirebaseAuth = {
  signIn:       signInWithGoogle,
  signOut:      signOutUser,
  getUser:      getCurrentUser,
  isLoggedIn:   isLoggedIn,
  syncToCloud:  syncToCloud,
  syncFromCloud: syncFromCloud
};
