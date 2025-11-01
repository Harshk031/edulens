# Phase 3 — Electron Migration

## Goal
Run EduLens as a desktop app for full control (kiosk, window chrome, preload, secure storage).

## Problems Faced
1) YouTube Error 153 / NET::ERR_BLOCKED_BY_RESPONSE
- <webview> + file:// origins triggered stricter checks.
- CSP and referrer/origin heuristics blocked the player.

2) Security settings vs. functionality
- Temptation to disable webSecurity or enable nodeIntegration caused risks.

3) IPC and preload wiring
- Context isolation and preload paths had to be correct.

## How We Solved
- Kept webSecurity: true and contextIsolation: true.
- Introduced a local HTTP embed wrapper to normalize origin.
- Ensured preload bridge for safe IPC.

## Snippets
```js
// electron.js (ESM + safe webPreferences)
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  win.loadURL(process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`);
};
app.whenReady().then(createWindow);
```