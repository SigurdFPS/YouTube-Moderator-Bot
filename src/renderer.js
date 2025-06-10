// ===== DOM ELEMENTS =====

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

const themeToggle = document.getElementById('themeToggle');
const fontSelect = document.getElementById('fontSelect');

// ===== UTILS =====

function showToast(message = '✔️ Task complete') {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function appendLog(line) {
  logBox.textContent += `\n${line}`;
  logBox.scrollTop = logBox.scrollHeight;
}

function switchTab(tabId) {
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

// ===== Step 1: Save OAuth Credentials =====

window.loadCredentials = async () => {
  const clientId = clientIdInput.value.trim();
  const clientSecret = clientSecretInput.value.trim();

  if (!clientId || !clientSecret) return showToast('❗ Please enter both Client ID and Secret');

  const fs = require('fs');
  const path = require('path');
  const dotenvPath = path.join(__dirname, '.env');

  const envContent = `YT_CLIENT_ID=${clientId}
YT_CLIENT_SECRET=${clientSecret}
GOOGLE_REDIRECT_URI=http://localhost:42813
REDIRECT_PORT=42813`;

  try {
    fs.writeFileSync(dotenvPath, envContent);
    step1.classList.remove('active');
    step2.classList.add('active');
    console.log('.env saved.');
  } catch (err) {
    showToast('❌ Failed to save credentials');
  }
};

// ===== Step 2: Authorize YouTube =====

authBtn.addEventListener('click', async () => {
  appendLog('🔗 Authorizing with YouTube...');
  const result = await window.api.authorizeYouTube();
  appendLog(result);
  authStatus.textContent = result;

  if (result.includes('successfully')) {
    step2.classList.remove('active');
    step3.classList.add('active');
    showToast('✅ YouTube Authorized');
  }
});

// ===== Step 3: Video Analysis =====

videoLinkInput.addEventListener('change', async () => {
  const link = videoLinkInput.value.trim();
  if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
    appendLog('⚠️ Invalid YouTube link.');
    return;
  }

  appendLog('📥 Analyzing video comments...');
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

  window.open(
    'reviewModal.html',
    'Review Comments',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes`
  );
});

deleteReviewedBtn.addEventListener('click', async () => {
  const msg = await window.api.deleteReviewedComments();
  appendLog(msg);
  showToast(msg);
});

// ===== Live Mode =====

let activeMessageCache = new Set();

function appendLiveLog(line) {
  if (activeMessageCache.has(line)) return;
  activeMessageCache.add(line);
  liveLogBox.textContent += `\n${line}`;
  liveLogBox.scrollTop = liveLogBox.scrollHeight;
}

startBtn.addEventListener('click', async () => {
  const videoId = liveVideoIdInput.value.trim();
  appendLiveLog(`🎬 Starting live chat monitoring${videoId ? ` for ${videoId}` : ''}...`);
  await window.api.startLiveMonitor(videoId);
  startBtn.style.display = 'none';
  stopBtn.style.display = 'inline-block';
});

stopBtn.addEventListener('click', async () => {
  await window.api.stopLiveMonitor();
  appendLiveLog(`🛑 Stopped live chat monitoring`);
  startBtn.style.display = 'inline-block';
  stopBtn.style.display = 'none';
});

// ===== Tab Switching =====

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ===== IPC Live Sync =====

const { ipcRenderer } = require('electron');

ipcRenderer.on('live-log', (_event, payload) => {
  if (typeof payload === 'string') return appendLiveLog(payload);

  payload.forEach(msg => {
    const tag = msg.isLikelySpam ? '🚫' : '💬';
    appendLiveLog(`${tag} [${msg.author}]: ${msg.text}`);
    if (msg.isLikelySpam) {
      window.api.deleteLiveComment(msg.id).then(() => {
        appendLiveLog(`🗑️ Deleted live spam from ${msg.author}`);
      });
    }
  });
});

// ===== Theme and Font Config =====

function applyTheme(theme) {
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(theme);
  themeToggle.textContent = theme === 'dark' ? '🌙 Dark Mode' : '🌞 Light Mode';
  window.api.saveConfig({ theme });
}

function applyFontTheme(fontTheme) {
  document.body.dataset.fontTheme = fontTheme;
  window.api.saveConfig({ fontTheme });
}

async function loadAndApplyConfig() {
  const config = await window.api.loadConfig();
  const theme = config?.theme || 'light';
  const fontTheme = config?.fontTheme || 'default';
  applyTheme(theme);
  applyFontTheme(fontTheme);
  if (fontSelect) fontSelect.value = fontTheme;
}

// ===== Theme/Font Toggles =====

themeToggle?.addEventListener('click', () => {
  const current = document.body.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

fontSelect?.addEventListener('change', (e) => {
  applyFontTheme(e.target.value);
});

// ===== Auto Auth + Theme on Load =====

window.addEventListener('DOMContentLoaded', async () => {
  await loadAndApplyConfig();

  const fs = require('fs');
  const path = require('path');
  const tokenPath = path.join(__dirname, 'tokens.json');

  if (fs.existsSync(tokenPath)) {
    step1.classList.remove('active');
    step2.classList.remove('active');
    step3.classList.add('active');
    appendLog('✅ YouTube already authorized');
    showToast('Auto-authorized');
  }
});