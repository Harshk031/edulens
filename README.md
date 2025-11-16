# 🎓 EduLens - Your AI Study Buddy

<div align="center">

![EduLens Banner](https://img.shields.io/badge/EduLens-AI%20Learning%20Assistant-blue?style=for-the-badge)
[![GitHub Stars](https://img.shields.io/github/stars/Harshk031/edulens?style=for-the-badge)](https://github.com/Harshk031/edulens/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red?style=for-the-badge)](https://github.com/Harshk031)

**Transform any YouTube video into an interactive learning experience**

[Features](#what-can-it-do) • [Getting Started](#getting-started) • [Demo](#how-to-use-it) • [Contributing](#want-to-contribute)

</div>

---

## 👋 Hey there!

I'm Harsh, and I built EduLens because I was tired of watching hour-long tutorials and forgetting everything 10 minutes later. You know that feeling when you watch a great educational video but can't remember the key points? Or when you need to find that one specific part but have to scrub through the entire thing? Yeah, that was driving me crazy.

So I spent months building this - a tool that actually makes learning from videos efficient. It transcribes videos, lets you ask questions about the content, generates quizzes, creates flashcards, and even makes mind maps. Basically everything I wished existed when I was binge-watching programming tutorials at 2 AM.

## What's This About?

EduLens takes any YouTube video and turns it into an interactive learning experience. It transcribes the video, lets you ask questions about the content, generates quizzes to test yourself, creates flashcards for studying, and even makes mind maps to visualize concepts. Pretty cool, right?

## ✨ What Can It Do?

<table>
<tr>
<td width="50%">

### 🎯 Core Features

- **🎬 Smart Transcription**
  - Powered by OpenAI's Whisper
  - Supports English & Hindi
  - Timestamps for every segment
  - 100% accurate from start to finish

- **💬 AI Q&A**
  - Ask anything about the video
  - Context-aware responses
  - Remembers conversation history
  - Works with full transcript

- **📝 Study Tools**
  - Auto-generated quizzes
  - Flashcards for memorization
  - Structured notes with timestamps
  - Mind maps for visual learning
  - Quick summaries

</td>
<td width="50%">

### 💻 For Developers

- **🔍 Code Extraction**
  - Auto-detects code in videos
  - Syntax highlighting
  - Multiple language support
  - Copy with one click

- **⚡ Productivity**
  - Focus mode (no distractions)
  - Rich text editor
  - Session management
  - Progress tracking

- **🔒 Privacy First**
  - Everything stored locally
  - Offline mode available
  - No tracking or analytics
  - Your data stays yours

</td>
</tr>
</table>

### 🎨 Why I Built This

I was spending hours watching coding tutorials and educational videos, but I kept running into the same problems:
- **Couldn't remember** what I learned after a week
- **Wasted time** searching for specific parts
- **No way to test** my understanding
- **Difficult to take notes** while watching

So I built EduLens to solve all of these. Now I can:
- ✅ Ask questions and get instant answers
- ✅ Generate quizzes to test myself
- ✅ Create flashcards for spaced repetition
- ✅ Jump to any part using timestamps
- ✅ Extract code without pausing/rewinding

**The result?** I actually remember what I learn now. And I'm not the only one - I hope this helps you too!

## Getting Started

### What You'll Need
- Node.js (version 18 or newer)
- Windows (I built this on Windows, but it should work on Mac/Linux with minor tweaks)
- A Groq API key (free tier works fine) OR LM Studio if you want everything local

### Setup

1. **Clone this repo:**
   ```bash
   git clone https://github.com/Harshk031/edulens.git
   cd edulens
   ```

2. **Install stuff:**
   ```bash
   cd app
   npm install
   ```
   This might take a minute - it's downloading all the dependencies.

3. **Configure your AI:**
   Create a file called `.env` in the `app/` folder:
   ```env
   PORT=5000
   GROQ_API_KEY=your_api_key_here
   LM_STUDIO_URL=http://localhost:1234
   PREFERRED_AI_PROVIDER=groq
   ```
   
   Get a free Groq API key from [console.groq.com](https://console.groq.com)

4. **Run it:**
   ```cmd
   # Easy way (Windows):
   cd launchers
   EduLens-Desktop-Only.cmd

   # Manual way:
   cd app
   npm run dev
   ```

That's it! The app should open in a new window.

## 🏗️ Project Architecture

I designed EduLens with a clean, modular architecture that's easy to understand and extend:

```
EduLens/
├── 📱 app/                          # Main application
│   ├── 🎨 frontend/                 # React + Vite (UI)
│   │   ├── components/              # Reusable UI components
│   │   ├── hooks/                   # Custom React hooks (useHybridAI, etc.)
│   │   ├── utils/                   # Helper functions
│   │   └── styles/                  # CSS modules
│   │
│   ├── ⚙️ backend/                  # Node.js + Express (API)
│   │   ├── routes/                  # API endpoints
│   │   │   ├── aiRoutes.cjs        # AI features (quiz, notes, etc.)
│   │   │   ├── videoRoutes.cjs     # Video processing
│   │   │   └── ...
│   │   ├── services/                # Core business logic
│   │   ├── utils/                   # Validators, helpers
│   │   └── server.js                # Main server (port 5000)
│   │
│   ├── 🖥️ electron/                 # Desktop app wrapper
│   │   └── electron-main.cjs        # Electron entry point
│   │
│   └── 📋 config/                   # Configuration
│       ├── vite.config.js           # Vite setup
│       └── eslint.config.js         # Code quality
│
├── 🚀 launchers/                    # Easy startup scripts
│   └── EduLens-Desktop-Only.cmd     # One-click launch
│
└── 💾 data/storage/                 # Local data (gitignored)
    ├── transcripts/                 # Video transcripts
    ├── embeddings/                  # AI vector embeddings
    └── sessions/                    # User sessions
```

### 🔧 Technical Highlights

**What I'm Proud Of:**

1. **Robust Error Handling**
   - Fixed critical bugs (function hoisting, 503 errors, memory leaks)
   - Comprehensive validation for transcripts
   - Graceful fallbacks when AI is unavailable

2. **Smart AI Integration**
   - Full transcript context in every AI request
   - Keyword matching fallback
   - Provider switching (Groq ↔ LM Studio)
   - Enhanced responses with timestamps

3. **Performance Optimizations**
   - Async operations with proper cleanup
   - No UI blocking
   - Memory leak prevention
   - Efficient transcript processing

4. **Developer Experience**
   - Clean, commented code
   - ESLint configuration
   - Modular architecture
   - Easy to extend

## 🔧 Configuration

### Ports
- **Backend**: `5000` (fixed)
- **Frontend**: `5173` (Vite dev server)
- **Electron**: Auto-connects to backend

### AI Providers
1. **Groq** (Cloud, Recommended)
   - Fast inference
   - High-quality responses
   - Requires API key

2. **LM Studio** (Local, Privacy-focused)
   - Offline operation
   - No data sharing
   - Requires local setup

### Environment Variables
```env
PORT=5000                          # Backend port
GROQ_API_KEY=sk-...               # Groq API key
LM_STUDIO_URL=http://localhost:1234  # LM Studio endpoint
PREFERRED_AI_PROVIDER=groq        # groq or lmstudio
```

## How to Use It

### The Basics

1. **Paste a YouTube URL** - Just copy any YouTube link and paste it in
2. **Wait for it to process** - Takes a minute or two depending on video length
3. **Start learning!** - Once it's done, you can:
   - Ask questions about the content
   - Generate a quiz to test yourself
   - Make flashcards for studying
   - Get a summary if you're in a hurry
   - Create a mind map to see how concepts connect

### Pro Tips
- The transcription works best with clear audio (obviously)
- You can ask follow-up questions - it remembers the context
- Use timestamps in the notes to jump back to specific parts of the video
- Focus mode is great when you need to actually concentrate
- If you're learning to code, try the code extraction feature on programming tutorials

### Keyboard Shortcuts (for the power users)
- `Ctrl+R` - Refresh the app
- `F12` - Open developer tools (if something breaks)
- `Ctrl+S` - Save your notes

## 🛠️ Development Journey

### The Tech Stack

I chose these technologies carefully based on what works best:

| Layer | Technology | Why I Chose It |
|-------|-----------|----------------|
| **Frontend** | React 18 + Vite | Fast, modern, great dev experience |
| **Backend** | Node.js + Express | Perfect for AI integration, easy to scale |
| **Desktop** | Electron | Cross-platform, access to system APIs |
| **AI** | Groq + LM Studio | Fast inference + privacy option |
| **Transcription** | Whisper | Best accuracy for speech-to-text |
| **Storage** | JSON files | Simple, portable, no database needed |

### Challenges I Overcame

Building this wasn't easy. Here are some of the tough problems I solved:

1. **🐛 Function Hoisting Bug**
   - Problem: `processAIResponse` was called before definition
   - Solution: Converted to function declaration for proper hoisting
   - Impact: Fixed all AI query crashes

2. **🔌 503 Service Errors**
   - Problem: Frontend getting 503 when backend wasn't ready
   - Solution: Direct backend calls, bypassing Vite proxy
   - Impact: Stable connection, no more timeouts

3. **💾 Memory Leaks**
   - Problem: Health monitor kept running after component unmount
   - Solution: Proper timeout tracking and cleanup
   - Impact: No more memory issues

4. **📝 Transcript Validation**
   - Problem: AI generating fake content from invalid transcripts
   - Solution: Comprehensive validation with relaxed thresholds
   - Impact: Robust handling of all video types

5. **⚡ UI Blocking**
   - Problem: Long AI operations freezing the interface
   - Solution: Async operations with proper error handling
   - Impact: Smooth, responsive UI

### npm Scripts

```bash
npm run dev              # Start everything (backend + frontend + electron)
npm run dev:backend      # Just the API server
npm run dev:frontend     # Just the React app
npm run dev:electron     # Just the desktop wrapper
npm run build            # Production build
npm run lint             # Check code quality
npm run test-backend     # Test API endpoints
```

### Want to Contribute?

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

I review PRs regularly and I'm always happy to help!

## Troubleshooting

### If Something Breaks

**App won't start:**
- Make sure port 5000 isn't already being used by something else
- Check that your `.env` file exists and has the right stuff in it
- Try running `npm install` again - maybe something didn't download properly

**Transcription not working:**
- Double-check the YouTube URL is valid
- Make sure you have internet (Whisper needs to download the video)
- Some videos might be region-locked or age-restricted

**AI giving weird responses:**
- Check your Groq API key is correct in the `.env` file
- If using LM Studio, make sure it's actually running
- Look at the console logs (F12) - they usually tell you what went wrong

**Getting 503 errors:**
- Just restart the app - sometimes the backend needs a fresh start
- Make sure nothing else is using port 5000

## Privacy Stuff

Just so you know:
- Everything stays on your computer - transcripts, notes, all of it
- I don't track anything or send analytics anywhere
- If you use LM Studio instead of Groq, literally nothing leaves your machine
- Your API keys stay in your `.env` file (and that file is gitignored, so it won't accidentally get uploaded)

## Want to Contribute?

Found a bug? Have an idea? Want to add a feature? Go for it!

1. Fork this repo
2. Make your changes
3. Test it to make sure it works
4. Send a pull request

I'm pretty chill about contributions - just try to keep the code readable and add comments if you're doing something complex.

## Tech Stack

Built with:
- React + Vite (frontend)
- Node.js + Express (backend)
- Electron (desktop app)
- Whisper (transcription)
- Groq API / LM Studio (AI)

## License

MIT License - basically do whatever you want with it, just don't blame me if something breaks 😅

## 📊 Project Stats

<div align="center">

| Metric | Value |
|--------|-------|
| **Lines of Code** | ~15,000+ |
| **Development Time** | 3+ months |
| **Files** | 200+ |
| **Features** | 10+ AI-powered tools |
| **Languages** | JavaScript, React, Node.js |
| **Tests** | Backend routes tested |

</div>

## 🎯 What's Next?

I'm constantly improving EduLens. Here's what's on the roadmap:

- [ ] **Mobile App** - React Native version for iOS/Android
- [ ] **Browser Extension** - Quick access from YouTube
- [ ] **More AI Providers** - Claude, Gemini support
- [ ] **Collaborative Features** - Share notes and quizzes
- [ ] **Advanced Analytics** - Track your learning progress
- [ ] **Custom Prompts** - Personalize AI responses
- [ ] **Export Options** - PDF, Markdown, Notion

Want to help with any of these? Open an issue or PR!

## 💝 Show Your Support

If EduLens helped you learn something new:

- ⭐ **Star this repo** - It really motivates me to keep improving it
- 🐛 **Report bugs** - Help me make it better
- 💡 **Suggest features** - Tell me what you'd like to see
- 📢 **Share it** - Help other learners discover this tool
- ☕ **Buy me a coffee** - If you're feeling generous (just kidding, stars are enough!)

## 🙏 Credits & Thanks

This project wouldn't exist without these amazing tools:

- **OpenAI** - For Whisper (best speech-to-text model)
- **Groq** - For lightning-fast AI inference
- **LM Studio** - For making local AI accessible
- **Electron Team** - For the desktop framework
- **React Team** - For the amazing UI library
- **Vite** - For the blazing-fast dev experience

And huge thanks to everyone who:
- Reported bugs
- Suggested features
- Contributed code
- Shared this project
- Gave it a star ⭐

## 📞 Get in Touch

Have questions? Want to collaborate? Just want to say hi?

- 🐛 **Issues**: [GitHub Issues](https://github.com/Harshk031/edulens/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Harshk031/edulens/discussions)
- 📧 **Email**: Check my GitHub profile
- 🌐 **GitHub**: [@Harshk031](https://github.com/Harshk031)

---

<div align="center">

**Built with ❤️ by [Harsh](https://github.com/Harshk031)**

*Making learning from videos actually effective, one transcript at a time*

[![GitHub](https://img.shields.io/badge/GitHub-Harshk031-black?style=for-the-badge&logo=github)](https://github.com/Harshk031)
[![Stars](https://img.shields.io/github/stars/Harshk031/edulens?style=for-the-badge)](https://github.com/Harshk031/edulens/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**If this helped you, give it a ⭐ - it means the world to me!**

</div>
