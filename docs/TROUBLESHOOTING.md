# Troubleshooting

## Error 153 / Video refuses to play in Electron
- Use local embed wrapper: GET http://localhost:5000/local/embed/:id
- Keep webSecurity:true; avoid origin=file:// and enablejsapi.
- Prefer iframe over webview; do not disable security policies.
- Verify with `npm run verify:embed`.

## Vite compile error overlay
- Read the red overlay; fix the first error.
- If JSX in .js, rename to .jsx (or adjust import).
- Clear vite cache: delete node_modules/.vite and restart.

## Ports / launcher
- Backend on 5000; Vite on 5173.
- Kill stale processes: `Get-NetTCPConnection -LocalPort 5000 | % {$_.OwningProcess} | % { Stop-Process -Id $_ -Force }`
- Run `scripts/launch-edulens.ps1` for full flow.

## Ollama
- Start: `ollama serve`
- Pull model: `ollama pull llama3.2:3b`
- Health: GET /api/ai/offline/health

## Verify demo quickly
- `npm run verify:demo` — checks base, AI, and embed routes.
