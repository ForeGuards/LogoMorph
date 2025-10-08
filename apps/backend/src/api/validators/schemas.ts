/**
 * Validation Schemas
 *
 * Zod schemas for request validation across all API endpoints
 * Ensures type safety and consistent validation
 */

import { z } from 'zod';

// Logo upload validation
export const uploadLogoSchema = z.object({
  file: z.object({
    name: z.string(),
    mimetype: z.enum(['image/svg+xml', 'image/png', 'image/jpeg']),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  }),
  options: z
    .object({
      autoAnalyze: z.boolean().optional().default(true),
      extractColors: z.boolean().optional().default(true),
    })
    .optional(),
});

// Job creation validation
export const createJobSchema = z.object({
  logoId: z.string().min(1, 'Logo ID is required'),
  type: z.enum(['generate', 'export'], {
    errorMap: () => ({ message: 'Type must be either generate or export' }),
  }),
  presetIds: z.array(z.string()).min(1, 'At least one preset is required').optional(),
  options: z
    .object({
      aiBackgrounds: z.boolean().optional(),
      formats: z.array(z.enum(['png', 'svg', 'jpg', 'webp'])).optional(),
      quality: z.number().min(1).max(100).optional(),
    })
    .optional(),
});

// Preset creation validation
export const createPresetSchema = z.object({
  name: z.string().min(1).max(100, 'Name must be 100 characters or less'),
  width: z.number().int().positive().max(4096, 'Width must be 4096 or less'),
  height: z.number().int().positive().max(4096, 'Height must be 4096 or less'),
  settings: z.object({
    padding: z
      .object({
        top: z.number().min(0).max(100),
        right: z.number().min(0).max(100),
        bottom: z.number().min(0).max(100),
        left: z.number().min(0).max(100),
      })
      .optional(),
    background: z
      .object({
        type: z.enum(['solid', 'gradient', 'ai', 'transparent']),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        gradient: z
          .object({
            start: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            end: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
            angle: z.number().min(0).max(360),
          })
          .optional(),
        aiPrompt: z.string().max(500).optional(),
      })
      .optional(),
    position: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
    scale: z.enum(['fit', 'fill', 'stretch', 'none']).optional(),
  }),
});

// API key creation validation
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100, 'Name must be 100 characters or less'),
  permissions: z
    .array(z.enum(['read', 'write', 'admin']))
    .min(1, 'At least one permission is required'),
  expiresIn: z.enum(['30d', '90d', '1y', 'never']).optional().default('never'),
});

// Webhook configuration validation
export const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z
    .array(z.enum(['job.created', 'job.completed', 'job.failed', 'logo.uploaded', 'export.ready']))
    .min(1, 'At least one event is required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
  active: z.boolean().optional().default(true),
});

// Query parameter validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Export validation
export const exportJobSchema = z.object({
  logoId: z.string().min(1, 'Logo ID is required'),
  presetIds: z.array(z.string()).min(1, 'At least one preset is required'),
  format: z.enum(['zip', 'individual']).optional().default('zip'),
  options: z
    .object({
      includeOriginal: z.boolean().optional().default(false),
      naming: z.enum(['preset', 'sequential', 'custom']).optional().default('preset'),
      customPrefix: z.string().max(50).optional(),
    })
    .optional(),
});

// User tier validation
export type UserTier = 'free' | 'pro' | 'enterprise';

export const userTierSchema = z.enum(['free', 'pro', 'enterprise']);

// Rate limit configuration based on tier
export const rateLimitConfig: Record<
  UserTier,
  { requestsPerMinute: number; quotaPerMonth: number }
> = {
  free: {
    requestsPerMinute: 10,
    quotaPerMonth: 100,
  },
  pro: {
    requestsPerMinute: 60,
    quotaPerMonth: 1000,
  },
  enterprise: {
    requestsPerMinute: 300,
    quotaPerMonth: 10000,
  },
};

// Type exports for TypeScript
export type UploadLogoInput = z.infer<typeof uploadLogoSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type ExportJobInput = z.infer<typeof exportJobSchema>;
