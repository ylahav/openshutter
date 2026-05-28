# OpenShutter production start (Windows)
# Starts backend and frontend using ports/env from build.ps1 output.
# Press Ctrl+C to stop both processes.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Read-DotEnvFile {
    param([string]$Path)
    $vars = @{}
    if (-not (Test-Path $Path)) { return $vars }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        $vars[$key] = $val
    }
    return $vars
}

function Start-NodeApp {
    param(
        [string]$Label,
        [string]$WorkingDir,
        [string]$Script,
        [hashtable]$EnvVars
    )
    $node = (Get-Command node -ErrorAction Stop).Source
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $node
    $psi.Arguments = $Script
    $psi.WorkingDirectory = $WorkingDir
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    foreach ($key in $EnvVars.Keys) {
        $psi.EnvironmentVariables[$key] = [string]$EnvVars[$key]
    }
    $proc = [System.Diagnostics.Process]::Start($psi)
    if (-not $proc) { throw "Failed to start $Label" }
    return $proc
}

function Stop-Existing {
    param([string]$PidFile, [string]$Label)
    if (-not (Test-Path $PidFile)) { return }
    $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
        Write-Host "Stopping existing $Label (PID $oldPid)..." -ForegroundColor Yellow
        Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$backendEnvPath = Join-Path $PSScriptRoot 'backend\.env'
$frontendEnvPath = Join-Path $PSScriptRoot 'frontend\.env.production'
$backendPidFile = Join-Path $PSScriptRoot '.openshutter-backend.pid'
$frontendPidFile = Join-Path $PSScriptRoot '.openshutter-frontend.pid'

$backendEnv = Read-DotEnvFile $backendEnvPath
$frontendEnv = Read-DotEnvFile $frontendEnvPath

$backendPort = if ($backendEnv['PORT']) { $backendEnv['PORT'] } else { '5000' }
$frontendPort = if ($frontendEnv['PORT']) { $frontendEnv['PORT'] } else { '4000' }

Write-Host ''
Write-Host 'Starting OpenShutter...' -ForegroundColor Green
Write-Host "  Backend:  http://localhost:$backendPort"
Write-Host "  Frontend: http://localhost:$frontendPort"
Write-Host ''

Stop-Existing $backendPidFile 'backend'
Stop-Existing $frontendPidFile 'frontend'

$backendVars = @{}
foreach ($k in $backendEnv.Keys) { $backendVars[$k] = $backendEnv[$k] }
$backendVars['PORT'] = $backendPort
$backendVars['NODE_ENV'] = 'production'

Write-Host "Starting backend on port $backendPort..." -ForegroundColor Cyan
$backendProc = Start-NodeApp -Label 'backend' `
    -WorkingDir (Join-Path $PSScriptRoot 'backend') `
    -Script 'dist/main.js' `
    -EnvVars $backendVars
$backendProc.Id | Set-Content $backendPidFile

Start-Sleep -Seconds 3

$frontendVars = @{}
foreach ($k in $frontendEnv.Keys) { $frontendVars[$k] = $frontendEnv[$k] }
$frontendVars['PORT'] = $frontendPort
$frontendVars['NODE_ENV'] = 'production'

Write-Host "Starting frontend on port $frontendPort..." -ForegroundColor Cyan
$frontendProc = Start-NodeApp -Label 'frontend' `
    -WorkingDir (Join-Path $PSScriptRoot 'frontend') `
    -Script 'build/index.js' `
    -EnvVars $frontendVars
$frontendProc.Id | Set-Content $frontendPidFile

Write-Host ''
Write-Host 'Services started.' -ForegroundColor Green
Write-Host "  Setup wizard: http://localhost:$frontendPort/setup"
Write-Host "  Admin login:  http://localhost:$frontendPort/login"
Write-Host ''
Write-Host 'Stop with:  .\stop.ps1   or press Ctrl+C in this window' -ForegroundColor Yellow
Write-Host ''

try {
    Wait-Process -Id $backendProc.Id, $frontendProc.Id
} finally {
    Stop-Existing $backendPidFile 'backend'
    Stop-Existing $frontendPidFile 'frontend'
}
