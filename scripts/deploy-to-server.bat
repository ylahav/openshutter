@echo off
REM Deploy OpenShutter to a production server (Windows)
REM Usage: scripts\deploy-to-server.bat user@server-ip [path]

setlocal enabledelayedexpansion

REM Check arguments
if "%1"=="" (
    echo ❌ Usage: %0 user@server-ip [deployment-path]
    echo Example: %0 user@192.168.1.100 /opt/openshutter
    exit /b 1
)

set SERVER=%1
set DEPLOY_PATH=%2
if "%DEPLOY_PATH%"=="" set DEPLOY_PATH=/opt/openshutter

echo 🚀 Deploying OpenShutter to %SERVER%
echo Deployment path: %DEPLOY_PATH%
echo.

REM Check if deployment package exists
if not exist "openshutter-deployment.tar.gz" (
    echo ⚠️  Deployment package not found. Building it now...
    call scripts\build-for-production.bat
)

REM Create deployment directory on server
echo 📁 Creating deployment directory on server...
ssh %SERVER% "mkdir -p %DEPLOY_PATH%"

REM Copy deployment package
echo 📦 Copying deployment package to server...
scp openshutter-deployment.tar.gz %SERVER%:%DEPLOY_PATH%/

REM Extract and deploy on server
echo 🔧 Deploying on server...
ssh %SERVER% "cd %DEPLOY_PATH% && tar -xzf openshutter-deployment.tar.gz && docker load < openshutter-image.tar && docker-compose -f docker-compose.prod.yml down || true && docker-compose -f docker-compose.prod.yml up -d"

if %errorlevel% equ 0 (
    echo ✅ Deployment completed successfully!
    echo.
    echo Application is running at:
    echo   http://%SERVER:~4%:4000
    echo.
    echo Useful commands:
    echo   ssh %SERVER% "cd %DEPLOY_PATH% && docker-compose -f docker-compose.prod.yml logs -f"
    echo   ssh %SERVER% "cd %DEPLOY_PATH% && docker-compose -f docker-compose.prod.yml down"
    echo   ssh %SERVER% "cd %DEPLOY_PATH% && docker-compose -f docker-compose.prod.yml up -d"
) else (
    echo ❌ Deployment failed
    exit /b 1
)
