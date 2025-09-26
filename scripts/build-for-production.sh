#!/bin/bash

# Build OpenShutter for production deployment
# This script creates a production-ready Docker image and exports it

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building OpenShutter for Production${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Create production environment file if it doesn't exist
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  Creating .env.production from .env.example${NC}"
    cp .env.example .env.production
    echo -e "${YELLOW}⚠️  Please edit .env.production with your production values${NC}"
fi

# Build the production image
echo -e "${BLUE}🔨 Building production Docker image...${NC}"
docker build -t openshutter:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Export the image
echo -e "${BLUE}📦 Exporting Docker image...${NC}"
docker save openshutter:latest > openshutter-image.tar

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image exported to openshutter-image.tar${NC}"
else
    echo -e "${RED}❌ Failed to export Docker image${NC}"
    exit 1
fi

# Create deployment package
echo -e "${BLUE}📁 Creating deployment package...${NC}"
tar -czf openshutter-deployment.tar.gz \
    openshutter-image.tar \
    docker-compose.prod.yml \
    .env.production \
    DEPLOYMENT.md

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment package created: openshutter-deployment.tar.gz${NC}"
else
    echo -e "${RED}❌ Failed to create deployment package${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Production build completed successfully!${NC}"
echo ""
echo -e "${BLUE}Files created:${NC}"
echo -e "  ${YELLOW}openshutter-image.tar${NC}        - Docker image"
echo -e "  ${YELLOW}openshutter-deployment.tar.gz${NC} - Complete deployment package"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Copy ${YELLOW}openshutter-deployment.tar.gz${NC} to your server"
echo -e "  2. Extract: ${YELLOW}tar -xzf openshutter-deployment.tar.gz${NC}"
echo -e "  3. Load image: ${YELLOW}docker load < openshutter-image.tar${NC}"
echo -e "  4. Start: ${YELLOW}docker-compose -f docker-compose.prod.yml up -d${NC}"
echo ""
echo -e "${BLUE}Or use the deployment script:${NC}"
echo -e "  ${YELLOW}./scripts/deploy-to-server.sh user@your-server${NC}"
