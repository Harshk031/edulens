# Phase 1 — Chrome Extension Failure

## Goal
Embed a distraction-free YouTube player directly on youtube.com using a Chrome extension and augment it with study tools.

## Problems Faced
1) DOM instability on YouTube
- Frequent class/id changes broke CSS/JS injection.
- Shadow DOM and dynamic hydration made selectors brittle.

2) CSP/Headers and permissions
- Content Security Policy blocked certain scripts.
- Extension messaging and timing created race conditions.

3) Focus experience not enforceable
- No window-level control: tabs, notifications, and suggestions remained distractions.

## How We Solved/Decided
- Logged DOM mutation frequency; saw frequent re-renders.
- Tried MutationObserver + retry injection; still flaky.
- Conclusion: Abandon extension approach; move to a controlled surface we own.

## Snippets
```log
[ext] inject.js -> attach sidebar... failed: querySelector returned null
[ext] retry #3... attaching CSS... removed by YouTube dynamic refresh
```
