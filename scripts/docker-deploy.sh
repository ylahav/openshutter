#!/bin/bash

# OpenShutter Docker Deployment Script
# Deploys the Docker image to production server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="openshutter"
TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"
CONTAINER_NAME="openshutter-prod"

echo -e "${BLUE}🚀 Deploying OpenShutter to Production...${NC}"

# Check if production env file exists
if [ ! -f "env.production" ]; then
    echo -e "${RED}❌ env.production file not found!${NC}"
    echo -e "${YELLOW}Please create env.production with your production configuration.${NC}"
    exit 1
fi

# Stop existing container if running
echo -e "${YELLOW}Stopping existing container...${NC}"
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
docker rm "${CONTAINER_NAME}" 2>/dev/null || true

# Pull latest image (if using registry)
# docker pull "${FULL_IMAGE_NAME}"

# Create necessary directories
echo -e "${YELLOW}Creating production directories...${NC}"
sudo mkdir -p /var/openshutter/storage
sudo mkdir -p /var/openshutter/logs
sudo chown -R 1001:1001 /var/openshutter/storage /var/openshutter/logs

# Run the container
echo -e "${YELLOW}Starting production container...${NC}"
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file env.production \
  -v /var/openshutter/storage:/app/storage \
  -v /var/openshutter/logs:/app/logs \
  "${FULL_IMAGE_NAME}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ OpenShutter deployed successfully!${NC}"
    echo -e "${BLUE}Container: ${CONTAINER_NAME}${NC}"
    echo -e "${BLUE}Port: 4000${NC}"
    echo -e "${BLUE}Storage: /var/openshutter/storage${NC}"
    echo -e "${BLUE}Logs: /var/openshutter/logs${NC}"
    
    # Show container status
    echo -e "${YELLOW}Container status:${NC}"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show logs
    echo -e "${YELLOW}Recent logs:${NC}"
    docker logs --tail 20 "${CONTAINER_NAME}"
    
    echo -e "${GREEN}🎉 Deployment completed!${NC}"
    echo -e "${BLUE}Application should be available at: http://localhost:4000${NC}"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi
