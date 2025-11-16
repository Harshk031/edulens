# Create desktop shortcut for EduLens
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\EduLens.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\EduLens.cmd"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.Description = "EduLens - AI-Powered Learning Assistant"
$Shortcut.Save()

Write-Host "✅ Desktop shortcut created: EduLens.lnk" -ForegroundColor Green
