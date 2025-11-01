import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ytbridge', {
  version: process.versions.electron,
})
