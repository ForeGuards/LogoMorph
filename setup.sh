#!/bin/bash

# LogoMorph Quick Setup Script
# This script helps you set up LogoMorph for local development

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LogoMorph Local Setup Script      ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}→ Checking prerequisites...${NC}"

if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Bun is not installed${NC}"
    echo "Install from: https://bun.sh"
    exit 1
fi
echo -e "${GREEN}✓ Bun $(bun --version) installed${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Install from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}→ Installing dependencies...${NC}"
bun install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check for .env file
echo ""
echo -e "${YELLOW}→ Checking environment configuration...${NC}"

if [ ! -f "apps/backend/.env" ]; then
    echo -e "${YELLOW}! No .env file found. Creating from example...${NC}"
    cp apps/backend/.env.example apps/backend/.env
    echo -e "${GREEN}✓ Created apps/backend/.env${NC}"
    echo -e "${YELLOW}! Please edit apps/backend/.env with your API keys${NC}"
    NEEDS_CONFIG=true
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Start infrastructure services
echo ""
echo -e "${YELLOW}→ Starting infrastructure services (Redis & MinIO)...${NC}"

if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker daemon is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

docker compose up -d redis minio

echo -e "${GREEN}✓ Redis and MinIO started${NC}"

# Wait for services to be ready
echo ""
echo -e "${YELLOW}→ Waiting for services to be ready...${NC}"
sleep 3

# Check if services are running
if docker compose ps redis | grep -q "Up"; then
    echo -e "${GREEN}✓ Redis is running on localhost:6379${NC}"
else
    echo -e "${RED}✗ Redis failed to start${NC}"
    docker logs logomorph-redis --tail 20
fi

if docker compose ps minio | grep -q "Up"; then
    echo -e "${GREEN}✓ MinIO is running on localhost:9000${NC}"
    echo -e "${GREEN}  MinIO Console: http://localhost:9001${NC}"
    echo -e "${GREEN}  Username: minioadmin${NC}"
    echo -e "${GREEN}  Password: minioadmin${NC}"
else
    echo -e "${RED}✗ MinIO failed to start${NC}"
    docker logs logomorph-minio --tail 20
fi

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Setup Complete!            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

if [ "$NEEDS_CONFIG" = true ]; then
    echo -e "${YELLOW}⚠ IMPORTANT: Before starting the server:${NC}"
    echo ""
    echo -e "${YELLOW}1. Sign up for accounts:${NC}"
    echo "   • Clerk: https://clerk.com (free tier)"
    echo "   • Convex: https://convex.dev (free tier)"
    echo ""
    echo -e "${YELLOW}2. Configure MinIO:${NC}"
    echo "   • Open: http://localhost:9001"
    echo "   • Login: minioadmin/minioadmin"
    echo "   • Create bucket: 'logomorph'"
    echo "   • Set bucket to public (for testing)"
    echo ""
    echo -e "${YELLOW}3. Edit apps/backend/.env with your API keys${NC}"
    echo ""
fi

echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Review and edit configuration:"
echo "   ${BLUE}nano apps/backend/.env${NC}"
echo ""
echo "2. Start the backend server:"
echo "   ${BLUE}cd apps/backend && bun run dev${NC}"
echo ""
echo "3. Visit the API documentation:"
echo "   ${BLUE}http://localhost:4000/api-docs${NC}"
echo ""
echo "4. Check the getting started guide:"
echo "   ${BLUE}cat GETTING_STARTED.md${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
