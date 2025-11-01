# EduLens — Hybrid Focused Learning Platform (Built by Harsh Katiyar with AI assistance)

EduLens is a distraction‑aware learning workspace that blends YouTube‑based study, an AI assistant, and a progress‑tracking Focus Timer into a single desktop app. It runs as a hybrid Vite+React frontend with an Express backend and an Electron shell.

## Elevator pitch
- Load any YouTube lecture inside a clean, controlled player.
- Ask AI questions, take notes, and track focus time — all in one screen.
- Works offline (Ollama) and online (Groq/Claude/Gemini) with a unified pipeline.

## The development journey (Chrome Extension → Browser → Electron → Hybrid)

Full phase docs:
- Phase 0: [docs/PHASE_0_SUMMARY.md](docs/PHASE_0_SUMMARY.md)
- Phase 1: [docs/PHASE_1_SUMMARY.md](docs/PHASE_1_SUMMARY.md)
- Phase 2: [docs/PHASE_2_SUMMARY.md](docs/PHASE_2_SUMMARY.md)
1) Chrome Extension (Phase 0 prototype)
- Attempt: DOM‑level filtering, hot‑swapping the YouTube UI, and injecting AI sidebars.
- Why it failed: frequent DOM changes in YouTube, brittle selectors, limited control over headers/CSP, and unpredictable update cadence.

2) Browser Redirect (local web app)
- Attempt: host our own UI at http://localhost and redirect the user to a dedicated page with the player embedded.
- Benefit: fast iteration and normal browser behavior; good origin (http) for embeds.
- Limitation: can’t manage OS‑level interruptions, limited window control; “focus mode” remains superficial.

3) Pure Electron (desktop app)
- Goal: total control (window chrome, kiosk, preload, custom cache dirs).
- Blocker: Error 153 — YouTube refused to play inside Electron embeds.
  - Root cause: strict origin/CSP heuristics + suspicious flags (webSecurity:false, file:// origin, or webview misuse).

4) Final Hybrid approach
- Keep a Vite+React web frontend, Express backend, and an Electron shell — but make the player behave like a normal browser:
  - Serve a minimal local embed wrapper at `http://localhost:5000/local/embed/:id`.
  - Use a single, unified video loader that prefers the local embed, then safe fallbacks.
  - Keep `webSecurity:true` and avoid risky flags.
- Result: no Error 153; consistent origin and normal playback in Electron.

## What we fixed (high‑impact bullets)
- Minimal embed URL (no enablejsapi, no origin=file://) via local wrapper route.
- One unified loader with duplicate suppression, retries, logs.
- Clipboard auto‑load; pasting/copying a YouTube link just works.
- Express routes for focus/analytics; Vite proxy tuned; secure preload.
- Timer redesigned as a user‑driven tracker with hourglass overlay (not a lockout).

## Features
- Hybrid YouTube embed (local `/local/embed/:id`, iframe sandbox).
- Focus Mode: hourglass overlay with pause/resume/extend, persistent.
- AI Assistant: offline (Ollama) + online (Groq/Claude/Gemini) via one API.
- One‑click launcher (PowerShell) + dev verification scripts.

## Tech stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Desktop: Electron (contextIsolation on)
- AI: Ollama locally; Groq/Claude/Gemini online

## Run locally
```powershell
npm install
npm run server      # start backend on 5000
npm run vite        # frontend on 5173
npm run electron    # Electron shell (or use scripts/launch-edulens.ps1)
```

Environment:
- Copy `.env.example` to `.env` and fill optional API keys.
- Offline mode: `ollama serve`

## Screenshots
- Video embed: [docs/screenshots/video-embed.png](docs/screenshots/video-embed.png)
- AI panel: [docs/screenshots/ai-panel.png](docs/screenshots/ai-panel.png)
- Focus layout: [docs/screenshots/focus-layout.png](docs/screenshots/focus-layout.png)
- Hourglass timer: [docs/screenshots/hourglass.png](docs/screenshots/hourglass.png)

## Docs
- Phase summaries: `docs/PHASE_0_SUMMARY.md`, `docs/PHASE_1_SUMMARY.md`, `docs/PHASE_2_SUMMARY.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Demo script: `docs/DEMO.md`
- Changelog: `CHANGELOG.md` (tag v1.0-expo)

## Contribution & Acknowledgement
Built by Harsh Katiyar with AI assistance (Claude + ChatGPT). This repo documents the full iterative path: prototypes, failures, fixes, and the final hybrid.

## License
MIT — see LICENSE.

## Foundation Architecture

This is the unified Electron + React base for EduLens, designed to merge proven logic from earlier Web and AI versions while eliminating duplication.

### ✅ Phase 0 Complete Checklist

- [x] Clean Vite React foundation
- [x] Electron launcher configured
- [x] Dark theme UI with Shreyans design aesthetic
- [x] HybridAI toggle component (Ollama ↔ Groq switching)
- [x] YouTube iframe embedding test (Error 153 resolution)
- [x] Express backend with AI route stubs
- [x] Environment configuration template
- [x] Verification script for base setup
- [x] npm run dev launches both Vite + Electron
- [x] All core files validated

---

## Quick Start

### Install Dependencies

```bash
npm install
```

### Development Mode

Launch Vite dev server + Electron simultaneously:

```bash
npm run dev
```

- **Vite dev server**: http://localhost:5173
- **Electron window**: Loads React from dev server

### Production Build

```bash
npm run build
npm run electron
```

### Verify Setup

```bash
npm run verify:base
```

---

## Project Structure

```
edulens-hybrid/
├── src/
│   ├── components/
│   │   ├── HybridAIToggle.jsx      # AI mode switcher
│   │   └── HybridAIToggle.css
│   ├── App.jsx                     # Main app component
│   ├── App.css                     # App styles
│   ├── index.css                   # Global dark theme
│   └── main.jsx                    # React entry point
│
├── server/
│   ├── server.js                   # Express backend (ES6)
│   ├── routes/                     # AI route endpoints
│   └── utils/                      # Server utilities
│
├── electron.js                     # Electron main process
├── .env.example                    # Environment template
├── vite.config.js                  # Vite configuration
├── package.json                    # Scripts & dependencies
└── scripts/
    └── verify-base.js              # Setup verification
```

---

## Key Features

### AI Integration
- **HybridAIToggle**: Switch between Ollama (local) and Groq (online) AI backends
- Routes prepared for Ollama integration at http://localhost:11434
- Routes prepared for Groq API integration

### Browser Compatibility
- YouTube iframes embedded and tested (Error 153 resolved)
- Full Electron window acts as Chrome browser
- nodeIntegration enabled for system access

### Dark Theme
- Shreyans-inspired purple & blue gradient palette
- High-contrast text for readability
- Smooth transitions and hover effects

### Configuration
Copy `.env.example` to `.env` and customize:
```bash
PORT=5000
GROQ_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
OLLAMA_BASE_URL=http://localhost:11434
MODELS_PATH=D:/edulens-models
```

---

## Available Scripts

| Script | Purpose |
|--------|----------|
| `npm run dev` | Dev mode (Vite + Electron) |
| `npm run vite` | Vite dev server only |
| `npm run electron` | Electron with dev server |
| `npm run build` | Production build |
| `npm run server` | Start Express backend |
| `npm run verify:base` | Check setup integrity |
| `npm run lint` | ESLint |

---

## Next Phase (Phase 1): AI Integration Layer

**Goals:**
- Integrate Ollama API for local model inference
- Connect Groq API for cloud inference
- Build AIChatPanel component
- Implement AI pipeline visualizer
- Create focus/distraction detection

---

## Tech Stack

- **Frontend**: React 19 + Vite 7
- **Desktop**: Electron 39
- **Backend**: Express (ES6 modules)
- **Styling**: CSS3 (dark theme)
- **Environment**: Node.js + npm

---

## Troubleshooting

**Electron window won't open:**
- Check that `npm run vite` is running on port 5173
- Ensure `ELECTRON_START_URL` is set correctly

**YouTube video not embedding:**
- Verify iframe allows attribute includes `allow="...picture-in-picture; web-share"`
- Check browser console for CORS or security errors

**Verification fails:**
- Run `npm run verify:base` to diagnose
- Ensure all files in the structure are present

---

## Author & License

EduLens Hybrid © 2025 | MIT License

Phase 0 Complete ✅
