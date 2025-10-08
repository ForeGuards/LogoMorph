# Getting Started with LogoMorph

This guide will help you set up and run LogoMorph locally for personal use.

## Prerequisites

✅ **Already installed:**

- [Bun](https://bun.sh) v1.2.20+ (you have this!)
- macOS (you're running this)

📋 **Need to install:**

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for Redis and MinIO)
- [Clerk Account](https://clerk.com) (free tier available)
- [Convex Account](https://convex.dev) (free tier available)

## Quick Start (Minimal Setup)

This will get you running in ~10 minutes with basic features.

### Step 1: Install Dependencies

```bash
# From the project root
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph

# Install all workspace dependencies
bun install
```

### Step 2: Start Infrastructure Services

Start Redis and MinIO using Docker Compose:

```bash
# Start Redis and MinIO in the background
docker compose up -d redis minio

# Verify services are running
docker compose ps
```

You should see:

- Redis running on `localhost:6379`
- MinIO running on `localhost:9000` (API) and `localhost:9001` (Console)

### Step 3: Set Up MinIO Storage

1. **Open MinIO Console:** http://localhost:9001
2. **Login:**
   - Username: `minioadmin`
   - Password: `minioadmin`

3. **Create a bucket:**
   - Click "Buckets" → "Create Bucket"
   - Name: `logomorph`
   - Leave defaults and click "Create"

4. **Set bucket to public (for testing):**
   - Select the `logomorph` bucket
   - Click "Manage" → "Access Policy"
   - Select "Public" and save

### Step 4: Set Up Clerk Authentication

1. **Sign up for Clerk:** https://clerk.com (free tier is fine)

2. **Create a new application:**
   - Name: `LogoMorph` (or any name)
   - Select "Email" and "Google" as sign-in methods
   - Click "Create application"

3. **Get your API keys:**
   - Go to "API Keys" in the Clerk dashboard
   - Copy your Publishable Key (starts with `pk_test_`)
   - Copy your Secret Key (starts with `sk_test_`)

4. **Set up webhooks:**
   - Go to "Webhooks" → "Add Endpoint"
   - URL: `http://localhost:4000/api/webhooks/clerk` (we'll make this accessible later)
   - Events: Select "user.created" and "user.updated"
   - Copy the Signing Secret (starts with `whsec_`)

### Step 5: Set Up Convex Backend

1. **Sign up for Convex:** https://convex.dev (free tier is fine)

2. **Create a new project:**
   - Name: `LogoMorph`
   - Region: Choose closest to you

3. **Get your deployment URL:**
   - From the Convex dashboard, copy your deployment URL
   - It looks like: `https://your-deployment.convex.cloud`

4. **Initialize Convex (optional for now):**
   ```bash
   cd /Users/giuseppe/Documents/github/foreguards/LogoMorph
   # We'll skip this for now - Convex can be added later
   ```

### Step 6: Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cd apps/backend
cp .env.example .env
```

Edit `apps/backend/.env` with your values:

```bash
# Minimal configuration for getting started

# Server Configuration
PORT=4000
NODE_ENV=development

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
CLERK_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# Redis (using Docker Compose)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# MinIO Storage (using Docker Compose)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=logomorph
S3_ENDPOINT=http://localhost:9000

# Convex Backend
CONVEX_URL=https://your-deployment.convex.cloud

# Disable AI features for now (optional)
OPENAI_ENABLED=false
REPLICATE_ENABLED=false
SD_ENABLED=false
REMOVEBG_ENABLED=false
FEATURE_AI_BACKGROUNDS=false
FEATURE_VISION_ANALYSIS=false
```

### Step 7: Start the Backend Server

```bash
# From apps/backend directory
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/backend

# Start with hot reload
bun run dev

# Or without hot reload
bun run start
```

You should see:

```
🚀 Backend server listening on http://localhost:4000
📚 API Documentation: http://localhost:4000/api-docs
🔧 Health Check: http://localhost:4000/health
🎯 Phase 6: Advanced Features & Polish - ACTIVE
✨ Phase 6.1: Advanced Editing Features (Effects, Masking, Batch) - READY
```

### Step 8: Test the API

Open your browser and navigate to:

**API Documentation:** http://localhost:4000/api-docs

Try these endpoints:

- **Health Check:** http://localhost:4000/health
- **Public Endpoint:** http://localhost:4000/api/public
- **Metrics:** http://localhost:4000/metrics

## Testing with curl

### 1. Test Health Check

```bash
curl http://localhost:4000/health
```

### 2. Test Protected Endpoint (requires authentication)

```bash
# This will return 401 without auth
curl http://localhost:4000/api/protected
```

### 3. Get Effect Presets

```bash
# This requires authentication - use Swagger UI for now
# Or generate a session token from Clerk
```

## Frontend Setup (Optional)

The frontend is built with Next.js and can run separately:

```bash
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/frontend

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_API_URL=http://localhost:4000
EOF

# Install dependencies
bun install

# Start frontend
bun run dev
```

Frontend will be available at: http://localhost:3000

## Using the API with Authentication

### Option 1: Using Swagger UI (Easiest)

1. Go to http://localhost:4000/api-docs
2. Click "Authorize" button
3. Enter your Clerk API key
4. Test endpoints directly from the UI

### Option 2: Using curl with Token

```bash
# Get a session token from Clerk first, then:
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:4000/api/editor/effects/presets
```

### Option 3: Using the Frontend

Once the frontend is running, sign in through Clerk and use the UI to interact with the backend.

## Available Features

### ✅ Currently Working

#### Logo Management

- Upload logos (SVG, PNG)
- Analyze logo properties
- Store in MinIO

#### Preset System

- 20+ preset templates
- Website headers, social media, app icons, etc.

#### Advanced Editing (Phase 6.1)

- **Effects Library:** Shadows, glows, borders, blur
- **Path Editing:** Modify SVG paths
- **Color Tools:** Extract, replace, palette generation
- **Masking:** Alpha channel manipulation, magic wand
- **Batch Operations:** Process multiple files at once

#### Job Processing

- Asynchronous variant generation
- Progress tracking
- Queue management with Redis

#### Export

- Multiple formats (PNG, JPEG, WebP, SVG)
- ZIP archives
- Custom naming conventions

### 🚧 Requires Additional Setup

#### AI Features (Optional)

To enable AI features, you'll need API keys from:

- OpenAI (for vision analysis): https://platform.openai.com
- Replicate (for background generation): https://replicate.com

Then update your `.env`:

```bash
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-your-key
REPLICATE_ENABLED=true
REPLICATE_API_KEY=r8_your-key
```

## Monitoring (Optional)

Start Prometheus and Grafana for metrics:

```bash
# Start all services including monitoring
docker compose up -d

# Access monitoring dashboards:
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

## Common Issues & Solutions

### Issue: "Cannot connect to Redis"

**Solution:**

```bash
# Check if Redis is running
docker compose ps redis

# Restart Redis
docker compose restart redis

# Check logs
docker compose logs redis
```

### Issue: "Cannot connect to MinIO"

**Solution:**

```bash
# Check if MinIO is running
docker compose ps minio

# Restart MinIO
docker compose restart minio

# Check logs
docker compose logs minio
```

### Issue: "Clerk authentication failed"

**Solution:**

- Verify your Clerk keys in `.env`
- Make sure keys start with `pk_test_` and `sk_test_`
- Check Clerk dashboard for API key status

### Issue: "Module not found" errors

**Solution:**

```bash
# Clean install dependencies
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph
rm -rf node_modules
rm -rf apps/*/node_modules
bun install
```

### Issue: Port already in use

**Solution:**

```bash
# Find what's using the port
lsof -i :4000

# Kill the process or change PORT in .env
PORT=5000
```

## Development Workflow

### Hot Reload Development

```bash
# Backend with hot reload
cd apps/backend
bun run dev

# Frontend with hot reload
cd apps/frontend
bun run dev
```

### Running Tests

```bash
# Run all tests
bun test

# Run backend tests only
cd apps/backend
bun test
```

### Type Checking

```bash
# Check all TypeScript types
bun run typecheck
```

### Linting and Formatting

```bash
# Format code
bun run format

# Check formatting
bun run format:check

# Lint code
bun run lint
```

## Project Structure

```
LogoMorph/
├── apps/
│   ├── backend/          # Express API server
│   │   ├── src/
│   │   │   ├── api/      # API routes and controllers
│   │   │   ├── services/ # Business logic
│   │   │   ├── config/   # Configuration
│   │   │   └── server.ts # Main server file
│   │   └── package.json
│   └── frontend/         # Next.js frontend
│       └── ...
├── docker-compose.yml    # Infrastructure services
├── package.json          # Workspace root
└── .env                  # Environment variables
```

## Next Steps

1. **Test the API:** Use Swagger UI to explore endpoints
2. **Upload a logo:** Try the upload endpoint with a test logo
3. **Generate variants:** Use the presets to create logo variants
4. **Try effects:** Apply shadows, glows, or other effects
5. **Batch operations:** Process multiple logos at once

## Need Help?

- Check the API docs: http://localhost:4000/api-docs
- Review logs: `docker compose logs -f`
- Check health: http://localhost:4000/health
- View metrics: http://localhost:4000/metrics

## Stopping Services

```bash
# Stop all Docker services
docker compose down

# Stop and remove volumes (careful - deletes data!)
docker compose down -v
```

## Production Deployment

For production deployment, refer to:

- `IMPLEMENTATION_PLAN.md` - Overall architecture
- `PHASE_6_SUMMARY.md` - Latest features
- Phase 5 documentation - Production readiness

---

**Current Status:** Backend fully functional for personal use!
**Next:** Set up frontend for complete user experience
