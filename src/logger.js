const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

/**
 * Writes a line to the daily log file.
 * @param {string} message - The message to log.
 * @param {boolean} timestamp - Whether to prepend timestamp.
 */
function writeLog(message, timestamp = true) {
  const now = new Date();
  const day = now.toISOString().split('T')[0]; // e.g., "2025-06-06"
  const logFile = path.join(logDir, `${day}.log`);

  const timeStr = now.toLocaleTimeString();
  const logEntry = timestamp ? `[${timeStr}] ${message}` : message;

  fs.appendFileSync(logFile, logEntry + '\n', 'utf-8');
  console.log(logEntry); // also mirror to terminal
}

/**
 * Log a grouped set of lines.
 * @param {string[]} lines - Multiple lines to write at once.
 * @param {boolean} timestampEach - Timestamp each line separately.
 */
function writeGroup(lines = [], timestampEach = true) {
  lines.forEach(line => writeLog(line, timestampEach));
}

module.exports = {
  writeLog,
  writeGroup,
};