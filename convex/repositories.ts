import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a new repository for a user (bot user approach)
export const addRepository = mutation({
  args: {
    userId: v.id("users"),
    owner: v.string(),
    name: v.string(),
    defaultBranch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const repositoryId = await ctx.db.insert("repositories", {
      userId: args.userId,
      owner: args.owner,
      name: args.name,
      fullName: `${args.owner}/${args.name}`,
      defaultBranch: args.defaultBranch || "main",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(repositoryId);
  },
});

// Get repository by ID
export const getRepository = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.repositoryId);
  },
});

// Get all repositories for a user
export const getUserRepositories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get active repositories for a user
export const getActiveUserRepositories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Find repository by user and name
export const findRepositoryByUserAndName = query({
  args: {
    userId: v.id("users"),
    owner: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_user_and_name", (q) => 
        q.eq("userId", args.userId)
         .eq("owner", args.owner)
         .eq("name", args.name)
      )
      .first();
  },
});

// Update repository
export const updateRepository = mutation({
  args: {
    repositoryId: v.id("repositories"),
    updates: v.object({
      defaultBranch: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.repositoryId, {
      ...args.updates,
      updatedAt: now,
    });

    return await ctx.db.get(args.repositoryId);
  },
});

// Delete repository
export const deleteRepository = mutation({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.repositoryId);
  },
});

// Validate if user has access to repository
export const validateRepositoryAccess = query({
  args: {
    repositoryId: v.id("repositories"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const repository = await ctx.db.get(args.repositoryId);
    return repository?.userId === args.userId;
  },
});
