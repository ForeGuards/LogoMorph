/**
 * API Key Authentication Middleware
 *
 * Supports dual authentication:
 * 1. Clerk JWT tokens (for web app users)
 * 2. API keys (for programmatic access)
 *
 * Priority: Clerk JWT > API Key > Unauthenticated
 */

import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { validateApiKeyFormat, hashApiKey, hasPermission } from '../services/apiKeys';

// TODO: Replace with Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export interface ApiKeyAuthContext {
  userId: string;
  keyId: string;
  permissions: string[];
}

declare module 'express-serve-static-core' {
  interface Request {
    apiKey?: ApiKeyAuthContext;
  }
}

/**
 * Authentication middleware supporting both Clerk and API keys
 *
 * Option 1: Separate middlewares (pros: simple; cons: repetitive)
 * Option 2: Unified middleware (pros: flexible; cons: complex)
 * Chosen: Unified middleware for better DX and consistency
 */
export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  // Try Clerk authentication first
  const clerkAuth = getAuth(req);
  if (clerkAuth.userId) {
    // User authenticated via Clerk
    return next();
  }

  // Try API key authentication
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      message: 'Provide either a valid Clerk JWT token or API key',
    });
  }

  // Validate API key format first (cheap operation)
  if (!validateApiKeyFormat(apiKey)) {
    return res.status(401).json({
      error: 'Invalid API key format',
      code: 'INVALID_API_KEY',
    });
  }

  // Hash and validate against database
  const keyHash = hashApiKey(apiKey);

  try {
    // TODO: Validate API key with Supabase
    // const { data: keyData, error } = await supabase.from('api_keys').select('*').eq('key_hash', keyHash).single();
    const keyData: any = null; // Temporary stub

    if (!keyData) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    // TODO: Update last used timestamp (fire and forget)
    // supabase.from('api_keys').update({ last_used_at: new Date() }).eq('id', keyData.id).then().catch(console.error);

    // Attach API key info to request
    req.apiKey = {
      userId: keyData.clerkUserId,
      keyId: keyData._id,
      permissions: keyData.permissions,
    };

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Get authenticated user ID from either Clerk or API key
 */
export const getAuthenticatedUserId = (req: Request): string | null => {
  // Check Clerk auth first
  const clerkAuth = getAuth(req);
  if (clerkAuth.userId) {
    return clerkAuth.userId;
  }

  // Check API key auth
  if (req.apiKey) {
    return req.apiKey.userId;
  }

  return null;
};

/**
 * Require specific permissions for API key access
 * Clerk users have implicit full access
 */
export const requirePermissions = (requiredPermissions: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Clerk users have full access
    const clerkAuth = getAuth(req);
    if (clerkAuth.userId) {
      return next();
    }

    // Check API key permissions
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    if (!hasPermission(req.apiKey.permissions, requiredPermissions)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        details: {
          required: Array.isArray(requiredPermissions)
            ? requiredPermissions
            : [requiredPermissions],
          provided: req.apiKey.permissions,
        },
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Allows both authenticated and unauthenticated requests
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Try Clerk first
  const clerkAuth = getAuth(req);
  if (clerkAuth.userId) {
    return next();
  }

  // Try API key
  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey && validateApiKeyFormat(apiKey)) {
    const keyHash = hashApiKey(apiKey);

    try {
      // TODO: Validate API key with Supabase
      // const { data: keyData } = await supabase.from('api_keys').select('*').eq('key_hash', keyHash).single();
      const keyData: any = null; // Temporary stub

      if (keyData) {
        req.apiKey = {
          userId: keyData.clerk_user_id,
          keyId: keyData.id,
          permissions: keyData.permissions,
        };

        // TODO: Update last used (fire and forget)
        // supabase.from('api_keys').update({ last_used_at: new Date() }).eq('id', keyData.id).then().catch(console.error);
      }
    } catch (error) {
      console.error('Optional auth error:', error);
    }
  }

  // Continue regardless of auth status
  next();
};
