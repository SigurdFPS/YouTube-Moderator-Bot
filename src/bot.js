// bot.js

const { google } = require('googleapis');
const { getOAuthClient } = require('./auth');

const youtube = google.youtube('v3');

// 🚀 Fetch all comments for a given video
async function fetchComments(videoId) {
  const auth = getOAuthClient();

  let comments = [];
  let nextPageToken = null;

  do {
    const res = await youtube.commentThreads.list({
      auth,
      part: ['snippet'],
      videoId,
      maxResults: 100,
      pageToken: nextPageToken || '',
      textFormat: 'plainText',
    });

    const items = res.data.items || [];
    for (const item of items) {
      const topComment = item.snippet.topLevelComment.snippet;
      comments.push({
        id: item.snippet.topLevelComment.id,
        text: topComment.textDisplay,
        author: topComment.authorDisplayName,
        publishedAt: topComment.publishedAt,
      });
    }

    nextPageToken = res.data.nextPageToken;
  } while (nextPageToken);

  return comments;
}

// 🧠 Intelligent spam analysis logic
function analyzeComments(comments) {
  const seen = new Set();
  const highLikely = [];
  const possibleLikely = [];
  const safe = [];

  const highSpamIndicators = [
    'been watching', 'source of inspiration', 'you always amaze me',
    'thanks for your content', 'inspiring me daily', 'positive vibes only',
  ];

  const emojiSpam = ['💕', '🎂', '👑', '🦖', '💖', '🔥', '🎉', '🥰'];
  const weakGenericReplies = ['thanks', 'amazing', 'cool', 'great video', 'love this', 'very useful'];

  for (const comment of comments) {
    const text = comment.text.trim().toLowerCase();

    // Deduplication
    if (seen.has(text)) {
      highLikely.push({ ...comment, reason: 'Duplicate comment' });
      continue;
    }
    seen.add(text);

    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
    const highMatch = highSpamIndicators.some(keyword => text.includes(keyword));
    const weakMatch = weakGenericReplies.some(keyword => text === keyword || text.includes(keyword));
    const isTooShort = text.length < 10;

    // Categorize
    if (emojiCount >= 3 || highMatch) {
      highLikely.push({ ...comment, reason: 'Emoji overload or high-risk phrase' });
    } else if (weakMatch || isTooShort) {
      possibleLikely.push({ ...comment, reason: 'Short or generic response' });
    } else {
      safe.push(comment);
    }
  }

  return {
    highLikely,
    possibleLikely,
    safeCount: safe.length,
    full: comments.length,
  };
}

// 🔍 Extracts the YouTube video ID from a full link
function extractVideoId(link) {
  const url = new URL(link);
  if (url.hostname === 'youtu.be') return url.pathname.substring(1);
  return url.searchParams.get('v');
}

module.exports = {
  fetchComments,
  analyzeComments,
  extractVideoId,
};