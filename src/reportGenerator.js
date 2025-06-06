const fs = require('fs');
const path = require('path');

/**
 * Generates a formatted report of the analyzed comments.
 * @param {string} videoLink - Full video URL.
 * @param {Array} highLikely - Array of flagged high-likelihood spam comments.
 * @param {Array} possibleLikely - Array of flagged possible spam comments.
 * @param {number} safeCount - Number of comments not flagged.
 * @returns {string} The path to the saved report file.
 */
function generateReport({ videoLink, highLikely, possibleLikely, safeCount }) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const dateStr = now.toLocaleString();

  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

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

module.exports = {
  generateReport,
};