# Whisper Quick Start Guide

## Choose Your Setup (Pick One)

### ⚡ Option A: OpenAI Whisper API (FASTEST - Recommended)

**Best for**: Development, testing, production with budget

**Setup (2 minutes)**:
1. Get API key from https://platform.openai.com/api-keys
2. Open `.env` file
3. Replace: `OPENAI_API_KEY=your_openai_api_key_here` with your actual key
4. Done! Restart server if running

**Cost**: $0.006/minute (~$0.36 per hour of video)

---

### 🖥️ Option B: Whisper.cpp (FREE - Local)

**Best for**: Privacy, offline use, cost-free

**Setup (10-15 minutes)**:

**Automated**:
```powershell
.\setup-whisper-cpp.ps1
```

**Manual**:
1. Download model (~140MB for Hindi support):
   ```powershell
   mkdir C:\whisper.cpp
   curl.exe -L -o C:\whisper.cpp\ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
   ```

2. Get Whisper.cpp binary:
   - Download from: https://github.com/ggerganov/whisper.cpp/releases
   - Or build from source

3. Update `.env`:
   ```
   WHISPER_CPP_BIN=C:\whisper.cpp\main.exe
   WHISPER_MODEL=C:\whisper.cpp\ggml-base.bin
   ```

---

## Test Your Setup

### Step 1: Restart Server

```powershell
# Stop server
Get-NetTCPConnection -LocalPort 5000 | Select -ExpandProperty OwningProcess | Stop-Process -Force

# Start server
Start-Job -ScriptBlock { Set-Location "C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid"; node server/server.js }

# Wait for startup
Start-Sleep -Seconds 5
```

### Step 2: Test with Sample Video

```powershell
# Test with the sample transcript (should be instant)
$b = @{ videoId='test123'; query='What is machine learning?'; mode='offline' } | ConvertTo-Json
(Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b).Content | ConvertFrom-Json | Select-Object -ExpandProperty text
```

### Step 3: Test with Real YouTube Video

**With captions** (instant):
```powershell
# Find a video with English captions on YouTube
$videoId = "YOUR_VIDEO_ID"
$b = @{ videoId=$videoId; query='Summarize this video'; mode='offline' } | ConvertTo-Json
(Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b).Content
```

**Without captions** (will use Whisper):
```powershell
# Try a short video without captions (2-5 minutes recommended for first test)
$videoId = "SHORT_VIDEO_ID"
$b = @{ videoId=$videoId; query='What is this about?'; mode='offline' } | ConvertTo-Json
(Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b).Content

# First time: Will say "Processing video in background. Try again in ~30s..."
# Wait 30-60 seconds, then run same command again
```

**Hindi video**:
```powershell
# Try a Hindi educational video
$videoId = "HINDI_VIDEO_ID"
$b = @{ videoId=$videoId; query='Main points?'; mode='offline' } | ConvertTo-Json
(Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b).Content
```

---

## Expected Behavior

### First Request to New Video:
```json
{
  "text": "Processing video in background. Try again in ~30s after initial transcript and indexing complete."
}
```

**Processing time**:
- YouTube captions: Instant
- OpenAI Whisper: 2-5 seconds for 10-min video
- Whisper.cpp: 30-120 seconds for 10-min video

### Second Request (After Processing):
```json
{
  "text": "TL;DR: [Summary]\n\nAnswer:\n[Detailed response with timestamps]\n\nKey takeaways:\n• Point 1\n• Point 2...",
  "sourceChunks": [...],
  "creditUseEstimate": {...}
}
```

---

## Troubleshooting

### "Processing video" never completes

**Check server logs**:
```powershell
Get-Job | Receive-Job
```

**Common issues**:
- OpenAI API key invalid → Check key in .env
- Whisper.cpp not found → Check paths in .env
- YouTube download failed → Try different video
- Audio extraction failed → Check ffmpeg is installed

### Server not responding

```powershell
# Check if server is running
curl.exe http://localhost:5000/health

# If not, start it
Start-Job -ScriptBlock { Set-Location "C:\Users\Harsh\OneDrive\Desktop\edulens-hybrid"; node server/server.js }
```

### Hindi transcription not working

1. Make sure using multilingual model: `ggml-base.bin` (not `ggml-base.en.bin`)
2. Or use OpenAI API (better for Hindi)
3. Check translator service is working

---

## Recommended Test Videos

### English with captions:
- `dQw4w9WgXcQ` - Music video (has auto-captions)

### English without captions:
- Find a short unlisted video or podcast clip

### Hindi:
- Search YouTube for: "Khan Academy Hindi" or "TED Hindi"
- Pick a 2-5 minute video for first test

---

## What's Next?

Once transcription is working:

1. ✅ Test with various video types
2. ✅ Try different query types
3. ✅ Test other AI features: `/api/ai/summary`, `/api/ai/notes`, `/api/ai/quiz`
4. ✅ Integrate with frontend

---

**Need help?** See `WHISPER_SETUP_GUIDE.md` for detailed documentation.
