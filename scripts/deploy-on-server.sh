#!/bin/bash

# OpenShutter Server Deployment Script
# This script is included in the deployment package for easy server deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PM2_APP_NAME="yairlCom"
PROJECT_ROOT="/var/www/yairl.com"

log "🚀 Starting OpenShutter deployment..."

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    error "ecosystem.config.js not found. Please run this script from the project root directory."
    exit 1
fi

# Check if we're already extracted (files should be present)
if [ ! -d ".next" ] || [ ! -f "package.json" ]; then
    error "Deployment files not found. Please ensure the ZIP file has been extracted and this script is run from the extracted directory."
    exit 1
fi

log "📁 Using extracted deployment files..."
success "Deployment files found"

# Install production dependencies
log "📦 Installing production dependencies..."
pnpm install --production --frozen-lockfile
success "Dependencies installed"

# Setup completed
log "📁 Build setup completed"
success "Regular build ready for deployment"

# Create logs directory
mkdir -p logs

# Stop existing PM2 application if running
log "🛑 Stopping existing PM2 application..."
pm2 stop $PM2_APP_NAME 2>/dev/null || warning "No existing PM2 application found"

# Start PM2 application
log "🚀 Starting PM2 application..."
pm2 start ecosystem.config.js
success "PM2 application started"

# Show status
log "📊 PM2 Status:"
pm2 status

# Show logs
log "📋 Recent logs:"
pm2 logs $PM2_APP_NAME --lines 10

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
