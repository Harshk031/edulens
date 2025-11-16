# EduLens - Stuck Job Cleanup Utility
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EduLens - Stuck Job Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

$jobsDir = "data\storage\sessions\jobs"

if (-not (Test-Path $jobsDir)) {
    Write-Host "No jobs directory found!" -ForegroundColor Red
    exit
}

# Get all job files
$jobFiles = Get-ChildItem "$jobsDir\*.json"

if ($jobFiles.Count -eq 0) {
    Write-Host "No jobs found!" -ForegroundColor Yellow
    exit
}

Write-Host "Found $($jobFiles.Count) job(s)" -ForegroundColor White
Write-Host ""

# Analyze each job
$stuckJobs = @()
$activeJobs = @()
$completedJobs = @()

foreach ($file in $jobFiles) {
    try {
        $job = Get-Content $file.FullName | ConvertFrom-Json
        $lastUpdate = [DateTime]::Parse($job.updatedAt)
        $minutesAgo = [math]::Round(((Get-Date) - $lastUpdate).TotalMinutes, 1)
        
        $jobInfo = [PSCustomObject]@{
            File = $file.Name
            VideoId = $job.videoId
            Status = $job.status
            Progress = $job.progress
            MinutesAgo = $minutesAgo
            Path = $file.FullName
        }
        
        if ($job.status -eq "done" -or $job.status -eq "completed") {
            $completedJobs += $jobInfo
        }
        elseif ($job.status -eq "processing" -and $minutesAgo -gt 10) {
            $stuckJobs += $jobInfo
        }
        elseif ($job.status -eq "processing") {
            $activeJobs += $jobInfo
        }
        else {
            $stuckJobs += $jobInfo
        }
    }
    catch {
        Write-Host "Error reading $($file.Name): $_" -ForegroundColor Red
    }
}

# Display active jobs
if ($activeJobs.Count -gt 0) {
    Write-Host "✅ ACTIVE JOBS ($($activeJobs.Count)):" -ForegroundColor Green
    $activeJobs | Format-Table VideoId, Progress, MinutesAgo -AutoSize
}

# Display completed jobs
if ($completedJobs.Count -gt 0) {
    Write-Host "✅ COMPLETED JOBS ($($completedJobs.Count)):" -ForegroundColor Green
    $completedJobs | Format-Table VideoId, Progress, MinutesAgo -AutoSize
}

# Display stuck jobs
if ($stuckJobs.Count -gt 0) {
    Write-Host "⚠️  STUCK JOBS ($($stuckJobs.Count)):" -ForegroundColor Yellow
    $stuckJobs | Format-Table VideoId, Status, Progress, MinutesAgo -AutoSize
    Write-Host ""
    
    $response = Read-Host "Delete stuck jobs? (y/n)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        foreach ($job in $stuckJobs) {
            try {
                Remove-Item $job.Path -Force
                Write-Host "  ✓ Deleted: $($job.File)" -ForegroundColor Green
            }
            catch {
                Write-Host "  ✗ Failed to delete: $($job.File) - $_" -ForegroundColor Red
            }
        }
        Write-Host ""
        Write-Host "Cleanup complete!" -ForegroundColor Green
    }
    else {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    }
}
else {
    Write-Host "✅ No stuck jobs found!" -ForegroundColor Green
}

# Option to clean old completed jobs
if ($completedJobs.Count -gt 0) {
    Write-Host ""
    $response = Read-Host "Delete old completed jobs? (y/n)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        $deleted = 0
        foreach ($job in $completedJobs) {
            if ($job.MinutesAgo -gt 60) { # Older than 1 hour
                try {
                    Remove-Item $job.Path -Force
                    Write-Host "  ✓ Deleted: $($job.File)" -ForegroundColor Green
                    $deleted++
                }
                catch {
                    Write-Host "  ✗ Failed to delete: $($job.File) - $_" -ForegroundColor Red
                }
            }
        }
        Write-Host ""
        Write-Host "Deleted $deleted old completed job(s)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
