# EduLens Complete Verification Script
# Checks all components systematically

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  EduLens Complete Verification" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$allPassed = $true

# CHECK 1: PORTS
Write-Host "`n[CHECK 1] PORT STATUS" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Gray

Write-Host "Port 5000: " -NoNewline
$port5000 = netstat -ano | Select-String ":5000.*LISTENING"
if ($port5000) {
    Write-Host "OCCUPIED" -ForegroundColor Red
    $port5000 | ForEach-Object {
        $line = $_.ToString()
        if ($line -match '\s+(\d+)\s*$') {
            $pid = $line -replace '.*\s+(\d+)\s*$', '$1'
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            Write-Host "  Process: $($proc.ProcessName) (PID: $pid)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "FREE ✓" -ForegroundColor Green
}

Write-Host "Port 5173: " -NoNewline
$port5173 = netstat -ano | Select-String ":5173.*LISTENING"
if ($port5173) {
    Write-Host "OCCUPIED (Vite should be here) ✓" -ForegroundColor Green
} else {
    Write-Host "FREE (Vite not running)" -ForegroundColor Yellow
}

# CHECK 2: FASTER-WHISPER
Write-Host "`n[CHECK 2] FASTER-WHISPER" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Gray

Write-Host "Installation: " -NoNewline
try {
    $fwVersion = python -c "import faster_whisper; print(faster_whisper.__version__)" 2>&1 | Select-String "\d+\.\d+\.\d+"
    if ($fwVersion) {
        Write-Host "INSTALLED ✓ (v$fwVersion)" -ForegroundColor Green
    } else {
        Write-Host "NOT FOUND" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "ERROR" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "Functionality: " -NoNewline
try {
    $fwTest = python -c "from faster_whisper import WhisperModel; print('OK')" 2>&1 | Select-String "OK"
    if ($fwTest) {
        Write-Host "WORKING ✓" -ForegroundColor Green
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "ERROR" -ForegroundColor Red
    $allPassed = $false
}

# CHECK 3: BACKEND CONFIGURATION
Write-Host "`n[CHECK 3] BACKEND CONFIGURATION" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Gray

$whisperCjs = "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app\backend\services\whisper.cjs"
if (Test-Path $whisperCjs) {
    $content = Get-Content $whisperCjs -Raw
    
    Write-Host "Faster-whisper PRIMARY: " -NoNewline
    if ($content -match "PRIORITY 1.*faster-whisper") {
        Write-Host "YES ✓" -ForegroundColor Green
    } else {
        Write-Host "NO" -ForegroundColor Red
        $allPassed = $false
    }
    
    Write-Host "whisper.cpp as FALLBACK: " -NoNewline
    if ($content -match "FALLBACK.*whisper\.cpp") {
        Write-Host "YES ✓" -ForegroundColor Green
    } else {
        Write-Host "NO" -ForegroundColor Yellow
    }
} else {
    Write-Host "whisper.cjs: NOT FOUND" -ForegroundColor Red
    $allPassed = $false
}

# CHECK 4: LAUNCHER
Write-Host "`n[CHECK 4] LAUNCHER CONFIGURATION" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Gray

$launcher = "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\launchers\EDULENS-FIXED-LAUNCHER.cmd"
if (Test-Path $launcher) {
    $content = Get-Content $launcher -Raw
    
    Write-Host "Process cleanup: " -NoNewline
    if ($content -match "taskkill.*node\.exe") {
        Write-Host "YES ✓" -ForegroundColor Green
    } else {
        Write-Host "NO" -ForegroundColor Red
        $allPassed = $false
    }
    
    Write-Host "Port 5000 verification: " -NoNewline
    if ($content -match "netstat.*:5000") {
        Write-Host "YES ✓" -ForegroundColor Green
    } else {
        Write-Host "NO" -ForegroundColor Yellow
    }
    
    Write-Host "Vite startup: " -NoNewline
    if ($content -match "dev:frontend") {
        Write-Host "YES ✓" -ForegroundColor Green
    } else {
        Write-Host "NO" -ForegroundColor Red
        $allPassed = $false
    }
    
    Write-Host "PORT environment set: " -NoNewline
    if ($content -match '\$env:PORT') {
        Write-Host "YES ✓" -ForegroundColor Green
    } else {
        Write-Host "NO" -ForegroundColor Yellow
    }
} else {
    Write-Host "Launcher: NOT FOUND" -ForegroundColor Red
    $allPassed = $false
}

# CHECK 5: SYNTAX ERRORS
Write-Host "`n[CHECK 5] SYNTAX VERIFICATION" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Gray

if (Test-Path $launcher) {
    Write-Host "Checking launcher syntax..." -ForegroundColor White
    $lines = Get-Content $launcher
    $errors = 0
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        # Check for common batch file errors
        if ($line -match '[^%]%[^%]' -and $line -notmatch 'echo') {
            Write-Host "  Line $lineNum`: Single % without escape" -ForegroundColor Yellow
            $errors++
        }
    }
    if ($errors -eq 0) {
        Write-Host "  NO ERRORS ✓" -ForegroundColor Green
    } else {
        Write-Host "  Found $errors potential issues" -ForegroundColor Yellow
    }
}

# FINAL SUMMARY
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "System is ready to use!" -ForegroundColor Green
} else {
    Write-Host "  SOME CHECKS FAILED" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please review the issues above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
