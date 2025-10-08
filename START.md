# 🚀 LogoMorph Quick Start Guide

This guide will help you start the LogoMorph application locally.

## Prerequisites

✅ **Already Done:**

- Bun installed
- Docker running
- Redis & MinIO containers running
- Dependencies installed
- Convex API types generated (temporary)

## Starting the Application

### Option 1: Start Both Services (Recommended)

Open **two terminal windows** and run these commands:

#### Terminal 1 - Backend Server

```bash
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/backend
bun run dev
```

#### Terminal 2 - Frontend Server

```bash
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/frontend
bun run dev
```

---

### Option 2: Start Services Separately

#### Start Backend Only

```bash
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/backend
bun run dev
```

The backend will be available at:

- **API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs
- **Health**: http://localhost:4000/health

#### Start Frontend Only

```bash
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/frontend
bun run dev
```

The frontend will be available at:

- **Frontend**: http://localhost:3000

---

## Access Points

Once both services are running:

| Service               | URL                            | Description                            |
| --------------------- | ------------------------------ | -------------------------------------- |
| **Frontend**          | http://localhost:3000          | Main user interface                    |
| **Backend API**       | http://localhost:4000          | REST API server                        |
| **API Documentation** | http://localhost:4000/api-docs | Swagger/OpenAPI docs                   |
| **Health Check**      | http://localhost:4000/health   | Server health status                   |
| **MinIO Console**     | http://localhost:9001          | Object storage (minioadmin/minioadmin) |
| **Redis**             | localhost:6379                 | Cache & job queue                      |

---

## ⚠️ Important Configuration Notes

### 1. Environment Variables

Before the app will work properly, you need to configure:

**File**: `apps/backend/.env`

```bash
# Required for authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Required for database (currently using temporary mock)
CONVEX_URL=https://your-deployment.convex.cloud

# MinIO is already configured for local dev
# Redis is already configured for local dev
```

### 2. Convex Setup (Important!)

**Current Status**: Using temporary mock API types

**To properly initialize Convex:**

```bash
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph
bunx convex dev
```

This will:

1. Prompt you to login/signup to Convex (free tier available)
2. Create a new deployment
3. Generate proper API types in `convex/_generated/`
4. Update your `.env` with the correct `CONVEX_URL`

### 3. Clerk Setup

1. Sign up at https://clerk.com (free tier)
2. Create a new application
3. Copy your API keys to `apps/backend/.env`

### 4. MinIO Setup

MinIO is already running, but you need to create the bucket:

1. Open http://localhost:9001
2. Login with: `minioadmin` / `minioadmin`
3. Create a bucket named: `logomorph`
4. Set the bucket policy to public (for testing)

---

## Troubleshooting

### Backend won't start?

```bash
# Check if ports are in use
lsof -i :4000

# Check Redis connection
docker ps | grep redis

# Check logs
cd apps/backend && bun src/server.ts
```

### Frontend won't start?

```bash
# Check if port is in use
lsof -i :3000

# Clear Next.js cache
cd apps/frontend
rm -rf .next
bun run dev
```

### Services won't connect?

- Make sure both backend AND frontend are running
- Check that Redis and MinIO containers are up: `docker ps`
- Verify environment variables in `apps/backend/.env`

---

## Development Workflow

1. **Start infrastructure** (if not running):

   ```bash
   docker compose up -d redis minio
   ```

2. **Start backend** (Terminal 1):

   ```bash
   cd apps/backend && bun run dev
   ```

3. **Start frontend** (Terminal 2):

   ```bash
   cd apps/frontend && bun run dev
   ```

4. **Open browser**:
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:4000/api-docs

---

## Next Steps

1. **Configure Convex**: Run `bunx convex dev` to set up your database
2. **Configure Clerk**: Add your authentication keys
3. **Test the app**: Upload a logo and generate variants
4. **Read the docs**: Check `GETTING_STARTED.md` for more details

---

## Quick Commands Reference

```bash
# Start everything from scratch
./setup.sh

# Start backend with hot reload
cd apps/backend && bun run dev

# Start frontend with hot reload
cd apps/frontend && bun run dev

# Stop all Docker services
docker compose down

# Restart Docker services
docker compose restart redis minio

# View backend logs
cd apps/backend && bun src/server.ts

# Build frontend for production
cd apps/frontend && bun run build
```

---

## Need Help?

- Check the main README.md
- Review GETTING_STARTED.md
- Check WARP.md for development guidelines
- Review API docs at http://localhost:4000/api-docs (when running)

Happy coding! 🎨✨
