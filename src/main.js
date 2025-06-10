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
} = require('./liveChat');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let mainWindow;
let lastAnalyzed = {
  highlyLikely: [],
  possibleLikely: [],
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  return { theme: 'default' };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');
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

// === IPC: YouTube OAuth ===
ipcMain.handle('authorize-youtube', async () => {
  try {
    await authorize();
    writeLog('✅ YouTube account successfully authenticated', 'video');
    return '✅ YouTube account successfully authenticated';
  } catch (err) {
    writeLog(`❌ Authorization failed: ${err.message}`, 'video');
    return `❌ Authorization failed: ${err.message}`;
  }
});

// === IPC: Comment Analysis ===
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

    const analysis = analyzeComments(comments);
    lastAnalyzed.highlyLikely = analysis.highLikely;
    lastAnalyzed.possibleLikely = analysis.possibleLikely;

    const summary = [
      `🚩 Highly likely: ${analysis.highlyLikely.length}`,
      `⚠️ Possible: ${analysis.possibleLikely.length}`,
      `✅ Safe: ${analysis.safeCount}`,
    ];

    writeGroup(summary, 'video');
    logSteps.push(...summary);
    logSteps.push('🧠 Report being generated...');

    const reportFile = generateReport({
      videoLink,
      highLikely: analysis.highLikely,
      possibleLikely: analysis.possibleLikely,
      safeCount: analysis.safeCount,
    });

    logSteps.push(`📄 Saved: ${reportFile}`);
    writeLog(`📄 Report saved: ${reportFile}`, 'video');

    return {
      highLikely: analysis.highlyLikely.map(c => c.text),
      possibleLikely: analysis.possibleLikely.map(c => c.text),
      safeCount: analysis.safeCount,
      logSteps,
    };
  } catch (err) {
    writeLog(`❌ Error: ${err.message}`, 'video');
    logSteps.push(`❌ Error: ${err.message}`);
    return {
      highLikely: [],
      possibleLikely: [],
      safeCount: 0,
      logSteps,
    };
  }
});

// === IPC: Deletion Logic ===
ipcMain.handle('delete-highly-likely', async () => {
  if (!lastAnalyzed.highlyLikely.length) {
    return '⚠️ Nothing to delete.';
  }

  const deleted = await deleteComments(lastAnalyzed.highlyLikely.map(c => c.id));
  writeLog(`🧹 Deleted ${deleted.length}`, 'video');
  return `🧹 Deleted ${deleted.length}`;
});

ipcMain.handle('get-review-comments', () => {
  return lastAnalyzed.possibleLikely;
});

ipcMain.on('submit-reviewed-comments', async (_event, idsToDelete) => {
  const deleted = await deleteComments(idsToDelete);
  writeLog(`🗑️ Manually deleted ${deleted.length}`, 'video');
});

ipcMain.handle('delete-reviewed-comments', async () => {
  return '🧼 Use the review window to mark comments.';
});

// === IPC: Live Chat ===
let liveMonitorActive = false;

ipcMain.on('start-live-monitor', async (_event, videoId) => {
  if (liveMonitorActive) {
    mainWindow.webContents.send('live-log', '⚠️ Already monitoring');
    return;
  }

  liveMonitorActive = true;

  await startLiveChatMonitor(async ({ highLikely, possibleLikely, all }) => {
    for (const msg of highLikely) {
      await deleteComments([msg.id]);
      writeLog(`🛑 Deleted: ${msg.text}`, 'live');
      mainWindow.webContents.send('live-log', `🛑 Deleted: ${msg.text}`);
    }

    for (const msg of possibleLikely) {
      writeLog(`⚠️ Suspect: ${msg.text}`, 'live');
      mainWindow.webContents.send('live-log', `⚠️ Suspect: ${msg.text}`);
    }

    for (const msg of all) {
      writeLog(`💬 ${msg.author}: ${msg.text}`, 'live');
      mainWindow.webContents.send('live-log', `💬 ${msg.author}: ${msg.text}`);
    }
  });

  writeLog('🟢 Live monitor started', 'live');
});

ipcMain.on('stop-live-monitor', () => {
  stopPolling();
  liveMonitorActive = false;
  mainWindow.webContents.send('live-log', '🔴 Stopped');
  mainWindow.webContents.send('live-monitor-stopped');
  writeLog('🔴 Monitor stopped', 'live');
});

// === IPC: Config ===
ipcMain.handle('load-config', () => {
  return loadConfig();
});

ipcMain.on('save-config', (_event, newConfig) => {
  const current = loadConfig();
  const merged = { ...current, ...newConfig };
  saveConfig(merged);
});