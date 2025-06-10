// ===== DOM ELEMENTS =====

// Step flow
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

// Auth flow
const clientIdInput = document.getElementById('clientIdInput');
const clientSecretInput = document.getElementById('clientSecretInput');
const authBtn = document.getElementById('authBtn');
const authStatus = document.getElementById('authStatus');

// Tabs
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Video analysis UI
const videoLinkInput = document.getElementById('videoLink');
const logBox = document.getElementById('logBox');
const highLikelyBox = document.getElementById('highLikely');
const possibleLikelyBox = document.getElementById('possibleLikely');
const safeCountLine = document.getElementById('safeCount');

// Buttons
const deleteHighBtn = document.getElementById('deleteHighBtn');
const reviewPossibleBtn = document.getElementById('reviewPossibleBtn');
const deleteReviewedBtn = document.getElementById('deleteReviewedBtn');

// Toast
const toast = document.getElementById('toast');

// Live Mode UI
const startBtn = document.getElementById('startLiveMonitor');
const stopBtn = document.getElementById('stopLiveMonitor');
const liveVideoIdInput = document.getElementById('liveVideoId');
const liveLogBox = document.getElementById('liveLogBox');

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
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tabId));
  });
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

// ===== Step 1: Save OAuth Credentials =====

window.loadCredentials = async () => {
  const clientId = clientIdInput.value.trim();
  const clientSecret = clientSecretInput.value.trim();

  if (!clientId || !clientSecret) {
    showToast('❗ Please enter both Client ID and Secret');
    return;
  }

  const fs = require('fs');
  const path = require('path');
  const dotenvPath = path.join(__dirname, '.env');

  const envContent = `YT_CLIENT_ID=${clientId}
YT_CLIENT_SECRET=${clientSecret}
GOOGLE_REDIRECT_URI=http://localhost:42813
REDIRECT_PORT=42813`;

  try {
    fs.writeFileSync(dotenvPath, envContent);
    console.log('.env saved.');
    step1.classList.remove('active');
    step2.classList.add('active');
  } catch (err) {
    console.error('Failed to save .env:', err.message);
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

// ===== Step 3: Video Analysis Tab =====

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

// ===== Live Mode Tab =====

let activeMessageCache = new Set();

function appendLiveLog(line) {
  if (activeMessageCache.has(line)) return;
  activeMessageCache.add(line);
  liveLogBox.textContent += `\n${line}`;
  liveLogBox.scrollTop = liveLogBox.scrollHeight;
}

startBtn.addEventListener('click', async () => {
  const videoId = liveVideoIdInput?.value.trim() || null;

  appendLiveLog(`🎬 Starting live chat monitoring${videoId ? ` for video ID: ${videoId}` : ''}...`);
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
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    switchTab(target);
  });
});

// ===== On Load: Auto Step Skip if Authenticated =====

window.addEventListener('DOMContentLoaded', () => {
  const fs = require('fs');
  const path = require('path');
  const tokenPath = path.join(__dirname, 'tokens.json');

  if (fs.existsSync(tokenPath)) {
    step1.classList.remove('active');
    step2.classList.remove('active');
    step3.classList.add('active');
    appendLog('✅ YouTube already authorized (tokens.json found)');
    showToast('Auto-authorized');
  }
});

// ===== IPC Live Log Sync from Main =====

const { ipcRenderer } = require('electron');
ipcRenderer.on('live-log', (_event, payload) => {
  if (typeof payload === 'string') {
    appendLiveLog(payload);
  } else if (Array.isArray(payload)) {
    payload.forEach(msg => {
      const tag = msg.isLikelySpam ? '🚫' : '💬';
      appendLiveLog(`${tag} [${msg.author}]: ${msg.text}`);

      if (msg.isLikelySpam) {
        window.api.deleteLiveComment(msg.id).then(() => {
          appendLiveLog(`🗑️ Deleted live spam from ${msg.author}`);
        });
      }
    });
  }
});