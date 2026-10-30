// ============================================================
//                  আলোর পথ - Main App Logic
//                  (Timer + Firebase Cloud Sync)
// ============================================================

// ===================== SIDEBAR =====================
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

menuBtn.addEventListener('click', () => {
  sidebar.classList.add('active');
  overlay.classList.add('active');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
});

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    const href = item.getAttribute('href');
    if (href && href !== '#') {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      return;
    }
    e.preventDefault();
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  });
});

// ============================================================
//                  CLOUD SYNC HELPER
// ============================================================
// ⭐ ডেটা পরিবর্তন হলেই এই ফাংশনটি ক্লাউডে সিঙ্ক করবে
function triggerCloudSync() {
  if (window.FirebaseAuth && window.FirebaseAuth.syncToCloud) {
    window.FirebaseAuth.syncToCloud();
  }
}

// ============================================================
//                  TIMER SYSTEM
// ============================================================

let seconds = 0;
let running = false;
let interval = null;
let startTimeMs = null;

const daysEl = document.getElementById('daysCount');
const clockEl = document.getElementById('timerClock');
const startBtn = document.getElementById('startBtn');
const btnText = document.getElementById('btnText');

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function updateDisplay() {
  const days = Math.floor(seconds / 86400);
  const remaining = seconds % 86400;
  daysEl.textContent = days;
  clockEl.textContent = formatTime(remaining);
}

function humanTime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} দিন`);
  if (hours > 0) parts.push(`${hours} ঘণ্টা`);
  if (minutes > 0) parts.push(`${minutes} মিনিট`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} সেকেন্ড`);
  return parts.join(' ');
}

// ---------- Start Timer ----------
function startTimer() {
  running = true;
  startTimeMs = Date.now();
  btnText.textContent = 'বন্ধ করুন';
  startBtn.classList.add('stopped');

  localStorage.setItem('timerRunning', 'true');
  localStorage.setItem('timerStartTime', startTimeMs.toString());
  localStorage.setItem('currentTimerSeconds', seconds.toString());
  localStorage.setItem('lastUpdateTime', Date.now().toString());

  // ⭐ টাইমার শুরু হলেই ক্লাউডে সিঙ্ক
  triggerCloudSync();

  interval = setInterval(() => {
    seconds++;
    updateDisplay();
    localStorage.setItem('currentTimerSeconds', seconds.toString());
    localStorage.setItem('lastUpdateTime', Date.now().toString());
    checkMilestone();
    
    // ⭐ প্রতি ১০ সেকেন্ড পর পর ক্লাউডে সিঙ্ক (ডেটা লস রোধে)
    if (seconds % 10 === 0) {
      triggerCloudSync();
    }
  }, 1000);
}

// ---------- Show Report Modal ----------
function showReportModal() {
  const failedSeconds = seconds;
  const failedAt = new Date();

  const timeEl = document.getElementById('failedTimeText');
  const dateEl = document.getElementById('failedDateText');
  if (timeEl) timeEl.textContent = humanTime(failedSeconds);
  if (dateEl) dateEl.textContent =
    failedAt.toLocaleDateString('bn-BD', {
      day: 'numeric', month: 'long', year: 'numeric'
    }) + ' • ' +
    failedAt.toLocaleTimeString('bn-BD', {
      hour: '2-digit', minute: '2-digit'
    });

  openReportModal(failedSeconds, startTimeMs, failedAt);
}

// ---------- Actually Stop Timer ----------
function actuallyStopTimer() {
  clearInterval(interval);
  running = false;
  btnText.textContent = 'শুরু করুন';
  startBtn.classList.remove('stopped');
}

startBtn.addEventListener('click', () => {
  if (running) {
    showReportModal();
  } else {
    startTimer();
  }
});

// ============================================================
//                  REPORT MODAL
// ============================================================

const reportModal = document.getElementById('reportModal');
const reportNote = document.getElementById('reportNote');
const cancelReport = document.getElementById('cancelReport');
const saveReport = document.getElementById('saveReport');

let pendingReport = null;

function openReportModal(failedSeconds, startTimeMsValue, failedAt) {
  pendingReport = {
    seconds: failedSeconds,
    humanTime: humanTime(failedSeconds),
    startTime: new Date(startTimeMsValue || Date.now()).toISOString(),
    endTime: failedAt.toISOString()
  };
  reportModal.classList.add('active');
  if (reportNote) {
    reportNote.value = '';
    setTimeout(() => reportNote.focus(), 300);
  }
}

function closeReportModal() {
  reportModal.classList.remove('active');
  pendingReport = null;
}

// ---------- Timer Reset Helper ----------
function resetTimer() {
  seconds = 0;
  updateDisplay();
  localStorage.removeItem('currentTimerSeconds');
  localStorage.removeItem('timerRunning');
  localStorage.removeItem('timerStartTime');
  localStorage.removeItem('lastUpdateTime');
  localStorage.removeItem('shownMilestones');
  
  // ⭐ রিসেট হলেই ক্লাউডে সিঙ্ক
  triggerCloudSync();
}

// ---------- Cancel Button ----------
cancelReport.addEventListener('click', () => {
  closeReportModal();
});

// ---------- Save Button ----------
saveReport.addEventListener('click', () => {
  if (!pendingReport) return;

  const noteText = reportNote.value.trim();

  const report = {
    id: Date.now(),
    seconds: pendingReport.seconds,
    humanTime: pendingReport.humanTime,
    startTime: pendingReport.startTime,
    endTime: pendingReport.endTime,
    note: noteText || ''
  };

  const allReports = JSON.parse(localStorage.getItem('reports') || '[]');
  allReports.unshift(report);
  localStorage.setItem('reports', JSON.stringify(allReports));

  closeReportModal();

  actuallyStopTimer();
  resetTimer();
  
  // ⭐ রিপোর্ট সেভ হলেই ক্লাউডে সিঙ্ক
  triggerCloudSync();
});

// ============================================================
//                  MILESTONE DATA
// ============================================================

const MILESTONES = [
  { days: 1,   title: 'প্রথম দিন',     msg: 'প্রথম ২৪ ঘণ্টা পূর্ণ হয়েছে।' },
  { days: 3,   title: '৩ দিন পূর্ণ',   msg: 'শুরুটা দৃঢ় হয়েছে। চালিয়ে যান।' },
  { days: 7,   title: 'এক সপ্তাহ',     msg: '৭ দিন অতিক্রম করেছেন।' },
  { days: 14,  title: 'দুই সপ্তাহ',    msg: '১৪ দিন পার হয়েছে।' },
  { days: 21,  title: '২১ দিন পূর্ণ',  msg: 'অভ্যাস গড়ার পথে আছেন।' },
  { days: 30,  title: 'এক মাস',        msg: '৩০ দিন পূর্ণ। অভিনন্দন।' },
  { days: 45,  title: '৪৫ দিন',        msg: 'প্রায় দেড় মাস পূর্ণ।' },
  { days: 60,  title: 'দুই মাস',       msg: '৬০ দিন পূর্ণ হয়েছে।' },
  { days: 75,  title: '৭৫ দিন',        msg: 'আরো শক্তিশালী হচ্ছেন।' },
  { days: 90,  title: 'তিন মাস',       msg: '৯০ দিন পূর্ণ। দুর্দান্ত।' },
  { days: 120, title: 'চার মাস',       msg: '১২০ দিন পূর্ণ।' },
  { days: 150, title: 'পাঁচ মাস',      msg: '১৫০ দিন অতিক্রম।' },
  { days: 180, title: 'ছয় মাস',       msg: 'অর্ধবর্ষ পূর্ণ হয়েছে।' },
  { days: 210, title: 'সাত মাস',       msg: '২১০ দিন পূর্ণ।' },
  { days: 240, title: 'আট মাস',        msg: '২৪০ দিন অতিক্রম।' },
  { days: 270, title: 'নয় মাস',       msg: '২৭০ দিন পূর্ণ। আর ৯০ দিন বাকি।' },
  { days: 300, title: '৩০০ দিন',       msg: '৩০০ দিন পূর্ণ। অভিনন্দন।' },
  { days: 330, title: '৩৩০ দিন',       msg: 'শেষ পর্যায়ে আছেন।' },
  { days: 360, title: 'এক বছর',        msg: '৩৬০ দিন পূর্ণ। গৌরবময় অর্জন।' }
];

function getShownMilestones() {
  return JSON.parse(localStorage.getItem('shownMilestones') || '[]');
}

function markMilestoneShown(days) {
  const shown = getShownMilestones();
  if (!shown.includes(days)) {
    shown.push(days);
    localStorage.setItem('shownMilestones', JSON.stringify(shown));
  }
}

function checkMilestone() {
  const days = Math.floor(seconds / 86400);
  if (days < 1) return;

  const shown = getShownMilestones();
  if (shown.includes(days)) return;

  const milestone = MILESTONES.find(m => m.days === days);
  if (milestone) {
    markMilestoneShown(days);
    showNotifyCard(milestone.title, milestone.msg, days);
  }
}

// ============================================================
//                  NOTIFY CARD
// ============================================================

const notifyCard = document.getElementById('notifyCard');
const notifyTitle = document.getElementById('notifyTitle');
const notifyMsg = document.getElementById('notifyMsg');
const notifyDays = document.getElementById('notifyDays');
const notifyClose = document.getElementById('notifyClose');

function showNotifyCard(title, msg, days) {
  notifyTitle.textContent = title;
  notifyMsg.textContent = msg;
  notifyDays.textContent = `${days} দিন`;
  notifyCard.classList.add('active');
}

function closeNotifyCard() {
  notifyCard.classList.remove('active');
}

if (notifyClose) {
  notifyClose.addEventListener('click', closeNotifyCard);
}

if (notifyCard) {
  notifyCard.addEventListener('click', (e) => {
    if (e.target === notifyCard) closeNotifyCard();
  });
}

// ============================================================
//                  MOTIVATION AYAT
// ============================================================

const MOTIVATION_AYAT = [
  {
    text: `"আর তোমরা যেনার কাছেও যেয়ো না। নিশ্চয়ই তা অশ্লীল কাজ এবং মন্দ পথ।"`,
    source: `-(আল-কুরআন, ১৭:৩২)`
  },
  {
    text: `"বলুন, আমার প্রতিপালক কেবল অশ্লীল কাজগুলোই হারাম করেছেন— প্রকাশ্য ও গোপন।"`,
    source: `-(আল-কুরআন, ৭:৩৩)`
  },
  {
    text: `"আর যারা আল্লাহর সঙ্গে অন্য কোনো ইলাহকে ডাকে না, আল্লাহ যাকে হত্যা করা হারাম করেছেন সেই প্রাণকে অন্যায়ভাবে হত্যা করে না এবং ব্যভিচার করে না।"`,
    source: `-(আল-কুরআন, ২৫:৬৮)`
  },
  {
    text: `"ব্যভিচারী নারী ও ব্যভিচারী পুরুষ— তাদের প্রত্যেককে একশত বেত্রাঘাত করো।"`,
    source: `-(আল-কুরআন, ২৪:২)`
  },
  {
    text: `"আর তারা যেন নিজেদের দৃষ্টি সংযত রাখে ও লজ্জাস্থান হেফাযত করে। এটাই তাদের জন্য অধিক পবিত্র।"`,
    source: `-(আল-কুরআন, ২৪:৩০)`
  }
];

function loadRandomAyat() {
  const ayatEl = document.getElementById('motivationText');
  const srcEl = document.getElementById('motivationSource');
  if (!ayatEl || !srcEl) return;

  const ayat = MOTIVATION_AYAT[Math.floor(Math.random() * MOTIVATION_AYAT.length)];
  ayatEl.textContent = ayat.text;
  srcEl.textContent = ayat.source;
}

loadRandomAyat();

// ============================================================
//                  RESTORE TIMER (FIXED — লাফাবে না)
// ============================================================

(function restoreTimer() {
  const wasRunning = localStorage.getItem('timerRunning') === 'true';
  const savedSeconds = parseInt(localStorage.getItem('currentTimerSeconds') || '0');
  const savedStartTime = parseInt(localStorage.getItem('timerStartTime') || '0');
  const lastUpdate = parseInt(localStorage.getItem('lastUpdateTime') || '0');

  if (wasRunning && savedStartTime > 0) {
    // টাইমার আগে চলছিল, এখনো চলবে
    const now = Date.now();
    const gapSeconds = lastUpdate > 0
      ? Math.floor((now - lastUpdate) / 1000)
      : 0;

    seconds = savedSeconds + Math.max(0, gapSeconds);
    startTimeMs = savedStartTime;

    running = true;
    btnText.textContent = 'বন্ধ করুন';
    startBtn.classList.add('stopped');

    interval = setInterval(() => {
      seconds++;
      updateDisplay();
      localStorage.setItem('currentTimerSeconds', seconds.toString());
      localStorage.setItem('lastUpdateTime', Date.now().toString());
      checkMilestone();
      
      // ⭐ প্রতি ১০ সেকেন্ড পর পর ক্লাউডে সিঙ্ক
      if (seconds % 10 === 0) {
        triggerCloudSync();
      }
    }, 1000);

    updateDisplay();
  } else {
    // ⭐ টাইমার বন্ধ ছিল, কিন্তু ক্লাউড থেকে হয়তো ডেটা এসেছে
    seconds = savedSeconds; 
    updateDisplay();
  }
})();

// ============================================================
//                  EXPOSE FOR OTHER PAGES
// ============================================================
window.AlorPoth = {
  getReports: () => JSON.parse(localStorage.getItem('reports') || '[]'),
  clearAllReports: () => {
    localStorage.removeItem('reports');
    triggerCloudSync();
  },
  humanTime: humanTime,
  syncToCloud: triggerCloudSync
};
