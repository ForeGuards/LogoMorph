# LogoMorph Backend Dockerfile
# Multi-stage build optimized for Bun runtime

# Stage 1: Dependencies
FROM oven/bun:1.2-slim AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY ../../package.json ../../bun.lock* ../../

# Install production dependencies
RUN bun install --production --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1.2-slim AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript (if needed)
RUN bun run typecheck

# Stage 3: Runner
FROM oven/bun:1.2-slim AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bunuser

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Change ownership
RUN chown -R bunuser:nodejs /app
USER bunuser

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD bun run -e "const res = await fetch('http://localhost:4000/health'); process.exit(res.ok ? 0 : 1)"

# Start server
CMD ["bun", "run", "src/server.ts"]
