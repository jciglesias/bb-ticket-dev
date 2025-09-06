import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Notify user when task is completed
export const notifyTaskCompleted = action({
  args: {
    userId: v.id("users"),
    taskId: v.id("developmentTasks"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Get user and task details
      const user = await ctx.runQuery(api.users.getUser, {
        userId: args.userId,
      });

      const task = await ctx.runQuery(api.tasks.getTask, {
        taskId: args.taskId,
      });

      if (!user || !task) {
        console.warn("User or task not found for notification");
        return;
      }

      // Get associated ticket
      const ticket = await ctx.runQuery(api.tickets.getTicket, {
        ticketId: task.ticketId,
      });

      if (!ticket) {
        console.warn("Ticket not found for notification");
        return;
      }

      // For now, just log the notification
      // In a real implementation, you might send emails, push notifications, etc.
      const message = args.success
        ? `✅ Task completed successfully! Your ticket "${ticket.title}" has been implemented.`
        : `❌ Task failed. Your ticket "${ticket.title}" could not be processed.`;

      console.log(`📧 Notification for ${user.email}: ${message}`);
      console.log(`📋 Task Details:`, {
        taskId: args.taskId,
        branchName: task.branchName,
        commitSha: task.commitSha,
        status: task.status,
      });

      // TODO: Implement actual notification delivery
      // Examples:
      // - Send email using a service like SendGrid, AWS SES, etc.
      // - Send push notification
      // - Save notification to database for in-app display
      // - Send webhook to external service

      return { success: true, notified: true };
    } catch (error) {
      console.error("Error sending completion notification:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Notify user when task fails
export const notifyTaskFailed = action({
  args: {
    userId: v.id("users"),
    taskId: v.id("developmentTasks"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get user and task details
      const user = await ctx.runQuery(api.users.getUser, {
        userId: args.userId,
      });

      const task = await ctx.runQuery(api.tasks.getTask, {
        taskId: args.taskId,
      });

      if (!user || !task) {
        console.warn("User or task not found for failure notification");
        return;
      }

      // Get associated ticket
      const ticket = await ctx.runQuery(api.tickets.getTicket, {
        ticketId: task.ticketId,
      });

      if (!ticket) {
        console.warn("Ticket not found for failure notification");
        return;
      }

      // For now, just log the notification
      const message = `❌ Task failed for ticket "${ticket.title}". Error: ${args.error}`;

      console.log(`📧 Failure Notification for ${user.email}: ${message}`);
      console.log(`🔧 You can retry the task or contact support for assistance.`);

      // TODO: Implement actual notification delivery
      return { success: true, notified: true };
    } catch (error) {
      console.error("Error sending failure notification:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Notify user when Pull Request is created
export const notifyPullRequestCreated = action({
  args: {
    userId: v.id("users"),
    taskId: v.id("developmentTasks"),
    pullRequestUrl: v.string(),
    pullRequestNumber: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Get user and task details
      const user = await ctx.runQuery(api.users.getUser, {
        userId: args.userId,
      });

      const task = await ctx.runQuery(api.tasks.getTask, {
        taskId: args.taskId,
      });

      if (!user || !task) {
        console.warn("User or task not found for Pull Request notification");
        return;
      }

      // Get associated ticket
      const ticket = await ctx.runQuery(api.tickets.getTicket, {
        ticketId: task.ticketId,
      });

      if (!ticket) {
        console.warn("Ticket not found for Pull Request notification");
        return;
      }

      // For now, just log the notification
      const message = `🚀 Pull Request created successfully! Your ticket "${ticket.title}" is ready for review.`;

      console.log(`📧 Pull Request Notification for ${user.email}: ${message}`);
      console.log(`🔗 Pull Request Details:`, {
        url: args.pullRequestUrl,
        number: args.pullRequestNumber,
        taskId: args.taskId,
        branchName: task.branchName,
      });

      // TODO: Implement actual notification delivery
      // Examples:
      // - Send email with PR link
      // - Send Slack/Teams notification
      // - Update project management tool
      // - Save notification to database for in-app display

      return { success: true, notified: true };
    } catch (error) {
      console.error("Error sending Pull Request notification:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Send general notification to user
export const sendNotification = action({
  args: {
    userId: v.id("users"),
    subject: v.string(),
    message: v.string(),
    type: v.optional(v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error")
    )),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.runQuery(api.users.getUser, {
        userId: args.userId,
      });

      if (!user) {
        console.warn("User not found for notification");
        return { success: false, error: "User not found" };
      }

      const typeIcon = {
        info: "ℹ️",
        success: "✅",
        warning: "⚠️",
        error: "❌",
      }[args.type || "info"];

      console.log(`📧 ${typeIcon} Notification for ${user.email}:`);
      console.log(`Subject: ${args.subject}`);
      console.log(`Message: ${args.message}`);

      // TODO: Implement actual notification delivery
      return { success: true, notified: true };
    } catch (error) {
      console.error("Error sending notification:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Batch notify multiple users
export const batchNotify = action({
  args: {
    userIds: v.array(v.id("users")),
    subject: v.string(),
    message: v.string(),
    type: v.optional(v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error")
    )),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const userId of args.userIds) {
      try {
        const result = await ctx.runAction(api.notifications.sendNotification, {
          userId,
          subject: args.subject,
          message: args.message,
          type: args.type,
        });
        results.push({ userId, ...result });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      success: true,
      results,
      totalNotifications: results.length,
      successfulNotifications: results.filter(r => r.success).length,
    };
  },
});
