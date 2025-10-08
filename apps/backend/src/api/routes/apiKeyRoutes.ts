/**
 * API Key Routes
 *
 * Endpoints for managing API keys
 * Requires Clerk authentication
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { apiRateLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validation';
import { createApiKeySchema, idParamSchema } from '../validators/schemas';
import {
  createApiKey,
  listApiKeys,
  deactivateApiKey,
  deleteApiKey,
} from '../controllers/apiKeyController';

const router = Router();

// All API key routes require Clerk authentication
router.use(requireAuth());

// Apply rate limiting
router.use(apiRateLimiter);

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: API key management endpoints
 */

/**
 * Create new API key
 * POST /api/api-keys
 */
router.post('/', validate({ body: createApiKeySchema }), createApiKey);

/**
 * List user's API keys
 * GET /api/api-keys
 */
router.get('/', listApiKeys);

/**
 * Deactivate API key
 * POST /api/api-keys/:id/deactivate
 */
router.post('/:id/deactivate', validate({ params: idParamSchema }), deactivateApiKey);

/**
 * Delete API key
 * DELETE /api/api-keys/:id
 */
router.delete('/:id', validate({ params: idParamSchema }), deleteApiKey);

export default router;
