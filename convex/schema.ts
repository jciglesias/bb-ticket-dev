// The schema is normally optional, but Convex has built-in support for schema validation
// and schema is the best way to ensure your database is consistent and well-typed.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    name: v.string(),
    githubUsername: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"]),

  // Repositories table (GitHub repositories owned by users)
  // Note: Uses bot user authentication instead of individual access tokens
  repositories: defineTable({
    userId: v.id("users"),
    owner: v.string(), // GitHub repo owner
    name: v.string(),  // GitHub repo name
    fullName: v.string(), // owner/name
    defaultBranch: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "owner", "name"])
    .index("by_active", ["isActive"]),

  // Tickets table
  tickets: defineTable({
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    title: v.string(),
    description: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"), 
      v.literal("high"),
      v.literal("critical")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    assignedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_repository", ["repositoryId"])
    .index("by_status", ["status"])
    .index("by_user_and_status", ["userId", "status"]),

  // Development tasks table
  developmentTasks: defineTable({
    ticketId: v.id("tickets"),
    repositoryId: v.id("repositories"),
    userId: v.id("users"),
    status: v.union(
      v.literal("queued"),
      v.literal("analyzing"),
      v.literal("generating"),
      v.literal("committing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    branchName: v.optional(v.string()),
    commitSha: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    blackboxRequestId: v.optional(v.string()),
    pullRequestUrl: v.optional(v.string()),
    pullRequestNumber: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_ticket", ["ticketId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_repository", ["repositoryId"]),
});
