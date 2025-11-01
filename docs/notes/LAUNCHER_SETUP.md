# EduLens Hybrid One-Click Launcher Setup

## ✅ Complete Setup Status

All components for the one-click launcher have been created and verified.

### Deliverables

| Component | Location | Status | Purpose |
|-----------|----------|--------|---------|
| **Launcher Script** | `scripts/launch-edulens.ps1` | ✅ Created | PowerShell orchestrator - starts backend, waits for port 5000, launches Electron |
| **Batch Wrapper** | `launch-edulens.bat` | ✅ Created | Double-click launcher - calls PowerShell without showing console |
| **Shortcut Creator** | `scripts/create-shortcut.ps1` | ✅ Created | Creates Windows desktop shortcut with proper icon/working dir |
| **Desktop Shortcut** | `C:\Users\Harsh\OneDrive\Desktop\EduLens Hybrid.lnk` | ✅ Created | One-click launch from desktop |
| **Verification Script** | `scripts/verify-demo.js` | ✅ Created | Checks all launcher components are working |
| **NPM Scripts** | `package.json` | ✅ Updated | Added `start`, `dev:backend`, `dev:frontend`, `dev:electron`, `verify:demo`, `create-shortcut` |

---

## 🚀 How to Launch EduLens Hybrid

### Option 1: Desktop Shortcut (Recommended)
```
1. Double-click "EduLens Hybrid" icon on your Desktop
2. Wait ~5-10 seconds for startup
3. Electron window opens with app loaded
```

### Option 2: Double-Click Batch File
```
1. Navigate to: C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid\
2. Double-click: launch-edulens.bat
3. PowerShell terminal appears briefly, then closes
4. Electron window opens
```

### Option 3: Command Line / npm
```bash
cd C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid
npm start
```

### Option 4: Backend-Only (Development)
```bash
cd C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid
PowerShell -ExecutionPolicy Bypass -File scripts/launch-edulens.ps1 -NoLaunch
# Backend runs on port 5000, Electron not launched
# Frontend available at http://localhost:5173
```

---

## 🔍 Launcher Features

### Automatic Startup Sequence
1. **Validates Node.js** (≥ 18 required)
2. **Checks .env file** (uses defaults if missing)
3. **Cleans up old processes** on ports 5000 & 5173
4. **Starts Express backend** in background PowerShell job
5. **Waits for port 5000** to be ready (up to 30 seconds)
6. **Launches Electron app** (frontend)
7. **Logs everything** to `logs/launcher.log`

### Environment Variables
The launcher automatically loads `.env` file which contains:
- `FOCUS_SECRET_KEY` - AES-256 encryption key for sessions
- `OLLAMA_BASE_URL` - Offline AI server URL (default: http://localhost:11434)
- `GROQ_API_KEY`, `CLAUDE_API_KEY`, `GEMINI_API_KEY` - Online AI provider keys
- `PORT=5000` - Backend server port

### Logging
All launcher output is logged to:
```
logs/launcher.log
```
Check this file if the launcher fails to start.

---

## ✅ Verification

Run this command to verify all launcher components:
```bash
npm run verify:demo
```

Expected output:
```
✅ Launcher script found and valid
✅ Batch wrapper found and valid
✅ Create-shortcut script found and valid
✅ Desktop shortcut found: C:\Users\Harsh\OneDrive\Desktop\EduLens Hybrid.lnk
✅ All required npm scripts found
✅ Project structure is complete
✅ .env file found
✅ Port 5000 (backend) is available
✅ Port 5173 (frontend) is available
✅ Logs directory exists

✅ Demo Launcher is READY TO USE!
```

---

## 🔧 Troubleshooting

### Issue: "Node.js not found"
**Solution**: Install Node.js ≥ 18 from https://nodejs.org/

### Issue: Port 5000 already in use
**Solution**: Kill existing process
```powershell
Get-NetTCPConnection -LocalPort 5000 | Stop-Process -Force
```

### Issue: Port 5173 already in use
**Solution**: Kill existing process
```powershell
Get-NetTCPConnection -LocalPort 5173 | Stop-Process -Force
```

### Issue: Backend fails to start
**Check**: 
1. Logs at `logs/launcher.log`
2. Node modules: `npm install`
3. Backend server: `node server/server.js` (manually test)

### Issue: Electron window won't open
**Check**:
1. Vite dev server: `npm run dev:frontend`
2. Backend health: `curl http://localhost:5000/health`
3. Logs: `logs/launcher.log`

### Issue: "Shortcut creation failed"
**Solution**: Run manually
```bash
npm run create-shortcut
```
Or create shortcut directly (see desktop shortcut creation below)

---

## 🎨 Desktop Shortcut Properties

The desktop shortcut (`EduLens Hybrid.lnk`) is configured with:
- **Target**: `launch-edulens.bat`
- **Working Directory**: `C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid`
- **Description**: "EduLens Hybrid - AI Focus Mode Application"
- **Icon**: `assets/icon.ico` (if available)

### Recreate Desktop Shortcut
If the shortcut is deleted or corrupted:
```bash
npm run create-shortcut
```

Or create manually using PowerShell:
```powershell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\EduLens Hybrid.lnk")
$Shortcut.TargetPath = "C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid\launch-edulens.bat"
$Shortcut.WorkingDirectory = "C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid"
$Shortcut.Description = "EduLens Hybrid - AI Focus Mode Application"
$Shortcut.Save()
```

---

## 📋 Project Structure

```
edulens-hybrid/
├── launch-edulens.bat           ← Double-click this to launch
├── scripts/
│   ├── launch-edulens.ps1       ← Main launcher script
│   ├── create-shortcut.ps1      ← Creates desktop shortcut
│   └── verify-demo.js           ← Verifies launcher setup
├── server/
│   └── server.js                ← Express backend
├── src/
│   ├── App.jsx                  ← React frontend
│   └── main.jsx                 ← Vite entry point
├── electron.js                  ← Electron main process
├── electron-preload.js          ← IPC bridge
├── .env                         ← Environment variables
├── package.json                 ← NPM scripts
└── logs/
    └── launcher.log             ← Launch logs
```

---

## 🔄 Optional: Autostart on System Startup

To enable autostart on Windows login, add this comment to `electron.js`:

```javascript
// Optional: Uncomment to enable autostart on Windows login
// app.setLoginItemSettings({ openAtLogin: true });
```

Then:
```bash
npm install electron-store  # (already installed)
```

Uncomment the line and restart Electron to enable.

---

## 🧪 Development Commands

```bash
# Launch with one-click
npm start

# Backend only (port 5000)
npm run dev:backend

# Frontend only (port 5173)
npm run dev:frontend

# Electron only (requires backend running)
npm run dev:electron

# Verify launcher setup
npm run verify:demo

# Create desktop shortcut
npm run create-shortcut

# Run verification tests
npm run verify:base
npm run verify:ai
npm run verify:focus
npm run verify:analytics
```

---

## 📞 Support

If launcher fails:
1. Check `logs/launcher.log` for detailed error messages
2. Verify Node.js: `node --version` (should be ≥ 18.0.0)
3. Check ports: `netstat -ano | findstr "5000 5173"`
4. Run verification: `npm run verify:demo`
5. Test backend: `node server/server.js`
6. Test frontend: `npm run dev:frontend`

---

**Last Updated**: 2025-10-31  
**Status**: ✅ Production Ready for Demo
