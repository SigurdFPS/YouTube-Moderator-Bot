const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Paths
const videoFilterPath = path.join(__dirname, 'src/filters/blacklist_video.json');
const liveFilterPath = path.join(__dirname, 'src/filters/blacklist_live.json');
const envPath = path.join(__dirname, '.env');
const configPath = path.join(__dirname, 'src/config/config.json');

let step1, step2, step3;
let clientIdInput, clientSecretInput;
let authBtn, authStatus;
let videoLinkInput, logBox, highLikelyBox, possibleLikelyBox, safeCountLine;
let deleteHighBtn, reviewPossibleBtn, deleteReviewedBtn;
let startBtn, stopBtn, liveVideoIdInput, liveLogBox;
let videoFilterBox, liveFilterBox, saveVideoFilterBtn, resetVideoFilterBtn, saveLiveFilterBtn, resetLiveFilterBtn;
let addVideoFilterBtn, addLiveFilterBtn, newVideoFilterInput, newLiveFilterInput;
let toast;

let activeMessageCache = new Set();

// ============ STEP 1 ============
async function loadStep1() {
  step1 = document.getElementById('step1');
  clientIdInput = document.getElementById('clientIdInput');
  clientSecretInput = document.getElementById('clientSecretInput');
  toast = document.getElementById('toast');

  document.getElementById('saveAndContinue').addEventListener('click', async () => {
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();
    if (!clientId || !clientSecret) return showToast('❗ Enter both fields');

    const content = `YT_CLIENT_ID=${clientId}\nYT_CLIENT_SECRET=${clientSecret}\nGOOGLE_REDIRECT_URI=http://localhost:42813\nREDIRECT_PORT=42813`;

    try {
      fs.writeFileSync(envPath, content);
      showToast('✅ Saved .env, loading Step 2...');
      setTimeout(() => {
        window.location.href = '../steps/step2.html';
      }, 1000);
    } catch (err) {
        console.error('Failed to write .env file:', err); // ⬅️ Add this
        showToast('❌ Failed to save .env');
    }
  });
}

// ============ STEP 2 ============
async function loadStep2() {
  step2 = document.getElementById('step2');
  authBtn = document.getElementById('authBtn');
  authStatus = document.getElementById('authStatus');
  toast = document.getElementById('toast');

  authBtn.addEventListener('click', async () => {
    const result = await window.api.authorizeYouTube();
    authStatus.textContent = result;
    if (result.includes('success')) {
      showToast('✅ Authorized');
      window.location.href = '../steps/step3.html';
    } else {
      showToast('❌ Authorization failed');
    }
  });
}

// ============ STEP 3 ============
async function loadStep3() {
  step3 = document.getElementById('step3');
  toast = document.getElementById('toast');

  videoLinkInput = document.getElementById('videoLink');
  logBox = document.getElementById('logBox');
  highLikelyBox = document.getElementById('highLikely');
  possibleLikelyBox = document.getElementById('possibleLikely');
  safeCountLine = document.getElementById('safeCount');
  deleteHighBtn = document.getElementById('deleteHighBtn');
  reviewPossibleBtn = document.getElementById('reviewPossibleBtn');
  deleteReviewedBtn = document.getElementById('deleteReviewedBtn');
  startBtn = document.getElementById('startLiveMonitor');
  stopBtn = document.getElementById('stopLiveMonitor');
  liveVideoIdInput = document.getElementById('liveVideoId');
  liveLogBox = document.getElementById('liveLogBox');
  videoFilterBox = document.getElementById('videoFilterBox');
  liveFilterBox = document.getElementById('liveFilterBox');
  saveVideoFilterBtn = document.getElementById('saveVideoFilter');
  resetVideoFilterBtn = document.getElementById('resetVideoFilter');
  saveLiveFilterBtn = document.getElementById('saveLiveFilter');
  resetLiveFilterBtn = document.getElementById('resetLiveFilter');
  addVideoFilterBtn = document.getElementById('addVideoFilter');
  addLiveFilterBtn = document.getElementById('addLiveFilter');
  newVideoFilterInput = document.getElementById('addVideoFilterInput');
  newLiveFilterInput = document.getElementById('addLiveFilterInput');

  const itemsPerPage = 10;
  let currentPage = { high: 1, possible: 1 };
  let fullResults = { high: [], possible: [], safeCount: 0 };

  function renderPaginatedComments(category, boxId, page) {
    const box = document.getElementById(boxId);
    const comments = fullResults[category];
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageComments = comments.slice(start, end);
    box.textContent = pageComments.join('\n') || 'None';
    const totalPages = Math.ceil(comments.length / itemsPerPage);
    document.getElementById(`${boxId}Pagination`).textContent = `Page ${page} of ${totalPages || 1}`;
  }

  function setupPaginationButtons(category, boxId) {
    document.getElementById(`${boxId}Prev`).addEventListener('click', () => {
      if (currentPage[category] > 1) {
        currentPage[category]--;
        renderPaginatedComments(category, boxId, currentPage[category]);
      }
    });

    document.getElementById(`${boxId}Next`).addEventListener('click', () => {
      const totalPages = Math.ceil(fullResults[category].length / itemsPerPage);
      if (currentPage[category] < totalPages) {
        currentPage[category]++;
        renderPaginatedComments(category, boxId, currentPage[category]);
      }
    });
  }

  setupPaginationButtons('high', 'highLikely');
  setupPaginationButtons('possible', 'possibleLikely');

  // Tabs
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Analysis
  videoLinkInput.addEventListener('change', async () => {
    const link = videoLinkInput.value.trim();
    if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
      appendLog('⚠️ Invalid YouTube link.');
      return;
    }

    appendLog('📥 Analyzing comments...');
    const result = await window.api.analyzeComments(link);

    fullResults.high = result.highLikely;
    fullResults.possible = result.possibleLikely;
    fullResults.safeCount = result.safeCount;

    currentPage = { high: 1, possible: 1 };

    renderPaginatedComments('high', 'highLikely', 1);
    renderPaginatedComments('possible', 'possibleLikely', 1);
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

  // Live Monitor
  startBtn.addEventListener('click', async () => {
    const videoId = liveVideoIdInput.value.trim();
    appendLiveLog(`🎬 Starting monitor${videoId ? ` for ${videoId}` : ''}...`);
    await window.api.startLiveMonitor(videoId);
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
  });

  stopBtn.addEventListener('click', async () => {
    await window.api.stopLiveMonitor();
    activeMessageCache.clear();
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
}

  // Filters
  function loadFilter(file, target) {
    if (fs.existsSync(file)) {
      const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
      target.value = Array.isArray(content) ? content.join('\n') : '';
    }
  }

  function saveFilter(file, source) {
    const lines = source.value.split('\n').map(l => l.trim()).filter(Boolean);
    fs.writeFileSync(file, JSON.stringify(lines, null, 2));
    showToast('✅ Filter saved');
  }

  function resetFilter(file, source, defaults) {
    fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
    loadFilter(file, source);
    showToast('🔁 Filter reset');
  }

  addVideoFilterBtn.addEventListener('click', async () => {
    const entry = newVideoFilterInput.value.trim();
    if (!entry) return showToast('❗ Empty entry');
    await window.api.addFilterEntry('video', entry);
    loadFilter(videoFilterPath, videoFilterBox);
    newVideoFilterInput.value = '';
    showToast('➕ Added to Video filter');
  });

  addLiveFilterBtn.addEventListener('click', async () => {
    const entry = newLiveFilterInput.value.trim();
    if (!entry) return showToast('❗ Empty entry');
    await window.api.addFilterEntry('live', entry);
    loadFilter(liveFilterPath, liveFilterBox);
    newLiveFilterInput.value = '';
    showToast('➕ Added to Live filter');
  });

  saveVideoFilterBtn.addEventListener('click', () => saveFilter(videoFilterPath, videoFilterBox));
  resetVideoFilterBtn.addEventListener('click', () =>
    resetFilter(videoFilterPath, videoFilterBox, [
      'been watching',
      'source of inspiration',
      'thanks for your content',
      'inspiring me daily',
      'positive vibes only'
    ])
  );

  saveLiveFilterBtn.addEventListener('click', () => saveFilter(liveFilterPath, liveFilterBox));
  resetLiveFilterBtn.addEventListener('click', () =>
    resetFilter(liveFilterPath, liveFilterBox, ['buy', 'check out my channel', 'sub4sub'])
  );

  loadFilter(videoFilterPath, videoFilterBox);
  loadFilter(liveFilterPath, liveFilterBox);
}

// ============ THEME LOADER ============
function applyThemeFromConfig() {
  if (!fs.existsSync(configPath)) return;

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const root = document.documentElement;
    if (config.theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.setAttribute('data-theme', 'light');

    if (config.fontFamily) {
      root.style.setProperty('--font-family', config.fontFamily);
    }
  } catch (e) {
    console.error('Failed to load theme from config:', e);
  }
}

// ============ HELPERS ============
function showToast(msg = '✔️ Task complete') {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function appendLog(line) {
  if (!logBox) return;
  logBox.textContent += `\n${line}`;
  logBox.scrollTop = logBox.scrollHeight;
}

function appendLiveLog(line) {
  if (!liveLogBox || activeMessageCache.has(line)) return;
  activeMessageCache.add(line);
  liveLogBox.textContent += `\n${line}`;
  liveLogBox.scrollTop = liveLogBox.scrollHeight;
}

// ============ INIT ============
window.addEventListener('DOMContentLoaded', async () => {
  applyThemeFromConfig();

  const current = window.location.pathname;
  if (current.includes('step1.html')) await loadStep1();
  else if (current.includes('step2.html')) await loadStep2();
  else if (current.includes('step3.html')) await loadStep3();
});