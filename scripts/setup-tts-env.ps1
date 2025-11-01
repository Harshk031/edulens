# Install Python deps if available (optional offline engines)
try {
  $py = (Get-Command python -ErrorAction SilentlyContinue)
  if ($py) {
    Write-Host "Python detected. Installing optional TTS deps..."
    python -m pip install --upgrade pip | Out-Null
    python -m pip install coqui-tts pyttsx3 soundfile | Out-Null
  } else {
    Write-Host "Python not found. Skipping offline TTS deps."
  }
} catch {
  Write-Host "Failed to install Python deps: $($_.Exception.Message)"
}