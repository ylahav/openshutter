#!/bin/bash

# OpenShutter Docker Build Script
# Builds the Docker image for deployment

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

echo -e "${BLUE}🐳 Building OpenShutter Docker Image...${NC}"

# Build the Docker image
echo -e "${YELLOW}Building image: ${FULL_IMAGE_NAME}${NC}"
docker build -t "${FULL_IMAGE_NAME}" .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo -e "${BLUE}Image: ${FULL_IMAGE_NAME}${NC}"
    
    # Show image size
    echo -e "${YELLOW}Image size:${NC}"
    docker images "${FULL_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    echo -e "${GREEN}🎉 Ready for deployment!${NC}"
    echo -e "${BLUE}To run locally:${NC}"
    echo -e "  docker run -p 4000:4000 --env-file env.development ${FULL_IMAGE_NAME}"
    echo -e "${BLUE}To run in production:${NC}"
    echo -e "  docker run -p 4000:4000 --env-file env.production ${FULL_IMAGE_NAME}"
    echo -e "${BLUE}Or use pnpm scripts:${NC}"
    echo -e "  pnpm run docker:dev    # Development"
    echo -e "  pnpm run docker:prod   # Production"
else
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi
