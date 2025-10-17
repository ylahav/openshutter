rem @echo off
REM Build OpenShutter for production deployment (Windows)
REM This script creates a production-ready Docker image and exports it

setlocal enabledelayedexpansion

echo 🚀 Building OpenShutter for Production
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Create production environment file if it doesn't exist
if not exist .env.production (
    echo ⚠️  Creating .env.production from env.development
    copy env.development .env.production
    echo ⚠️  Please edit .env.production with your production values
)

REM Build the production image
echo 🔨 Building production Docker image...
docker build -t openshutter:latest .

if %errorlevel% equ 0 (
    echo ✅ Docker image built successfully
) else (
    echo ❌ Docker build failed
    exit /b 1
)

REM Export the image
echo 📦 Exporting Docker image...
docker save openshutter:latest > openshutter-image.tar

if %errorlevel% equ 0 (
    echo ✅ Docker image exported to openshutter-image.tar
) else (
    echo ❌ Failed to export Docker image
    exit /b 1
)

REM Create deployment package
echo 📁 Creating deployment package...
tar -czf openshutter-deployment.tar.gz openshutter-image.tar docker-compose.prod.yml .env.production docs/DEPLOYMENT.md

if %errorlevel% equ 0 (
    echo ✅ Deployment package created: openshutter-deployment.tar.gz
) else (
    echo ❌ Failed to create deployment package
    exit /b 1
)

echo.
echo 🎉 Production build completed successfully!
echo.
echo Files created:
echo   openshutter-image.tar        - Docker image
echo   openshutter-deployment.tar.gz - Complete deployment package
echo.
echo Next steps:
echo   1. Copy openshutter-deployment.tar.gz to your server
echo   2. Extract: tar -xzf openshutter-deployment.tar.gz
echo   3. Load image: docker load ^< openshutter-image.tar
echo   4. Start: docker-compose -f docker-compose.prod.yml up -d
echo.
echo Or use the deployment script:
echo   scripts\deploy-to-server.bat user@your-server
