# BlackBox AI Ticket Development System

A multi-user, Domain-Driven Design (DDD) application built with Convex and Node.js that automatically processes development tickets using GitHub repositories and BlackBox AI integration.

## 🏗️ System Architecture

```
User → Repository → Tickets → Development Tasks → Pull Requests
```

Each user operates in isolation with their own:
- GitHub repositories (with access tokens)
- Development tickets
- Processing workflows
- Generated code and PRs

## 🚀 Core Features

- **Multi-User Support**: Isolated workflows per user/repository
- **GitHub Integration**: Branch creation, commits, and Pull Request automation
- **BlackBox AI Integration**: Automated code generation using Claude 3.5 Sonnet
- **Pull Request Management**: Automated PR creation with customizable content
- **Real-time Processing**: Async task processing with status tracking

## �️ Quick Start

1. **Setup**:
   ```bash
   git clone <repository-url>
   cd bb-ticket-dev
   npm install
   npx convex dev --configure
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env.local
   # Add your BlackBox AI API key and other config
   ```

3. **Start Development**:
   ```bash
   npx convex dev
   ```

## 💻 Usage

### Basic Workflow

```typescript
import { api } from "./convex/_generated/api";

// 1. Create user and repository
const userRepo = await convex.mutation(api.api.createUserWithRepo, {
  userData: {
    email: "dev@example.com",
    name: "Developer",
    githubUsername: "devuser",
  },
  repositoryData: {
    owner: "devuser",
    name: "my-project",
    accessToken: "ghp_your_token",
  },
});

// 2. Create and process ticket
const ticket = await convex.mutation(api.api.createAndProcessTicket, {
  userId: userRepo.user._id,
  repositoryId: userRepo.repository._id,
  ticketData: {
    title: "Add Authentication",
    description: "Implement JWT authentication system",
    priority: "high",
  },
  autoProcess: true,
});

// 3. Create Pull Request (after task completion)
const pr = await convex.action(api.api.createTaskPullRequest, {
  taskId: ticket.task._id,
  userId: userRepo.user._id,
  title: "Add JWT Authentication System", // Optional
  description: "Custom PR description", // Optional
});
```

### Available Scripts

```bash
npm run demo          # Basic demo
npm run demo:pr       # Pull Request demo
npm run test:pr       # Test PR functionality
npm run test:blackbox # Test AI integration
```

## 🔄 Development Workflow

1. **Ticket Creation** → User creates development task
2. **AI Processing** → BlackBox AI generates code
3. **GitHub Integration** → Creates branch and commits changes
4. **Pull Request** → Creates PR for code review
5. **Notifications** → User receives completion updates

## 🔧 Core API Functions

### Main Endpoints
- `api.createUserWithRepo` - Create user and repository
- `api.createAndProcessTicket` - Create and auto-process ticket
- `api.createTaskPullRequest` - Create PR for completed task
- `api.getUserDashboard` - Get user statistics and activity

### Status Monitoring
- `api.getSystemStats` - System-wide statistics
- `tasks.getTask` - Individual task status
- `tasks.getUserTasks` - User's task list

## � Database Schema

### Core Tables
- **users**: User accounts and GitHub info
- **repositories**: GitHub repos with access tokens
- **tickets**: Development tasks/requirements
- **developmentTasks**: Processing workflow records

### Key Fields
- Tasks include: `branchName`, `commitSha`, `pullRequestUrl`, `pullRequestNumber`
- All tables have user isolation via `userId` foreign keys

## 🔒 Security & Isolation

- **User Isolation**: Each user operates independently
- **GitHub Tokens**: User-provided, securely stored
- **Access Control**: All operations validate user ownership
- **Repository Permissions**: Users can only access their own repos

## 🚦 Task Status Flow

```
pending → queued → analyzing → generating → committing → completed
                    ↓              ↓            ↓
                 failed ←     failed ←     failed
```

## 🎯 Current Status

- ✅ **Multi-user architecture implemented**
- ✅ **BlackBox AI integration active** (Claude 3.5 Sonnet)
- ✅ **GitHub integration complete** (branch, commit, PR)
- ✅ **Pull Request automation ready**
- ✅ **Real-time notifications working**

## 🔮 Roadmap

- [ ] Code Review Integration
- [ ] Slack/Discord Notifications  
- [ ] Advanced AI Prompting
- [ ] Batch Processing
- [ ] Analytics Dashboard

## 📝 License

ISC License - See LICENSE file for details.
