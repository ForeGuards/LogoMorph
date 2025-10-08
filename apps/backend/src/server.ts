/*
Option 1: Bun.serve (pros: performance, built-in; cons: Clerk integration requires manual JWT verification)
Option 2: Express (pros: mature ecosystem, Clerk middleware; cons: additional dependency)
Chosen: Express for Phase 0 to integrate Clerk quickly; can migrate to Bun.serve later per WARP.md
*/

import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import swaggerUi from 'swagger-ui-express';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';
import { swaggerSpec } from './config/swagger';
import { metricsService } from './services/monitoring/metrics';
import logoRoutes from './api/routes/logoRoutes';
import jobRoutes from './api/routes/jobRoutes';
import exportRoutes from './api/routes/exportRoutes';
import presetRoutes from './api/routes/presetRoutes';
import apiKeyRoutes from './api/routes/apiKeyRoutes';
import pathRoutes from './api/routes/editor/pathRoutes';
import colorRoutes from './api/routes/editor/colorRoutes';
import effectsRoutes from './api/routes/editor/effectsRoutes';
import batchRoutes from './api/routes/editor/batchRoutes';
import { handleClerkWebhook } from './api/controllers/clerkWebhookController';
import { webhookRateLimiter } from './middleware/rateLimit';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// Response Compression
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses > 1KB
  }),
);

// CORS
app.use(cors());

// Body Parsing
app.use(express.json());

// Logging
app.use(morgan('dev'));

// File Upload
app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    abortOnLimit: true,
    responseOnLimit: 'File size exceeds 10 MB limit',
  }),
);

// Request tracking middleware for Prometheus
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    metricsService.trackHttpRequest(req.method, route, res.statusCode, duration);
  });
  next();
});

// API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'LogoMorph API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  }),
);

// Swagger JSON spec
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check imports
import { healthCheckService } from './services/health/healthCheck';

// Initialize health check service
// healthCheckService.initialize({ redisClient, convexClient });

// Liveness probe - simple check that app is running
app.get('/health', async (_req, res) => {
  try {
    const health = await healthCheckService.checkLiveness();
    res.json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: 'Service unavailable' });
  }
});

// Readiness probe - checks all dependencies
app.get('/health/ready', async (_req, res) => {
  try {
    const health = await healthCheckService.checkReadiness();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: 'Service unavailable' });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', metricsService.getContentType());
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

// Public route
app.get('/api/public', (_req, res) => {
  res.json({ message: 'Public endpoint' });
});

// Clerk webhooks (before Clerk middleware to avoid auth)
app.post(
  '/api/webhooks/clerk',
  express.raw({ type: 'application/json' }),
  webhookRateLimiter,
  handleClerkWebhook,
);

// Clerk auth middleware
app.use(clerkMiddleware());

// Protected route example
app.get('/api/protected', requireAuth(), (req, res) => {
  const auth = getAuth(req);
  res.json({ message: 'Protected endpoint', userId: auth.userId });
});

// Logo management routes
app.use('/api', logoRoutes);

// Job management routes
app.use('/api/jobs', jobRoutes);

// Export routes
app.use('/api/export', exportRoutes);

// Preset management routes
app.use('/api/presets', presetRoutes);

// API key management routes
app.use('/api/api-keys', apiKeyRoutes);

// Editor routes (Phase 6)
app.use('/api/editor/paths', pathRoutes);
app.use('/api/editor/colors', colorRoutes);
app.use('/api/editor/effects', effectsRoutes);
app.use('/api/editor/batch', batchRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Backend server listening on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎯 Phase 6: Advanced Features & Polish - ACTIVE`);
  console.log(`✨ Phase 6.1: Advanced Editing Features (Effects, Masking, Batch) - READY`);
});
