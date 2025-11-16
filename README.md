# 🎓 EduLens - AI-Powered Learning Assistant

> Transform YouTube videos into comprehensive learning experiences with AI-powered transcription, analysis, and interactive study tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-blue.svg)](https://www.electronjs.org/)

## ✨ Features

### 🎬 Video Processing
- **Automatic Transcription**: Powered by Whisper for accurate speech-to-text
- **Full Video Coverage**: Processes videos from start to end with timestamps
- **Multi-language Support**: English and Hindi transcription

### 🤖 AI-Powered Learning Tools
- **Smart Q&A**: Ask questions about video content with context-aware responses
- **Auto-Generated Quizzes**: Create comprehensive quizzes from video content
- **Flashcards**: Generate study flashcards with key concepts
- **Study Notes**: Detailed notes with timestamps and structure
- **Mind Maps**: Visual concept maps for better understanding
- **Summaries**: Concise video summaries with key points

### 💻 Developer Features
- **Code Extraction**: Automatically detect and extract code snippets
- **Syntax Highlighting**: Support for multiple programming languages
- **Code Execution**: Run extracted code directly in the app

### 🎯 Productivity
- **Focus Mode**: Distraction-free learning environment
- **Rich Text Editor**: Advanced note-taking with formatting
- **Progress Tracking**: Monitor your learning journey
- **Session Management**: Save and resume learning sessions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Windows OS (launchers optimized for Windows)
- Optional: LM Studio for offline AI (privacy-focused)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/EduLens.git
   cd EduLens
   ```

2. **Install dependencies:**
   ```bash
   cd app
   npm install
   ```

3. **Set up environment variables:**
   Create `.env` file in `app/` directory:
   ```env
   PORT=5000
   GROQ_API_KEY=your_groq_api_key_here
   LM_STUDIO_URL=http://localhost:1234
   PREFERRED_AI_PROVIDER=groq
   ```

4. **Launch the application:**
   ```cmd
   # Using desktop launcher (recommended)
   cd launchers
   EduLens-Desktop-Only.cmd

   # Or manually
   cd app
   npm run dev
   ```

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

## 📖 Usage Guide

### Basic Workflow

1. **Load a Video**
   - Paste YouTube URL in the input field
   - Click "Process" or press Enter
   - Wait for transcription (progress shown)

2. **Explore AI Features**
   - **Ask Questions**: Type queries about the video
   - **Generate Quiz**: Test your understanding
   - **Create Flashcards**: Study key concepts
   - **Take Notes**: Structured notes with timestamps
   - **View Mind Map**: Visual concept overview

3. **Advanced Features**
   - **Code Extraction**: Automatically detect code snippets
   - **Focus Mode**: Enable distraction-free learning
   - **Export**: Save notes and transcripts

### Keyboard Shortcuts
- `Ctrl+R`: Refresh application
- `F12`: Open DevTools (debug)
- `Ctrl+Q`: Quick query
- `Ctrl+S`: Save notes

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

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check if port 5000 is available
- Verify `.env` file exists
- Run `npm install` to ensure dependencies

**Transcription fails:**
- Ensure Whisper is installed
- Check video URL is valid
- Verify internet connection

**AI features not working:**
- Check Groq API key in `.env`
- Verify LM Studio is running (if using local)
- Check backend logs for errors

**503 Errors:**
- Restart the application
- Check backend is running on port 5000
- Verify Vite proxy configuration

## 🔒 Privacy & Security

- **Local Storage**: All transcripts stored locally
- **No Tracking**: No analytics or telemetry
- **Offline Mode**: Use LM Studio for complete privacy
- **API Keys**: Stored locally in `.env` (never committed)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Whisper**: OpenAI's speech recognition model
- **Groq**: Fast AI inference
- **LM Studio**: Local AI runtime
- **Electron**: Cross-platform desktop framework
- **React**: UI framework

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting guide above

---

**Made with ❤️ for learners everywhere**
