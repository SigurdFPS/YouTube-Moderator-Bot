const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const { authorize } = require('./auth');
const { fetchComments, analyzeComments, extractVideoId } = require('./bot');
const { generateReport } = require('./reportGenerator');
const { writeLog, writeGroup } = require('./logger');

let mainWindow;

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

    const summary = [
      `🚩 Highly likely spam: ${analysis.highLikely.length}`,
      `⚠️ Possible spam: ${analysis.possibleLikely.length}`,
      `✅ Safe comments: ${analysis.safeCount}`,
    ];

    writeGroup(summary);
    logSteps.push(...summary);
    logSteps.push('🧠 Analysis complete. Generating report...');

    // === Generate and save report ===
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

// === IPC: Stubbed Deletion Actions ===
ipcMain.handle('delete-highly-likely', async () => {
  writeLog('🧹 Deleted highly likely comments (stub)');
  return '🧹 Deleted highly likely comments (stub).';
});

ipcMain.handle('delete-reviewed-comments', async () => {
  writeLog('🗑️ Deleted reviewed comments (stub)');
  return '🗑️ Deleted reviewed comments (stub).';
});