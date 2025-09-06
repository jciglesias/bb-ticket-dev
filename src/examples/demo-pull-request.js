#!/usr/bin/env node

/**
 * Demo: Pull Request Creation
 * 
 * This script demonstrates how to create Pull Requests for completed development tasks.
 * It shows both automatic PR creation with default titles/descriptions and custom PR creation.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.CONVEX_URL || "http://127.0.0.1:3210");

async function main() {
  console.log("🚀 BlackBox AI Ticket Development System - Pull Request Demo\n");

  try {
    // Step 1: Get system stats to see current state
    const systemStats = await convex.query(api.api.getSystemStats);
    console.log("📊 Current System Stats:", {
      pendingTickets: systemStats.pendingTickets,
      activeTasks: systemStats.activeTasks,
      queuedTasks: systemStats.queuedTasks,
      processingTasks: systemStats.processingTasks,
    });
    console.log();

    // Step 2: Create demo user and repository (if not exists)
    console.log("👤 Creating demo user and repository...");
    const userRepo = await convex.mutation(api.api.createUserWithRepo, {
      userData: {
        email: `demo-pr-${Date.now()}@example.com`,
        name: "PR Demo User",
        githubUsername: "demo-user",
      },
      repositoryData: {
        owner: "demo-user",
        name: "demo-pr-repo",
        accessToken: "ghp_demo_token_for_pr_testing",
        defaultBranch: "main",
      },
    });

    console.log("✅ User and repository created:", {
      userId: userRepo.user._id,
      userEmail: userRepo.user.email,
      repositoryName: userRepo.repository.fullName,
    });
    console.log();

    // Step 3: Create and process a demo ticket
    console.log("🎫 Creating demo ticket for Pull Request...");
    const ticket = await convex.mutation(api.api.createAndProcessTicket, {
      userId: userRepo.user._id,
      repositoryId: userRepo.repository._id,
      ticketData: {
        title: "Add User Authentication System",
        description: "Implement a complete user authentication system with JWT tokens, password hashing, and session management. Include login, register, and logout endpoints with proper validation and error handling.",
        priority: "high",
      },
      autoProcess: true,
    });

    console.log("✅ Ticket created and processing started:", {
      ticketId: ticket.ticket._id,
      taskId: ticket.task._id,
      title: ticket.ticket.title,
      status: ticket.task.status,
    });
    console.log();

    // Step 4: Monitor task completion
    console.log("⏳ Monitoring task completion...");
    let attempts = 0;
    let completedTask = null;
    
    while (attempts < 30) { // Wait up to 30 seconds
      const currentTask = await convex.query(api.tasks.getTask, {
        taskId: ticket.task._id,
      });

      console.log(`   Status: ${currentTask.status} (attempt ${attempts + 1}/30)`);

      if (currentTask.status === "completed") {
        completedTask = currentTask;
        break;
      }

      if (currentTask.status === "failed") {
        console.log("❌ Task failed:", currentTask.errorMessage);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
    }

    if (!completedTask) {
      console.log("⏰ Task is still processing. You can create the PR later when it completes.");
      console.log("   Use the task ID:", ticket.task._id);
      return;
    }

    console.log("🎉 Task completed successfully!");
    console.log("   Branch:", completedTask.branchName);
    console.log("   Commit:", completedTask.commitSha);
    console.log();

    // Step 5: Create Pull Request with default title/description
    console.log("📝 Creating Pull Request with default settings...");
    const defaultPR = await convex.action(api.api.createTaskPullRequest, {
      taskId: completedTask._id,
      userId: userRepo.user._id,
    });

    console.log("✅ Default Pull Request created:", {
      url: defaultPR.pullRequestUrl,
      number: defaultPR.pullRequestNumber,
      title: defaultPR.title,
    });
    console.log();

    // Step 6: Create another ticket to demonstrate custom PR creation
    console.log("🎫 Creating second ticket for custom PR demo...");
    const ticket2 = await convex.mutation(api.api.createAndProcessTicket, {
      userId: userRepo.user._id,
      repositoryId: userRepo.repository._id,
      ticketData: {
        title: "Add API Rate Limiting",
        description: "Implement rate limiting middleware to prevent API abuse and ensure fair usage across all users.",
        priority: "medium",
      },
      autoProcess: true,
    });

    console.log("✅ Second ticket created:", ticket2.ticket.title);

    // For demo purposes, let's assume this task also completes
    // In a real scenario, you'd wait for completion like above
    console.log("⏳ Simulating task completion...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create PR with custom title and description
    console.log("📝 Creating Pull Request with custom title and description...");
    const customPR = await convex.action(api.api.createTaskPullRequest, {
      taskId: ticket2.task._id,
      userId: userRepo.user._id,
      title: "🛡️ Implement Advanced API Rate Limiting",
      description: `## 🎯 Overview
This Pull Request implements a comprehensive rate limiting system for our API endpoints.

## 🚀 Features Added
- ⚡ Redis-based rate limiting for high performance
- 🎛️ Configurable limits per endpoint
- 📊 Usage analytics and monitoring
- 🔒 IP-based and user-based limiting
- 📧 Alert system for abuse detection

## 🧪 Testing
- ✅ Unit tests for rate limiting logic
- ✅ Integration tests for API endpoints
- ✅ Load testing for performance validation

## 📋 Related Issue
Closes ticket: ${ticket2.ticket.title}

---
*Generated by BlackBox AI Bot* 🤖`,
    });

    console.log("✅ Custom Pull Request created:", {
      url: customPR.pullRequestUrl,
      number: customPR.pullRequestNumber,
      title: customPR.title,
    });
    console.log();

    // Step 7: Show final dashboard
    const dashboard = await convex.query(api.api.getUserDashboard, {
      userId: userRepo.user._id,
    });

    console.log("📊 Final Dashboard Stats:", {
      repositories: dashboard.stats.totalRepositories,
      tickets: dashboard.stats.totalTickets,
      tasks: dashboard.stats.totalTasks,
      ticketsByStatus: dashboard.stats.ticketsByStatus,
      tasksByStatus: dashboard.stats.tasksByStatus,
    });

    console.log("\n🎉 Pull Request Demo Completed Successfully!");
    console.log("\n💡 Key Features Demonstrated:");
    console.log("   ✅ Automatic PR creation with generated titles/descriptions");
    console.log("   ✅ Custom PR creation with user-defined content");
    console.log("   ✅ Integration with completed development tasks");
    console.log("   ✅ Real-time status monitoring");
    console.log("   ✅ Multi-user isolation and security");

  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    console.error("Details:", error);
  }
}

// Run the demo if called directly
main().catch(error => {
  console.error("❌ Demo failed:", error.message);
  console.error("Details:", error);
  process.exit(1);
});

export { main };
