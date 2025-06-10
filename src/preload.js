const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // === OAuth & Config ===
  authorizeYouTube: () => ipcRenderer.invoke('authorize-youtube'),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.send('save-config', config),
  saveEnvFile: (clientId, clientSecret) =>
    ipcRenderer.invoke('save-env-file', clientId, clientSecret),

  // === Comment Analysis ===
  analyzeComments: (videoLink) => ipcRenderer.invoke('analyze-comments', videoLink),

  // === Manual Review Support ===
  getReviewComments: () => ipcRenderer.invoke('get-review-comments'),
  submitReviewedComments: (commentIds) =>
    ipcRenderer.send('submit-reviewed-comments', commentIds),

  // === Comment Deletion ===
  deleteHighlyLikely: () => ipcRenderer.invoke('delete-highly-likely'),
  deleteReviewedComments: () => ipcRenderer.invoke('delete-reviewed-comments'),

  // === Live Chat Monitoring ===
  startLiveMonitor: (videoId) => ipcRenderer.send('start-live-monitor', videoId),
  stopLiveMonitor: () => ipcRenderer.send('stop-live-monitor'),
  deleteLiveComment: (commentId) => ipcRenderer.invoke('delete-live-comment', commentId),

  onLiveChatMessage: (callback) => {
    ipcRenderer.removeAllListeners('live-chat-message');
    ipcRenderer.on('live-chat-message', (_, msg) => callback(msg));
  },

  onLiveMonitorStopped: (callback) => {
    ipcRenderer.once('live-monitor-stopped', () => callback());
  },

  // === Filter Management ===
  addFilterEntry: (mode, entry) => ipcRenderer.invoke('add-filter-entry', mode, entry),
  resetFilters: (mode) => ipcRenderer.invoke('reset-filters', mode),

  // === Step Navigation ===
  loadStep2: () => ipcRenderer.send('load-step-2'),
  loadStep3: () => ipcRenderer.send('load-step-3'),
});