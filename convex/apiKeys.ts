/**
 * API Keys Convex Functions
 *
 * Manages API key creation, validation, and lifecycle
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Create a new API key
 */
export const create = mutation({
  args: {
    clerkUserId: v.string(),
    keyHash: v.string(),
    name: v.string(),
    prefix: v.string(),
    permissions: v.array(v.string()),
    expiresIn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Calculate expiration
    let expiresAt: number | undefined;
    if (args.expiresIn && args.expiresIn !== 'never') {
      const daysMap: Record<string, number> = {
        '30d': 30,
        '90d': 90,
        '1y': 365,
      };
      const days = daysMap[args.expiresIn] || 365;
      expiresAt = now + days * 24 * 60 * 60 * 1000;
    }

    const keyId = await ctx.db.insert('apiKeys', {
      clerkUserId: args.clerkUserId,
      keyHash: args.keyHash,
      name: args.name,
      prefix: args.prefix,
      permissions: args.permissions,
      expiresAt,
      isActive: true,
      createdAt: now,
    });

    return keyId;
  },
});

/**
 * Get API key by hash (for validation)
 */
export const getByHash = query({
  args: {
    keyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query('apiKeys')
      .withIndex('by_hash', (q) => q.eq('keyHash', args.keyHash))
      .first();

    if (!key) {
      return null;
    }

    // Check if expired
    if (key.expiresAt && key.expiresAt < Date.now()) {
      return null;
    }

    // Check if active
    if (!key.isActive) {
      return null;
    }

    return key;
  },
});

/**
 * Get API key by prefix (for display purposes)
 */
export const getByPrefix = query({
  args: {
    prefix: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiKeys')
      .withIndex('by_prefix', (q) => q.eq('prefix', args.prefix))
      .first();
  },
});

/**
 * List user's API keys
 */
export const listByUser = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .collect();

    // Don't return full hash, only metadata
    return keys.map((key) => ({
      _id: key._id,
      name: key.name,
      prefix: key.prefix,
      permissions: key.permissions,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
    }));
  },
});

/**
 * Update API key last used timestamp
 */
export const updateLastUsed = mutation({
  args: {
    keyId: v.id('apiKeys'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, {
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Deactivate API key
 */
export const deactivate = mutation({
  args: {
    keyId: v.id('apiKeys'),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.clerkUserId !== args.clerkUserId) {
      throw new Error('Unauthorized');
    }

    await ctx.db.patch(args.keyId, {
      isActive: false,
    });

    return { success: true };
  },
});

/**
 * Delete API key
 */
export const remove = mutation({
  args: {
    keyId: v.id('apiKeys'),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.clerkUserId !== args.clerkUserId) {
      throw new Error('Unauthorized');
    }

    await ctx.db.delete(args.keyId);

    return { success: true };
  },
});
