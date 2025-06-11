const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // === Step 1: OAuth Client Credentials ===
  saveEnvFile: (clientId, clientSecret) =>
    ipcRenderer.invoke('save-env-file', clientId, clientSecret),

  // === Step 2: YouTube Authorization ===
  authorizeYouTube: () =>
    ipcRenderer.invoke('authorize-youtube'),

  // === Config Management ===
  loadConfig: () =>
    ipcRenderer.invoke('load-config'),
  saveConfig: (config) =>
    ipcRenderer.send('save-config', config),

  // === Theme Configuration ===
  updateFontFamily: (font) =>
    ipcRenderer.send('update-font-family', font),
  toggleTheme: (darkMode) =>
    ipcRenderer.send('toggle-theme', darkMode),

  // Optional listener for dynamic updates
  onThemeUpdated: (callback) =>
    ipcRenderer.on('theme-updated', (_, data) => callback(data)),

  // === Step Navigation ===
  loadStep1: () =>
    ipcRenderer.send('load-step-1'),
  loadStep2: () =>
    ipcRenderer.send('load-step-2'),
  loadStep3: () =>
    ipcRenderer.send('load-step-3'),

  // === Comment Analysis ===
  analyzeComments: (videoLink) =>
    ipcRenderer.invoke('analyze-comments', videoLink),
  deleteHighlyLikely: () =>
    ipcRenderer.invoke('delete-highly-likely'),

  // === Manual Review Workflow ===
  getReviewComments: () =>
    ipcRenderer.invoke('get-review-comments'),
  submitReviewedComments: (commentIds) =>
    ipcRenderer.send('submit-reviewed-comments', commentIds),
  deleteReviewedComments: () =>
    ipcRenderer.invoke('delete-reviewed-comments'),

  // === Live Chat Monitor ===
  startLiveMonitor: (videoId) =>
    ipcRenderer.send('start-live-monitor', videoId),
  stopLiveMonitor: () =>
    ipcRenderer.send('stop-live-monitor'),
  deleteLiveComment: (commentId) =>
    ipcRenderer.invoke('delete-live-comment', commentId),

  onLiveChatMessage: (callback) => {
    ipcRenderer.removeAllListeners('live-chat-message');
    ipcRenderer.on('live-chat-message', (_, msg) => callback(msg));
  },
  onLiveMonitorStopped: (callback) => {
    ipcRenderer.once('live-monitor-stopped', () => callback());
  },

  // === Filter Management ===
  addFilterEntry: (mode, entry) =>
    ipcRenderer.invoke('add-filter-entry', mode, entry),
  resetFilters: (mode) =>
    ipcRenderer.invoke('reset-filters', mode),
  openFilterFile: (mode) =>
    ipcRenderer.invoke('open-filter-file', mode),
});

// ✅ Legacy access for modal windows
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (...args) => ipcRenderer.send(...args),
  invoke: (...args) => ipcRenderer.invoke(...args),
  on: (...args) => ipcRenderer.on(...args),
  once: (...args) => ipcRenderer.once(...args),
  removeAllListeners: (...args) => ipcRenderer.removeAllListeners(...args),
});