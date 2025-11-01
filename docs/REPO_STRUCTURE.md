# Repo Structure

This document describes the layout of the EduLens Hybrid repository.

- `src/`
  - `components/` UI components (AIChatPanel, FocusHourglass, HybridAIToggle, etc.)
  - `components/pipeline/` Animated frontend/backend pipeline visualizers
  - `renderer/` client utilities (video-loader)
  - `ai/` AI pipeline (parallelx, transcriptor, embeddings, generator, retriever)
  - `server/` dev API routes used by the app (under `src/server/routes/*.cjs`)
  - `services/` local services (whisper wrappers, ytApi, embeddings, rag)
  - `styles/` global theme and animations

- `server/`
  - `server.js` Express backend entry for dev with dynamic route loading
  - `routes/` offline/online AI, TTS (optional) endpoints

- `electron/` Electron helpers (YouTubePlayer, preload code under `preload/`)
- `preload/` Electron preload bridges (context isolation)
- `scripts/` project scripts (kept: `verify-base.js`, `verify-ai.js`)
- `config/` runtime config (parallelx, embeddings)
- `docs/` journey and phase docs
- `logs/` runtime logs (git-ignored)

Temporary artifacts are cleaned on exit (`tmp-*.mp3`, `*-16k.wav(.json)`), and Whisper deletes its intermediates after use.
