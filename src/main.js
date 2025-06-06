const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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

// === Mocked Comment Fetcher ===
function fetchCommentsForVideo(videoLink) {
  // Simulate pulling comments from YouTube
  return [
    "Your videos are always very useful! Thank you for this new knowledge! 🍓",
    "Been watching you for a long time now 💕🎂",
    "Your videos have been a real source of inspiration 🦖👑",
    "Just saying hi",
    "Subbed because you taught me something cool",
    "Amazing content 🔥🔥🔥",
    "Thanks!", // short generic
    "Thanks!", // repeated
    "This helped me finish my project 💡",
  ];
}

// === Spam Detection Logic ===
function analyzeComments(comments) {
  const highLikely = [];
  const possibleLikely = [];
  const seenTexts = new Set();

  const highSpamKeywords = ['source of inspiration', 'been watching', 'amaze me', 'positive content', '💕', '👑', '🎂', '🦖', '💖'];
  const possibleSpamKeywords = ['useful', 'amazing', 'cool', '🔥', 'thanks', 'helped'];

  for (const comment of comments) {
    const lowered = comment.toLowerCase();
    const deduplicated = seenTexts.has(lowered);

    if (deduplicated) {
      highLikely.push(comment + ' (duplicate)');
      continue;
    }

    seenTexts.add(lowered);

    if (highSpamKeywords.some(k => lowered.includes(k))) {
      highLikely.push(comment);
    } else if (possibleSpamKeywords.some(k => lowered.includes(k))) {
      possibleLikely.push(comment);
    }
  }

  const flaggedTotal = highLikely.length + possibleLikely.length;
  const safeCount = comments.length - flaggedTotal;

  return {
    highLikely,
    possibleLikely,
    safeCount,
  };
}

// === IPC Handlers ===
ipcMain.handle('authorize-youtube', async () => {
  return '✅ YouTube account successfully authenticated (stub)';
});

ipcMain.handle('analyze-comments', async (_event, videoLink) => {
  const logSteps = [];

  logSteps.push(`Video received: ${videoLink}`);
  const comments = fetchCommentsForVideo(videoLink);
  logSteps.push(`Fetched ${comments.length} comments...`);

  const analysis = analyzeComments(comments);

  logSteps.push(`Highly likely spam: ${analysis.highLikely.length}`);
  logSteps.push(`Possible spam: ${analysis.possibleLikely.length}`);
  logSteps.push(`Safe comments: ${analysis.safeCount}`);
  logSteps.push('Analysis complete. Report generated.');

  // Save to file
  const date = new Date().toISOString().split('T')[0];
  const logPath = path.join(__dirname, 'logs');
  if (!fs.existsSync(logPath)) fs.mkdirSync(logPath);
  const reportFile = path.join(logPath, `${date}_report.txt`);

  const content = `Video: ${videoLink}
Date: ${new Date().toLocaleString()}
Highly Likely: ${analysis.highLikely.length}
Possible: ${analysis.possibleLikely.length}
Safe: ${analysis.safeCount}
Comments Total: ${comments.length}

=== Highly Likely ===
${analysis.highLikely.join('\n')}

=== Possible ===
${analysis.possibleLikely.join('\n')}
`;

  fs.writeFileSync(reportFile, content);
  logSteps.push(`Report saved: ${reportFile}`);

  return {
    highLikely: analysis.highLikely,
    possibleLikely: analysis.possibleLikely,
    safeCount: analysis.safeCount,
    logSteps,
  };
});

ipcMain.handle('delete-highly-likely', async () => {
  // Simulated
  return '🧹 Deleted highly likely comments (stub).';
});

ipcMain.handle('delete-reviewed-comments', async () => {
  // Simulated
  return '🗑️ Deleted reviewed comments (stub).';
});