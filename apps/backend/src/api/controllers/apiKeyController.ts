/**
 * API Key Controller
 *
 * Handles API key management operations
 * Provides CRUD functionality for user API keys
 */

import { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { generateApiKey } from '../../services/apiKeys';
import { sanitizeOutput } from '../../middleware/validation';

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

/**
 * Create a new API key
 *
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - clerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [read, write, admin]
 *               expiresIn:
 *                 type: string
 *                 enum: ['30d', '90d', '1y', 'never']
 *     responses:
 *       201:
 *         description: API key created successfully
 */
export const createApiKey = async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const { name, permissions, expiresIn } = req.body;

    // Validate input
    if (!name || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        details: 'Name and permissions array are required',
      });
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey(
      process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
    );

    // Store in Convex
    const keyId = await convex.mutation(api.apiKeys.create, {
      clerkUserId: auth.userId,
      keyHash: hash,
      name,
      prefix,
      permissions,
      expiresIn,
    });

    // Return key only once (won't be shown again)
    return res.status(201).json({
      message: 'API key created successfully',
      apiKey: key,
      keyId,
      prefix,
      warning: 'Save this key securely. It will not be shown again.',
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return res.status(500).json({
      error: 'Failed to create API key',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * List user's API keys
 *
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: List all API keys for the authenticated user
 *     tags: [API Keys]
 *     security:
 *       - clerkAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 */
export const listApiKeys = async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const keys = await convex.query(api.apiKeys.listByUser, {
      clerkUserId: auth.userId,
    });

    return res.json({
      keys: sanitizeOutput(keys),
      total: keys.length,
    });
  } catch (error) {
    console.error('List API keys error:', error);
    return res.status(500).json({
      error: 'Failed to list API keys',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Deactivate an API key
 *
 * @swagger
 * /api/api-keys/{id}/deactivate:
 *   post:
 *     summary: Deactivate an API key
 *     tags: [API Keys]
 *     security:
 *       - clerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key deactivated
 */
export const deactivateApiKey = async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const { id } = req.params;

    await convex.mutation(api.apiKeys.deactivate, {
      keyId: id,
      clerkUserId: auth.userId,
    });

    return res.json({
      message: 'API key deactivated successfully',
    });
  } catch (error) {
    console.error('Deactivate API key error:', error);

    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'API key not found')
    ) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      });
    }

    return res.status(500).json({
      error: 'Failed to deactivate API key',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Delete an API key
 *
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Delete an API key
 *     tags: [API Keys]
 *     security:
 *       - clerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key deleted
 */
export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const { id } = req.params;

    await convex.mutation(api.apiKeys.remove, {
      keyId: id,
      clerkUserId: auth.userId,
    });

    return res.json({
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Delete API key error:', error);

    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'API key not found')
    ) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      });
    }

    return res.status(500).json({
      error: 'Failed to delete API key',
      code: 'INTERNAL_ERROR',
    });
  }
};
