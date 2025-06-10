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

    // Store for later deletion or review
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

// === IPC: Real Deletion of Highly Likely Comments ===
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

// === IPC: Open review modal, provide comment list ===
ipcMain.handle('get-review-comments', () => {
  return lastAnalyzed.possibleLikely;
});

// === IPC: Delete selected comments after manual review ===
ipcMain.on('submit-reviewed-comments', async (_event, idsToDelete) => {
  const deleted = await deleteComments(idsToDelete);
  writeLog(`🗑️ Manually deleted ${deleted.length} reviewed comments`);
});

// === IPC: Stub fallback for Delete Reviewed button ===
ipcMain.handle('delete-reviewed-comments', async () => {
  return '🧼 Please use the Review button and select comments manually.';
});

// === LIVE CHAT MONITORING ===
const { startLiveChatListener, stopLiveChatListener } = require('./liveChat');

let liveChatInterval = null;
let recentLiveMessages = new Set();

ipcMain.handle('start-live-monitor', async () => {
  if (liveChatInterval) return '⚠️ Already monitoring live chat.';

  try {
    const startInfo = await startLiveChatListener();
    if (!startInfo || !startInfo.liveChatId) throw new Error('Live chat not found.');

    writeLog(`🟢 Monitoring started for liveChatId: ${startInfo.liveChatId}`);
    recentLiveMessages.clear();

    liveChatInterval = setInterval(async () => {
      const newMessages = await startLiveChatListener(startInfo.liveChatId);

      for (const msg of newMessages) {
        if (recentLiveMessages.has(msg.text)) continue;
        recentLiveMessages.add(msg.text);

        if (msg.isLikelySpam) {
          await deleteComments([msg.id]);
          mainWindow.webContents.send('live-log', `🛑 Deleted spam: ${msg.text}`);
        } else {
          mainWindow.webContents.send('live-log', `💬 ${msg.text}`);
        }

        // Keep memory usage low
        if (recentLiveMessages.size > 100) {
          recentLiveMessages = new Set([...recentLiveMessages].slice(-50));
        }
      }
    }, 5000);

    return '✅ Live monitoring started.';
  } catch (err) {
    return `❌ Failed to start live monitor: ${err.message}`;
  }
});

ipcMain.handle('stop-live-monitor', async () => {
  if (liveChatInterval) {
    clearInterval(liveChatInterval);
    liveChatInterval = null;
    writeLog('🔴 Live monitoring stopped.');
    return '🔴 Live monitoring stopped.';
  }
  return '⚠️ No live monitor active.';
});