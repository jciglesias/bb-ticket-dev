import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Example usage script demonstrating the multi-user ticket development system

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

async function demonstrateSystem() {
  console.log("🚀 Starting BlackBox AI Ticket Development System Demo");
  console.log("=" .repeat(60));

  try {
    // Example 1: Create first user with repository
    console.log("\n📝 Example 1: Creating User 1 with Authentication Repository");
    const user1Data = await client.mutation(api.api.createUserWithRepo, {
      userData: {
        email: "john@example.com",
        name: "John Developer",
        githubUsername: "johndeveloper",
      },
      repositoryData: {
        owner: "johndeveloper",
        name: "my-auth-app",
        accessToken: "ghp_example_token_123", // In real usage, this would be a real GitHub token
        defaultBranch: "main",
      },
    });
    console.log("✅ Created User 1:", user1Data.user);
    console.log("✅ Added Repository:", user1Data.repository);

    // Example 2: Create second user with different repository
    console.log("\n📝 Example 2: Creating User 2 with API Repository");
    const user2Data = await client.mutation("api:createUserWithRepo", {
      userData: {
        email: "sarah@example.com",
        name: "Sarah Developer",
        githubUsername: "sarahdev",
      },
      repositoryData: {
        owner: "sarahdev",
        name: "api-service",
        accessToken: "ghp_example_token_456", // In real usage, this would be a real GitHub token
        defaultBranch: "develop",
      },
    });
    console.log("✅ Created User 2:", user2Data.user);
    console.log("✅ Added Repository:", user2Data.repository);

    // Example 3: User 1 creates and processes an authentication ticket
    console.log("\n📝 Example 3: User 1 Creating Authentication Ticket");
    const authTicket = await client.mutation("api:createAndProcessTicket", {
      userId: user1Data.user._id,
      repositoryId: user1Data.repository._id,
      ticketData: {
        title: "Add JWT Authentication",
        description: "Implement JWT-based authentication system with login and registration endpoints. Include middleware for token validation and user session management.",
        priority: "high",
      },
      autoProcess: true,
    });
    console.log("✅ Created and processing ticket:", authTicket.ticket);
    console.log("✅ Development task created:", authTicket.task);

    // Example 4: User 2 creates and processes an API ticket
    console.log("\n📝 Example 4: User 2 Creating API Endpoint Ticket");
    const apiTicket = await client.mutation("api:createAndProcessTicket", {
      userId: user2Data.user._id,
      repositoryId: user2Data.repository._id,
      ticketData: {
        title: "Create User Management API",
        description: "Create REST API endpoints for user management including CRUD operations for users, with proper validation and error handling.",
        priority: "medium",
      },
      autoProcess: true,
    });
    console.log("✅ Created and processing ticket:", apiTicket.ticket);
    console.log("✅ Development task created:", apiTicket.task);

    // Example 5: Wait a bit for processing, then check user dashboards
    console.log("\n⏳ Waiting 3 seconds for processing...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check User 1 dashboard
    console.log("\n📊 User 1 Dashboard:");
    const user1Dashboard = await client.query("api:getUserDashboard", {
      userId: user1Data.user._id,
    });
    console.log("Repositories:", user1Dashboard.repositories.length);
    console.log("Tickets:", user1Dashboard.stats.ticketsByStatus);
    console.log("Tasks:", user1Dashboard.stats.tasksByStatus);

    // Check User 2 dashboard  
    console.log("\n📊 User 2 Dashboard:");
    const user2Dashboard = await client.query("api:getUserDashboard", {
      userId: user2Data.user._id,
    });
    console.log("Repositories:", user2Dashboard.repositories.length);
    console.log("Tickets:", user2Dashboard.stats.ticketsByStatus);
    console.log("Tasks:", user2Dashboard.stats.tasksByStatus);

    // Example 6: Show system-wide statistics
    console.log("\n📈 System Statistics:");
    const systemStats = await client.query("api:getSystemStats");
    console.log("Pending tickets:", systemStats.pendingTickets);
    console.log("Active tasks:", systemStats.activeTasks);
    console.log("Queued tasks:", systemStats.queuedTasks);
    console.log("Processing tasks:", systemStats.processingTasks);

    // Example 7: Show recent activity for users
    console.log("\n📋 Recent Activity for User 1:");
    const user1Activity = await client.query("api:getRecentActivity", {
      userId: user1Data.user._id,
    });
    console.log("Recent tickets:", user1Activity.recentTickets.map(t => ({ title: t.title, status: t.status })));

    console.log("\n📋 Recent Activity for User 2:");
    const user2Activity = await client.query("api:getRecentActivity", {
      userId: user2Data.user._id,
    });
    console.log("Recent tickets:", user2Activity.recentTickets.map(t => ({ title: t.title, status: t.status })));

    console.log("\n🎉 Demo completed successfully!");
    console.log("\nKey Features Demonstrated:");
    console.log("✅ Multi-user support with separate repositories per user");
    console.log("✅ User-specific ticket creation and processing");
    console.log("✅ Isolated development workflows per user/repo");
    console.log("✅ Dashboard and activity tracking per user");
    console.log("✅ System-wide monitoring and statistics");

  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

// Test with hardcoded data (for development/testing)
async function testWithHardcodedData() {
  console.log("🧪 Testing with Hardcoded Development Data");
  console.log("=" .repeat(60));

  // This demonstrates how the system would work with predefined test data
  const testScenarios = [
    {
      user: { email: "test1@dev.com", name: "Test User 1" },
      repo: { owner: "testuser1", name: "auth-service", accessToken: "test_token_1" },
      ticket: { title: "Implement OAuth2", description: "Add OAuth2 authentication flow" },
    },
    {
      user: { email: "test2@dev.com", name: "Test User 2" },
      repo: { owner: "testuser2", name: "payment-api", accessToken: "test_token_2" },
      ticket: { title: "Payment Integration", description: "Integrate Stripe payment processing" },
    },
  ];

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n🔧 Test Scenario ${i + 1}:`);
    console.log(`   User: ${scenario.user.name} (${scenario.user.email})`);
    console.log(`   Repository: ${scenario.repo.owner}/${scenario.repo.name}`);
    console.log(`   Ticket: ${scenario.ticket.title}`);
    
    // In a real test, you would run the actual mutations here
    console.log("   ✅ Would create user and repository");
    console.log("   ✅ Would create and process ticket");
    console.log("   ✅ Would track development progress");
  }
}

// Environment check
function checkEnvironment() {
  if (!process.env.CONVEX_URL) {
    console.error("❌ CONVEX_URL environment variable is not set");
    console.log("Please run 'npx convex dev' to start the development server");
    process.exit(1);
  }
  
  console.log("✅ Environment configured:");
  console.log(`   Convex URL: ${process.env.CONVEX_URL}`);
}

// Main execution
async function main() {
  checkEnvironment();
  
  const args = process.argv.slice(2);
  
  if (args.includes("--test")) {
    await testWithHardcodedData();
  } else {
    await demonstrateSystem();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { demonstrateSystem, testWithHardcodedData };
