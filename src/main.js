const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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

let mainWindow;
let lastAnalyzed = {
  highlyLikely: [],
  possibleLikely: [],
};

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

// === IPC: YouTube OAuth Authorization ===
ipcMain.handle('authorize-youtube', async () => {
  try {
    await authorize();
    writeLog('✅ YouTube account successfully authenticated');
    return '✅ YouTube account successfully authenticated';
  } catch (err) {
    writeLog(`❌ Authorization failed: ${err.message}`);
    return `❌ Authorization failed: ${err.message}`;
  }
});

// === IPC: Analyze YouTube Comments ===
ipcMain.handle('analyze-comments', async (_event, videoLink) => {
  const logSteps = [];

  try {
    const videoId = extractVideoId(videoLink);
    if (!videoId) throw new Error('Invalid YouTube link or missing video ID');

    writeLog(`🎯 Video received: ${videoLink}`);
    logSteps.push(`🎯 Video received: ${videoLink}`);

    const comments = await fetchComments(videoId);
    writeLog(`📥 Fetched ${comments.length} comments`);
    logSteps.push(`📥 Fetched ${comments.length} comments`);

    const analysis = analyzeComments(comments);

    lastAnalyzed.highlyLikely = analysis.highLikely;
    lastAnalyzed.possibleLikely = analysis.possibleLikely;

    const summary = [
      `🚩 Highly likely spam: ${analysis.highLikely.length}`,
      `⚠️ Possible spam: ${analysis.possibleLikely.length}`,
      `✅ Safe comments: ${analysis.safeCount}`,
    ];

    writeGroup(summary);
    logSteps.push(...summary);
    logSteps.push('🧠 Analysis complete. Generating report...');

    const reportFile = generateReport({
      videoLink,
      highLikely: analysis.highLikely,
      possibleLikely: analysis.possibleLikely,
      safeCount: analysis.safeCount,
    });

    logSteps.push(`📄 Report saved: ${reportFile}`);
    writeLog(`📄 Report saved: ${reportFile}`);

    return {
      highLikely: analysis.highLikely.map(c => c.text),
      possibleLikely: analysis.possibleLikely.map(c => c.text),
      safeCount: analysis.safeCount,
      logSteps,
    };
  } catch (err) {
    writeLog(`❌ Error analyzing video: ${err.message}`);
    logSteps.push(`❌ Error: ${err.message}`);
    return {
      highLikely: [],
      possibleLikely: [],
      safeCount: 0,
      logSteps,
    };
  }
});

// === IPC: Deletion ===
ipcMain.handle('delete-highly-likely', async () => {
  if (!lastAnalyzed.highlyLikely.length) {
    return '⚠️ No highly likely comments available to delete.';
  }

  const deleted = await deleteComments(
    lastAnalyzed.highlyLikely.map(c => c.id)
  );

  writeLog(`🧹 Deleted ${deleted.length} highly likely comments`);
  return `🧹 Deleted ${deleted.length} highly likely comments`;
});

ipcMain.handle('get-review-comments', () => {
  return lastAnalyzed.possibleLikely;
});

ipcMain.on('submit-reviewed-comments', async (_event, idsToDelete) => {
  const deleted = await deleteComments(idsToDelete);
  writeLog(`🗑️ Manually deleted ${deleted.length} reviewed comments`);
});

ipcMain.handle('delete-reviewed-comments', async () => {
  return '🧼 Please use the Review button and select comments manually.';
});

// === IPC: Live Chat Monitoring ===
let liveMonitorActive = false;

ipcMain.on('start-live-monitor', async (_event, videoId) => {
  if (liveMonitorActive) {
    mainWindow.webContents.send('live-log', '⚠️ Already monitoring.');
    return;
  }

  liveMonitorActive = true;

  await startLiveChatMonitor(async ({ highLikely, possibleLikely, all }) => {
    for (const msg of highLikely) {
      await deleteComments([msg.id]);
      mainWindow.webContents.send('live-log', `🛑 Deleted spam: ${msg.text}`);
    }

    for (const msg of possibleLikely) {
      mainWindow.webContents.send('live-log', `⚠️ Suspected: ${msg.text}`);
    }

    for (const msg of all) {
      mainWindow.webContents.send('live-log', `💬 ${msg.author}: ${msg.text}`);
    }
  });

  writeLog('🟢 Live monitor started');
});

ipcMain.on('stop-live-monitor', () => {
  stopPolling();
  liveMonitorActive = false;
  mainWindow.webContents.send('live-log', '🔴 Monitoring stopped.');
  mainWindow.webContents.send('live-monitor-stopped');
  writeLog('🔴 Live monitor stopped');
});