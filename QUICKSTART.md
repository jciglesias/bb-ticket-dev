# Quick Reference - BlackBox AI Ticket System

## 🚀 Quick Start Commands

```bash
# Setup
git clone <repo> && cd bb-ticket-dev
npm install
npx convex dev --configure

# Development
npx convex dev                    # Start backend
npm run demo                      # Run basic demo
npm run demo:pr                   # Run PR demo

# Testing  
npm run test:pr                   # Test PR functionality
npm run test:blackbox             # Test AI integration
```

## 📋 Core API Reference

### Main Endpoints
```typescript
// User & Repository Setup
api.api.createUserWithRepo({ userData, repositoryData })

// Ticket Processing
api.api.createAndProcessTicket({ userId, repositoryId, ticketData, autoProcess })

// Pull Request Creation
api.api.createTaskPullRequest({ taskId, userId, title?, description? })

// Monitoring
api.api.getUserDashboard({ userId })
api.api.getSystemStats()
```

### Task Management
```typescript
// Get task status
api.tasks.getTask({ taskId })
api.tasks.getUserTasks({ userId })

// Task operations
api.development.retryTask({ taskId, userId? })
```

## 🏗️ Project Structure

```
convex/
├── api.ts           # Main endpoints
├── development.ts   # Workflow engine
├── github.ts        # GitHub integration
├── blackbox.ts      # AI integration
├── notifications.ts # Event system
├── schema.ts        # Database schema
├── users.ts         # User management
├── repositories.ts  # Repository management
├── tickets.ts       # Ticket management
└── tasks.ts         # Task management

src/
├── domain/          # DDD entities & services
├── application/     # Use cases
└── examples/        # Demo scripts
```

## 📊 Database Quick Schema

```typescript
users: {
  email: string,
  name: string,
  githubUsername?: string
}

repositories: {
  userId: Id<"users">,
  owner: string,
  name: string,
  accessToken: string,
  defaultBranch: string,
  isActive: boolean
}

tickets: {
  userId: Id<"users">,
  repositoryId: Id<"repositories">,
  title: string,
  description: string,
  priority: "low"|"medium"|"high"|"critical",
  status: "pending"|"processing"|"completed"|"failed"
}

developmentTasks: {
  ticketId: Id<"tickets">,
  userId: Id<"users">,
  repositoryId: Id<"repositories">,
  status: "queued"|"analyzing"|"generating"|"committing"|"completed"|"failed",
  branchName?: string,
  commitSha?: string,
  pullRequestUrl?: string,
  pullRequestNumber?: number
}
```

## � Workflow States

```
Task Flow:
pending → queued → analyzing → generating → committing → completed
            ↓         ↓           ↓            ↓
         failed ←  failed ←   failed ←    failed

Ticket Flow:  
pending → processing → completed
    ↓          ↓
  failed ← failed
```

## 🔧 Environment Setup

```bash
# .env.local
CONVEX_DEPLOYMENT=dev:your-deployment
BLACKBOX_API_KEY=sk-your-api-key
BLACKBOX_API_BASE_URL=https://api.blackbox.ai/v1
```

## 🎯 Usage Examples

### Complete Workflow
```typescript
// 1. Setup
const userRepo = await convex.mutation(api.api.createUserWithRepo, {
  userData: { email: "dev@example.com", name: "Developer" },
  repositoryData: { owner: "user", name: "repo", accessToken: "ghp_token" }
});

// 2. Create Ticket
const ticket = await convex.mutation(api.api.createAndProcessTicket, {
  userId: userRepo.user._id,
  repositoryId: userRepo.repository._id,
  ticketData: {
    title: "Add Authentication",
    description: "Implement JWT auth",
    priority: "high"
  },
  autoProcess: true
});

// 3. Monitor (poll until completed)
const task = await convex.query(api.tasks.getTask, { taskId: ticket.task._id });

// 4. Create PR
const pr = await convex.action(api.api.createTaskPullRequest, {
  taskId: ticket.task._id,
  userId: userRepo.user._id
});
```

### Dashboard Monitoring
```typescript
const dashboard = await convex.query(api.api.getUserDashboard, { userId });
const stats = await convex.query(api.api.getSystemStats);

console.log({
  userTasks: dashboard.stats.tasksByStatus,
  systemActive: stats.activeTasks
});
```

## 🔍 Debugging Tips

### Check Task Status
```typescript
const task = await convex.query(api.tasks.getTask, { taskId });
console.log(task.status, task.errorMessage);
```

### Retry Failed Tasks
```typescript
await convex.action(api.development.retryTask, { taskId });
```

### System Health
```typescript
const stats = await convex.query(api.api.getSystemStats);
console.log("Active tasks:", stats.activeTasks);
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Task stuck in "queued" | Check Convex background jobs |
| GitHub API errors | Verify PAT permissions |
| BlackBox AI timeouts | Check API key and quotas |
| PR creation fails | Ensure task is completed |

## 📖 Documentation Files

- `README.md` - Overview and setup
- `TECHNICAL.md` - Detailed technical docs  
- `QUICKSTART.md` - This quick reference
- `src/examples/` - Working demo scripts
    owner: "bob-dev",
    name: "backend-api",
    accessToken: "ghp_bob_token_here" 
  }
});
```

### 3. Create and Process Tickets
```javascript
// Alice creates a frontend ticket
const aliceTicket = await convex.mutation(api.api.createAndProcessTicket, {
  userId: user1.user._id,
  repositoryId: user1.repository._id,
  ticketData: {
    title: "Add Dark Mode",
    description: "Implement dark mode toggle with theme switching"
  }
});

// Bob creates a backend ticket  
const bobTicket = await convex.mutation(api.api.createAndProcessTicket, {
  userId: user2.user._id,
  repositoryId: user2.repository._id, 
  ticketData: {
    title: "Add Authentication API",
    description: "Create JWT auth endpoints with login/register"
  }
});
```

### 4. Monitor Progress
```javascript
// Each user can check their own dashboard
const aliceDashboard = await convex.query(api.api.getUserDashboard, {
  userId: user1.user._id
});

const bobDashboard = await convex.query(api.api.getUserDashboard, {
  userId: user2.user._id  
});
```

## 🔧 Key Benefits

### ✅ User Isolation
- Each user only sees their own data
- GitHub tokens are kept separate
- No cross-user data leakage

### ✅ Scalable Processing  
- Multiple tickets can process simultaneously
- Each user's work is independent
- System handles concurrent operations

### ✅ Repository Flexibility
- Users can add multiple repositories
- Different projects for different purposes
- Easy repository management per user

### ✅ Real-time Monitoring
- Track your own tickets and tasks
- Get notifications when work completes
- Dashboard shows your progress only

## 📊 Example Multi-User Scenario

```
Company ABC has 3 developers:

👨‍💻 Alice (Frontend)
├── Repository: alice-dev/dashboard-app
├── Tickets: "Add Charts", "Fix Mobile Layout"
└── Status: 2 processing, 1 completed

👨‍💻 Bob (Backend)  
├── Repository: bob-dev/api-server
├── Tickets: "Add Auth", "Database Optimization"  
└── Status: 1 processing, 1 pending

👩‍💻 Carol (DevOps)
├── Repository: carol-ops/deployment-scripts
├── Tickets: "CI/CD Pipeline", "Docker Setup"
└── Status: 2 completed

Each developer works independently with their own repos and tickets!
```

## 🛠️ Development Workflow

1. **Onboarding**: New user creates account, adds GitHub repo
2. **Ticket Creation**: User describes what they want built  
3. **Automatic Processing**: BlackBox AI analyzes repo and generates code
4. **Code Delivery**: New branch created with implementation
5. **Review & Merge**: User reviews and merges the generated code
6. **Repeat**: Create more tickets for additional features

## 🎯 Perfect Use Cases

- **Development Teams**: Multiple developers, each with their projects
- **Freelancers**: Managing multiple client repositories  
- **Agencies**: Different projects for different clients
- **Open Source**: Maintainers automating feature development
- **Personal Projects**: Solo developer with multiple repositories

## 📞 Support

The system is designed to be self-explanatory, but key functions include:

- `createUserWithRepo`: Create user and add their first repository
- `createAndProcessTicket`: Create ticket and start processing  
- `getUserDashboard`: Check your personal progress
- `getSystemStats`: Admin view of overall system status

---

**Ready to get started?** Run `npm run demo` to see the system in action!
