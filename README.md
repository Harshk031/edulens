# EduLens — The Hybrid Distraction-Free Learning Companion

Created by: Harsh Katiyar  
Journey built with AI guidance and real engineering effort.

## 🧩 Overview

EduLens is a hybrid Electron + Web-based focus and learning environment that embeds YouTube videos in a distraction-free interface and extends it with AI-powered features — summaries, quizzes, flashcards, notes, and mindmaps — powered by Ollama (offline) and Groq (online).

It merges productivity and learning into a unified “Focus Mode,” designed to help you learn faster and stay in deep concentration.

## 🚀 Core Features
- Hybrid video embedding system — Works in both Electron and Browser modes.
- Distraction-free YouTube playback — Only the video, no recommended content.
- AI-powered tools — Summaries, quizzes, flashcards, and notes from the video transcript.
- Parallel transcript processing — Handles long videos under one minute using Whisper + ParallelX method.
- Offline + Online AI — Ollama for local inference, Groq for cloud AI (auto fallback system).
- Hourglass Focus Timer — Realistic sand animation synced with study time.
- Modern Interface — Built with React, Vite, Electron, GSAP, and Three.js animations.

## 🧭 Journey & Development Story

### Phase 1 — The Chrome Extension Failure
Initially, EduLens started as a Chrome extension to hide distractions directly on YouTube.  
However, YouTube’s powerful DOM kept breaking the injected CSS and JavaScript, causing persistent conflicts.  
After multiple failed iterations, the idea was abandoned.

### Phase 2 — The Redirect Attempt
The next approach was to redirect YouTube videos into a controlled local webpage (localhost).  
This gave full design freedom, but browsers restricted system-level controls — making it impossible to create a true “focus environment.”  
This idea was also dropped.

### Phase 3 — Full Electron Migration
The project pivoted fully to Electron for total control.  
Yet, embedding YouTube inside Electron caused NET::ERR_BLOCKED_BY_RESPONSE and 153 embedding errors.  
YouTube’s CORS and CSP restrictions blocked direct <iframe> and <webview> usage.

### Phase 4 — The Hybrid Breakthrough
After days of debugging, a hybrid architecture was born:
- Electron uses <webview> with custom CSP injection.  
- Web version uses <iframe> fallback.  
- YouTube links copied to clipboard auto-load in both environments.  
This solved the embedding issue permanently.

### Phase 5 — AI System Integration
Next came AI features.  
We linked Ollama (offline) and Groq API (online).  
Early hurdles included: invalid/missing keys, Groq 401 errors, and Ollama not responding.  
These were fixed by wiring dynamic fallbacks, health checks, and automatic service detection at runtime.

### Phase 6 — Transcript Intelligence
EduLens now uses WhisperAI + ParallelX to convert both Hindi and English videos into full transcripts under one minute.  
The transcript powers all AI tasks — summaries, notes, mindmaps, and quizzes — so you can understand any part of a video (like “10–15 minutes”) instantly.

### Phase 7 — Visual & UX Overhaul
We implemented:  
- A cinematic launch screen (3–5 seconds) with a motivational quote and rocket animation.  
- Sheryians-inspired dark-green theme with glassmorphism and smooth GSAP animations.  
- Floating hourglass timer synced with session.  
- Responsive landscape layout (video left, AI right).

### Phase 8 — Stability & Launcher Automation
A PowerShell-based launcher system was built:  
- Auto-start backend (Express)  
- Port health detection  
- Electron auto-launch  
- Desktop shortcut for one-click start

## 💻 Tech Stack
- Frontend: React, Vite, GSAP, Three.js  
- Backend: Node.js (Express)  
- AI Engines: Ollama (local), Groq (cloud)  
- Transcription: WhisperAI + ParallelX  
- Packaging: Electron  
- Launcher: PowerShell orchestration  
- Version Control: Git + GitHub

## 📁 Repository Structure
See docs/REPO_STRUCTURE.md for a directory-by-directory overview.

## ⚙️ Setup Instructions
```bash
# Clone repository
git clone https://github.com/Harshk031/edulens
cd edulens

# Install dependencies
npm install

# Configure .env
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=your_groq_key
VITE_API_BASE=http://localhost:5000

# Run everything (frontend + backend + electron)
npm run dev
```

## 🎓 Future Roadmap
- AI-driven visual summaries.  
- Contextual Q&A linked to specific video timestamps.  
- Adaptive study planner.  
- Mobile companion app.  
- Auto-update and crash recovery.

## 💬 Author’s Note (by Harsh Katiyar)
“EduLens started as a simple idea — I wanted to study from YouTube without distractions.  
What began as a Chrome extension evolved into this full hybrid AI-assisted learning companion.  
Every error taught me something new — from browser CORS nightmares to embedding failures, to API key problems.  
This is more than a project — it’s a journey of persistence, curiosity, and continuous learning.”
