# Stop OpenShutter backend/frontend started by start.ps1

$ErrorActionPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot

function Stop-ByPidFile {
    param([string]$PidFile, [string]$Label)
    if (-not (Test-Path $PidFile)) { return }
    $pid = Get-Content $PidFile
    if ($pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)) {
        Write-Host "Stopping $Label (PID $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
    }
    Remove-Item $PidFile -Force
}

Stop-ByPidFile (Join-Path $PSScriptRoot '.openshutter-backend.pid') 'backend'
Stop-ByPidFile (Join-Path $PSScriptRoot '.openshutter-frontend.pid') 'frontend'
Write-Host 'Done.' -ForegroundColor Green
