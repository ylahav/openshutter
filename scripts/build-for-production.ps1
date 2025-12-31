# Build OpenShutter monorepo for production deployment (Windows PowerShell)
# This script builds both backend and frontend, then creates a deployment package and Docker image

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

# Check if Docker is running (for Docker-based deployment)
$DOCKER_AVAILABLE = $false
try {
    docker info | Out-Null
    $DOCKER_AVAILABLE = $true
} catch {
    Write-Host "WARNING: Docker is not running. Docker-based deployment will be skipped." -ForegroundColor Yellow
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

# Copy Docker files if they exist
# Note: Docker image does NOT include MongoDB - use external MongoDB
if (Test-Path "docker-compose.external-mongodb.yml") {
    Copy-Item -Path "docker-compose.external-mongodb.yml" -Destination (Join-Path $DEPLOY_DIR "docker-compose.yml") -Force
    Write-Host "  Using external MongoDB configuration (no MongoDB in image)" -ForegroundColor Green
}
if (Test-Path "docker-compose.prod.yml") {
    Copy-Item -Path "docker-compose.prod.yml" -Destination (Join-Path $DEPLOY_DIR "docker-compose.prod.yml") -Force
}
if (Test-Path "Dockerfile") {
    Copy-Item -Path "Dockerfile" -Destination (Join-Path $DEPLOY_DIR "Dockerfile") -Force
}

# Copy environment example if production env doesn't exist
if (Test-Path ".env.production") {
    Copy-Item -Path ".env.production" -Destination (Join-Path $DEPLOY_DIR ".env.production") -Force
} elseif (Test-Path ".env.example") {
    Copy-Item -Path ".env.example" -Destination (Join-Path $DEPLOY_DIR ".env.production.example") -Force
    Write-Host "WARNING: Created .env.production.example - please configure it on the server" -ForegroundColor Yellow
}

# Copy deployment documentation
if (Test-Path "docs\DEPLOYMENT.md") {
    New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "docs") -Force | Out-Null
    Copy-Item -Path "docs\DEPLOYMENT.md" -Destination (Join-Path $DEPLOY_DIR "docs\DEPLOYMENT.md") -Force
}

# Create a start script
$START_SCRIPT = @"
#!/bin/bash
# Production start script for OpenShutter

set -e

# Start backend
echo "Starting backend..."
cd backend
pnpm install --prod --frozen-lockfile
PORT=`${PORT:-5000} node dist/main.js &
BACKEND_PID=`$!

# Wait for backend to start
sleep 3

# Start frontend (SvelteKit)
echo "Starting frontend..."
cd ../frontend
pnpm install --prod --frozen-lockfile
PORT=`${FRONTEND_PORT:-4000} node build/index.js &
FRONTEND_PID=`$!

# Wait for both processes
wait `$BACKEND_PID `$FRONTEND_PID
"@
$START_SCRIPT | Out-File -FilePath (Join-Path $DEPLOY_DIR "start.sh") -Encoding utf8 -NoNewline

# Create deployment package using ZIP (preferred on Windows) or tar
Write-Host "  Creating archive..." -ForegroundColor Blue
$ZIP_PATH = Join-Path $PROJECT_ROOT "openshutter-deployment.zip"
$TAR_PATH = Join-Path $PROJECT_ROOT "openshutter-deployment.tar.gz"

# On Windows, prefer ZIP as it's more reliable
if ($IsWindows -or $env:OS -like "*Windows*") {
    Write-Host "  Using ZIP compression (Windows)" -ForegroundColor Blue
    if (Test-Path $DEPLOY_DIR) {
        Compress-Archive -Path $DEPLOY_DIR -DestinationPath $ZIP_PATH -Force
        if (Test-Path $ZIP_PATH) {
            $ZIP_SIZE = (Get-Item $ZIP_PATH).Length / 1MB
            Write-Host "  ZIP archive created successfully: $ZIP_PATH ($([math]::Round($ZIP_SIZE, 2)) MB)" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Failed to create ZIP archive" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: Deployment directory not found: $DEPLOY_DIR" -ForegroundColor Red
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

# Docker build
if ($DOCKER_AVAILABLE) {
    Write-Host "Building Docker image..." -ForegroundColor Blue
    docker build -t openshutter:latest .
    $DOCKER_BUILD_EXIT = $LASTEXITCODE
    
    if ($DOCKER_BUILD_EXIT -eq 0) {
        # Check if image was created
        $IMAGE_EXISTS = docker images openshutter:latest --format '{{.Repository}}' 2>$null
        if ($IMAGE_EXISTS -and $IMAGE_EXISTS.Trim() -eq "openshutter") {
            Write-Host "Exporting Docker image..." -ForegroundColor Blue
            docker save openshutter:latest -o openshutter-image.tar
            $DOCKER_SAVE_EXIT = $LASTEXITCODE
            if ($DOCKER_SAVE_EXIT -eq 0) {
                Write-Host "Docker image exported to openshutter-image.tar" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "Docker build failed or Dockerfile not found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Production build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Blue
if (Test-Path "openshutter-deployment.tar.gz") {
    $TAR_SIZE = (Get-Item "openshutter-deployment.tar.gz").Length / 1MB
    Write-Host "  openshutter-deployment.tar.gz - Complete deployment package ($([math]::Round($TAR_SIZE, 2)) MB)" -ForegroundColor Yellow
}
if (Test-Path "openshutter-deployment.zip") {
    $ZIP_SIZE = (Get-Item "openshutter-deployment.zip").Length / 1MB
    Write-Host "  openshutter-deployment.zip    - Complete deployment package (ZIP format) ($([math]::Round($ZIP_SIZE, 2)) MB)" -ForegroundColor Yellow
}
if (Test-Path "openshutter-image.tar") {
    Write-Host "  openshutter-image.tar        - Docker image" -ForegroundColor Yellow
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
Write-Host "  4. Install dependencies: cd openshutter; pnpm install --prod" -ForegroundColor White
Write-Host "  5. Start with Docker: docker-compose up -d" -ForegroundColor White
Write-Host "     Or start manually: ./start.sh" -ForegroundColor White
Write-Host ""
Write-Host "Note: Docker image does NOT include MongoDB. Use external MongoDB instance." -ForegroundColor Yellow
Write-Host ""
