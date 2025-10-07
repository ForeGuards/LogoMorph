import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    metadata: v.optional(v.any()),
  }).index('by_clerk_user', ['clerkUserId']),

  logos: defineTable({
    clerkUserId: v.string(),
    filename: v.string(),
    storagePath: v.string(),
    format: v.string(),
    metadata: v.optional(v.any()),
  }).index('by_user', ['clerkUserId']),
});
