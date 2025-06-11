const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { authorize } = require('./auth');
const {
  fetchComments,
  analyzeComments,
  extractVideoId,
  deleteComments,
} = require('./bot');
const { generateReport } = require('./reportGenerator');
const { writeLog, writeGroup } = require('./logger');
const {
  startLiveChatMonitor,
  stopPolling,
  setMainWindow,
} = require('./liveChat');

const APPDATA_DIR = path.join(app.getPath('userData'), 'YouTubeCommentCleaner');
const CONFIG_PATH = path.join(APPDATA_DIR, 'config.json');
const ENV_PATH = path.join(APPDATA_DIR, '.env');
const TOKENS_PATH = path.join(APPDATA_DIR, 'tokens.json');

let mainWindow;
let reviewWindow; // NEW: Modal reference
let lastAnalyzed = {
  highlyLikely: [],
  possibleLikely: [],
};

function ensureAppDir() {
  if (!fs.existsSync(APPDATA_DIR)) fs.mkdirSync(APPDATA_DIR, { recursive: true });
}

function getDefaultConfig() {
  return {
    font: 'default',
    mode: 'video',
    '--title-font': "'Segoe UI', sans-serif",
    '--paragraph-font': "'Segoe UI', sans-serif",
    '--text': '#000000',
    '--bg': '#ffffff',
    '--accent': '#1d72f3',
    '--btn-bg': '#1d72f3',
    '--btn-text': '#ffffff',
    darkMode: false,
  };
}

function loadConfig() {
  ensureAppDir();
  const defaultConfig = getDefaultConfig();
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return { ...defaultConfig, ...userConfig };
    } else {
      saveConfig(defaultConfig);
      return defaultConfig;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
    return defaultConfig;
  }
}

function saveConfig(config) {
  try {
    ensureAppDir();
    const fullConfig = { ...getDefaultConfig(), ...config };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(fullConfig, null, 2));
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

function getStartupStepFile() {
  const envExists = fs.existsSync(ENV_PATH);
  const tokensExist = fs.existsSync(TOKENS_PATH);
  if (!envExists) return 'step1.html';
  if (!tokensExist) return 'step2.html';
  return 'step3.html';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 560,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  const startupFile = getStartupStepFile();
  mainWindow.loadFile(path.join(__dirname, '/steps', startupFile));
  setMainWindow(mainWindow);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// === Navigation ===
ipcMain.on('load-step-2', () => {
  mainWindow.loadFile(path.join(__dirname, '/steps/step2.html'));
});
ipcMain.on('load-step-3', () => {
  mainWindow.loadFile(path.join(__dirname, '/steps/step3.html'));
});

// === Step 1: Save .env ===
ipcMain.handle('save-env-file', async (_event, clientId, clientSecret) => {
  try {
    ensureAppDir();
    const content = [
      `YT_CLIENT_ID=${clientId}`,
      `YT_CLIENT_SECRET=${clientSecret}`,
      `GOOGLE_REDIRECT_URI=http://localhost:42813`,
      `REDIRECT_PORT=42813`,
    ].join('\n');
    fs.writeFileSync(ENV_PATH, content);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// === Step 2: YouTube OAuth ===
ipcMain.handle('authorize-youtube', async () => {
  try {
    await authorize();
    writeLog('✅ YouTube account successfully authenticated', 'video');
    fs.writeFileSync(TOKENS_PATH, '{}'); // placeholder
    return '✅ YouTube account successfully authenticated';
  } catch (err) {
    writeLog(`❌ Authorization failed: ${err.message}`, 'video');
    return `❌ Authorization failed: ${err.message}`;
  }
});

// === Comment Analysis ===
ipcMain.handle('analyze-comments', async (_event, videoLink) => {
  const logSteps = [];
  try {
    const videoId = extractVideoId(videoLink);
    if (!videoId) throw new Error('Invalid YouTube link');

    writeLog(`🎯 Video: ${videoLink}`, 'video');
    logSteps.push(`🎯 Video: ${videoLink}`);

    const comments = await fetchComments(videoId);
    logSteps.push(`📥 ${comments.length} comments fetched`);
    writeLog(`📥 ${comments.length} comments fetched`, 'video');

    const analysis = analyzeComments(comments, 'video');
    lastAnalyzed.highlyLikely = analysis.highLikely;
    lastAnalyzed.possibleLikely = analysis.possibleLikely;

    const summary = [
      `🚩 Highly likely: ${analysis.highLikely.length}`,
      `⚠️ Possible: ${analysis.possibleLikely.length}`,
      `✅ Safe: ${analysis.safeCount}`,
    ];

    writeGroup(summary, 'video');
    logSteps.push(...summary, '🧠 Report being generated...');

    const reportFile = generateReport({
      videoLink,
      highLikely: analysis.highLikely,
      possibleLikely: analysis.possibleLikely,
      safeCount: analysis.safeCount,
    });

    logSteps.push(`📄 Saved: ${reportFile}`);
    writeLog(`📄 Report saved: ${reportFile}`, 'video');

    return {
      highLikely: analysis.highLikely.map(c => c.text),
      possibleLikely: analysis.possibleLikely.map(c => c.text),
      safeCount: analysis.safeCount,
      logSteps,
    };
  } catch (err) {
    writeLog(`❌ Error: ${err.message}`, 'video');
    return {
      highLikely: [],
      possibleLikely: [],
      safeCount: 0,
      logSteps: [`❌ Error: ${err.message}`],
    };
  }
});

// === Comment Deletion ===
ipcMain.handle('delete-highly-likely', async () => {
  if (!lastAnalyzed.highlyLikely.length) return '⚠️ Nothing to delete.';
  const deleted = await deleteComments(lastAnalyzed.highlyLikely.map(c => c.id));
  writeLog(`🧹 Deleted ${deleted.length}`, 'video');
  return `🧹 Deleted ${deleted.length}`;
});
ipcMain.handle('get-review-comments', () => lastAnalyzed.possibleLikely);
ipcMain.on('submit-reviewed-comments', async (_event, idsToDelete) => {
  const deleted = await deleteComments(idsToDelete);
  writeLog(`🗑️ Manually deleted ${deleted.length}`, 'video');
});
ipcMain.handle('delete-reviewed-comments', async () => {
  if (!lastAnalyzed.possibleLikely.length) return '⚠️ No comments to review.';
  const deleted = await deleteComments(lastAnalyzed.possibleLikely.map(c => c.id));
  writeLog(`🧼 Deleted ${deleted.length} reviewed comments`, 'video');
  return `🧼 Deleted ${deleted.length} reviewed comments`;
});

// === Live Chat Monitor ===
let liveMonitorActive = false;

ipcMain.on('start-live-monitor', async (_event, videoId) => {
  if (liveMonitorActive) {
    mainWindow.webContents.send('live-log', '⚠️ Already monitoring');
    return;
  }
  liveMonitorActive = true;

  await startLiveChatMonitor(async (flaggedMessages) => {
    for (const msg of flaggedMessages) {
      if (msg.isLikelySpam) {
        await deleteComments([msg.id]);
        writeLog(`🛑 Deleted: ${msg.text}`, 'live');
        mainWindow.webContents.send('live-log', {
          id: msg.id,
          author: msg.author,
          text: msg.text,
          isLikelySpam: true,
        });
      } else {
        writeLog(`⚠️ Suspect: ${msg.text}`, 'live');
        mainWindow.webContents.send('live-log', {
          id: msg.id,
          author: msg.author,
          text: msg.text,
          isLikelySpam: false,
        });
      }
    }
  }, videoId);

  writeLog('🟢 Live monitor started', 'live');
  mainWindow.webContents.send('live-log', '🟢 Live monitor started');
});

ipcMain.on('stop-live-monitor', () => {
  stopPolling();
  liveMonitorActive = false;
  mainWindow.webContents.send('live-log', '🔴 Stopped');
  mainWindow.webContents.send('live-monitor-stopped');
  writeLog('🔴 Monitor stopped', 'live');
});

ipcMain.handle('delete-live-comment', async (_event, commentId) => {
  try {
    await deleteComments([commentId]);
    return `🗑️ Deleted ${commentId}`;
  } catch (err) {
    return `❌ Error deleting: ${err.message}`;
  }
});

// === Config ===
ipcMain.handle('load-config', () => loadConfig());
ipcMain.on('save-config', (_event, newConfig) => {
  const current = loadConfig();
  const merged = { ...current, ...newConfig };
  saveConfig(merged);
});

// === Theme Toggle ===
ipcMain.on('toggle-theme', (_event, darkMode) => {
  const config = loadConfig();
  config.darkMode = darkMode;
  saveConfig(config);
  mainWindow.webContents.send('theme-updated', darkMode);
});

// === Reload App ===
ipcMain.on('reload-app', () => {
  app.relaunch();
  app.exit(0);
});

// === REVIEW MODAL WINDOW ===
ipcMain.on('open-review-modal', () => {
  if (reviewWindow && !reviewWindow.isDestroyed()) {
    reviewWindow.focus();
    return;
  }

  reviewWindow = new BrowserWindow({
    width: 650,
    height: 700,
    modal: true,
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  reviewWindow.loadFile(path.join(__dirname, 'reviewModal.html'));
});