// ============================================================
//                  Firebase Auth + Cloud Sync
//                  আলোর পথ (Fixed - No Reload Loop)
// ============================================================

// ============================================================
//  🔐 Google Login
// ============================================================
async function signInWithGoogle() {
  if (typeof firebaseReady === 'undefined' || !firebaseReady || !auth) {
    showMessage('⚠️ Firebase লোড হয়নি');
    return null;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
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
      showMessage('❌ ডোমেইন অনুমোদিত নয়');
    } else if (error.code === 'auth/popup-closed-by-user') {
      // নিজে বন্ধ করেছে
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
  if (typeof firebaseReady !== 'undefined' && firebaseReady && auth) {
    try { await auth.signOut(); } catch (e) {}
  }
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userPhoto');
  
  // ⭐ লগআউটে সেশন ফ্ল্যাগ রিসেট
  sessionStorage.removeItem('hasSyncedThisSession');
  
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

// ⬆️ লোকাল ডেটা ক্লাউডে সেভ
let isSyncingToCloud = false;
async function syncToCloud() {
  if (typeof firebaseReady === 'undefined' || !firebaseReady || !db || !auth) return;
  const user = auth.currentUser;
  if (!user) return;
  if (isSyncingToCloud) return;
  
  isSyncingToCloud = true;

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
  } finally {
    isSyncingToCloud = false;
  }
}

// ⬇️ ক্লাউড থেকে ডেটা নিয়ে লোকালস্টোরেজে সেভ (একবারই, রিলোড ছাড়া)
let isSyncingFromCloud = false;
async function syncFromCloud() {
  if (typeof firebaseReady === 'undefined' || !firebaseReady || !db || !auth) return;
  const user = auth.currentUser;
  if (!user) return;
  
  // ⭐ Infinite loop ব্লক — এই সেশনে একবার সিঙ্ক হলে আর হবে না
  if (isSyncingFromCloud) return;
  if (sessionStorage.getItem('hasSyncedThisSession') === 'true') {
    console.log('ℹ️ এই সেশনে আগেই সিঙ্ক হয়েছে');
    return;
  }
  
  isSyncingFromCloud = true;

  try {
    const userDoc = db.collection('users').doc(user.uid);
    const docSnap = await userDoc.get();

    if (docSnap.exists) {
      const data = docSnap.data();

      // ক্লাউড থেকে সব ডেটা লোকালে কপি
      for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
          localStorage.setItem(key, data[key]);
        }
      }
      
      console.log('✅ ক্লাউড থেকে ডেটা রিস্টোর হয়েছে');
      showMessage('✅ আপনার পুরনো ডেটা ফিরে এসেছে');
      
      // ⭐ সেশন ফ্ল্যাগ সেট করি যাতে আর রিলোড না হয়
      sessionStorage.setItem('hasSyncedThisSession', 'true');
      
      // ⭐ রিলোড না করে সরাসরি UI আপডেট
      window.dispatchEvent(new CustomEvent('dataRestoredFromCloud'));
      
      // ⭐ প্রোফাইল পেজে থাকলে হোমে যাবে, অন্যথায় ডেটা দেখাবে
      if (window.location.pathname.includes('profile.html')) {
        setTimeout(() => window.location.href = '../index.html', 1500);
      }
      // ⭐ অন্য পেজে (index, note, quiz) থাকলে কোনো রিলোড হবে না
      
    } else {
      // ক্লাউডে ডেটা নেই — নতুন ইউজার, ফোনের ডেটা আপলোড করি
      console.log('ℹ️ নতুন ইউজার, ফোনের ডেটা ক্লাউডে আপলোড হচ্ছে');
      await syncToCloud();
      sessionStorage.setItem('hasSyncedThisSession', 'true');
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
