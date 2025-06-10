const { google } = require('googleapis');
const { getOAuthClient } = require('./auth');
const fs = require('fs');
const path = require('path');

const youtube = google.youtube('v3');

// 🔄 Load blacklist config based on mode
function loadBlacklist(mode = 'video') {
  const file = path.join(__dirname, 'src', 'filters', `blacklist_${mode}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { highSpamIndicators: [], weakReplies: [] };
  }
}

// 🧠 Spam Analysis (Live or Video mode)
function analyzeComments(comments, mode = 'video') {
  const seen = new Set();
  const highLikely = [];
  const possibleLikely = [];
  const safe = [];

  const { highSpamIndicators, weakReplies } = loadBlacklist(mode);

  for (const comment of comments) {
    const text = comment.text.trim().toLowerCase();

    // Deduplication
    if (seen.has(text)) {
      highLikely.push({ ...comment, reason: 'Duplicate comment' });
      continue;
    }
    seen.add(text);

    const emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    const hasHighSpam = highSpamIndicators.some(keyword => text.includes(keyword));
    const hasWeakReply = weakReplies.some(keyword => text === keyword || text.includes(keyword));
    const isTooShort = text.length < 10;
    const isHypeEmote = emojiCount >= 4 && !hasHighSpam && mode === 'live';

    if (hasHighSpam && !isHypeEmote) {
      highLikely.push({ ...comment, reason: 'High-risk phrase' });
    } else if (emojiCount >= 6 && mode !== 'live') {
      highLikely.push({ ...comment, reason: 'Emoji overload' });
    } else if (hasWeakReply || isTooShort) {
      possibleLikely.push({ ...comment, reason: 'Short or generic reply' });
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

// 🧹 Delete comments by ID
async function deleteComments(commentIds = []) {
  const auth = getOAuthClient();
  const results = [];

  for (const id of commentIds) {
    try {
      await youtube.comments.delete({
        auth,
        id,
      });
      results.push({ id, status: 'deleted' });
    } catch (err) {
      results.push({ id, status: 'error', message: err.message });
    }
  }

  return results;
}

// 🔍 Extract YouTube video ID from URL
function extractVideoId(link) {
  const url = new URL(link);
  if (url.hostname === 'youtu.be') return url.pathname.substring(1);
  return url.searchParams.get('v');
}

module.exports = {
  fetchComments,
  analyzeComments,
  extractVideoId,
  deleteComments,
};