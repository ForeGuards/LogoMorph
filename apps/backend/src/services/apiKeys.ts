/**
 * API Key Service
 *
 * Handles API key generation, validation, and management
 * Uses crypto for secure hashing and nanoid for key generation
 */

import crypto from 'crypto';
import { nanoid } from 'nanoid';

/**
 * API Key format: lm_dev_<random>_<checksum>
 * - lm: LogoMorph prefix
 * - dev/prod: Environment indicator
 * - random: 32-character nanoid
 * - checksum: 8-character hash for validation
 */

/**
 * Generate a new API key
 *
 * Option 1: UUID (pros: standard; cons: long, no metadata)
 * Option 2: Custom format (pros: readable, includes metadata; cons: custom implementation)
 * Chosen: Custom format for better UX and debugging
 */
export function generateApiKey(environment: 'dev' | 'prod' = 'dev'): {
  key: string;
  hash: string;
  prefix: string;
} {
  // Generate random component
  const random = nanoid(32);

  // Create checksum for validation
  const checksum = crypto.createHash('sha256').update(random).digest('hex').substring(0, 8);

  // Construct full key
  const key = `lm_${environment}_${random}_${checksum}`;

  // Generate prefix for display (first 12 chars + last 4)
  const prefix = `${key.substring(0, 12)}...${key.substring(key.length - 4)}`;

  // Hash full key for storage
  const hash = hashApiKey(key);

  return { key, hash, prefix };
}

/**
 * Hash API key for secure storage
 * Uses SHA-256 for one-way hashing
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key format
 * Checks structure and checksum without database lookup
 */
export function validateApiKeyFormat(key: string): boolean {
  // Check format: lm_env_random_checksum
  const parts = key.split('_');

  if (parts.length !== 4) {
    return false;
  }

  const [prefix, env, random, checksum] = parts;

  // Validate prefix
  if (prefix !== 'lm') {
    return false;
  }

  // Validate environment
  if (!['dev', 'prod'].includes(env)) {
    return false;
  }

  // Validate random length (nanoid default is 32)
  if (random.length !== 32) {
    return false;
  }

  // Validate checksum
  const expectedChecksum = crypto.createHash('sha256').update(random).digest('hex').substring(0, 8);

  return checksum === expectedChecksum;
}

/**
 * Extract metadata from API key
 */
export function extractKeyMetadata(key: string): {
  environment: string;
  valid: boolean;
} {
  const parts = key.split('_');

  if (parts.length !== 4) {
    return { environment: 'unknown', valid: false };
  }

  return {
    environment: parts[1],
    valid: validateApiKeyFormat(key),
  };
}

/**
 * Check if API key has required permissions
 */
export function hasPermission(
  keyPermissions: string[],
  requiredPermission: string | string[],
): boolean {
  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  // Admin permission grants all access
  if (keyPermissions.includes('admin')) {
    return true;
  }

  // Check if key has any of the required permissions
  return required.some((perm) => keyPermissions.includes(perm));
}

/**
 * Generate API key prefix for display
 * Shows first 12 and last 4 characters
 */
export function generatePrefix(key: string): string {
  if (key.length < 16) {
    return key;
  }
  return `${key.substring(0, 12)}...${key.substring(key.length - 4)}`;
}
