# Whisper Transcription Setup Guide

This guide helps you configure automatic transcription for videos without captions and Hindi language videos.

## Option 1: OpenAI Whisper API (Recommended - Fast & Accurate) ⚡

### Advantages:
- ✅ Fastest transcription (cloud-based)
- ✅ Best accuracy, especially for Hindi
- ✅ Automatic language detection
- ✅ No local installation needed
- ✅ Supports 99+ languages including Hindi

### Cost:
- $0.006 per minute of audio
- Example: 10-minute video = $0.06

### Setup Steps:

1. **Get OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Sign in or create account
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Add to .env file:**
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Test it:**
   ```powershell
   # Test with a real YouTube video without captions
   $b = @{ videoId='REAL_VIDEO_ID'; query='Summarize this'; mode='offline' } | ConvertTo-Json
   (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b).Content
   ```

### Language Support:
The system automatically detects language. For Hindi videos:
- Hindi audio is transcribed to Hindi text
- Automatically translated to English for AI processing
- Original Hindi transcript is preserved

---

## Option 2: Whisper.cpp (Local, Free, Slower) 🖥️

### Advantages:
- ✅ Completely free
- ✅ Works offline
- ✅ Privacy - no data sent to cloud
- ✅ One-time setup

### Disadvantages:
- ⚠️ Slower (CPU-dependent)
- ⚠️ Lower accuracy than OpenAI
- ⚠️ Requires ~1-4GB disk space
- ⚠️ Manual installation needed

### Setup Steps:

#### Step 1: Download Whisper.cpp

I've prepared an automated installer script. Run:

```powershell
.\setup-whisper-cpp.ps1
```

Or manually:

1. **Download pre-built Windows binary:**
   - Go to https://github.com/ggerganov/whisper.cpp/releases
   - Download latest `whisper-bin-x64.zip`
   - Extract to `C:\whisper.cpp\`

2. **Download model file:**
   
   For English videos:
   ```powershell
   # Base model (faster, ~140MB)
   curl.exe -L -o C:\whisper.cpp\ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
   ```
   
   For multilingual (including Hindi):
   ```powershell
   # Base multilingual model (~140MB)
   curl.exe -L -o C:\whisper.cpp\ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
   
   # OR Medium model for better accuracy (~1.5GB)
   curl.exe -L -o C:\whisper.cpp\ggml-medium.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
   ```

#### Step 2: Configure .env

Update your `.env` file:

```bash
# For English videos
WHISPER_CPP_BIN=C:\whisper.cpp\main.exe
WHISPER_MODEL=C:\whisper.cpp\ggml-base.en.bin

# For Hindi/multilingual videos
WHISPER_CPP_BIN=C:\whisper.cpp\main.exe
WHISPER_MODEL=C:\whisper.cpp\ggml-base.bin
```

#### Step 3: Test

```powershell
# Test whisper.cpp directly
C:\whisper.cpp\main.exe -h
```

---

## Model Comparison

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| ggml-tiny.en | 75 MB | Very Fast | Basic | Quick drafts |
| ggml-base.en | 140 MB | Fast | Good | English only |
| ggml-base | 140 MB | Fast | Good | Multiple languages |
| ggml-small | 460 MB | Medium | Better | Better accuracy |
| ggml-medium | 1.5 GB | Slow | Best | Best quality |
| ggml-large | 2.9 GB | Very Slow | Best | Maximum accuracy |

**Recommendation for Hindi videos**: `ggml-base` or `ggml-medium`

---

## Fallback Strategy

The system uses this priority:

1. **YouTube Captions** (if available) - Instant, free
2. **OpenAI Whisper API** (if `OPENAI_API_KEY` set) - Fast, ~2-3x realtime
3. **Whisper.cpp** (if `WHISPER_CPP_BIN` set) - Slow, ~0.1-0.3x realtime
4. **Empty transcript** - Returns heuristic response

## Testing Different Scenarios

### Test 1: Video with English captions
```powershell
# Should use YouTube captions (instant)
$b = @{ videoId='dQw4w9WgXcQ'; query='What is this about?'; mode='offline' } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b
```

### Test 2: Video without captions (OpenAI)
```powershell
# Should use OpenAI Whisper (if key is set)
# Try a short educational video without captions
$b = @{ videoId='SHORT_VIDEO_ID'; query='Summarize'; mode='offline' } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b
```

### Test 3: Hindi video
```powershell
# Should transcribe Hindi → translate to English
$b = @{ videoId='HINDI_VIDEO_ID'; query='Main points?'; mode='offline' } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:5000/api/ai/query" -Method POST -ContentType 'application/json' -Body $b
```

## Monitoring Progress

When processing a video for the first time, you'll see:
```json
{
  "text": "Processing video in background. Try again in ~30s..."
}
```

Check logs for progress:
```powershell
Get-Job | Receive-Job
```

## Troubleshooting

### OpenAI Whisper Issues

**"Invalid API key"**
- Check key starts with `sk-`
- Ensure no extra spaces
- Verify key at https://platform.openai.com/api-keys

**"Rate limit exceeded"**
- Free tier: 3 requests/min
- Paid tier: Higher limits
- Wait a minute and retry

### Whisper.cpp Issues

**"WHISPER_CPP_BIN not found"**
- Check file path in .env
- Ensure `main.exe` exists
- Use absolute paths with backslashes

**"Model file not found"**
- Download the model file
- Check path in WHISPER_MODEL
- Ensure .bin file exists

**"Slow processing"**
- Normal for CPU processing
- Use smaller model (tiny/base)
- Or switch to OpenAI API

## Recommendations

### For Development/Testing:
- Use **OpenAI Whisper API** - fastest iteration

### For Production (cost-sensitive):
- Start with **YouTube captions** (free, instant)
- Fallback to **Whisper.cpp** with `ggml-base` model
- Cache transcripts to avoid reprocessing

### For Hindi Content:
- **OpenAI Whisper API** - best Hindi accuracy
- Or **Whisper.cpp** with `ggml-base` or `ggml-medium`

### For Privacy/Offline:
- Use **Whisper.cpp** only
- Keep both English and multilingual models

---

## Storage Considerations

Transcripts are cached in `src/storage/transcripts/`. A typical transcript:
- 10-minute video: ~50-100KB
- 60-minute video: ~300-500KB

No need to regenerate unless you delete the cached file.

---

**Next**: Choose your option and follow the setup steps above!
