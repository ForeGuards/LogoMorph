/**
 * Webhooks Convex Functions
 *
 * Manages webhook subscriptions and delivery logs
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Create a new webhook
 */
export const create = mutation({
  args: {
    clerkUserId: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const webhookId = await ctx.db.insert('webhooks', {
      clerkUserId: args.clerkUserId,
      url: args.url,
      events: args.events,
      secret: args.secret,
      active: args.active,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return webhookId;
  },
});

/**
 * List user's webhooks
 */
export const listByUser = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('webhooks')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .collect();
  },
});

/**
 * Get active webhooks for an event
 */
export const getActiveByEvent = query({
  args: {
    clerkUserId: v.string(),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const allWebhooks = await ctx.db
      .query('webhooks')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .collect();

    return allWebhooks.filter(
      (webhook) =>
        webhook.active && webhook.events.includes(args.event) && (webhook.failureCount ?? 0) < 5, // Disable after 5 consecutive failures
    );
  },
});

/**
 * Update webhook
 */
export const update = mutation({
  args: {
    webhookId: v.id('webhooks'),
    clerkUserId: v.string(),
    url: v.optional(v.string()),
    events: v.optional(v.array(v.string())),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.clerkUserId !== args.clerkUserId) {
      throw new Error('Unauthorized');
    }

    const updates: Partial<{
      url: string;
      events: string[];
      active: boolean;
      updatedAt: number;
    }> = { updatedAt: Date.now() };
    if (args.url !== undefined) updates.url = args.url;
    if (args.events !== undefined) updates.events = args.events;
    if (args.active !== undefined) updates.active = args.active;

    await ctx.db.patch(args.webhookId, updates);

    return { success: true };
  },
});

/**
 * Delete webhook
 */
export const remove = mutation({
  args: {
    webhookId: v.id('webhooks'),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.clerkUserId !== args.clerkUserId) {
      throw new Error('Unauthorized');
    }

    await ctx.db.delete(args.webhookId);

    return { success: true };
  },
});

/**
 * Record webhook failure
 */
export const recordFailure = mutation({
  args: {
    webhookId: v.id('webhooks'),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);

    if (!webhook) {
      return;
    }

    const failureCount = (webhook.failureCount ?? 0) + 1;
    const updates: Partial<{
      failureCount: number;
      lastFailureAt: number;
      active: boolean;
    }> = {
      failureCount,
      lastFailureAt: Date.now(),
    };

    // Disable webhook after 5 consecutive failures
    if (failureCount >= 5) {
      updates.active = false;
    }

    await ctx.db.patch(args.webhookId, updates);
  },
});

/**
 * Reset webhook failure count (on successful delivery)
 */
export const resetFailureCount = mutation({
  args: {
    webhookId: v.id('webhooks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookId, {
      failureCount: 0,
    });
  },
});

/**
 * Log webhook delivery
 */
export const logDelivery = mutation({
  args: {
    webhookId: v.id('webhooks'),
    event: v.string(),
    payload: v.any(),
    response: v.optional(v.any()),
    statusCode: v.optional(v.number()),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('webhookLogs', {
      webhookId: args.webhookId,
      event: args.event,
      payload: args.payload,
      response: args.response,
      statusCode: args.statusCode,
      success: args.success,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get webhook logs
 */
export const getLogs = query({
  args: {
    webhookId: v.id('webhooks'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const logs = await ctx.db
      .query('webhookLogs')
      .withIndex('by_webhook', (q) => q.eq('webhookId', args.webhookId))
      .order('desc')
      .take(limit);

    return logs;
  },
});
