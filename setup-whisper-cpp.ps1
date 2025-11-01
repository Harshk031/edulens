# Whisper.cpp Automated Setup Script for Windows
# This script downloads and configures Whisper.cpp for local transcription

Write-Host "`n=== Whisper.cpp Setup for EduLens ===" -ForegroundColor Cyan
Write-Host "This will install Whisper.cpp for local, offline transcription`n" -ForegroundColor Yellow

# Configuration
$installDir = "C:\whisper.cpp"
$whisperRelease = "https://github.com/ggerganov/whisper.cpp/releases/latest"
$modelBaseUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main"

# Create installation directory
Write-Host "[1/5] Creating installation directory..." -ForegroundColor Green
if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-Host "     Created: $installDir" -ForegroundColor Gray
} else {
    Write-Host "     Already exists: $installDir" -ForegroundColor Gray
}

# Ask user which model to download
Write-Host "`n[2/5] Select Whisper model:" -ForegroundColor Green
Write-Host "     1. ggml-tiny.en (75MB)    - Very fast, English only, basic quality" -ForegroundColor Gray
Write-Host "     2. ggml-base.en (140MB)   - Fast, English only, good quality [RECOMMENDED FOR ENGLISH]" -ForegroundColor Gray
Write-Host "     3. ggml-base (140MB)      - Fast, multilingual, good quality [RECOMMENDED FOR HINDI]" -ForegroundColor Gray
Write-Host "     4. ggml-small (460MB)     - Medium speed, better quality" -ForegroundColor Gray
Write-Host "     5. ggml-medium (1.5GB)    - Slow, best quality" -ForegroundColor Gray
Write-Host "     6. Skip model download (already have one)" -ForegroundColor Gray

$choice = Read-Host "`n     Enter choice (1-6)"

$modelName = ""
$modelFile = ""
switch ($choice) {
    "1" { $modelName = "ggml-tiny.en.bin"; $modelFile = "$installDir\$modelName" }
    "2" { $modelName = "ggml-base.en.bin"; $modelFile = "$installDir\$modelName" }
    "3" { $modelName = "ggml-base.bin"; $modelFile = "$installDir\$modelName" }
    "4" { $modelName = "ggml-small.bin"; $modelFile = "$installDir\$modelName" }
    "5" { $modelName = "ggml-medium.bin"; $modelFile = "$installDir\$modelName" }
    "6" { Write-Host "     Skipping model download" -ForegroundColor Yellow; $modelName = "skip" }
    default { Write-Host "     Invalid choice. Defaulting to ggml-base.en.bin" -ForegroundColor Yellow; $modelName = "ggml-base.en.bin"; $modelFile = "$installDir\$modelName" }
}

# Download model
if ($modelName -ne "skip") {
    Write-Host "`n[3/5] Downloading model: $modelName" -ForegroundColor Green
    if (Test-Path $modelFile) {
        Write-Host "     Model already exists. Skipping download." -ForegroundColor Yellow
    } else {
        $modelUrl = "$modelBaseUrl/$modelName"
        Write-Host "     Downloading from: $modelUrl" -ForegroundColor Gray
        Write-Host "     This may take several minutes depending on model size..." -ForegroundColor Gray
        try {
            curl.exe -L -o $modelFile $modelUrl --progress-bar
            Write-Host "     ✓ Downloaded successfully" -ForegroundColor Green
        } catch {
            Write-Host "     ✗ Download failed: $_" -ForegroundColor Red
            Write-Host "     You can download manually from: $modelUrl" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "`n[3/5] Model download skipped" -ForegroundColor Yellow
}

# Download Whisper.cpp binary
Write-Host "`n[4/5] Downloading Whisper.cpp binary..." -ForegroundColor Green
$binPath = "$installDir\main.exe"

if (Test-Path $binPath) {
    Write-Host "     Binary already exists. Skipping download." -ForegroundColor Yellow
} else {
    Write-Host "     Note: Pre-built Windows binaries are not always available." -ForegroundColor Yellow
    Write-Host "     You may need to build from source. See: https://github.com/ggerganov/whisper.cpp" -ForegroundColor Yellow
    Write-Host "`n     Attempting to download pre-built binary..." -ForegroundColor Gray
    
    # Try common locations for pre-built binaries
    $possibleUrls = @(
        "https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-bin-x64.zip",
        "https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.3/whisper-bin-x64.zip",
        "https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.2/whisper-bin-x64.zip"
    )
    
    $downloaded = $false
    foreach ($url in $possibleUrls) {
        try {
            Write-Host "     Trying: $url" -ForegroundColor Gray
            $zipPath = "$installDir\whisper-bin.zip"
            curl.exe -L -o $zipPath $url -s --fail
            if (Test-Path $zipPath) {
                Expand-Archive -Path $zipPath -DestinationPath $installDir -Force
                Remove-Item $zipPath
                $downloaded = $true
                Write-Host "     ✓ Downloaded and extracted" -ForegroundColor Green
                break
            }
        } catch {
            Write-Host "     ✗ Failed" -ForegroundColor Gray
        }
    }
    
    if (!$downloaded) {
        Write-Host "`n     ⚠ Could not download pre-built binary automatically." -ForegroundColor Yellow
        Write-Host "     Please build from source:" -ForegroundColor Yellow
        Write-Host "     1. Install Visual Studio or MinGW" -ForegroundColor Gray
        Write-Host "     2. Clone: git clone https://github.com/ggerganov/whisper.cpp" -ForegroundColor Gray
        Write-Host "     3. Build: cd whisper.cpp && make" -ForegroundColor Gray
        Write-Host "     4. Copy main.exe to $installDir" -ForegroundColor Gray
    }
}

# Update .env file
Write-Host "`n[5/5] Updating .env configuration..." -ForegroundColor Green
$envPath = ".\.env"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    # Check if WHISPER config already exists
    if ($envContent -notmatch "WHISPER_CPP_BIN") {
        # Add configuration
        $whisperConfig = @"

# Whisper.cpp Configuration (local transcription)=
WHISPER_CPP_BIN=$installDir\main.exe
WHISPER_MODEL=$modelFile
"@
        Add-Content -Path $envPath -Value $whisperConfig
        Write-Host "     ✓ Added Whisper configuration to .env" -ForegroundColor Green
    } else {
        Write-Host "     Whisper configuration already exists in .env" -ForegroundColor Yellow
        Write-Host "     Please update manually if needed:" -ForegroundColor Yellow
        Write-Host "     WHISPER_CPP_BIN=$installDir\main.exe" -ForegroundColor Gray
        Write-Host "     WHISPER_MODEL=$modelFile" -ForegroundColor Gray
    }
} else {
    Write-Host "     ✗ .env file not found. Please create it manually." -ForegroundColor Red
}

# Summary
Write-Host "`n=== Setup Summary ===" -ForegroundColor Cyan
Write-Host "Installation directory: $installDir" -ForegroundColor Gray
if ($modelName -ne "skip") {
    Write-Host "Model: $modelName" -ForegroundColor Gray
}
Write-Host "Binary: $installDir\main.exe" -ForegroundColor Gray

# Test if everything is ready
$ready = $true
if (!(Test-Path "$installDir\main.exe")) {
    Write-Host "`n⚠ Warning: main.exe not found. You need to build or download it." -ForegroundColor Yellow
    $ready = $false
}
if ($modelName -ne "skip" -and !(Test-Path $modelFile)) {
    Write-Host "⚠ Warning: Model file not found." -ForegroundColor Yellow
    $ready = $false
}

if ($ready) {
    Write-Host "`n✓ Setup complete! Whisper.cpp is ready to use." -ForegroundColor Green
    Write-Host "`nTo test:" -ForegroundColor Cyan
    Write-Host "  $installDir\main.exe -h" -ForegroundColor Gray
} else {
    Write-Host "`n⚠ Setup incomplete. Please follow the manual steps above." -ForegroundColor Yellow
}

Write-Host "`nFor usage instructions, see: WHISPER_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
