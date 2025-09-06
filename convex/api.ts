import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Main API endpoints for the ticket development system

// Create a complete workflow: user -> repository -> ticket -> process (with bot validation)
export const createUserWithRepo = action({
  args: {
    userData: v.object({
      email: v.string(),
      name: v.string(),
      githubUsername: v.optional(v.string()),
    }),
    repositoryData: v.object({
      owner: v.string(),
      name: v.string(),
      defaultBranch: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Validate bot access to repository first
    const botAccess = await ctx.runAction(api.github.validateBotAccess, {
      owner: args.repositoryData.owner,
      name: args.repositoryData.name,
    });

    if (!botAccess.hasAccess) {
      throw new Error(`Bot doesn't have access to repository ${args.repositoryData.owner}/${args.repositoryData.name}. ${botAccess.error || 'Please ensure the BlackBox AI bot user is added as a collaborator with write permissions.'}`);
    }

    // Create user first
    const user = await ctx.runMutation(api.users.createUser, args.userData);
    
    if (!user) {
      throw new Error("Failed to create user");
    }

    // Add repository for the user
    const repository = await ctx.runMutation(api.repositories.addRepository, {
      userId: user._id,
      ...args.repositoryData,
    });

    return {
      user,
      repository,
      botAccess,
    };
  },
});

// Create a ticket and immediately start processing it
export const createAndProcessTicket = mutation({
  args: {
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    ticketData: v.object({
      title: v.string(),
      description: v.string(),
      priority: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )),
    }),
    autoProcess: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Create the ticket
    const ticket = await ctx.runMutation(api.tickets.createTicket, {
      userId: args.userId,
      repositoryId: args.repositoryId,
      title: args.ticketData.title,
      description: args.ticketData.description,
      priority: args.ticketData.priority,
    });

    if (!ticket) {
      throw new Error("Failed to create ticket");
    }

    let task = null;
    if (args.autoProcess !== false) {
      // Start processing immediately
      task = await ctx.runMutation(api.tickets.assignTicketForDevelopment, {
        ticketId: ticket._id,
      });

      // Schedule the workflow to run
      ctx.scheduler.runAfter(0, api.development.runDevelopmentWorkflow, {
        taskId: task._id,
      });
    }

    return {
      ticket,
      task,
    };
  },
});

// Get dashboard data for a user
export const getUserDashboard = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [user, repositories, tickets, tasks] = await Promise.all([
      ctx.runQuery(api.users.getUser, { userId: args.userId }),
      ctx.runQuery(api.repositories.getUserRepositories, { userId: args.userId }),
      ctx.runQuery(api.tickets.getUserTickets, { userId: args.userId }),
      ctx.runQuery(api.tasks.getUserTasks, { userId: args.userId }),
    ]);

    // Group tickets by status
    const ticketsByStatus = {
      pending: tickets.filter(t => t.status === "pending").length,
      processing: tickets.filter(t => t.status === "processing").length,
      completed: tickets.filter(t => t.status === "completed").length,
      failed: tickets.filter(t => t.status === "failed").length,
    };

    // Group tasks by status
    const tasksByStatus = {
      queued: tasks.filter(t => t.status === "queued").length,
      analyzing: tasks.filter(t => t.status === "analyzing").length,
      generating: tasks.filter(t => t.status === "generating").length,
      committing: tasks.filter(t => t.status === "committing").length,
      completed: tasks.filter(t => t.status === "completed").length,
      failed: tasks.filter(t => t.status === "failed").length,
    };

    return {
      user,
      repositories,
      tickets,
      tasks,
      stats: {
        totalRepositories: repositories.length,
        activeRepositories: repositories.filter(r => r.isActive).length,
        totalTickets: tickets.length,
        totalTasks: tasks.length,
        ticketsByStatus,
        tasksByStatus,
      },
    };
  },
});

// Get recent activity for a user
export const getRecentActivity = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [tickets, tasks] = await Promise.all([
      ctx.runQuery(api.tickets.getUserTickets, { userId: args.userId }),
      ctx.runQuery(api.tasks.getUserTasks, { userId: args.userId }),
    ]);

    // Get recent tickets (last 10)
    const recentTickets = tickets.slice(0, 10);
    
    // Get recent tasks (last 10)
    const recentTasks = tasks.slice(0, 10);

    return {
      recentTickets,
      recentTasks,
    };
  },
});

// Retry multiple failed tasks
export const retryFailedTasks = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all failed tasks for the user
    const allTasks = await ctx.runQuery(api.tasks.getUserTasks, { userId: args.userId });
    const failedTasks = allTasks.filter(task => task.status === "failed");

    const results = [];
    for (const task of failedTasks) {
      try {
        const retriedTask = await ctx.runMutation(api.tasks.retryFailedTask, {
          taskId: task._id,
        });

        // Schedule the workflow to run
        ctx.scheduler.runAfter(0, api.development.runDevelopmentWorkflow, {
          taskId: task._id,
        });

        results.push({ taskId: task._id, success: true, task: retriedTask });
      } catch (error) {
        results.push({ 
          taskId: task._id, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return {
      retriedTasks: results.filter(r => r.success).length,
      failedRetries: results.filter(r => !r.success).length,
      results,
    };
  },
});

// Create Pull Request for a completed task
export const createTaskPullRequest = action({
  args: {
    taskId: v.id("developmentTasks"),
    userId: v.optional(v.id("users")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Use the development service to create the PR
    return await ctx.runAction(api.development.createPullRequest, args);
  },
});

// Get system statistics (for monitoring)
export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    const [pendingTickets, activeTasks] = await Promise.all([
      ctx.runQuery(api.tickets.getPendingTickets),
      ctx.runQuery(api.tasks.getActiveTasks),
    ]);

    return {
      pendingTickets: pendingTickets.length,
      activeTasks: activeTasks.length,
      queuedTasks: activeTasks.filter(t => t.status === "queued").length,
      processingTasks: activeTasks.filter(t => t.status === "analyzing" || t.status === "generating" || t.status === "committing").length,
      timestamp: Date.now(),
    };
  },
});
