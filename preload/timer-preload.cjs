const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronTimer', {
  update: (state) => { try { ipcRenderer.send('timer:update', state); } catch {} },
  notifyEnded: () => { try { ipcRenderer.send('timer:ended'); } catch {} },
  onControl: (handler) => { try { ipcRenderer.on('timer:control', (_e, cmd) => handler && handler(cmd)); } catch {} }
});
