# Merge Guide: BlackBox AI Ticket System → Circular/Public

## Overview

This guide explains how to merge the essential BlackBox AI Ticket Development System functions into the `https://github.com/funfake/circular/tree/main/public` repository structure.

## Target Repository Analysis

**Target**: `funfake/circular` → `/public` folder  
**Purpose**: Integrate AI-powered ticket development capabilities into an existing public-facing application

## Core Functions to Migrate

### 1. Essential Backend Functions (Convex)

#### Primary Functions (`convex/`)
```
convex/
├── api.ts              # Main API endpoints - REQUIRED
├── blackbox.ts         # AI integration - REQUIRED
├── development.ts      # Workflow engine - REQUIRED
├── github.ts          # GitHub integration - REQUIRED
├── schema.ts          # Database schema - REQUIRED
└── notifications.ts   # Event system - OPTIONAL
```

#### Secondary Functions (User Management)
```
convex/
├── users.ts           # User management - REQUIRED
├── repositories.ts    # Repo management - REQUIRED
├── tickets.ts         # Ticket handling - REQUIRED
└── tasks.ts          # Task tracking - REQUIRED
```

### 2. Domain Logic (Optional - for clean architecture)
```
src/domain/
├── entities/          # Core business objects
├── repositories/      # Data interfaces
└── services/         # Business logic
```

## Migration Strategy

### Step 1: Prepare Target Repository

```bash
# Clone target repository
git clone https://github.com/funfake/circular.git
cd circular

# Create feature branch for integration
git checkout -b feature/blackbox-ai-integration

# Navigate to public folder (target location)
cd public
```

### Step 2: Create Integration Structure

```bash
# In circular/public/, create integration structure
mkdir -p api/blackbox-ai/
mkdir -p api/blackbox-ai/convex/
mkdir -p api/blackbox-ai/lib/
mkdir -p api/blackbox-ai/types/
```

### Step 3: Copy Essential Functions

```bash
# Copy core Convex functions
cp /path/to/bb-ticket-dev/convex/api.ts public/api/blackbox-ai/convex/
cp /path/to/bb-ticket-dev/convex/blackbox.ts public/api/blackbox-ai/convex/
cp /path/to/bb-ticket-dev/convex/development.ts public/api/blackbox-ai/convex/
cp /path/to/bb-ticket-dev/convex/github.ts public/api/blackbox-ai/convex/
cp /path/to/bb-ticket-dev/convex/schema.ts public/api/blackbox-ai/convex/

# Copy supporting functions
cp /path/to/bb-ticket-dev/convex/users.ts public/api/blackbox-ai/convex/
cp /path/to/bb-ticket-dev/convex/repositories.ts public/api/blackbox-ai/convex/
cp /path/to/bb-ticket-dev/convex/tickets.ts public/api/blackbox-ai/convex/
cp /path/to/bb-ticket-dev/convex/tasks.ts public/api/blackbox-ai/convex/

# Copy configuration files
cp /path/to/bb-ticket-dev/package.json public/api/blackbox-ai/
cp /path/to/bb-ticket-dev/.env.example public/api/blackbox-ai/
```

### Step 4: Adapt to Target Structure

#### Update Package.json Dependencies
```json
{
  "name": "circular-blackbox-ai",
  "dependencies": {
    "@octokit/rest": "^20.0.2",
    "axios": "^1.6.2", 
    "convex": "^1.14.1",
    "zod": "^3.22.4"
  }
}
```

#### Create Integration API Wrapper
```typescript
// public/api/blackbox-ai/index.ts
export { api } from './convex/_generated/api';
export * from './lib/integration';

// Main integration interface
export class BlackBoxAIIntegration {
  static async processTicket(ticketData: TicketData) {
    // Integration logic here
  }
  
  static async createPullRequest(taskId: string) {
    // PR creation logic here
  }
}
```

## Integration Points

### 1. Environment Configuration

```bash
# Add to target repo's .env
BLACKBOX_API_KEY=sk-your-api-key
BLACKBOX_API_BASE_URL=https://api.blackbox.ai/v1
CONVEX_DEPLOYMENT=your-deployment
```

### 2. API Endpoints Integration

#### Option A: Standalone API Routes
```typescript
// public/api/blackbox-ai/routes/tickets.ts
import { BlackBoxAIIntegration } from '../index';

export async function POST(request: Request) {
  const ticketData = await request.json();
  return await BlackBoxAIIntegration.processTicket(ticketData);
}
```

#### Option B: Embedded Functions
```typescript
// Integrate into existing public API structure
// public/api/development/tickets.ts
import { api } from '../blackbox-ai/convex/_generated/api';
```

### 3. Database Schema Integration

```sql
-- If using SQL database, adapt Convex schema:
CREATE TABLE blackbox_users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  github_username VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE blackbox_tickets (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES blackbox_users(id),
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Required Modifications

### 1. Namespace Functions

```typescript
// Prefix all functions to avoid conflicts
export const blackboxProcessTicket = action({
  // ... existing logic
});

export const blackboxCreatePR = action({
  // ... existing logic  
});
```

### 2. Update Import Paths

```typescript
// Update all internal imports
import { api } from "./_generated/api";
// becomes
import { api } from "./convex/_generated/api";
```

### 3. Configuration Adaptation

```typescript
// Adapt to target repo's config system
const config = {
  blackboxApiKey: process.env.BLACKBOX_API_KEY,
  githubBaseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  // ... other config
};
```

## Minimal Integration (Core Functions Only)

If full integration is too complex, extract just the essential functions:

### Core Files Needed:
```
public/api/blackbox-ai/
├── core.ts           # Main AI processing logic
├── github.ts         # GitHub operations
├── types.ts          # TypeScript definitions
└── config.ts         # Configuration
```

### Essential Functions:
```typescript
// public/api/blackbox-ai/core.ts
export async function processTicketWithAI(
  repositoryContext: string,
  ticketDescription: string
) {
  // BlackBox AI integration logic
}

export async function createGitHubPR(
  repoData: RepoData,
  changes: FileChange[],
  branchName: string
) {
  // GitHub PR creation logic
}
```

## Testing Integration

```bash
# Test the integration
cd public/api/blackbox-ai/
npm install
npm test

# Test individual functions
node -e "
const { processTicketWithAI } = require('./core.ts');
processTicketWithAI('test context', 'test ticket').then(console.log);
"
```

## Deployment Considerations

### 1. Environment Variables
- Ensure all required env vars are available in target deployment
- Update CI/CD pipelines to include BlackBox AI credentials

### 2. Dependencies
- Add required npm packages to target repo's package.json
- Ensure Node.js version compatibility

### 3. Database
- If target uses different DB, create migration scripts
- Consider using Convex as microservice vs full migration

## Usage in Target Application

```typescript
// Example usage in circular/public application
import { BlackBoxAIIntegration } from './api/blackbox-ai';

// Process a development ticket
const result = await BlackBoxAIIntegration.processTicket({
  title: "Add user authentication",
  description: "Implement JWT-based auth system",
  repositoryUrl: "https://github.com/funfake/circular"
});

// Create pull request
const pr = await BlackBoxAIIntegration.createPullRequest(result.taskId);
```

## Rollback Plan

```bash
# If integration causes issues, easy rollback:
git checkout main
git branch -D feature/blackbox-ai-integration

# Or remove integration folder:
rm -rf public/api/blackbox-ai/
```

## Support & Maintenance

1. **Documentation**: Keep integration docs updated
2. **Monitoring**: Add logging for AI processing
3. **Updates**: Regular updates to BlackBox AI integration
4. **Security**: Regular security audits of API keys and permissions

---

**Next Steps:**
1. Review target repository structure
2. Choose integration approach (full vs minimal)  
3. Execute migration plan
4. Test integration thoroughly
5. Deploy and monitor
