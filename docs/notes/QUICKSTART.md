# 🚀 EduLens Hybrid – Quick Start Guide

## Location
```
C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid
```

## One-Command Launch (Dev Mode)
```bash
npm run dev
```
✅ This starts:
- Vite dev server on http://localhost:5173
- Electron window that loads the React app
- Hot Module Replacement (HMR) enabled

## Essential Commands

| Command | What It Does |
|---------|-------------|
| `npm run dev` | 🔥 **START HERE** – Vite + Electron |
| `npm run build` | 📦 Build for production |
| `npm run verify:base` | ✅ Check setup is correct |
| `npm run server` | 🖥️ Start Express backend (port 5000) |
| `npm run lint` | 🔍 Check code quality |

## First Time Setup

```bash
# Navigate to project
cd "C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid"

# Install dependencies (only if needed)
npm install

# Launch the app
npm run dev
```

That's it! An Electron window should open with the React app.

## Verify Everything Works

```bash
npm run verify:base
```

Should show: **🎉 Base structure verified successfully**

## Project Structure (TL;DR)

```
edulens-hybrid/
├── src/                      # React components & styles
│   ├── App.jsx               # Main app
│   └── components/           # Reusable components
├── server/                   # Express backend (for Phase 1)
├── electron.js               # Electron entry point
├── package.json              # Dependencies & scripts
├── .env.example              # Copy this to .env and add API keys
└── README.md                 # Full documentation
```

## Configuration

Copy and edit `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with:
```
PORT=5000
GROQ_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
OLLAMA_BASE_URL=http://localhost:11434
MODELS_PATH=D:/edulens-models
```

## Troubleshooting

**Electron window won't open?**
- Make sure `npm run dev` shows "Vite ready in ..." message
- Check that port 5173 is not blocked
- Try restarting npm

**YouTube video not loading?**
- Check browser console (F12 in Electron)
- Video should load when Vite is running

**Verification fails?**
- Run `npm run verify:base` to see which files are missing
- Check the file structure against README.md

## What's Next (Phase 1)

- Connect Ollama for local AI
- Connect Groq for cloud AI
- Build AI chat panel
- Implement focus lock

---

**Status**: ✅ Phase 0 Complete  
**Last Updated**: 2025-10-31  
**Location**: `C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid`

🧠 **EduLens Hybrid AI** is ready to run!
