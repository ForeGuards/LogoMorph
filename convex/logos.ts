import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Create a new logo entry in the database
 */
export const createLogo = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const logoId = await ctx.db.insert('logos', {
      ...args,
      createdAt: Date.now(),
    });
    return logoId;
  },
});

/**
 * Get a logo by ID
 */
export const getLogo = query({
  args: { logoId: v.id('logos') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.logoId);
  },
});

/**
 * Get all logos for a user
 */
export const getUserLogos = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('logos')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .order('desc')
      .collect();
  },
});

/**
 * Delete a logo
 */
export const deleteLogo = mutation({
  args: { logoId: v.id('logos') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.logoId);
  },
});

/**
 * Update logo metadata
 */
export const updateLogoMetadata = mutation({
  args: {
    logoId: v.id('logos'),
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
  },
  handler: async (ctx, args) => {
    const { logoId, metadata } = args;
    await ctx.db.patch(logoId, { metadata });
  },
});
