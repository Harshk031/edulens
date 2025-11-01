const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('ytbridge', {
  version: process.versions.electron,
});
