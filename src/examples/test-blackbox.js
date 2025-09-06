#!/usr/bin/env node

/**
 * Test script to demonstrate the BlackBox AI integration
 * This will create a user, repository, and ticket, then process it using the real BlackBox AI API
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Initialize client
const client = new ConvexHttpClient(process.env.CONVEX_URL || "http://127.0.0.1:3210");

async function testBlackBoxIntegration() {
  console.log('🧪 Testing BlackBox AI Integration');
  console.log('=' .repeat(50));

  try {
    // Create a test user with repository
    console.log('\n📝 Creating test user and repository...');
    const testUser = await client.mutation(api.api.createUserWithRepo, {
      userData: {
        email: "test@blackbox-integration.com",
        name: "BlackBox Test User",
        githubUsername: "blackbox-tester",
      },
      repositoryData: {
        owner: "blackbox-tester",
        name: "test-repo",
        accessToken: "ghp_test_token_for_demo", // This is just for demo - won't actually be used
        defaultBranch: "main",
      },
    });

    console.log('✅ Created user:', testUser.user.name);
    console.log('✅ Created repository:', testUser.repository.fullName);

    // Create and process a ticket that will use BlackBox AI
    console.log('\n🎫 Creating ticket for BlackBox AI processing...');
    const ticket = await client.mutation(api.api.createAndProcessTicket, {
      userId: testUser.user._id,
      repositoryId: testUser.repository._id,
      ticketData: {
        title: "Create Express.js Authentication API",
        description: "Build a complete authentication system with JWT tokens, including login, register, and middleware for protecting routes. Include input validation and error handling.",
        priority: "high",
      },
      autoProcess: true,
    });

    console.log('✅ Created ticket:', ticket.ticket.title);
    console.log('✅ Started processing task:', ticket.task._id);

    // Wait a bit for processing
    console.log('\n⏳ Waiting for BlackBox AI to generate code...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check task status
    const taskStatus = await client.query(api.tasks.getTask, {
      taskId: ticket.task._id,
    });

    console.log('\n📊 Task Status:', taskStatus.status);
    if (taskStatus.branchName) {
      console.log('🌿 Branch:', taskStatus.branchName);
    }
    if (taskStatus.commitSha) {
      console.log('📝 Commit:', taskStatus.commitSha);
    }
    if (taskStatus.errorMessage) {
      console.log('❌ Error:', taskStatus.errorMessage);
    }

    // Get user dashboard
    const dashboard = await client.query(api.api.getUserDashboard, {
      userId: testUser.user._id,
    });

    console.log('\n📊 Dashboard Summary:');
    console.log('Repositories:', dashboard.stats.totalRepositories);
    console.log('Tickets by status:', dashboard.stats.ticketsByStatus);
    console.log('Tasks by status:', dashboard.stats.tasksByStatus);

    console.log('\n🎉 Test completed!');
    console.log('\n💡 The system now uses the REAL BlackBox AI API to generate code!');
    console.log('Check your Convex logs to see the API interactions.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check environment
function checkEnvironment() {
  if (!process.env.CONVEX_URL) {
    console.error("❌ CONVEX_URL environment variable is not set");
    console.log("Please run 'npx convex dev' first to start the development server");
    process.exit(1);
  }
  
  console.log("✅ Environment configured:");
  console.log(`   Convex URL: ${process.env.CONVEX_URL}`);
  console.log(`   BlackBox API: ${process.env.BLACKBOX_API_URL || 'Using default URL'}`);
  console.log(`   BlackBox API Key: ${process.env.BLACKBOX_API_KEY ? '✅ Set' : '❌ Not set'}`);
}

// Main execution
async function main() {
  checkEnvironment();
  await testBlackBoxIntegration();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testBlackBoxIntegration };
