# Phase 2 — Redirect Experiment (Local Web App)

## Goal
Control the full UI/UX by redirecting YouTube URLs into a localhost page that embeds the player and adds AI tools.

## Problems Faced
1) Limited system control in browser
- Couldn’t enforce a true “focus environment” (OS notifications, multi-window distractions).

2) Clipboard and link handling
- Reliably capturing copied YouTube URLs across tabs was inconsistent.

3) CORS/CSP edges
- Some embed and service calls tripped CSP or cross-origin rules in certain setups.

## How We Solved/Decided
- Built a clean localhost page with an iframe wrapper.
- Added URL paste/autodetect; worked, but still a browser.
- Conclusion: Move to Electron to get windowing/OS-level control.

## Snippets
```log
[web] /embed?url=https://youtu.be/abc123
[web] AI panel loaded | clipboard watch: on
```