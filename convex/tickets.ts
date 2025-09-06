import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new ticket
export const createTicket = mutation({
  args: {
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    title: v.string(),
    description: v.string(),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ticketId = await ctx.db.insert("tickets", {
      userId: args.userId,
      repositoryId: args.repositoryId,
      title: args.title,
      description: args.description,
      priority: args.priority || "medium",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(ticketId);
  },
});

// Get ticket by ID
export const getTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.ticketId);
  },
});

// Get all tickets for a user
export const getUserTickets = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get tickets for a repository
export const getRepositoryTickets = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .order("desc")
      .collect();
  },
});

// Get tickets by user and status
export const getUserTicketsByStatus = query({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", args.userId).eq("status", args.status)
      )
      .order("desc")
      .collect();
  },
});

// Get all pending tickets (for processing queue)
export const getPendingTickets = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc") // Process older tickets first
      .collect();
  },
});

// Update ticket
export const updateTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      priority: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )),
      status: v.optional(v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )),
      assignedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.ticketId, {
      ...args.updates,
      updatedAt: now,
    });

    return await ctx.db.get(args.ticketId);
  },
});

// Delete ticket
export const deleteTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    // Also delete associated development tasks
    const tasks = await ctx.db
      .query("developmentTasks")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(args.ticketId);
  },
});

// Assign ticket for development (creates a development task)
export const assignTicketForDevelopment = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "pending") {
      throw new Error("Ticket is not in pending status");
    }

    const now = Date.now();

    // Update ticket status to processing
    await ctx.db.patch(args.ticketId, {
      status: "processing",
      assignedAt: now,
      updatedAt: now,
    });

    // Create development task
    const taskId = await ctx.db.insert("developmentTasks", {
      ticketId: args.ticketId,
      repositoryId: ticket.repositoryId,
      userId: ticket.userId,
      status: "queued",
      startedAt: now,
    });

    return await ctx.db.get(taskId);
  },
});
