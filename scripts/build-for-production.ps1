# Build OpenShutter monorepo for production deployment (Windows PowerShell)
# This script builds both backend and frontend, then creates a deployment package

$ErrorActionPreference = "Stop"

# Get the project root directory (parent of scripts directory)
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $PROJECT_ROOT

Write-Host "Building OpenShutter for Production" -ForegroundColor Blue
Write-Host ""

# Check if pnpm is available
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pnpm is not installed. Please install pnpm first." -ForegroundColor Red
    exit 1
}


# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Blue
try {
    # Try with frozen lockfile first, fall back to regular install if lockfile is outdated
    $installOutput = pnpm install --frozen-lockfile 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Lockfile outdated, updating..." -ForegroundColor Yellow
        pnpm install
        if ($LASTEXITCODE -ne 0) {
            throw "pnpm install failed"
        }
    }
} catch {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Build backend
Write-Host "Building backend..." -ForegroundColor Blue
try {
    pnpm --filter openshutter-backend build
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        throw "Backend build failed with exit code $LASTEXITCODE"
    }
    Write-Host "Backend built successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Backend build failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Blue
try {
    pnpm --filter openshutter build
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        throw "Frontend build failed with exit code $LASTEXITCODE"
    }
    Write-Host "Frontend built successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Clean up old deployment files
Write-Host "Cleaning up old build files..." -ForegroundColor Blue
if (Test-Path "openshutter-deployment.tar.gz") {
    Remove-Item "openshutter-deployment.tar.gz" -Force
}
if (Test-Path "openshutter-image.tar") {
    Remove-Item "openshutter-image.tar" -Force
}

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Blue

# Create a temporary directory for deployment files
# Compatible with both Windows PowerShell 5.1 and PowerShell Core 6.0+
$TEMP_DIR = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
$DEPLOY_DIR = Join-Path $TEMP_DIR "openshutter"
New-Item -ItemType Directory -Path $DEPLOY_DIR -Force | Out-Null

# Copy necessary files
Write-Host "  Copying backend files..." -ForegroundColor Blue
New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "backend") -Force | Out-Null
Copy-Item -Path "backend\dist" -Destination (Join-Path $DEPLOY_DIR "backend\dist") -Recurse -Force
Copy-Item -Path "backend\package.json" -Destination (Join-Path $DEPLOY_DIR "backend\package.json") -Force
if (Test-Path "backend\tsconfig.json") {
    Copy-Item -Path "backend\tsconfig.json" -Destination (Join-Path $DEPLOY_DIR "backend\tsconfig.json") -Force
}

Write-Host "  Copying frontend files..." -ForegroundColor Blue
New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "frontend") -Force | Out-Null
# SvelteKit uses .svelte-kit/output instead of build
if (Test-Path "frontend\.svelte-kit\output") {
    New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "frontend\.svelte-kit") -Force | Out-Null
    Copy-Item -Path "frontend\.svelte-kit\output" -Destination (Join-Path $DEPLOY_DIR "frontend\.svelte-kit\output") -Recurse -Force
}
if (Test-Path "frontend\build") {
    Copy-Item -Path "frontend\build" -Destination (Join-Path $DEPLOY_DIR "frontend\build") -Recurse -Force
}
Copy-Item -Path "frontend\package.json" -Destination (Join-Path $DEPLOY_DIR "frontend\package.json") -Force
if (Test-Path "frontend\svelte.config.js") {
    Copy-Item -Path "frontend\svelte.config.js" -Destination (Join-Path $DEPLOY_DIR "frontend\svelte.config.js") -Force
}
if (Test-Path "frontend\vite.config.ts") {
    Copy-Item -Path "frontend\vite.config.ts" -Destination (Join-Path $DEPLOY_DIR "frontend\vite.config.ts") -Force
}

Write-Host "  Copying configuration files..." -ForegroundColor Blue
Copy-Item -Path "package.json" -Destination (Join-Path $DEPLOY_DIR "package.json") -Force
if (Test-Path "pnpm-workspace.yaml") {
    Copy-Item -Path "pnpm-workspace.yaml" -Destination (Join-Path $DEPLOY_DIR "pnpm-workspace.yaml") -Force
}
if (Test-Path "pnpm-lock.yaml") {
    Copy-Item -Path "pnpm-lock.yaml" -Destination (Join-Path $DEPLOY_DIR "pnpm-lock.yaml") -Force
}


# Copy environment example files
Write-Host "  Copying environment example files..." -ForegroundColor Blue
# Frontend environment example
if (Test-Path "frontend\env.production.example") {
    Copy-Item -Path "frontend\env.production.example" -Destination (Join-Path $DEPLOY_DIR "frontend\env.production.example") -Force
}
# Frontend PM2 ecosystem config example
if (Test-Path "frontend\ecosystem.config.js.example") {
    Copy-Item -Path "frontend\ecosystem.config.js.example" -Destination (Join-Path $DEPLOY_DIR "frontend\ecosystem.config.js.example") -Force
}
# Backend environment example
if (Test-Path "backend\env.example") {
    Copy-Item -Path "backend\env.example" -Destination (Join-Path $DEPLOY_DIR "backend\env.example") -Force
}

# Copy deployment documentation
if (Test-Path "docs\DEPLOYMENT.md") {
    New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "docs") -Force | Out-Null
    Copy-Item -Path "docs\DEPLOYMENT.md" -Destination (Join-Path $DEPLOY_DIR "docs\DEPLOYMENT.md") -Force
}

# Create build script (installs dependencies)
$BUILD_SCRIPT = @"
#!/bin/bash
# Production build script for OpenShutter
# This script installs all production dependencies

set -e

echo "Installing dependencies for OpenShutter..."

# Install root dependencies
echo "Installing root dependencies..."
pnpm install --prod --frozen-lockfile

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pnpm install --prod --frozen-lockfile
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
pnpm install --prod --frozen-lockfile
cd ..

echo "All dependencies installed successfully!"
"@
$BUILD_SCRIPT | Out-File -FilePath (Join-Path $DEPLOY_DIR "build.sh") -Encoding utf8 -NoNewline

# Create start script (starts the application)
$START_SCRIPT = @"
#!/bin/bash
# Production start script for OpenShutter
# This script starts both backend and frontend services

set -e

# Start backend
echo "Starting backend..."
cd backend
PORT=`${PORT:-5000} node dist/main.js &
BACKEND_PID=`$!

# Wait for backend to start
sleep 3

# Start frontend (SvelteKit)
echo "Starting frontend..."
cd ../frontend
# PORT must be set as environment variable (adapter-node defaults to 3000 if not set)
# Use build/index.js (not just 'build') for ES module compatibility
PORT=${FRONTEND_PORT:-4000} node build/index.js &
FRONTEND_PID=$!

# Wait for both processes
wait `$BACKEND_PID `$FRONTEND_PID
"@
$START_SCRIPT | Out-File -FilePath (Join-Path $DEPLOY_DIR "start.sh") -Encoding utf8 -NoNewline

# Create deployment package using ZIP (preferred on Windows) or tar
Write-Host "  Creating archive..." -ForegroundColor Blue
$ZIP_PATH = Join-Path $PROJECT_ROOT "openshutter-deployment.zip"
$TAR_PATH = Join-Path $PROJECT_ROOT "openshutter-deployment.tar.gz"

# Detect Windows (works for both PowerShell 5.1 and PowerShell Core)
$isWindowsOS = $false
if ($IsWindows) {
    $isWindowsOS = $true
} elseif ($env:OS -like "*Windows*") {
    $isWindowsOS = $true
} elseif ($PSVersionTable.Platform -eq "Win32NT") {
    $isWindowsOS = $true
}

# On Windows, prefer ZIP as it's more reliable
if ($isWindowsOS) {
    Write-Host "  Using ZIP compression (Windows)" -ForegroundColor Blue
    if (Test-Path $DEPLOY_DIR) {
        try {
            Compress-Archive -Path $DEPLOY_DIR -DestinationPath $ZIP_PATH -Force
            if (Test-Path $ZIP_PATH) {
                $ZIP_SIZE = (Get-Item $ZIP_PATH).Length / 1MB
                Write-Host "  ZIP archive created successfully: $ZIP_PATH ($([math]::Round($ZIP_SIZE, 2)) MB)" -ForegroundColor Green
            } else {
                Write-Host "ERROR: Failed to create ZIP archive - file not found after creation" -ForegroundColor Red
                exit 1
            }
        } catch {
            Write-Host "ERROR: Failed to create ZIP archive: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERROR: Deployment directory not found: $DEPLOY_DIR" -ForegroundColor Red
        exit 1
    }
} elseif (Get-Command tar -ErrorAction SilentlyContinue) {
    # Use tar on Unix-like systems
    Push-Location $TEMP_DIR
    try {
        if (Test-Path "openshutter") {
            & tar -czf $TAR_PATH openshutter
            if ($LASTEXITCODE -eq 0 -and (Test-Path $TAR_PATH)) {
                $TAR_SIZE = (Get-Item $TAR_PATH).Length / 1MB
                Write-Host "  TAR archive created successfully: $TAR_PATH ($([math]::Round($TAR_SIZE, 2)) MB)" -ForegroundColor Green
            } else {
                Write-Host "ERROR: tar command failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
                # Fallback to ZIP
                Compress-Archive -Path "openshutter" -DestinationPath $ZIP_PATH -Force
                if (Test-Path $ZIP_PATH) {
                    $ZIP_SIZE = (Get-Item $ZIP_PATH).Length / 1MB
                    Write-Host "  Created ZIP archive instead: $ZIP_PATH ($([math]::Round($ZIP_SIZE, 2)) MB)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "ERROR: openshutter directory not found in $TEMP_DIR" -ForegroundColor Red
        }
    } finally {
        Pop-Location
    }
} elseif (Get-Command 7z -ErrorAction SilentlyContinue) {
    # Use 7zip as fallback
    Set-Location $TEMP_DIR
    if (Test-Path "openshutter") {
        7z a -ttar -so openshutter | 7z a -si $TAR_PATH
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: 7zip command failed" -ForegroundColor Red
            # Fallback to ZIP
            Compress-Archive -Path "openshutter" -DestinationPath $ZIP_PATH -Force
            if (Test-Path $ZIP_PATH) {
                $ZIP_SIZE = (Get-Item $ZIP_PATH).Length / 1MB
                Write-Host "  Created ZIP archive instead: $ZIP_PATH ($([math]::Round($ZIP_SIZE, 2)) MB)" -ForegroundColor Yellow
            }
        } else {
            if (Test-Path $TAR_PATH) {
                $TAR_SIZE = (Get-Item $TAR_PATH).Length / 1MB
                Write-Host "  TAR archive created successfully: $TAR_PATH ($([math]::Round($TAR_SIZE, 2)) MB)" -ForegroundColor Green
            }
        }
    }
    Set-Location $PROJECT_ROOT
} else {
    Write-Host "WARNING: tar or 7zip not found. Creating ZIP archive instead..." -ForegroundColor Yellow
    Compress-Archive -Path $DEPLOY_DIR -DestinationPath $ZIP_PATH -Force
    if (Test-Path $ZIP_PATH) {
        $ZIP_SIZE = (Get-Item $ZIP_PATH).Length / 1MB
        Write-Host "   Deployment files archived as ZIP: openshutter-deployment.zip ($([math]::Round($ZIP_SIZE, 2)) MB)" -ForegroundColor Yellow
    }
    Write-Host "   Deployment files are also in: $DEPLOY_DIR" -ForegroundColor Yellow
}

# Clean up temp directory
Remove-Item -Path $TEMP_DIR -Recurse -Force

Write-Host ""
# Verify ZIP was created
if (-not (Test-Path $ZIP_PATH)) {
    Write-Host "ERROR: Deployment package was not created!" -ForegroundColor Red
    Write-Host "Expected file: $ZIP_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Production build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Blue
if (Test-Path "openshutter-deployment.tar.gz") {
    $TAR_SIZE = (Get-Item "openshutter-deployment.tar.gz").Length / 1MB
    Write-Host "  openshutter-deployment.tar.gz - Complete deployment package ($([math]::Round($TAR_SIZE, 2)) MB)" -ForegroundColor Yellow
}
if (Test-Path "openshutter-deployment.zip") {
    $ZIP_SIZE = (Get-Item "openshutter-deployment.zip").Length / 1MB
    Write-Host "  openshutter-deployment.zip    - Complete deployment package (ZIP format) ($([math]::Round($ZIP_SIZE, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "ERROR: openshutter-deployment.zip was not created!" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
if (Test-Path "openshutter-deployment.zip") {
    Write-Host "  1. Copy openshutter-deployment.zip to your server" -ForegroundColor White
    Write-Host "  2. Extract: unzip openshutter-deployment.zip" -ForegroundColor White
} elseif (Test-Path "openshutter-deployment.tar.gz") {
    Write-Host "  1. Copy openshutter-deployment.tar.gz to your server" -ForegroundColor White
    Write-Host "  2. Extract: tar -xzf openshutter-deployment.tar.gz" -ForegroundColor White
}
Write-Host "  3. Configure .env.production with your MongoDB URI (external MongoDB required)" -ForegroundColor White
Write-Host "     Example: MONGODB_URI=mongodb://your-mongodb-host:27017/openshutter" -ForegroundColor Gray
Write-Host "  4. Install dependencies: cd openshutter; chmod +x build.sh; ./build.sh" -ForegroundColor White
Write-Host "  5. Start application: chmod +x start.sh; ./start.sh" -ForegroundColor White
Write-Host "     Or use PM2 (recommended): See docs/SERVER_DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
