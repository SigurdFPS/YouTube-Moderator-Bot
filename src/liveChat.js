const { google } = require('googleapis');
const { getOAuthClient } = require('./auth');
const { analyzeComments } = require('./bot');

const youtube = google.youtube('v3');

let polling = false;
let interval = null;

/**
 * Gets the liveChatId from the user's currently active live stream.
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

  const liveChatId = broadcasts[0].snippet.liveChatId;
  return liveChatId;
}

/**
 * Polls messages from the given liveChatId.
 */
async function pollLiveChat(liveChatId, onMessages) {
  const auth = getOAuthClient();
  let nextPageToken = '';
  polling = true;

  async function poll() {
    if (!polling) return;

    try {
      const res = await youtube.liveChatMessages.list({
        auth,
        liveChatId,
        part: ['snippet', 'authorDetails'],
        pageToken: nextPageToken,
      });

      const messages = res.data.items.map((item) => ({
        id: item.id,
        text: item.snippet.displayMessage,
        author: item.authorDetails.displayName,
        publishedAt: item.snippet.publishedAt,
      }));

      if (messages.length > 0 && typeof onMessages === 'function') {
        onMessages(messages);
      }

      nextPageToken = res.data.nextPageToken;
    } catch (err) {
      console.error('❌ Failed to fetch live chat messages:', err.message);
      polling = false;
    }
  }

  interval = setInterval(poll, 5000); // every 5 seconds
  poll(); // run immediately
}

/**
 * Stops the current polling session.
 */
function stopPolling() {
  polling = false;
  if (interval) clearInterval(interval);
  console.log('🛑 Live chat polling stopped.');
}

/**
 * Starts Live Chat Monitoring with spam detection callback.
 */
async function startLiveChatMonitor(onSpamDetected = () => {}) {
  try {
    const liveChatId = await getLiveChatId();
    console.log('🎥 Live chat found. Starting monitor...');

    pollLiveChat(liveChatId, (messages) => {
      const result = analyzeComments(messages);
      if (result.highLikely.length || result.possibleLikely.length) {
        onSpamDetected({
          highLikely: result.highLikely,
          possibleLikely: result.possibleLikely,
          all: messages,
        });
      }
    });
  } catch (err) {
    console.error('❌ Live chat monitor error:', err.message);
  }
}

module.exports = {
  startLiveChatMonitor,
  stopPolling,
};