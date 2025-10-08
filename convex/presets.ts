import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Create a custom preset
 */
export const createPreset = mutation({
  args: {
    clerkUserId: v.string(),
    clerkOrgId: v.optional(v.string()),
    name: v.string(),
    width: v.number(),
    height: v.number(),
    category: v.optional(v.string()), // 'web', 'social', 'mobile', 'print', 'custom'
    description: v.optional(v.string()),
    settings: v.object({
      alignment: v.optional(v.string()),
      fillMode: v.optional(v.string()),
      margin: v.optional(v.number()),
      background: v.optional(
        v.object({
          type: v.string(),
          color: v.optional(v.string()),
        }),
      ),
    }),
    isPublic: v.optional(v.boolean()), // Whether others can see/use it
  },
  handler: async (ctx, args) => {
    // Check if preset with same name already exists for this user
    const existing = await ctx.db
      .query('presets')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .filter((q) => q.eq(q.field('name'), args.name))
      .first();

    if (existing) {
      throw new Error('A preset with this name already exists');
    }

    const presetId = await ctx.db.insert('presets', {
      ...args,
      isSystem: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return presetId;
  },
});

/**
 * Update a custom preset
 */
export const updatePreset = mutation({
  args: {
    presetId: v.id('presets'),
    name: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    settings: v.optional(
      v.object({
        alignment: v.optional(v.string()),
        fillMode: v.optional(v.string()),
        margin: v.optional(v.number()),
        background: v.optional(
          v.object({
            type: v.string(),
            color: v.optional(v.string()),
          }),
        ),
      }),
    ),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { presetId, ...updates } = args;

    const preset = await ctx.db.get(presetId);
    if (!preset) {
      throw new Error('Preset not found');
    }

    if (preset.isSystem) {
      throw new Error('Cannot modify system presets');
    }

    await ctx.db.patch(presetId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return presetId;
  },
});

/**
 * Delete a custom preset
 */
export const deletePreset = mutation({
  args: {
    presetId: v.id('presets'),
  },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);

    if (!preset) {
      throw new Error('Preset not found');
    }

    if (preset.isSystem) {
      throw new Error('Cannot delete system presets');
    }

    await ctx.db.delete(args.presetId);
  },
});

/**
 * Get all system presets
 */
export const getSystemPresets = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('presets')
      .withIndex('system_presets', (q) => q.eq('isSystem', true))
      .collect();
  },
});

/**
 * Get user's custom presets
 */
export const getUserPresets = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('presets')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .filter((q) => q.eq(q.field('isSystem'), false))
      .order('desc')
      .collect();
  },
});

/**
 * Get all presets (system + user's custom)
 */
export const getAllPresetsForUser = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const systemPresets = await ctx.db
      .query('presets')
      .withIndex('system_presets', (q) => q.eq('isSystem', true))
      .collect();

    const userPresets = await ctx.db
      .query('presets')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .filter((q) => q.eq(q.field('isSystem'), false))
      .collect();

    return {
      system: systemPresets,
      custom: userPresets,
    };
  },
});

/**
 * Get public presets from other users
 */
export const getPublicPresets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const presets = await ctx.db
      .query('presets')
      .filter((q) => q.and(q.eq(q.field('isSystem'), false), q.eq(q.field('isPublic'), true)))
      .take(limit);

    return presets;
  },
});

/**
 * Get preset by ID
 */
export const getPreset = query({
  args: {
    presetId: v.id('presets'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.presetId);
  },
});

/**
 * Duplicate a preset (create a copy)
 */
export const duplicatePreset = mutation({
  args: {
    presetId: v.id('presets'),
    clerkUserId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.presetId);

    if (!original) {
      throw new Error('Preset not found');
    }

    const duplicate = await ctx.db.insert('presets', {
      clerkUserId: args.clerkUserId,
      name: args.newName,
      width: original.width,
      height: original.height,
      settings: original.settings,
      isSystem: false,
      isPublic: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return duplicate;
  },
});
