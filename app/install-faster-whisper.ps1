# Install Faster Whisper
# Much more stable and faster than whisper.cpp

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Faster Whisper Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/3] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "      Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Python not found!" -ForegroundColor Red
    Write-Host "      Install Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Check pip
Write-Host ""
Write-Host "[2/3] Checking pip..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "      Found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: pip not found!" -ForegroundColor Red
    exit 1
}

# Install faster-whisper
Write-Host ""
Write-Host "[3/3] Installing faster-whisper..." -ForegroundColor Yellow
Write-Host "      This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

pip install faster-whisper

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Faster Whisper is now installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Benefits:" -ForegroundColor Cyan
    Write-Host "  • 2-4x faster than whisper.cpp" -ForegroundColor White
    Write-Host "  • Much more stable (no hanging)" -ForegroundColor White
    Write-Host "  • Better accuracy" -ForegroundColor White
    Write-Host "  • Automatic GPU support" -ForegroundColor White
    Write-Host ""
    Write-Host "Restart the backend to use it!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Installation Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try manual installation:" -ForegroundColor Yellow
    Write-Host "  pip install faster-whisper" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
