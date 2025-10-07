/*
Option 1: Bun.serve (pros: performance, built-in; cons: Clerk integration requires manual JWT verification)
Option 2: Express (pros: mature ecosystem, Clerk middleware; cons: additional dependency)
Chosen: Express for Phase 0 to integrate Clerk quickly; can migrate to Bun.serve later per WARP.md
*/

import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Public route
app.get('/api/public', (_req, res) => {
  res.json({ message: 'Public endpoint' });
});

// Clerk auth middleware
app.use(clerkMiddleware());

// Protected route example
app.get('/api/protected', requireAuth(), (req, res) => {
  const auth = getAuth(req);
  res.json({ message: 'Protected endpoint', userId: auth.userId });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
