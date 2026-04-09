const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stickyPersistence', {
  load: () => ipcRenderer.invoke('persistence:load'),
  save: (payload) => ipcRenderer.invoke('persistence:save', payload)
});

contextBridge.exposeInMainWorld('stickyAppControls', {
  restart: () => ipcRenderer.invoke('controls:restart'),
  hide: () => ipcRenderer.invoke('controls:hide'),
  quit: () => ipcRenderer.invoke('controls:quit'),
  toggleDebug: () => ipcRenderer.invoke('controls:toggleDebug'),
  setWindowMode: (mode) => ipcRenderer.invoke('controls:setWindowMode', mode),
  setGhostMousePassthrough: (enabled) => ipcRenderer.invoke('controls:setGhostMousePassthrough', enabled)
});
