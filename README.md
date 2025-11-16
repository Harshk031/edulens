# 🎓 EduLens - Your AI Study Buddy

Hey there! 👋 Welcome to EduLens - a project I built to make learning from YouTube videos way more effective. Ever watched a long tutorial and wished you could just ask questions about it? Or needed to study from a lecture but didn't have time to watch the whole thing? That's exactly why I created this.

## What's This About?

EduLens takes any YouTube video and turns it into an interactive learning experience. It transcribes the video, lets you ask questions about the content, generates quizzes to test yourself, creates flashcards for studying, and even makes mind maps to visualize concepts. Pretty cool, right?

## What Can It Do?

### The Main Stuff
- **Transcribe Videos** - Uses Whisper AI to convert speech to text. Works surprisingly well!
- **Ask Questions** - Literally just ask anything about the video and get answers based on the actual content
- **Generate Quizzes** - Test yourself with auto-generated questions from the video
- **Make Flashcards** - Perfect for memorizing key concepts
- **Create Notes** - Get structured notes with timestamps so you can jump back to specific parts
- **Mind Maps** - Visual diagrams of how concepts connect (great for visual learners)
- **Summaries** - TL;DR version of long videos

### For Developers
- **Code Extraction** - Automatically finds and extracts code from programming tutorials
- **Syntax Highlighting** - Makes code readable with proper formatting
- **Run Code** - Test code snippets right in the app

### Other Cool Stuff
- **Focus Mode** - Blocks distractions when you need to concentrate
- **Rich Text Editor** - Take your own notes with formatting
- **Works Offline** - Use LM Studio for complete privacy (no data sent anywhere)

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

## 🏗️ Project Structure

```
EduLens/
├── app/
│   ├── frontend/              # React frontend (Vite)
│   │   ├── components/        # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   └── styles/           # CSS modules
│   ├── backend/              # Node.js backend (Express)
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Helper functions
│   │   └── server.js         # Main server file
│   ├── electron/             # Electron main process
│   ├── config/               # Configuration files
│   │   └── vite.config.js    # Vite configuration
│   ├── eslint.config.js      # ESLint v9 configuration
│   └── package.json          # Dependencies and scripts
├── launchers/                # Application launchers
│   └── EduLens-Desktop-Only.cmd
├── data/                     # Application data
│   └── storage/
│       ├── transcripts/      # Video transcripts (JSON)
│       ├── embeddings/       # AI embeddings
│       └── sessions/         # User sessions
└── README.md                 # This file
```

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

## 🛠️ Development

### Tech Stack
- **Frontend**: React 18, Vite, CSS Modules
- **Backend**: Node.js, Express, Whisper
- **Desktop**: Electron
- **AI**: Groq API, LM Studio, OpenAI-compatible APIs
- **Storage**: JSON-based file system

### npm Scripts
```bash
npm run dev              # Start all services
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run dev:electron     # Electron only
npm run build            # Build for production
npm run lint             # Run ESLint
npm run test-backend     # Test backend routes
```

### Development Setup
1. Install dependencies: `npm install`
2. Set up `.env` file with API keys
3. Run `npm run dev` to start all services
4. Open `http://localhost:5173` in browser (or Electron launches automatically)

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

## Credits

Big thanks to:
- OpenAI for Whisper
- Groq for their fast API
- The LM Studio team
- Everyone who builds open source tools

## Questions?

If you run into issues or have questions:
- Check the troubleshooting section above
- Look through existing GitHub issues
- Open a new issue if you can't find an answer

---

Built by [Harshk031](https://github.com/Harshk031) | If this helped you learn something, give it a ⭐!
