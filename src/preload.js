const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  authorizeYouTube: () => ipcRenderer.invoke('authorize-youtube'),
  analyzeComments: (videoLink) => ipcRenderer.invoke('analyze-comments', videoLink),
  deleteHighlyLikely: () => ipcRenderer.invoke('delete-highly-likely'),
  deleteReviewedComments: () => ipcRenderer.invoke('delete-reviewed-comments'),
});