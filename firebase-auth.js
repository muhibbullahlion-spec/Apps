// ⬇️ ক্লাউড থেকে ডেটা নিয়ে লোকালস্টোরেজে সেভ (Master Sync)
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
      
      // ⭐ এখন আর চেক করবো না যে লোকালে ডেটা আছে কিনা। 
      // লগইন করলেই ক্লাউডের ডেটা লোকালে চলে আসবে।
      
      for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
          localStorage.setItem(key, data[key]);
        }
      }
      
      console.log('✅ ক্লাউড থেকে ডেটা রিস্টোর হয়েছে');
      showMessage('✅ আপনার পুরনো ডেটা ফিরে এসেছে');
      
      // পেজ রিলোড দিলে টাইমার ও নোট আপডেট হয়ে যাবে
      setTimeout(() => {
        if (window.location.pathname.includes('profile.html')) {
           // প্রোফাইলে থাকলে হোমে নিয়ে যাবে
           window.location.href = '../index.html'; 
        } else {
           location.reload();
        }
      }, 1500);
      
    } else {
      // ক্লাউডে ডেটা নেই, ফোনের ডেটা ক্লাউডে আপলোড করি
      syncToCloud();
    }
  } catch (error) {
    console.error('❌ Cloud Load Error:', error);
  } finally {
    isSyncingFromCloud = false;
  }
      }
