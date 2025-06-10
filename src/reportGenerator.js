const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

/**
 * Generates a detailed report for static video analysis.
 * @param {Object} params
 * @param {string} params.videoLink
 * @param {Array} params.highLikely
 * @param {Array} params.possibleLikely
 * @param {number} params.safeCount
 * @returns {string} path to saved report
 */
function generateReport({ videoLink, highLikely, possibleLikely, safeCount }) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const dateStr = now.toLocaleString();
  const reportFilePath = path.join(logDir, `${timestamp}_report.txt`);

  const reportLines = [
    `🧾 YouTube Comment Analysis Report`,
    `Date: ${dateStr}`,
    `Video: ${videoLink}`,
    '',
    `📊 Summary`,
    `- Highly Likely Spam: ${highLikely.length}`,
    `- Possible Spam: ${possibleLikely.length}`,
    `- Safe Comments: ${safeCount}`,
    `- Total Processed: ${highLikely.length + possibleLikely.length + safeCount}`,
    '',
    `========================`,
    `🚩 Highly Likely Spam Comments`,
    `========================`,
    ...highLikely.map(c => `• ${c.text} [Reason: ${c.reason}]`),
    '',
    `========================`,
    `⚠️  Possible Spam Comments`,
    `========================`,
    ...possibleLikely.map(c => `• ${c.text} [Reason: ${c.reason}]`),
  ];

  fs.writeFileSync(reportFilePath, reportLines.join('\n'), 'utf-8');
  return reportFilePath;
}

/**
 * Appends a real-time entry to a Live Mode session report file.
 * Creates file on first write.
 * @param {Object} msg
 * @param {string} msg.text
 * @param {string} msg.reason
 * @param {string} [msg.author]
 * @param {boolean} isHighLikely
 */
function appendLiveReport(msg, isHighLikely) {
  const today = new Date().toISOString().split('T')[0];
  const liveLogPath = path.join(logDir, `${today}_live_mode.txt`);

  const time = new Date().toLocaleTimeString();
  const author = msg.author ? `(${msg.author})` : '';
  const label = isHighLikely ? '🛑 SPAM' : '⚠️ SUSPECT';
  const line = `[${time}] ${label} ${author}: ${msg.text} [Reason: ${msg.reason}]`;

  fs.appendFileSync(liveLogPath, line + '\n', 'utf-8');
}

module.exports = {
  generateReport,
  appendLiveReport,
};