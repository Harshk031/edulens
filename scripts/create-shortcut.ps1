#Requires -Version 5.0
<#
.SYNOPSIS
Creates a Windows desktop shortcut for EduLens Hybrid

.DESCRIPTION
Creates a desktop shortcut that launches the one-click launcher script.
Supports custom icon from assets/icon.ico

.EXAMPLE
.\scripts\create-shortcut.ps1
#>

param(
    [string]$DesktopPath = "$env:USERPROFILE\Desktop",
    [switch]$Force
)

# ============================================
# COLOR OUTPUT HELPERS
# ============================================
function Write-Success {
    Write-Host "[OK] $args" -ForegroundColor Green
}

function Write-Error-Custom {
    Write-Host "[ERROR] $args" -ForegroundColor Red
}

function Write-Info {
    Write-Host "[INFO] $args" -ForegroundColor Cyan
}

# ============================================
# SETUP
# ============================================
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "EduLens Hybrid.lnk"
$LauncherScript = Join-Path -Path $ProjectRoot -ChildPath "scripts" | Join-Path -ChildPath "launch-edulens.ps1"
$IconPath = Join-Path -Path $ProjectRoot -ChildPath "assets" | Join-Path -ChildPath "icon.ico"
$BatchPath = Join-Path -Path $ProjectRoot -ChildPath "launch-edulens.bat"

# ============================================
# VALIDATION
# ============================================
Write-Info "Creating desktop shortcut for EduLens Hybrid..."

if (-not (Test-Path $LauncherScript)) {
    Write-Error-Custom "Launcher script not found: $LauncherScript"
    exit 1
}

if ((Test-Path $ShortcutPath) -and -not $Force) {
    Write-Info "Shortcut already exists. Use -Force to overwrite."
    Write-Info "Shortcut path: $ShortcutPath"
    exit 0
}

# ============================================
# CREATE SHORTCUT
# ============================================
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    
    # Use batch file as target (no PowerShell console window)
    $Shortcut.TargetPath = $BatchPath
    $Shortcut.WorkingDirectory = $ProjectRoot
    $Shortcut.Description = "EduLens Hybrid - AI Focus Mode Application"
    
    # Set icon if it exists
    if (Test-Path $IconPath) {
        $Shortcut.IconLocation = $IconPath
        Write-Info "Icon set: $IconPath"
    } else {
        Write-Info "Icon not found at $IconPath (optional)"
    }
    
    # Save shortcut
    $Shortcut.Save()
    
    Write-Success "Desktop shortcut created!"
    Write-Info "Location: $ShortcutPath"
    Write-Info "Working Directory: $ProjectRoot"
    Write-Info "Target: $BatchPath"
    
} catch {
    Write-Error-Custom "Failed to create shortcut: $_"
    exit 1
}

# ============================================
# VERIFICATION
# ============================================
if (Test-Path $ShortcutPath) {
    Write-Success "Shortcut verified on disk"
    $ShortcutItem = Get-Item $ShortcutPath
    Write-Info "Created: $($ShortcutItem.CreationTime)"
    Write-Info "Size: $($ShortcutItem.Length) bytes"
    Write-Success "Ready to use! Double-click EduLens Hybrid on your desktop to launch."
    exit 0
} else {
    Write-Error-Custom "Shortcut creation failed."
    exit 1
}
