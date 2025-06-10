const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // === Auth ===
  authorizeYouTube: () => ipcRenderer.invoke('authorize-youtube'),

  // === Comment Analysis ===
  analyzeComments: (videoLink) => ipcRenderer.invoke('analyze-comments', videoLink),

  // === Deletion ===
  deleteHighlyLikely: () => ipcRenderer.invoke('delete-highly-likely'),
  deleteReviewedComments: () => ipcRenderer.invoke('delete-reviewed-comments'),

  // === Manual Review Support ===
  getReviewComments: () => ipcRenderer.invoke('get-review-comments'),
  submitReviewedComments: (commentIds) =>
    ipcRenderer.send('submit-reviewed-comments', commentIds),

  // === Live Chat Monitoring ===
  startLiveMonitor: (videoId) => ipcRenderer.send('start-live-monitor', videoId),
  stopLiveMonitor: () => ipcRenderer.send('stop-live-monitor'),

  onLiveChatMessage: (callback) => {
    ipcRenderer.removeAllListeners('live-chat-message');
    ipcRenderer.on('live-chat-message', (_, msg) => callback(msg));
  },

  onLiveMonitorStopped: (callback) => {
    ipcRenderer.once('live-monitor-stopped', () => callback());
  },

  deleteLiveComment: (commentId) => ipcRenderer.invoke('delete-live-comment', commentId),

  // === Config Persistence ===
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.send('save-config', config),
});