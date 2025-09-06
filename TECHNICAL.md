# Technical Documentation - BlackBox AI Ticket Development System

## System Overview

The BlackBox AI Ticket Development System is a multi-user application that automates software development workflows using AI-powered code generation and GitHub integration. Built with Convex (serverless backend) and Node.js, it follows Domain-Driven Design principles for scalability and maintainability.

## Architecture

### High-Level Architecture
```
Frontend/API Layer
       ↓
Convex Functions (Backend)
       ↓
Database (Convex DB) + External APIs (GitHub, BlackBox AI)
```

### Domain-Driven Design Structure
```
src/
├── domain/
│   ├── entities/          # Core business objects
│   ├── repositories/      # Data access interfaces  
│   └── services/          # Domain business logic
├── application/
│   └── usecases/          # Application workflows
└── infrastructure/
    └── convex/            # Backend implementation
```

### Data Flow
1. **User Request** → API endpoint
2. **Convex Function** → Validates and processes
3. **Domain Service** → Applies business rules
4. **External APIs** → GitHub/BlackBox AI integration
5. **Database** → Persists state
6. **Notifications** → User feedback

## Core Components

### 1. Backend Functions (convex/)

#### schema.ts
Defines database tables and relationships:
- **users**: User accounts with GitHub integration
- **repositories**: GitHub repository metadata and access tokens
- **tickets**: Development requirements/tasks
- **developmentTasks**: Processing workflow state

#### api.ts - Main API Endpoints
- `createUserWithRepo`: Atomic user and repository creation
- `createAndProcessTicket`: Create ticket and start processing
- `createTaskPullRequest`: Generate pull request for completed tasks
- `getUserDashboard`: User analytics and activity
- `getSystemStats`: System-wide monitoring

#### development.ts - Core Workflow Engine
- `processTicket`: Main orchestration function
- `runDevelopmentWorkflow`: Async task processor
- `createPullRequest`: PR creation logic
- `retryTask`: Failed task recovery

#### github.ts - GitHub Integration
- `validateRepository`: Verify repository access
- `getRepositoryContext`: Extract codebase context
- `createBranch`: Git branch management  
- `commitChanges`: Automated commits
- `createPullRequest`: PR creation via GitHub API

#### blackbox.ts - AI Integration
- `generateCode`: BlackBox AI API integration
- `simulateBlackboxResponse`: Development fallback
- Uses Claude 3.5 Sonnet for code generation

#### notifications.ts - Event System
- `notifyTaskCompleted`: Task completion alerts
- `notifyTaskFailed`: Error notifications
- `notifyPullRequestCreated`: PR creation alerts

### 2. Domain Layer (src/domain/)

#### Entities
Core business objects with validation and behavior:
- `User`: System user with GitHub credentials
- `Repository`: GitHub repository with access control
- `Ticket`: Development task specification
- `DevelopmentTask`: Workflow execution context

#### Repositories
Data access interfaces for clean architecture:
- `UserRepository`: User CRUD operations
- `RepositoryRepository`: Repository management
- `TicketRepository`: Ticket lifecycle
- `TaskRepository`: Task state management

#### Services
Business logic and domain rules:
- `TicketProcessingService`: Workflow coordination
- `GitHubIntegrationService`: External API management
- `NotificationService`: Event handling

### 3. Database Schema

```typescript
// Users table
{
  _id: Id<"users">,
  email: string,
  name: string,
  githubUsername?: string,
  createdAt: number,
  updatedAt: number
}

// Repositories table  
{
  _id: Id<"repositories">,
  userId: Id<"users">,
  owner: string,
  name: string,
  fullName: string,        // "owner/name"
  accessToken: string,     // GitHub PAT
  defaultBranch: string,
  isActive: boolean,
  createdAt: number,
  updatedAt: number
}

// Tickets table
{
  _id: Id<"tickets">,
  userId: Id<"users">,
  repositoryId: Id<"repositories">,
  title: string,
  description: string,
  priority: "low" | "medium" | "high" | "critical",
  status: "pending" | "processing" | "completed" | "failed",
  assignedAt?: number,
  completedAt?: number,
  createdAt: number,
  updatedAt: number
}

// Development Tasks table
{
  _id: Id<"developmentTasks">,
  ticketId: Id<"tickets">,
  repositoryId: Id<"repositories">, 
  userId: Id<"users">,
  status: "queued" | "analyzing" | "generating" | "committing" | "completed" | "failed",
  branchName?: string,
  commitSha?: string,
  pullRequestUrl?: string,
  pullRequestNumber?: number,
  errorMessage?: string,
  blackboxRequestId?: string,
  startedAt: number,
  completedAt?: number
}
```

### 4. Indexes and Query Patterns

```typescript
// Performance-optimized indexes
users: ["by_email"]
repositories: ["by_user", "by_user_and_name", "by_active"] 
tickets: ["by_user", "by_repository", "by_status", "by_user_and_status"]
developmentTasks: ["by_ticket", "by_user", "by_status", "by_repository"]
```

Common query patterns:
- User dashboard: Get all user's repositories, tickets, and tasks
- System monitoring: Count active tasks by status
- Task processing: Get queued tasks ordered by creation time
- Repository validation: Check user ownership before operations

## Security Model

### Multi-Tenant Isolation
- Every operation validates user ownership via `userId`
- Database queries filtered by user context
- No cross-user data access possible

### GitHub Integration Security
- User-provided Personal Access Tokens (PATs)
- Tokens stored encrypted in database
- Minimum required permissions: repo read/write
- No shared or system-wide GitHub credentials

### Access Control
```typescript
// Validation pattern used throughout
async function validateUserAccess(ctx, userId, resourceUserId) {
  if (userId !== resourceUserId) {
    throw new Error("Access denied: User does not own this resource");
  }
}
```

### Data Validation
- Zod schemas for input validation
- Database constraints via Convex schema
- Business rule validation in domain services

## Processing Workflow

### Task State Machine
```
pending → queued → analyzing → generating → committing → completed
            ↓         ↓           ↓            ↓
         failed ←  failed ←   failed ←    failed
```

### Workflow Steps
1. **Ticket Creation**: User creates development request
2. **Task Queuing**: System creates `developmentTask` record
3. **Repository Analysis**: Extract codebase context and structure  
4. **AI Code Generation**: Send context to BlackBox AI (Claude 3.5 Sonnet)
5. **GitHub Operations**: Create branch, commit generated code
6. **Task Completion**: Update status, send notifications
7. **PR Creation**: Optional pull request generation

### Error Handling
- Automatic retry mechanism for failed tasks
- Detailed error logging and user notifications
- Graceful degradation when external services unavailable
- Transaction rollback for consistency

## External Integrations

### BlackBox AI API
- **Endpoint**: Claude 3.5 Sonnet via BlackBox AI
- **Authentication**: API key in environment
- **Request Format**: Repository context + ticket description
- **Response**: Generated code files with commit messages
- **Rate Limiting**: Handled by service layer
- **Fallback**: Simulation mode for development

### GitHub API (Octokit)
- **Authentication**: Per-user PATs
- **Operations**: Repository access, branch creation, commits, PRs
- **Error Handling**: GitHub API errors mapped to user-friendly messages
- **Rate Limiting**: Respects GitHub rate limits

## Performance Considerations

### Database Optimization
- Strategic indexes for common query patterns
- Compound indexes for multi-field queries
- Query result limits to prevent large data transfers

### Async Processing
- Background task processing with Convex scheduler
- Non-blocking workflows for user operations
- Status polling for long-running tasks

### Caching Strategy
- Repository context cached during processing
- User session data cached for dashboard queries
- AI responses cached to avoid duplicate API calls

## Monitoring and Observability

### System Metrics
- Active task counts by status
- Processing time per workflow stage  
- Success/failure rates
- User activity patterns

### Logging
- Structured logging for all operations
- Error tracking with context
- Performance monitoring
- Security event logging

### Health Checks
- Database connectivity
- External API availability
- Background job processing status

## Deployment Architecture

### Convex Backend
- Serverless functions with automatic scaling
- Database managed by Convex platform
- Environment-specific deployments (dev/prod)

### Environment Configuration
```bash
# Required environment variables
CONVEX_DEPLOYMENT=<deployment-name>
BLACKBOX_API_KEY=<api-key>
BLACKBOX_API_BASE_URL=<api-url>

# Optional configuration
GITHUB_DEFAULT_BRANCH=main
LOG_LEVEL=info
```

### CI/CD Pipeline
1. Code validation and testing
2. Convex function deployment
3. Schema migrations (if needed)
4. Health check verification
5. Production traffic routing

## Development Workflow

### Local Development
```bash
# Start local development
npx convex dev

# Run demos
npm run demo       # Basic workflow
npm run demo:pr    # Pull request demo

# Testing  
npm run test:pr    # Test PR functionality
npm run test:blackbox # Test AI integration
```

### Code Organization
- Domain-driven folder structure
- Separation of concerns between layers
- Dependency injection for testability
- Interface-based external integrations

### Testing Strategy
- Unit tests for domain logic
- Integration tests for workflows  
- End-to-end tests for critical paths
- Mock services for external APIs

## Troubleshooting

### Common Issues
1. **GitHub API Rate Limits**: Use multiple PATs or implement backoff
2. **BlackBox AI Timeouts**: Increase timeout values, implement retry
3. **Task Stuck in Processing**: Manual retry or state reset
4. **Invalid Repository Access**: Verify PAT permissions

### Debug Tools
- Convex dashboard for database inspection
- System stats API for monitoring
- Task status tracking
- Detailed error logging

### Recovery Procedures
- Failed task retry mechanism
- Database state correction
- User notification system
- Manual intervention capabilities

## Future Enhancements

### Planned Features
- Advanced AI prompting and customization
- Code review integration
- Batch processing capabilities  
- Enhanced analytics dashboard
- Webhook integrations
- Multi-repository support per user

### Scalability Improvements
- Task queue optimization
- Database sharding strategies
- API response caching
- Background job optimization

### Security Enhancements
- OAuth GitHub integration
- Enhanced access logging
- Rate limiting per user
- Audit trail implementation
