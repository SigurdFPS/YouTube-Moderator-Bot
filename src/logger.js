const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

/**
 * Writes a log entry to the correct type log file (video or live).
 * @param {string} message - The message to log.
 * @param {'video'|'live'} type - Log type context.
 * @param {boolean} timestamp - Whether to include timestamp.
 */
function writeLog(message, type = 'video', timestamp = true) {
  const now = new Date();
  const day = now.toISOString().split('T')[0]; // e.g., "2025-06-10"
  const timeStr = now.toLocaleTimeString();

  const logFile = path.join(logDir, `${type}-${day}.log`);
  const logEntry = timestamp ? `[${timeStr}] ${message}` : message;

  fs.appendFileSync(logFile, logEntry + '\n', 'utf-8');
  console.log(logEntry); // also mirror to terminal
}

/**
 * Writes multiple lines to the same log type.
 * @param {string[]} lines - List of lines to write.
 * @param {'video'|'live'} type - Log type context.
 * @param {boolean} timestampEach - Timestamp each line separately.
 */
function writeGroup(lines = [], type = 'video', timestampEach = true) {
  lines.forEach(line => writeLog(line, type, timestampEach));
}

module.exports = {
  writeLog,
  writeGroup,
};