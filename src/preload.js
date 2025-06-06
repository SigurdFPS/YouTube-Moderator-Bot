const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Auth
  authorizeYouTube: () => ipcRenderer.invoke('authorize-youtube'),

  // Analysis
  analyzeComments: (videoLink) => ipcRenderer.invoke('analyze-comments', videoLink),

  // Deletion
  deleteHighlyLikely: () => ipcRenderer.invoke('delete-highly-likely'),
  deleteReviewedComments: () => ipcRenderer.invoke('delete-reviewed-comments'),

  // Manual review modal support
  getReviewComments: () => ipcRenderer.invoke('get-review-comments'),
  submitReviewedComments: (commentIds) => ipcRenderer.send('submit-reviewed-comments', commentIds),
});