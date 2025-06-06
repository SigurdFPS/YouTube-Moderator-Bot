// renderer.js

const authBtn = document.getElementById('authBtn');
const videoLinkInput = document.getElementById('videoLink');
const logBox = document.getElementById('logBox');
const highLikelyBox = document.getElementById('highLikely');
const possibleLikelyBox = document.getElementById('possibleLikely');
const safeCountLine = document.getElementById('safeCount');
const toast = document.getElementById('toast');

// Buttons
const deleteHighBtn = document.getElementById('deleteHighBtn');
const reviewPossibleBtn = document.getElementById('reviewPossibleBtn');
const deleteReviewedBtn = document.getElementById('deleteReviewedBtn');

// Helpers
function appendLog(line) {
  logBox.textContent += `\n${line}`;
  logBox.scrollTop = logBox.scrollHeight;
}

function showToast(message = '✔️ Operation complete') {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// === UI EVENTS ===

authBtn.addEventListener('click', async () => {
  appendLog('🔗 Authorizing with YouTube...');
  const result = await window.api.authorizeYouTube();
  appendLog(result);
  showToast('YouTube Authorized');
});

videoLinkInput.addEventListener('change', async () => {
  const link = videoLinkInput.value.trim();
  if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
    appendLog('⚠️ Invalid YouTube link.');
    return;
  }

  appendLog('📥 Analyzing video comments...');
  const result = await window.api.analyzeComments(link);

  highLikelyBox.textContent = result.highLikely.join('\n') || 'None';
  possibleLikelyBox.textContent = result.possibleLikely.join('\n') || 'None';
  safeCountLine.textContent = `${result.safeCount} comments marked safe.`;

  result.logSteps.forEach(line => appendLog(`📝 ${line}`));
  showToast('Analysis complete');
});

deleteHighBtn.addEventListener('click', async () => {
  const msg = await window.api.deleteHighlyLikely();
  appendLog(msg);
  showToast(msg);
});

reviewPossibleBtn.addEventListener('click', () => {
  alert('Manual review not yet implemented. You can copy & review above.');
});

deleteReviewedBtn.addEventListener('click', async () => {
  const msg = await window.api.deleteReviewedComments();
  appendLog(msg);
  showToast(msg);
});