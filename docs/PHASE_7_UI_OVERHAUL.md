# Phase 7 — UI/UX Overhaul

## Goal
Deliver a calm, cinematic learning surface with smooth motion and a responsive layout that keeps the learner in flow.

## Problems Faced
1) Visual identity and motion
- Needed a theme that feels intentional and modern.

2) Focus timer feedback
- Plain timers felt sterile; no sense of progress.

3) Performance of animations
- Heavy motion can stutter if not batched/tuned.

## How We Solved
- Adopted a Sheryians-inspired dark‑green palette with glassmorphism.
- Built an hourglass timer with a realistic sand feel (GSAP timelines) and session sync.
- Reduced layout thrash; used will-change and RAF‑friendly tweens.

## Snippets
```js
// Hourglass timeline (concept)
const tl = gsap.timeline({ defaults: { ease: 'power2.out' }});
tl.to('#sandTop', { scaleY: 0, duration: focusMinutes * 60 });
tl.to('#sandBottom', { scaleY: 1, duration: focusMinutes * 60 }, '<');
```