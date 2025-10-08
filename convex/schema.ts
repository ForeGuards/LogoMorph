import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    clerkOrgId: v.optional(v.string()),
    email: v.string(),
    metadata: v.optional(
      v.object({
        tier: v.optional(v.string()),
        quotaUsed: v.optional(v.number()),
        quotaLimit: v.optional(v.number()),
      }),
    ),
  })
    .index('by_clerk_user', ['clerkUserId'])
    .index('by_clerk_org', ['clerkOrgId']),

  logos: defineTable({
    clerkUserId: v.string(),
    clerkOrgId: v.optional(v.string()),
    filename: v.string(),
    storagePath: v.string(),
    storageUrl: v.string(),
    format: v.string(),
    metadata: v.object({
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      size: v.number(),
      boundingBox: v.optional(
        v.object({
          x: v.number(),
          y: v.number(),
          width: v.number(),
          height: v.number(),
        }),
      ),
      colorPalette: v.optional(v.array(v.string())),
    }),
    createdAt: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_org', ['clerkOrgId']),

  jobs: defineTable({
    clerkUserId: v.string(),
    logoId: v.id('logos'),
    type: v.string(),
    status: v.string(),
    options: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_status', ['status'])
    .index('by_logo', ['logoId']),

  presets: defineTable({
    name: v.string(),
    width: v.number(),
    height: v.number(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    settings: v.any(),
    isSystem: v.boolean(),
    isPublic: v.optional(v.boolean()),
    clerkUserId: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['clerkUserId'])
    .index('system_presets', ['isSystem']),

  generatedAssets: defineTable({
    jobId: v.id('jobs'),
    presetId: v.id('presets'),
    storagePath: v.string(),
    storageUrl: v.string(),
    format: v.string(),
    createdAt: v.number(),
  }).index('by_job', ['jobId']),

  apiKeys: defineTable({
    clerkUserId: v.string(),
    keyHash: v.string(),
    name: v.string(),
    prefix: v.string(),
    permissions: v.array(v.string()),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_prefix', ['prefix'])
    .index('by_hash', ['keyHash']),

  webhooks: defineTable({
    clerkUserId: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    active: v.boolean(),
    failureCount: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_active', ['active']),

  webhookLogs: defineTable({
    webhookId: v.id('webhooks'),
    event: v.string(),
    payload: v.any(),
    response: v.optional(v.any()),
    statusCode: v.optional(v.number()),
    success: v.boolean(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_webhook', ['webhookId']),

  usageLogs: defineTable({
    clerkUserId: v.string(),
    action: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_action', ['action'])
    .index('by_date', ['createdAt']),
});
