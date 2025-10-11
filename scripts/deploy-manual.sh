#!/bin/bash
# Manual deployment script for deploying directly from local machine
# Usage: ./scripts/deploy-manual.sh

set -e

# Colour codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

echo -e "${GREEN}GitHub Planner - Manual Deployment Script${NC}"
echo "=============================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file with required environment variables"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required variables
REQUIRED_VARS=(
    "MONGODB_URI"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "GITHUB_TOKEN"
    "JWT_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set${NC}"
        exit 1
    fi
done

# Get Docker image name
read -p "Docker image name [githubplanner]: " IMAGE_NAME
IMAGE_NAME=${IMAGE_NAME:-githubplanner}

read -p "Docker image tag [latest]: " IMAGE_TAG
IMAGE_TAG=${IMAGE_TAG:-latest}

FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"

# Build Docker image
echo -e "\n${GREEN}Building Docker image...${NC}"
docker build -f Containerfile -t $FULL_IMAGE .

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Ask deployment method
echo -e "\n${YELLOW}Select deployment method:${NC}"
echo "1) Local (run container on this machine)"
echo "2) Remote server (deploy via SSH)"
echo "3) Build only (don't deploy)"
read -p "Choice [1]: " DEPLOY_METHOD
DEPLOY_METHOD=${DEPLOY_METHOD:-1}

if [ "$DEPLOY_METHOD" == "1" ]; then
    # Local deployment
    echo -e "\n${GREEN}Deploying locally...${NC}"
    
    # Stop existing container
    docker stop githubplanner 2>/dev/null || true
    docker rm githubplanner 2>/dev/null || true
    
    # Run new container
    docker run -d \
        --name githubplanner \
        --restart unless-stopped \
        -p 3000:3000 \
        -e NODE_ENV=production \
        -e NEXT_TELEMETRY_DISABLED=1 \
        -e MONGODB_URI="$MONGODB_URI" \
        -e NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
        -e NEXTAUTH_URL="$NEXTAUTH_URL" \
        -e GITHUB_TOKEN="$GITHUB_TOKEN" \
        -e JWT_SECRET="$JWT_SECRET" \
        -e SMTP_HOST="$SMTP_HOST" \
        -e SMTP_PORT="$SMTP_PORT" \
        -e SMTP_USER="$SMTP_USER" \
        -e SMTP_PASS="$SMTP_PASS" \
        -e SMTP_FROM="$SMTP_FROM" \
        $FULL_IMAGE
    
    echo -e "${GREEN}Container started successfully!${NC}"
    echo "Access your application at http://localhost:3000"
    echo ""
    echo "View logs with: docker logs -f githubplanner"
    echo "Stop with: docker stop githubplanner"

elif [ "$DEPLOY_METHOD" == "2" ]; then
    # Remote deployment
    read -p "Server IP: " SERVER_IP
    read -p "SSH user [root]: " SERVER_USER
    SERVER_USER=${SERVER_USER:-root}
    
    echo -e "\n${GREEN}Saving image to tar...${NC}"
    docker save $FULL_IMAGE | gzip > /tmp/githubplanner.tar.gz
    
    echo -e "${GREEN}Uploading to server...${NC}"
    scp /tmp/githubplanner.tar.gz $SERVER_USER@$SERVER_IP:/tmp/
    
    echo -e "${GREEN}Deploying on server...${NC}"
    ssh $SERVER_USER@$SERVER_IP bash -s << ENDSSH
        set -e
        echo "Loading Docker image..."
        gunzip -c /tmp/githubplanner.tar.gz | docker load
        
        echo "Stopping existing container..."
        docker stop githubplanner 2>/dev/null || true
        docker rm githubplanner 2>/dev/null || true
        
        echo "Starting new container..."
        docker run -d \
            --name githubplanner \
            --restart unless-stopped \
            -p 3000:3000 \
            -e NODE_ENV=production \
            -e NEXT_TELEMETRY_DISABLED=1 \
            -e MONGODB_URI="$MONGODB_URI" \
            -e NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
            -e NEXTAUTH_URL="$NEXTAUTH_URL" \
            -e GITHUB_TOKEN="$GITHUB_TOKEN" \
            -e JWT_SECRET="$JWT_SECRET" \
            -e SMTP_HOST="$SMTP_HOST" \
            -e SMTP_PORT="$SMTP_PORT" \
            -e SMTP_USER="$SMTP_USER" \
            -e SMTP_PASS="$SMTP_PASS" \
            -e SMTP_FROM="$SMTP_FROM" \
            $FULL_IMAGE
        
        echo "Cleaning up..."
        rm /tmp/githubplanner.tar.gz
        docker system prune -af --filter "until=24h"
        
        echo "Deployment complete!"
        docker ps --filter name=githubplanner
ENDSSH
    
    rm /tmp/githubplanner.tar.gz
    echo -e "${GREEN}Remote deployment successful!${NC}"
    echo "Access your application at http://$SERVER_IP:3000"

else
    echo -e "${GREEN}Build complete. Image: $FULL_IMAGE${NC}"
    echo "Push to registry with: docker push $FULL_IMAGE"
fi

echo -e "\n${GREEN}Done!${NC}"

