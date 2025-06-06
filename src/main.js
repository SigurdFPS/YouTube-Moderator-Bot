const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const { authorize } = require('./auth');
const { fetchComments, analyzeComments, extractVideoId } = require('./bot');

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
    await authorize(); // sets internal auth client
    return '✅ YouTube account successfully authenticated';
  } catch (err) {
    console.error('Authorization Error:', err.message);
    return `❌ Authorization failed: ${err.message}`;
  }
});

// === IPC: Analyze YouTube Comments ===
ipcMain.handle('analyze-comments', async (_event, videoLink) => {
  const logSteps = [];

  try {
    const videoId = extractVideoId(videoLink);
    if (!videoId) throw new Error('Invalid YouTube link or missing video ID');

    logSteps.push(`Video received: ${videoLink}`);
    const comments = await fetchComments(videoId);
    logSteps.push(`Fetched ${comments.length} comments...`);

    const analysis = analyzeComments(comments);

    logSteps.push(`Highly likely spam: ${analysis.highLikely.length}`);
    logSteps.push(`Possible spam: ${analysis.possibleLikely.length}`);
    logSteps.push(`Safe comments: ${analysis.safeCount}`);
    logSteps.push('Analysis complete. Report generated.');

    // === Save Log Report ===
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

    const reportFile = path.join(logDir, `${timestamp}_report.txt`);
    const fileContent = [
      `Video: ${videoLink}`,
      `Date: ${new Date().toLocaleString()}`,
      `Highly Likely: ${analysis.highLikely.length}`,
      `Possible: ${analysis.possibleLikely.length}`,
      `Safe: ${analysis.safeCount}`,
      `Comments Total: ${comments.length}`,
      '',
      '=== Highly Likely ===',
      ...analysis.highLikely.map(c => `- ${c.text} (${c.reason})`),
      '',
      '=== Possible ===',
      ...analysis.possibleLikely.map(c => `- ${c.text} (${c.reason})`),
    ].join('\n');

    fs.writeFileSync(reportFile, fileContent);
    logSteps.push(`Report saved: ${reportFile}`);

    return {
      highLikely: analysis.highLikely.map(c => c.text),
      possibleLikely: analysis.possibleLikely.map(c => c.text),
      safeCount: analysis.safeCount,
      logSteps,
    };
  } catch (err) {
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
  return '🧹 Deleted highly likely comments (stub).';
});

ipcMain.handle('delete-reviewed-comments', async () => {
  return '🗑️ Deleted reviewed comments (stub).';
});