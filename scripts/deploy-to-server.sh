#!/bin/bash

# OpenShutter PM2 Deployment Script
# This script should be run on the server after uploading the deployment package

set -e

# Configuration
PROJECT_ROOT="/var/www/yourdomain.com"
PM2_APP_NAME="openshutter"
ZIP_FILE="openshutter-deployment.zip"
BACKUP_DIR="/var/www/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

# Check if zip file exists
if [ ! -f "$ZIP_FILE" ]; then
    error "Deployment package '$ZIP_FILE' not found in current directory"
    exit 1
fi

log "🚀 Starting OpenShutter PM2 deployment..."

# Create backup if application exists
if [ -d "$PROJECT_ROOT" ] && [ -f "$PROJECT_ROOT/package.json" ]; then
    log "📦 Creating backup of current deployment..."
    BACKUP_NAME="openshutter-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r "$PROJECT_ROOT" "$BACKUP_DIR/$BACKUP_NAME"
    success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
fi

# Stop PM2 application if running
log "⏹️  Stopping PM2 application..."
if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
    pm2 stop "$PM2_APP_NAME"
    success "PM2 application stopped"
else
    warning "PM2 application '$PM2_APP_NAME' not found or not running"
fi

# Create project directory if it doesn't exist
mkdir -p "$PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Extract deployment package
log "📁 Extracting deployment package..."
unzip -o "/tmp/$ZIP_FILE" -d "$PROJECT_ROOT"
success "Package extracted successfully"

# Install production dependencies
log "📦 Installing production dependencies..."
pnpm install --production --frozen-lockfile
success "Dependencies installed"

# Setup completed
log "📁 Build setup completed"
success "Regular build ready for deployment"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Start PM2 application
log "🚀 Starting PM2 application..."
pm2 start ecosystem.config.js
success "PM2 application started"

# Save PM2 configuration
pm2 save
success "PM2 configuration saved"

# Show application status
log "📊 Application status:"
pm2 status

# Show logs
log "📋 Recent logs:"
pm2 logs "$PM2_APP_NAME" --lines 10

# Cleanup
rm -f "/tmp/$ZIP_FILE"
success "Temporary files cleaned up"

success "🎉 Deployment completed successfully!"
log "Application is running at: http://localhost:4000"
log "PM2 app name: $PM2_APP_NAME"
log "Project root: $PROJECT_ROOT"

# Show useful commands
echo ""
log "📋 Useful PM2 commands:"
echo "  pm2 status                    # Check application status"
echo "  pm2 logs $PM2_APP_NAME        # View application logs"
echo "  pm2 restart $PM2_APP_NAME     # Restart application"
echo "  pm2 stop $PM2_APP_NAME        # Stop application"
echo "  pm2 monit                     # Monitor applications"
