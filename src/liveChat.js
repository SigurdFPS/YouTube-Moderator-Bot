const { google } = require('googleapis');
const { getOAuthClient } = require('./auth');
const { analyzeComments } = require('./bot');
const { writeLog } = require('./logger');

const youtube = google.youtube('v3');

let polling = false;
let interval = null;
let nextPageToken = '';
let mainWindowRef = null;

/**
 * Get the active liveChatId from the user's current livestream.
 */
async function getLiveChatId() {
  const auth = getOAuthClient();
  const res = await youtube.liveBroadcasts.list({
    auth,
    part: ['snippet'],
    broadcastStatus: 'active',
    mine: true,
  });

  const broadcasts = res.data.items;
  if (!broadcasts || broadcasts.length === 0) {
    throw new Error('No active live broadcasts found.');
  }

  return broadcasts[0].snippet.liveChatId;
}

/**
 * Start polling the live chat and return detected messages.
 */
async function startLiveChatListener(liveChatIdOverride) {
  const auth = getOAuthClient();
  const liveChatId = liveChatIdOverride || await getLiveChatId();

  const res = await youtube.liveChatMessages.list({
    auth,
    liveChatId,
    part: ['snippet', 'authorDetails'],
    pageToken: nextPageToken,
  });

  nextPageToken = res.data.nextPageToken;

  const rawMessages = res.data.items.map(item => ({
    id: item.id,
    text: item.snippet.displayMessage,
    author: item.authorDetails.displayName,
    publishedAt: item.snippet.publishedAt,
  }));

  const analysis = analyzeComments(rawMessages, 'live');

  const highlyLikelyIds = new Set(analysis.highLikely.map(m => m.id));

  const enrichedMessages = rawMessages.map(msg => ({
    ...msg,
    isLikelySpam: highlyLikelyIds.has(msg.id),
  }));

  return {
    liveChatId,
    messages: enrichedMessages,
    stats: analysis,
  };
}

/**
 * Start long-running live chat monitor with spam detection callback.
 */
async function startLiveChatMonitor(onSpamDetected = () => {}) {
  try {
    const liveChatId = await getLiveChatId();
    console.log('🎥 Live chat found. Starting monitor...');
    writeLog('🎥 Live chat found. Starting monitor...', 'live');

    polling = true;
    interval = setInterval(async () => {
      const { messages, stats } = await startLiveChatListener(liveChatId);

      // Surface stats to UI
      if (mainWindowRef) {
        mainWindowRef.webContents.send(
          'live-log',
          `📊 Analyzed ${stats.full} messages — 🛑 High: ${stats.highLikely.length}, ⚠️ Possible: ${stats.possibleLikely.length}, ✅ Safe: ${stats.safeCount}`
        );
      }

      const flagged = messages.filter(m => m.isLikelySpam);
      if (flagged.length > 0) {
        onSpamDetected(flagged);
      }
    }, 5000);
  } catch (err) {
    console.error('❌ Live chat monitor error:', err.message);
    if (mainWindowRef) {
      mainWindowRef.webContents.send('live-log', `❌ Live monitor failed: ${err.message}`);
    }
  }
}

/**
 * Stop polling.
 */
function stopPolling() {
  polling = false;
  if (interval) clearInterval(interval);
  console.log('🛑 Live chat polling stopped.');
  writeLog('🛑 Live chat polling stopped.', 'live');
}

/**
 * Inject mainWindow from main.js for UI log emission.
 */
function setMainWindow(win) {
  mainWindowRef = win;
}

module.exports = {
  getLiveChatId,
  startLiveChatListener,
  startLiveChatMonitor,
  stopPolling,
  setMainWindow,
};