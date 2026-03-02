const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cvinnaAPI', {
  enableDeveloperMode: () => ipcRenderer.send('enable-developer-mode'),
});
