// config.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read config:', e.message);
  }
  return {}; // return default if not found
}

function saveConfig(data) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save config:', e.message);
  }
}

module.exports = { loadConfig, saveConfig };