# EduLens Backend Safe Starter
# Automatically restarts backend if it crashes

$appPath = "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\app"
$restartCount = 0
$maxRestarts = 5

Write-Host "🚀 EduLens Backend Safe Starter" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

while ($restartCount -lt $maxRestarts) {
    if ($restartCount -gt 0) {
        Write-Host ""
        Write-Host "⚠️ Backend crashed! Restart #$restartCount" -ForegroundColor Yellow
        Write-Host "Waiting 3 seconds before restart..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
    
    Write-Host "🔄 Starting backend server..." -ForegroundColor Green
    Write-Host "   Path: $appPath" -ForegroundColor Gray
    Write-Host "   Time: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $appPath
    
    # Start backend and capture exit code
    node --expose-gc backend/server.js
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ Backend exited cleanly" -ForegroundColor Green
        break
    } else {
        Write-Host ""
        Write-Host "❌ Backend crashed with exit code: $exitCode" -ForegroundColor Red
        $restartCount++
    }
}

if ($restartCount -ge $maxRestarts) {
    Write-Host ""
    Write-Host "❌ Backend crashed $maxRestarts times. Giving up." -ForegroundColor Red
    Write-Host "   Check the error messages above for details." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
