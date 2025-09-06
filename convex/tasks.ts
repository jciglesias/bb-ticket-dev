import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get development task by ID
export const getTask = query({
  args: { taskId: v.id("developmentTasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// Get tasks by ticket ID
export const getTasksByTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("developmentTasks")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .order("desc")
      .collect();
  },
});

// Get tasks for a user
export const getUserTasks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("developmentTasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get tasks by status
export const getTasksByStatus = query({
  args: {
    status: v.union(
      v.literal("queued"),
      v.literal("analyzing"),
      v.literal("generating"),
      v.literal("committing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("developmentTasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("asc") // Process older tasks first for queued tasks
      .collect();
  },
});

// Get active tasks (not completed or failed)
export const getActiveTasks = query({
  args: {},
  handler: async (ctx) => {
    const activeTasks = [];
    const statuses = ["queued", "analyzing", "generating", "committing"] as const;
    
    for (const status of statuses) {
      const tasks = await ctx.db
        .query("developmentTasks")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      activeTasks.push(...tasks);
    }
    
    return activeTasks.sort((a, b) => a.startedAt - b.startedAt);
  },
});

// Update development task
export const updateTask = mutation({
  args: {
    taskId: v.id("developmentTasks"),
    updates: v.object({
      status: v.optional(v.union(
        v.literal("queued"),
        v.literal("analyzing"),
        v.literal("generating"),
        v.literal("committing"),
        v.literal("completed"),
        v.literal("failed")
      )),
      branchName: v.optional(v.string()),
      commitSha: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      blackboxRequestId: v.optional(v.string()),
      completedAt: v.optional(v.number()),
      pullRequestUrl: v.optional(v.string()),
      pullRequestNumber: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, args.updates);
    return await ctx.db.get(args.taskId);
  },
});

// Create a new development task
export const createTask = mutation({
  args: {
    ticketId: v.id("tickets"),
    repositoryId: v.id("repositories"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("developmentTasks", {
      ticketId: args.ticketId,
      repositoryId: args.repositoryId,
      userId: args.userId,
      status: "queued",
      startedAt: now,
    });

    return await ctx.db.get(taskId);
  },
});

// Delete development task
export const deleteTask = mutation({
  args: { taskId: v.id("developmentTasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});

// Retry a failed task
export const retryFailedTask = mutation({
  args: { taskId: v.id("developmentTasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "failed") {
      throw new Error("Task is not in failed status");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: "queued",
      errorMessage: undefined,
      startedAt: now,
      completedAt: undefined,
    });

    return await ctx.db.get(args.taskId);
  },
});

// Get tasks for a repository
export const getRepositoryTasks = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("developmentTasks")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .order("desc")
      .collect();
  },
});
