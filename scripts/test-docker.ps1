# Test Docker setup for OpenShutter
Write-Host "🐳 Testing Docker Setup for OpenShutter" -ForegroundColor Blue
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        Write-Host "   You can start Docker Desktop from the Start menu or system tray." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Docker is not installed or not accessible." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
Write-Host "Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker Compose is available" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker Compose is not available" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker Compose is not installed" -ForegroundColor Red
    exit 1
}

# Check if .env.local exists
Write-Host "Checking environment file..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.local not found. Creating a test version..." -ForegroundColor Yellow
}

# Always create/update .env.local for testing
$envContent = @"
# MongoDB Configuration
MONGODB_URI=mongodb://host.docker.internal:27017/openshutter
MONGODB_DB=openshutter

# NextAuth Configuration
NEXTAUTH_SECRET=test-secret-key-for-docker-testing-$(Get-Random)
NEXTAUTH_URL=http://localhost:4000

# Local Storage Configuration
LOCAL_STORAGE_PATH=/app/storage
STORAGE_PROVIDER=local

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:4000
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Host "✅ Created/updated .env.local for testing" -ForegroundColor Green

# Test Docker build
Write-Host "Testing Docker build..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

try {
    docker build -t openshutter-test . 2>&1 | ForEach-Object {
        if ($_ -match "ERROR|error") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "SUCCESS|success|Built") {
            Write-Host $_ -ForegroundColor Green
        } else {
            Write-Host $_
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker build successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Docker setup is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Blue
        Write-Host "  pnpm docker:prod    - Start production environment" -ForegroundColor Cyan
        Write-Host "  pnpm docker:dev     - Start development environment" -ForegroundColor Cyan
        Write-Host "  pnpm docker:logs    - View logs" -ForegroundColor Cyan
        Write-Host "  pnpm docker:stop    - Stop containers" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Docker build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker build failed with error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🐳 Docker setup test completed!" -ForegroundColor Blue
