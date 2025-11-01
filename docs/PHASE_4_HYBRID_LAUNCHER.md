# Phase 4 — Hybrid Launcher & Embed Strategy

## Goal
Blend Electron (desktop) and Web (browser) with a consistent YouTube experience, and ship a one‑click launcher that brings up backend + Electron reliably.

## Problems Faced
1) Embed reliability across environments
- <webview> in Electron vs <iframe> in browser needed different handling.

2) Startup sequencing
- Backend must become healthy before Electron opens to avoid blank states.

3) Port/process conflicts
- Dev servers sometimes held ports 5000/5173.

## How We Solved
- Electron path: <webview> with CSP injection; Web path: <iframe> fallback.
- Launcher script (PowerShell) that:
  - Starts backend, polls /health until 200 OK, then launches Electron.
  - Cleans stale processes on ports 5000/5173.
  - Logs to logs/launcher.log and times out safely.

## Snippets
```powershell
# scripts/launch-edulens.ps1 (excerpt)
$maxRetries = 30
$healthUrl = "http://127.0.0.1:5000/health"
for ($i = 0; $i -lt $maxRetries; $i++) {
  try {
    $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { break }
  } catch {}
  Start-Sleep -Seconds 1
}
Start-Process -FilePath "npm" -ArgumentList "run","dev:electron" -WindowStyle Normal
```
