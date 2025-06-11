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
      console.error('Failed to write .env file:', err);
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

  const selector = document.getElementById('fontSelector');
  const toggle = document.getElementById('tabToggle');
  const videoTab = document.getElementById('video');
  const liveTab = document.getElementById('live');

  const themes = {
    default: { title: "'Segoe UI'", paragraph: "'Segoe UI'", text: "#000", bg: "#fff", accent: "#1d72f3" },
    classic: { title: "'Oswald'", paragraph: "'EB Garamond'", text: "#1e1e1e", bg: "#faf8f5", accent: "#6a4e42" },
    modern: { title: "'Roboto'", paragraph: "'Nunito'", text: "#222", bg: "#f6f8fa", accent: "#1976d2" },
    elegant: { title: "'Spectral'", paragraph: "'Karla'", text: "#2c2c2c", bg: "#fbfbf7", accent: "#9a6b99" },
    futuristic: { title: "'Abril Fatface'", paragraph: "'Poppins'", text: "#fff", bg: "#1a1a1a", accent: "#00ffff" },
    minimalist: { title: "'Source Sans Pro'", paragraph: "'Source Serif Pro'", text: "#111", bg: "#fefefe", accent: "#4caf50" },
  };

  function applyTheme(key) {
    const theme = themes[key] || themes.default;
    document.body.style.setProperty('--title-font', theme.title);
    document.body.style.setProperty('--paragraph-font', theme.paragraph);
    document.body.style.setProperty('--text', theme.text);
    document.body.style.setProperty('--bg', theme.bg);
    document.body.style.setProperty('--accent', theme.accent);
    document.body.style.setProperty('--btn-bg', theme.accent);
    document.body.style.setProperty('--btn-text', theme.text === '#ffffff' ? '#000' : '#fff');
  }

  window.api.loadConfig().then(cfg => {
    const selected = themes.hasOwnProperty(cfg?.font) ? cfg.font : 'default';
    selector.value = selected;
    applyTheme(selected);
    const isLive = cfg?.mode === 'live';
    toggle.checked = isLive;
    videoTab.classList.toggle('active', !isLive);
    liveTab.classList.toggle('active', isLive);
  });

  selector.addEventListener('change', () => {
    const selected = selector.value;
    applyTheme(selected);
    window.api.saveConfig({ font: selected });
  });

  toggle.addEventListener('change', () => {
    const isLive = toggle.checked;
    videoTab.classList.toggle('active', !isLive);
    liveTab.classList.toggle('active', isLive);
    window.api.saveConfig({ mode: isLive ? 'live' : 'video' });
  });

  const commentsData = { high: [], possible: [], safe: [] };
  const currentPages = { high: 1, possible: 1, safe: 1 };
  const COMMENTS_PER_PAGE = 10;

  function renderTab(tab) {
    const box = document.getElementById(`${tab}CommentsBox`);
    const pagination = document.getElementById(`${tab}Pagination`);
    const page = currentPages[tab];
    const start = (page - 1) * COMMENTS_PER_PAGE;
    const items = commentsData[tab].slice(start, start + COMMENTS_PER_PAGE);
    box.innerHTML = items.map(t => `<p>${t}</p>`).join('') || '<i>No comments</i>';

    const totalPages = Math.ceil(commentsData[tab].length / COMMENTS_PER_PAGE);
    pagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.classList.toggle('active', i === page);
      btn.addEventListener('click', () => {
        currentPages[tab] = i;
        renderTab(tab);
      });
      pagination.appendChild(btn);
    }
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.comment-boxes > .tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(btn.dataset.tab).classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });

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
      const logEntry = `${tag} [${msg.author}]: ${msg.text}`;
      if (activeMessageCache.has(logEntry)) return;

      appendLiveLog(logEntry);
      if (msg.isLikelySpam) {
        window.api.deleteLiveComment(msg.id).then(() => {
          appendLiveLog(`🗑️ Deleted from ${msg.author}`);
          activeMessageCache.delete(logEntry);
        });
      } else {
        appendLiveLog(`✅ Allowed from ${msg.author}`);
        activeMessageCache.delete(logEntry);
      }
    });
  });

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