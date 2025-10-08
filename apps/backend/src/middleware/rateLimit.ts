/**
 * Rate Limiting Middleware
 *
 * Implements tiered rate limiting based on Clerk user metadata
 * Uses express-rate-limit with custom key generator
 */

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getAuth } from '@clerk/express';
import { rateLimitConfig, UserTier } from '../api/validators/schemas';

// Helper to normalize IPv6 addresses for rate limiting
function normalizeIp(ip: string): string {
  // Convert IPv6-mapped IPv4 addresses to IPv4
  // e.g., ::ffff:192.168.1.1 -> 192.168.1.1
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  // For IPv6, normalize to remove leading zeros and use consistent format
  // This prevents bypass via different IPv6 representations
  if (ip.includes(':')) {
    // Split by colons and normalize each segment
    const segments = ip.split(':');
    const normalized = segments
      .map((seg) => {
        // Remove leading zeros but keep at least one digit
        return seg ? parseInt(seg, 16).toString(16) : '0';
      })
      .join(':');
    return normalized;
  }

  return ip;
}

/**
 * Get user tier from Clerk metadata
 *
 * Option 1: Store in Convex (pros: centralized; cons: additional query)
 * Option 2: Store in Clerk metadata (pros: fast access; cons: sync complexity)
 * Chosen: Clerk metadata for performance, with Convex as source of truth
 */
async function getUserTier(_userId: string): Promise<UserTier> {
  // TODO: Fetch from Clerk user metadata or Convex
  // For now, return default tier
  // In production, this would query Clerk API or cached metadata
  return 'free';
}

/**
 * Rate limit key generator
 * Uses user ID if authenticated, IP address as fallback
 * Properly handles IPv6 addresses to prevent bypass
 */
const keyGenerator = (req: Request): string => {
  const auth = getAuth(req);

  if (auth.userId) {
    return `user:${auth.userId}`;
  }

  // Fallback to IP for unauthenticated requests
  const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
  const normalizedIp = normalizeIp(rawIp);
  return `ip:${normalizedIp}`;
};

/**
 * Standard rate limiter
 * Configures limits based on user tier
 */
export const createRateLimiter = (options?: {
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    skipSuccessfulRequests = false,
  } = options || {};

  return rateLimit({
    windowMs,
    max: async (req: Request) => {
      const auth = getAuth(req);

      if (!auth.userId) {
        // Strict limits for unauthenticated requests
        return 5;
      }

      // Get user tier and return appropriate limit
      const tier = await getUserTier(auth.userId);
      return rateLimitConfig[tier].requestsPerMinute;
    },
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });
};

/**
 * Upload-specific rate limiter
 * Stricter limits for resource-intensive operations
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  skipSuccessfulRequests: true,
});

/**
 * API endpoint rate limiter
 * Standard limits for general API operations
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  keyGenerator: (req: Request) => {
    const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
    const normalizedIp = normalizeIp(rawIp);
    return `auth:${normalizedIp}`;
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Webhook rate limiter
 * Protects webhook endpoints from abuse
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // Allow burst traffic from webhook sources
  keyGenerator: (req: Request) => {
    // Use IP and webhook signature if available
    const signature = req.headers['x-webhook-signature'] as string;
    if (signature) {
      return `webhook:${signature}`;
    }
    const rawIp = req.ip || 'unknown';
    const normalizedIp = normalizeIp(rawIp);
    return `webhook-ip:${normalizedIp}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
