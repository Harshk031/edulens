# EduLens – TechExpo Demo Script

1) Overview (15s)
- EduLens is a hybrid desktop learning workspace: YouTube + AI + Focus timer.
- Built by Harsh Katiyar with AI assistance.

2) Launch (20s)
- Start with `npm start` or the desktop launcher.
- Backend starts on 5000, Vite on 5173, Electron opens the app window.

3) YouTube Embed (30s)
- Copy any YouTube link; video loads inline via local `/local/embed/:id`.
- No Error 153; origin is http://localhost.

4) Focus Timer (30s)
- Set 15/30/45 or custom, hourglass overlays above the player.
- Pause/Resume/Extend +5m; never blocks usage.

5) AI Assistant (45s)
- Toggle Offline (Ollama) or Online (Groq/Claude/Gemini).
- Ask questions about the video; tools: Summarize/Quiz/Mindmap.

6) Analytics & Gamification (30s)
- History, points, streaks, badges (Phase 3 foundation).

7) Closing (10s)
- Hybrid approach solved Error 153 and kept UX smooth.
- Open-source: MIT License.
