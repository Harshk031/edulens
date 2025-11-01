# Phase 6 — Transcript Engine (Whisper + ParallelX)

## Goal
Generate accurate transcripts from long YouTube videos quickly, and make them queryable by time range.

## Problems Faced
1) Long processing time for large videos
- Sequential transcription was too slow.

2) Language handling (Hindi + English)
- Mixed-language content reduced accuracy in default settings.

3) Segment-to-timestamp mapping for UX
- Needed a reliable way to answer questions like “10–15 minutes segment.”

## How We Solved
- ParallelX strategy: split audio into overlapping chunks; transcribe in parallel; merge with heuristics.
- Whisper configuration tuned for bilingual content.
- Built an index of segments → timestamps → text.

## Snippets
```log
[transcript] job=7h3x start
[transcript] chunks=8 | concurrency=4 | model=whisper-large-v3
[transcript] merged segments: 142 | language: hi-en | duration: 01:12:04
[transcript] done in 54.2s
```
