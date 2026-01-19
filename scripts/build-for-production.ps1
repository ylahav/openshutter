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

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Blue
if (Test-Path "backend\dist") {
    Remove-Item -Path "backend\dist" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "frontend\build") {
    Remove-Item -Path "frontend\build" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "frontend\.svelte-kit") {
    Remove-Item -Path "frontend\.svelte-kit" -Recurse -Force -ErrorAction SilentlyContinue
}

# Build backend
Write-Host "Building backend..." -ForegroundColor Blue
try {
    pnpm --filter openshutter-backend build
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        throw "Backend build failed with exit code $LASTEXITCODE"
    }
    if (-not (Test-Path "backend\dist")) {
        throw "Backend dist directory was not created"
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
    if (-not (Test-Path "frontend\build") -and -not (Test-Path "frontend\.svelte-kit\output")) {
        throw "Frontend build directory was not created"
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
# SvelteKit with adapter-node outputs to build/ directory
if (Test-Path "frontend\build") {
    Copy-Item -Path "frontend\build" -Destination (Join-Path $DEPLOY_DIR "frontend\build") -Recurse -Force
    Write-Host "    Copied frontend/build directory" -ForegroundColor Green
} elseif (Test-Path "frontend\.svelte-kit\output") {
    # Fallback for other adapters
    New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "frontend\.svelte-kit") -Force | Out-Null
    Copy-Item -Path "frontend\.svelte-kit\output" -Destination (Join-Path $DEPLOY_DIR "frontend\.svelte-kit\output") -Recurse -Force
    Write-Host "    Copied frontend/.svelte-kit/output directory" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: Frontend build directory not found!" -ForegroundColor Red
    Write-Host "Expected: frontend\build or frontend\.svelte-kit\output" -ForegroundColor Red
    exit 1
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

# Copy utility scripts
Write-Host "  Copying utility scripts..." -ForegroundColor Blue
New-Item -ItemType Directory -Path (Join-Path $DEPLOY_DIR "scripts") -Force | Out-Null
if (Test-Path "scripts\cleanup-storage-configs.cjs") {
    Copy-Item -Path "scripts\cleanup-storage-configs.cjs" -Destination (Join-Path $DEPLOY_DIR "scripts\cleanup-storage-configs.cjs") -Force
}
if (Test-Path "scripts\cleanup-storage-configs.sh") {
    Copy-Item -Path "scripts\cleanup-storage-configs.sh" -Destination (Join-Path $DEPLOY_DIR "scripts\cleanup-storage-configs.sh") -Force
}

# Create build script (installs dependencies and configures environment)
# Use single-quoted here-string to prevent PowerShell variable expansion
$BUILD_SCRIPT = @'
#!/bin/bash
# Production build script for OpenShutter
# This script installs all production dependencies and configures environment variables

set -e

echo "=========================================="
echo "OpenShutter Production Setup"
echo "=========================================="
echo ""

# Ask if this is an update or first installation
read -p "Is this an update to an existing installation? (y/n) [n]: " IS_UPDATE
IS_UPDATE=${IS_UPDATE:-n}

if [[ "$IS_UPDATE" =~ ^[Yy]$ ]]; then
    echo ""
    echo "=========================================="
    echo "Update Mode: Installing dependencies only"
    echo "=========================================="
    echo ""
    echo "Existing configuration files will be preserved."
    echo ""
    
    # Install dependencies only (preserves existing .env files)
    echo "Installing root dependencies..."
    pnpm install --prod --frozen-lockfile
    
    echo "Installing backend dependencies..."
    cd backend
    pnpm install --prod --frozen-lockfile
    cd ..
    
    echo "Installing frontend dependencies..."
    cd frontend
    pnpm install --prod --frozen-lockfile
    cd ..
    
    echo ""
    echo "=========================================="
    echo "✅ Update completed successfully!"
    echo "=========================================="
    echo ""
    echo "Dependencies have been updated."
    echo "Your existing configuration files (.env, ecosystem.config.js) have been preserved."
    echo ""
    echo "Next steps:"
    echo "  1. Restart services: pm2 restart all"
    echo "  2. Verify: pm2 status"
    echo ""
    exit 0
fi

# First installation - prompt for configuration
echo "First Installation Mode: Full setup"
echo ""
echo "Please provide the following configuration:"
echo ""

# Backend port
read -p "Backend port [5000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-5000}

# Frontend port
read -p "Frontend port [4000]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-4000}

# MongoDB configuration
echo ""
echo "MongoDB Configuration:"
read -p "MongoDB host [localhost:27017]: " MONGODB_HOST
MONGODB_HOST=${MONGODB_HOST:-localhost:27017}

read -p "Database name [openshutter]: " MONGODB_DB
MONGODB_DB=${MONGODB_DB:-openshutter}

read -p "Does MongoDB require authentication? (y/n) [n]: " MONGODB_AUTH_REQUIRED
MONGODB_AUTH_REQUIRED=${MONGODB_AUTH_REQUIRED:-n}

MONGODB_USER=""
MONGODB_PASSWORD=""
MONGODB_AUTH_SOURCE="admin"

if [[ "$MONGODB_AUTH_REQUIRED" =~ ^[Yy]$ ]]; then
    read -p "MongoDB username: " MONGODB_USER
    read -sp "MongoDB password: " MONGODB_PASSWORD
    echo ""
    read -p "MongoDB auth source [admin]: " MONGODB_AUTH_SOURCE
    MONGODB_AUTH_SOURCE=${MONGODB_AUTH_SOURCE:-admin}
fi

# Build MongoDB URI
if [[ "$MONGODB_AUTH_REQUIRED" =~ ^[Yy]$ ]]; then
    # URL encode special characters in password
    MONGODB_PASSWORD_ENCODED=$(echo -n "$MONGODB_PASSWORD" | sed 's/!/%21/g; s/@/%40/g; s/#/%23/g; s/\$/%24/g; s/%/%25/g; s/&/%26/g; s/\//%2F/g; s/:/%3A/g')
    MONGODB_URI="mongodb://${MONGODB_USER}:${MONGODB_PASSWORD_ENCODED}@${MONGODB_HOST}/${MONGODB_DB}?authSource=${MONGODB_AUTH_SOURCE}"
else
    MONGODB_URI="mongodb://${MONGODB_HOST}/${MONGODB_DB}"
fi

echo ""
echo "=========================================="
echo "Installing dependencies..."
echo "=========================================="

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

echo ""
echo "=========================================="
echo "Creating environment files..."
echo "=========================================="

# Generate JWT secret (same for both frontend and backend)
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

# Create backend .env file
echo "Creating backend/.env..."
cat > backend/.env << EOF
# MongoDB Configuration
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}

# Authentication Configuration
AUTH_JWT_SECRET=${JWT_SECRET}

# Application Configuration
NODE_ENV=production
PORT=${BACKEND_PORT}

# CORS Configuration
FRONTEND_URL=http://localhost:${FRONTEND_PORT}
EOF

# Create frontend .env.production file
echo "Creating frontend/.env.production..."
cat > frontend/.env.production << EOF
# Authentication Configuration (SvelteKit)
AUTH_JWT_SECRET=${JWT_SECRET}

# Application Configuration
NODE_ENV=production
BACKEND_URL=http://localhost:${BACKEND_PORT}
PORT=${FRONTEND_PORT}
EOF

echo ""
echo "=========================================="
echo "✅ Setup completed successfully!"
echo "=========================================="
echo ""
echo "Configuration summary:"
echo "  Backend port: ${BACKEND_PORT}"
echo "  Frontend port: ${FRONTEND_PORT}"
echo "  MongoDB URI: ${MONGODB_URI}"
echo ""
echo "Environment files created:"
echo "  - backend/.env"
echo "  - frontend/.env.production"
echo ""

# Create PM2 ecosystem.config.js for frontend
echo "Creating frontend/ecosystem.config.js..."
cat > frontend/ecosystem.config.js << ECFGEOF
// PM2 Ecosystem Configuration for OpenShutter Frontend
// Auto-generated by build.sh - do not edit manually

// Load environment variables from .env.production
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.production');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

module.exports = {
  apps: [{
    name: 'openshutter-frontend',
    script: 'build/index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: ${FRONTEND_PORT},
      BACKEND_URL: 'http://localhost:${BACKEND_PORT}',
      AUTH_JWT_SECRET: '${JWT_SECRET}',
      ...envVars  // Include all other variables from .env.production
    },
    // Auto restart settings
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    
    // Health monitoring
    min_uptime: '10s',
    max_restarts: 10,
    
    // Process management
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
ECFGEOF

echo "  - frontend/ecosystem.config.js"
echo ""
echo "⚠️  IMPORTANT: The AUTH_JWT_SECRET has been set to the same value in both files."
echo ""
'@
# Write build.sh with LF line endings (Unix format)
$buildScriptPath = Join-Path $DEPLOY_DIR "build.sh"
$buildScriptContent = $BUILD_SCRIPT -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText($buildScriptPath, $buildScriptContent, [System.Text.UTF8Encoding]::new($false))

# Create start script (starts the application)
# Use single-quoted here-string to prevent PowerShell variable expansion
$START_SCRIPT = @'
#!/bin/bash
# Production start script for OpenShutter
# This script starts both backend and frontend services
# Ports are read from environment files created by build.sh

set -e

# Load backend port from backend/.env file
if [ -f "backend/.env" ]; then
    export $(grep -v '^#' backend/.env | grep -E '^PORT=' | xargs)
    BACKEND_PORT=${PORT:-5000}
    echo "📋 Loaded backend port from backend/.env: ${BACKEND_PORT}"
else
    BACKEND_PORT=${PORT:-5000}
    echo "⚠️  backend/.env not found, using default port: ${BACKEND_PORT}"
fi

# Load frontend port from frontend/.env.production file
if [ -f "frontend/.env.production" ]; then
    export $(grep -v '^#' frontend/.env.production | grep -E '^PORT=' | xargs)
    FRONTEND_PORT=${PORT:-4000}
    echo "📋 Loaded frontend port from frontend/.env.production: ${FRONTEND_PORT}"
else
    FRONTEND_PORT=${PORT:-4000}
    echo "⚠️  frontend/.env.production not found, using default port: ${FRONTEND_PORT}"
fi

echo ""
echo "🚀 Starting OpenShutter services..."
echo "   Backend port: ${BACKEND_PORT}"
echo "   Frontend port: ${FRONTEND_PORT}"
echo ""

# Start backend
echo "Starting backend on port ${BACKEND_PORT}..."
cd backend
PORT=${BACKEND_PORT} node dist/main.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend (SvelteKit)
echo "Starting frontend on port ${FRONTEND_PORT}..."
cd ../frontend
# Load environment variables from .env.production if it exists
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | grep -v '^$' | xargs)
    echo "📋 Loaded environment variables from .env.production"
fi
# PORT must be set as environment variable (adapter-node defaults to 3000 if not set)
# Use build/index.js (not just 'build') for ES module compatibility
PORT=${FRONTEND_PORT} node build/index.js &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
'@
# Write start.sh with LF line endings (Unix format)
$startScriptPath = Join-Path $DEPLOY_DIR "start.sh"
$startScriptContent = $START_SCRIPT -replace "`r`n", "`n" -replace "`r", "`n"
[System.IO.File]::WriteAllText($startScriptPath, $startScriptContent, [System.Text.UTF8Encoding]::new($false))

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
            # Remove existing ZIP if it exists
            if (Test-Path $ZIP_PATH) {
                Remove-Item $ZIP_PATH -Force
            }
            
            # Create ZIP with contents at root level (not inside 'openshutter' folder)
            # Use .NET compression API (compatible with PowerShell 5.1+)
            try {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
            } catch {
                Write-Host "WARNING: Could not load compression assembly, using fallback method" -ForegroundColor Yellow
            }
            
            # Try using .NET ZipFile API if available
            if ([System.IO.Compression.ZipFile]::Open) {
                $zip = [System.IO.Compression.ZipFile]::Open($ZIP_PATH, [System.IO.Compression.ZipArchiveMode]::Create)
                try {
                    # Get all files recursively from the openshutter directory
                    # $DEPLOY_DIR already points to the 'openshutter' folder, so files are directly inside it
                    $files = Get-ChildItem -Path $DEPLOY_DIR -Recurse -File
                    foreach ($file in $files) {
                        # Calculate relative path from DEPLOY_DIR (which is the 'openshutter' folder)
                        # This gives us paths like "backend/...", "frontend/...", etc. directly at root
                        $relativePath = $file.FullName.Substring($DEPLOY_DIR.Length + 1)
                        # Use forward slashes for ZIP file paths (ZIP standard)
                        $entryName = $relativePath.Replace('\', '/')
                        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName) | Out-Null
                    }
                } finally {
                    $zip.Dispose()
                }
            } else {
                # Fallback: Create a temporary directory structure and compress it
                Write-Host "  Using fallback ZIP method..." -ForegroundColor Yellow
                $tempZipDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
                New-Item -ItemType Directory -Path $tempZipDir -Force | Out-Null
                
                # Copy contents of openshutter folder to temp directory root
                $items = Get-ChildItem -Path $DEPLOY_DIR
                foreach ($item in $items) {
                    Copy-Item -Path $item.FullName -Destination (Join-Path $tempZipDir $item.Name) -Recurse -Force
                }
                
                # Create ZIP from temp directory
                Compress-Archive -Path "$tempZipDir\*" -DestinationPath $ZIP_PATH -Force
                
                # Clean up temp directory
                Remove-Item -Path $tempZipDir -Recurse -Force
            }
            
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
                # Fallback to ZIP with contents at root level
                if (Test-Path $ZIP_PATH) {
                    Remove-Item $ZIP_PATH -Force
                }
                # Create temp directory and copy contents
                $tempZipDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
                New-Item -ItemType Directory -Path $tempZipDir -Force | Out-Null
                $items = Get-ChildItem -Path "openshutter"
                foreach ($item in $items) {
                    Copy-Item -Path $item.FullName -Destination (Join-Path $tempZipDir $item.Name) -Recurse -Force
                }
                Compress-Archive -Path "$tempZipDir\*" -DestinationPath $ZIP_PATH -Force
                Remove-Item -Path $tempZipDir -Recurse -Force
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
            # Fallback to ZIP with contents at root level
            if (Test-Path $ZIP_PATH) {
                Remove-Item $ZIP_PATH -Force
            }
            # Create temp directory and copy contents
            $tempZipDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
            New-Item -ItemType Directory -Path $tempZipDir -Force | Out-Null
            $items = Get-ChildItem -Path "openshutter"
            foreach ($item in $items) {
                Copy-Item -Path $item.FullName -Destination (Join-Path $tempZipDir $item.Name) -Recurse -Force
            }
            Compress-Archive -Path "$tempZipDir\*" -DestinationPath $ZIP_PATH -Force
            Remove-Item -Path $tempZipDir -Recurse -Force
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
    # Create ZIP with contents at root level (not inside 'openshutter' folder)
    if (Test-Path $ZIP_PATH) {
        Remove-Item $ZIP_PATH -Force
    }
    # Create temp directory and copy contents
    $tempZipDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
    New-Item -ItemType Directory -Path $tempZipDir -Force | Out-Null
    $items = Get-ChildItem -Path $DEPLOY_DIR
    foreach ($item in $items) {
        Copy-Item -Path $item.FullName -Destination (Join-Path $tempZipDir $item.Name) -Recurse -Force
    }
    Compress-Archive -Path "$tempZipDir\*" -DestinationPath $ZIP_PATH -Force
    Remove-Item -Path $tempZipDir -Recurse -Force
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
