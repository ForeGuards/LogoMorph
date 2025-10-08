# LogoMorph Quick Reference

## 🚀 Getting Started

```bash
# One-command setup (run from project root)
./setup.sh

# Manual setup
bun install
docker compose up -d redis minio
cd apps/backend && cp .env.example .env
# Edit .env with your keys, then:
cd apps/backend && bun run dev
```

## 📦 Common Commands

### Development

```bash
# Start backend with hot reload
cd apps/backend && bun run dev

# Start frontend
cd apps/frontend && bun run dev

# Start all infrastructure
docker compose up -d

# Stop all infrastructure
docker compose down
```

### Testing

```bash
# Run all tests
bun test

# Run backend tests
cd apps/backend && bun test

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format
```

### Docker Services

```bash
# Start Redis & MinIO only
docker compose up -d redis minio

# View logs
docker compose logs -f

# Restart a service
docker compose restart redis

# Stop all services
docker compose down

# Stop and remove data
docker compose down -v
```

## 🌐 URLs

| Service       | URL                            | Credentials           |
| ------------- | ------------------------------ | --------------------- |
| Backend API   | http://localhost:4000          | -                     |
| API Docs      | http://localhost:4000/api-docs | -                     |
| Health Check  | http://localhost:4000/health   | -                     |
| Metrics       | http://localhost:4000/metrics  | -                     |
| Frontend      | http://localhost:3000          | -                     |
| MinIO Console | http://localhost:9001          | minioadmin/minioadmin |
| MinIO API     | http://localhost:9000          | -                     |
| Redis         | localhost:6379                 | -                     |
| Prometheus    | http://localhost:9090          | -                     |
| Grafana       | http://localhost:3001          | admin/admin           |

## 🔑 API Endpoints

### Public Endpoints

```bash
# Health check
curl http://localhost:4000/health

# Public endpoint
curl http://localhost:4000/api/public

# Prometheus metrics
curl http://localhost:4000/metrics
```

### Protected Endpoints (require Clerk auth)

```bash
# Get effect presets
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/editor/effects/presets

# Apply shadow effect
curl -X POST http://localhost:4000/api/editor/effects/shadow \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"svgContent":"<svg>...</svg>","offsetX":2,"offsetY":2,"blur":4,"color":"#000000","opacity":0.3}'

# Create batch job
curl -X POST http://localhost:4000/api/editor/batch/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileIds":["file1","file2"],"operations":[{"type":"effect","params":{"presetName":"soft-shadow"}}]}'
```

## 🛠️ Available Features

### Phase 6.1 - Advanced Editing

#### Effects Library

- Shadow effects (soft, hard)
- Glow effects (neon, warm)
- Border/outline effects
- Blur effects

#### Path Editing

- Parse SVG paths
- Update/add/remove points
- Path validation

#### Color Tools

- Extract colors from SVG/images
- Replace colors with tolerance
- Generate color palettes

#### Advanced Masking

- Alpha channel extraction
- Magic wand selection
- SVG clip path generation
- Edge refinement

#### Batch Operations

- Process multiple files
- Track progress in real-time
- Apply effects to batches
- Batch resize and export

### Core Features

- Logo upload (SVG, PNG)
- 20+ preset templates
- Variant generation
- Job queue management
- Export to multiple formats
- ZIP archive creation

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check for port conflicts
lsof -i :4000

# Check dependencies
cd apps/backend && bun install

# Check .env file
cat apps/backend/.env
```

### Redis connection failed

```bash
# Check Redis status
docker compose ps redis

# Restart Redis
docker compose restart redis

# Check logs
docker compose logs redis
```

### MinIO connection failed

```bash
# Check MinIO status
docker compose ps minio

# Restart MinIO
docker compose restart minio

# Create bucket manually at http://localhost:9001
```

### Clerk authentication errors

```bash
# Verify keys in .env
grep CLERK apps/backend/.env

# Keys should start with:
# CLERK_PUBLISHABLE_KEY=pk_test_
# CLERK_SECRET_KEY=sk_test_
# CLERK_WEBHOOK_SECRET=whsec_
```

## 📚 Documentation

- Full guide: `GETTING_STARTED.md`
- Implementation plan: `IMPLEMENTATION_PLAN.md`
- Phase 6 summary: `PHASE_6_SUMMARY.md`
- Project rules: `WARP.md`

## 🎯 Quick Test Flow

1. **Start services:**

   ```bash
   ./setup.sh
   ```

2. **Start backend:**

   ```bash
   cd apps/backend && bun run dev
   ```

3. **Test health:**

   ```bash
   curl http://localhost:4000/health
   ```

4. **View API docs:**
   Open http://localhost:4000/api-docs

5. **Test effects (in Swagger UI):**
   - Click "Authorize" with your Clerk key
   - Try GET `/api/editor/effects/presets`
   - Try POST `/api/editor/effects/apply-preset`

## 💡 Tips

- Use **Swagger UI** for easiest API testing
- Check **Prometheus metrics** for monitoring
- Use **MinIO Console** to verify uploads
- View **Redis** data with RedisInsight (optional)
- Enable hot reload with `bun --hot`
- All files are under 300 LOC (project standard)

## 🔄 Reset Everything

```bash
# Stop all services and remove data
docker compose down -v

# Clean install
rm -rf node_modules apps/*/node_modules
bun install

# Re-run setup
./setup.sh
```

## 📞 Need Help?

1. Check logs: `docker compose logs -f`
2. Check health: http://localhost:4000/health
3. Check metrics: http://localhost:4000/metrics
4. Review documentation: `cat GETTING_STARTED.md`
