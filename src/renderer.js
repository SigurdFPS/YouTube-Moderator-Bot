const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// ============ DOM SELECTIONS ============
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

const clientIdInput = document.getElementById('clientIdInput');
const clientSecretInput = document.getElementById('clientSecretInput');
const authBtn = document.getElementById('authBtn');
const authStatus = document.getElementById('authStatus');

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

const videoLinkInput = document.getElementById('videoLink');
const logBox = document.getElementById('logBox');
const highLikelyBox = document.getElementById('highLikely');
const possibleLikelyBox = document.getElementById('possibleLikely');
const safeCountLine = document.getElementById('safeCount');

const deleteHighBtn = document.getElementById('deleteHighBtn');
const reviewPossibleBtn = document.getElementById('reviewPossibleBtn');
const deleteReviewedBtn = document.getElementById('deleteReviewedBtn');

const toast = document.getElementById('toast');

const startBtn = document.getElementById('startLiveMonitor');
const stopBtn = document.getElementById('stopLiveMonitor');
const liveVideoIdInput = document.getElementById('liveVideoId');
const liveLogBox = document.getElementById('liveLogBox');

const fontSelect = document.getElementById('fontSelect');

// Filter Controls
const videoFilterBox = document.getElementById('videoFilterBox');
const liveFilterBox = document.getElementById('liveFilterBox');
const saveVideoFilterBtn = document.getElementById('saveVideoFilter');
const resetVideoFilterBtn = document.getElementById('resetVideoFilter');
const saveLiveFilterBtn = document.getElementById('saveLiveFilter');
const resetLiveFilterBtn = document.getElementById('resetLiveFilter');
const addVideoFilterBtn = document.getElementById('addVideoFilterBtn');
const addLiveFilterBtn = document.getElementById('addLiveFilterBtn');
const newVideoFilterInput = document.getElementById('newVideoFilterInput');
const newLiveFilterInput = document.getElementById('newLiveFilterInput');

// Paths
const videoFilterPath = path.join(__dirname, 'src/filters/blacklist_video.json');
const liveFilterPath = path.join(__dirname, 'src/filters/blacklist_live.json');

// ============ UTILS ============
function showToast(message = '✔️ Task complete') {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function appendLog(line) {
  logBox.textContent += `\n${line}`;
  logBox.scrollTop = logBox.scrollHeight;
}

function appendLiveLog(line) {
  if (activeMessageCache.has(line)) return;
  activeMessageCache.add(line);
  liveLogBox.textContent += `\n${line}`;
  liveLogBox.scrollTop = liveLogBox.scrollHeight;
}

function switchTab(tabId) {
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  tabContents.forEach(content => content.classList.toggle('active', content.id === tabId));
}

// ============ STEP 1: Save .env ============
window.loadCredentials = async () => {
  const clientId = clientIdInput.value.trim();
  const clientSecret = clientSecretInput.value.trim();
  if (!clientId || !clientSecret) return showToast('❗ Enter both fields');

  const envPath = path.join(__dirname, '.env');
  const content = `YT_CLIENT_ID=${clientId}\nYT_CLIENT_SECRET=${clientSecret}\nGOOGLE_REDIRECT_URI=http://localhost:42813\nREDIRECT_PORT=42813`;

  try {
    fs.writeFileSync(envPath, content);
    step1.classList.remove('active');
    step2.classList.add('active');
    console.log('.env saved.');
  } catch {
    showToast('❌ Failed to save .env');
  }
};

// ============ STEP 2: OAuth ============
authBtn.addEventListener('click', async () => {
  appendLog('🔗 Authorizing...');
  const result = await window.api.authorizeYouTube();
  appendLog(result);
  authStatus.textContent = result;

  if (result.includes('success')) {
    step2.classList.remove('active');
    step3.classList.add('active');
    showToast('✅ Authorized');
  }
});

// ============ STEP 3: Comment Analysis ============
videoLinkInput.addEventListener('change', async () => {
  const link = videoLinkInput.value.trim();
  if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
    appendLog('⚠️ Invalid YouTube link.');
    return;
  }

  appendLog('📥 Analyzing comments...');
  const result = await window.api.analyzeComments(link);

  highLikelyBox.textContent = result.highLikely.join('\n') || 'None';
  possibleLikelyBox.textContent = result.possibleLikely.join('\n') || 'None';
  safeCountLine.textContent = `${result.safeCount} comments marked safe.`;

  result.logSteps.forEach(line => appendLog(`📝 ${line}`));
  showToast('✅ Analysis complete');
});

deleteHighBtn.addEventListener('click', async () => {
  const msg = await window.api.deleteHighlyLikely();
  appendLog(msg);
  showToast(msg);
});

reviewPossibleBtn.addEventListener('click', () => {
  const width = 650;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  window.open('reviewModal.html', 'Review Comments', `width=${width},height=${height},left=${left},top=${top}`);
});

deleteReviewedBtn.addEventListener('click', async () => {
  const msg = await window.api.deleteReviewedComments();
  appendLog(msg);
  showToast(msg);
});

// ============ LIVE CHAT ============
let activeMessageCache = new Set();

startBtn.addEventListener('click', async () => {
  const videoId = liveVideoIdInput.value.trim();
  appendLiveLog(`🎬 Starting monitor${videoId ? ` for ${videoId}` : ''}...`);
  await window.api.startLiveMonitor(videoId);
  startBtn.style.display = 'none';
  stopBtn.style.display = 'inline-block';
});

stopBtn.addEventListener('click', async () => {
  await window.api.stopLiveMonitor();
  appendLiveLog(`🛑 Monitoring stopped`);
  startBtn.style.display = 'inline-block';
  stopBtn.style.display = 'none';
});

ipcRenderer.on('live-log', (_e, payload) => {
  if (typeof payload === 'string') return appendLiveLog(payload);

  payload.forEach(msg => {
    const tag = msg.isLikelySpam ? '🚫' : '💬';
    appendLiveLog(`${tag} [${msg.author}]: ${msg.text}`);
    if (msg.isLikelySpam) {
      window.api.deleteLiveComment(msg.id).then(() => {
        appendLiveLog(`🗑️ Deleted from ${msg.author}`);
      });
    }
  });
});

// ============ CONFIG: Font Theme ============
function applyFontTheme(fontTheme) {
  document.body.dataset.fontTheme = fontTheme;
  window.api.saveConfig({ fontTheme });
}

async function loadAndApplyConfig() {
  const config = await window.api.loadConfig();
  const fontTheme = config?.fontTheme || 'default';
  applyFontTheme(fontTheme);
  if (fontSelect) fontSelect.value = fontTheme;
}

fontSelect?.addEventListener('change', (e) => {
  applyFontTheme(e.target.value);
});

// ============ FILTERS ============
function loadFilter(path, targetBox) {
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf-8');
    try {
      const list = JSON.parse(content);
      targetBox.value = Array.isArray(list) ? list.join('\n') : '';
    } catch {
      targetBox.value = '';
    }
  }
}

function saveFilter(path, sourceBox) {
  const lines = sourceBox.value.split('\n').map(line => line.trim()).filter(Boolean);
  fs.writeFileSync(path, JSON.stringify(lines, null, 2));
  showToast('✅ Filter saved');
}

function resetFilter(path, sourceBox, defaults) {
  fs.writeFileSync(path, JSON.stringify(defaults, null, 2));
  loadFilter(path, sourceBox);
  showToast('🔁 Filter reset');
}

// Add Entry Buttons
addVideoFilterBtn?.addEventListener('click', async () => {
  const entry = newVideoFilterInput.value.trim();
  if (!entry) return showToast('❗ Empty entry');
  await window.api.addFilterEntry('video', entry);
  loadFilter(videoFilterPath, videoFilterBox);
  newVideoFilterInput.value = '';
  showToast('➕ Added to Video filter');
});

addLiveFilterBtn?.addEventListener('click', async () => {
  const entry = newLiveFilterInput.value.trim();
  if (!entry) return showToast('❗ Empty entry');
  await window.api.addFilterEntry('live', entry);
  loadFilter(liveFilterPath, liveFilterBox);
  newLiveFilterInput.value = '';
  showToast('➕ Added to Live filter');
});

// Save / Reset Buttons
saveVideoFilterBtn?.addEventListener('click', () => saveFilter(videoFilterPath, videoFilterBox));
resetVideoFilterBtn?.addEventListener('click', () =>
  resetFilter(videoFilterPath, videoFilterBox, [
    'been watching',
    'source of inspiration',
    'thanks for your content',
    'inspiring me daily',
    'positive vibes only'
  ])
);

saveLiveFilterBtn?.addEventListener('click', () => saveFilter(liveFilterPath, liveFilterBox));
resetLiveFilterBtn?.addEventListener('click', () =>
  resetFilter(liveFilterPath, liveFilterBox, [
    'buy',
    'check out my channel',
    'sub4sub'
  ])
);

// ============ INIT ============
window.addEventListener('DOMContentLoaded', async () => {
  await loadAndApplyConfig();

  const tokenPath = path.join(__dirname, 'tokens.json');
  if (fs.existsSync(tokenPath)) {
    step1.classList.remove('active');
    step2.classList.remove('active');
    step3.classList.add('active');
    appendLog('✅ YouTube already authorized');
    showToast('Auto-authorized');
  }

  loadFilter(videoFilterPath, videoFilterBox);
  loadFilter(liveFilterPath, liveFilterBox);
});