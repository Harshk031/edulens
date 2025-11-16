# Create desktop shortcut for EduLens Desktop App
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\Harsh\OneDrive\Desktop\workkrrha.lnk")
$Shortcut.TargetPath = "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\launchers\EduLens-Desktop-Only.cmd"
$Shortcut.WorkingDirectory = "C:\Users\Harsh\OneDrive\Desktop\backup\EduLens\launchers"
$Shortcut.Description = "EduLens Desktop Application - Fully Autonomous"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,21"
$Shortcut.WindowStyle = 1
$Shortcut.Save()

Write-Host "✅ Desktop shortcut created: workkrrha.lnk" -ForegroundColor Green
Write-Host "🚀 EduLens Desktop App launcher ready!" -ForegroundColor Cyan
