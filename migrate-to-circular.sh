#!/bin/bash

# BlackBox AI Ticket System → Circular/Public Migration Script
# This script extracts only the essential functions for integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 BlackBox AI → Circular/Public Migration Tool${NC}"
echo "========================================="

# Check if target directory is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide target directory path${NC}"
    echo "Usage: $0 /path/to/circular/public"
    exit 1
fi

TARGET_DIR="$1"
SOURCE_DIR="$(pwd)"

echo -e "${BLUE}📂 Source: ${SOURCE_DIR}${NC}"
echo -e "${BLUE}📂 Target: ${TARGET_DIR}${NC}"

# Verify target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}❌ Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Create integration structure
echo -e "\n${YELLOW}📁 Creating integration structure...${NC}"
mkdir -p "$TARGET_DIR/api/blackbox-ai/convex"
mkdir -p "$TARGET_DIR/api/blackbox-ai/lib"
mkdir -p "$TARGET_DIR/api/blackbox-ai/types"

# Copy essential Convex functions
echo -e "\n${YELLOW}📋 Copying essential Convex functions...${NC}"

ESSENTIAL_FILES=(
    "api.ts"
    "blackbox.ts" 
    "development.ts"
    "github.ts"
    "schema.ts"
    "users.ts"
    "repositories.ts"
    "tickets.ts"
    "tasks.ts"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$SOURCE_DIR/convex/$file" ]; then
        cp "$SOURCE_DIR/convex/$file" "$TARGET_DIR/api/blackbox-ai/convex/"
        echo -e "${GREEN}✅ Copied: convex/$file${NC}"
    else
        echo -e "${RED}❌ Missing: convex/$file${NC}"
    fi
done

# Copy configuration files
echo -e "\n${YELLOW}🔧 Copying configuration files...${NC}"
if [ -f "$SOURCE_DIR/.env.example" ]; then
    cp "$SOURCE_DIR/.env.example" "$TARGET_DIR/api/blackbox-ai/"
    echo -e "${GREEN}✅ Copied: .env.example${NC}"
fi

if [ -f "$SOURCE_DIR/package.json" ]; then
    # Create simplified package.json with only essential dependencies
    cat > "$TARGET_DIR/api/blackbox-ai/package.json" << EOF
{
  "name": "circular-blackbox-ai-integration",
  "version": "1.0.0",
  "description": "BlackBox AI integration for Circular project",
  "main": "index.ts",
  "dependencies": {
    "@octokit/rest": "^20.0.2",
    "axios": "^1.6.2",
    "convex": "^1.14.1",
    "zod": "^3.22.4"
  },
  "scripts": {
    "dev": "convex dev",
    "build": "convex deploy"
  }
}
EOF
    echo -e "${GREEN}✅ Created: simplified package.json${NC}"
fi

# Create integration wrapper
echo -e "\n${YELLOW}🔨 Creating integration wrapper...${NC}"
cat > "$TARGET_DIR/api/blackbox-ai/index.ts" << 'EOF'
// BlackBox AI Integration Wrapper for Circular/Public
import { ConvexHttpClient } from "convex/browser";

export interface TicketData {
  title: string;
  description: string;
  repositoryUrl: string;
  priority?: "low" | "medium" | "high" | "critical";
}

export interface RepoData {
  owner: string;
  name: string;
  accessToken: string;
  defaultBranch?: string;
}

export class BlackBoxAIIntegration {
  private static client: ConvexHttpClient;

  static initialize(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  static async processTicket(ticketData: TicketData, repoData: RepoData) {
    try {
      // Create user and repo if not exists
      const userRepo = await this.client.mutation("api:createUserWithRepo", {
        userData: {
          email: "integration@circular.com",
          name: "Circular Integration"
        },
        repositoryData: repoData
      });

      // Create and process ticket
      const ticket = await this.client.mutation("api:createAndProcessTicket", {
        userId: userRepo.user._id,
        repositoryId: userRepo.repository._id,
        ticketData,
        autoProcess: true
      });

      return ticket;
    } catch (error) {
      console.error("BlackBox AI processing failed:", error);
      throw error;
    }
  }

  static async createPullRequest(taskId: string, userId: string, options?: {
    title?: string;
    description?: string;
  }) {
    try {
      return await this.client.action("api:createTaskPullRequest", {
        taskId,
        userId,
        ...options
      });
    } catch (error) {
      console.error("PR creation failed:", error);
      throw error;
    }
  }

  static async getTaskStatus(taskId: string) {
    try {
      return await this.client.query("tasks:getTask", { taskId });
    } catch (error) {
      console.error("Task status check failed:", error);
      throw error;
    }
  }
}

// Export types
export * from './types/index';

// Export for direct access if needed
export { api } from './convex/_generated/api';
EOF

echo -e "${GREEN}✅ Created: integration wrapper${NC}"

# Create types file
echo -e "\n${YELLOW}📝 Creating TypeScript definitions...${NC}"
cat > "$TARGET_DIR/api/blackbox-ai/types/index.ts" << 'EOF'
export interface User {
  _id: string;
  email: string;
  name: string;
  githubUsername?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Repository {
  _id: string;
  userId: string;
  owner: string;
  name: string;
  fullName: string;
  accessToken: string;
  defaultBranch: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Ticket {
  _id: string;
  userId: string;
  repositoryId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "processing" | "completed" | "failed";
  assignedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DevelopmentTask {
  _id: string;
  ticketId: string;
  repositoryId: string;
  userId: string;
  status: "queued" | "analyzing" | "generating" | "committing" | "completed" | "failed";
  branchName?: string;
  commitSha?: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  errorMessage?: string;
  blackboxRequestId?: string;
  startedAt: number;
  completedAt?: number;
}

export interface FileChange {
  path: string;
  content: string;
  action: "create" | "update" | "delete";
}

export interface ProcessingResult {
  ticket: Ticket;
  task: DevelopmentTask;
  success: boolean;
  error?: string;
}
EOF

echo -e "${GREEN}✅ Created: TypeScript definitions${NC}"

# Create usage example
echo -e "\n${YELLOW}📖 Creating usage example...${NC}"
cat > "$TARGET_DIR/api/blackbox-ai/example.ts" << 'EOF'
// Example usage of BlackBox AI Integration in Circular/Public
import { BlackBoxAIIntegration } from './index';

async function example() {
  // Initialize the integration
  BlackBoxAIIntegration.initialize(process.env.CONVEX_URL || 'http://localhost:3210');

  // Process a development ticket
  try {
    const result = await BlackBoxAIIntegration.processTicket(
      {
        title: "Add user authentication to Circular",
        description: "Implement JWT-based authentication with login/logout functionality",
        repositoryUrl: "https://github.com/funfake/circular",
        priority: "high"
      },
      {
        owner: "funfake",
        name: "circular", 
        accessToken: "ghp_your_github_token",
        defaultBranch: "main"
      }
    );

    console.log("Ticket processing started:", result.ticket._id);
    console.log("Task ID:", result.task._id);

    // Poll for completion
    let task = result.task;
    while (task.status !== "completed" && task.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      task = await BlackBoxAIIntegration.getTaskStatus(task._id);
      console.log("Task status:", task.status);
    }

    if (task.status === "completed") {
      // Create pull request
      const pr = await BlackBoxAIIntegration.createPullRequest(
        task._id,
        result.ticket.userId,
        {
          title: "🤖 AI-Generated: Add User Authentication",
          description: "This PR was generated by BlackBox AI based on the development ticket."
        }
      );

      console.log("Pull request created:", pr.pullRequestUrl);
    } else {
      console.error("Task failed:", task.errorMessage);
    }

  } catch (error) {
    console.error("Integration failed:", error);
  }
}

// Export for use in other parts of the application
export { example };
EOF

echo -e "${GREEN}✅ Created: usage example${NC}"

# Create README for the integration
echo -e "\n${YELLOW}📚 Creating integration README...${NC}"
cat > "$TARGET_DIR/api/blackbox-ai/README.md" << 'EOF'
# BlackBox AI Integration

This folder contains the BlackBox AI Ticket Development System integration for the Circular project.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

3. Initialize Convex:
```bash
npx convex dev --configure
```

## Usage

```typescript
import { BlackBoxAIIntegration } from './api/blackbox-ai';

// Initialize
BlackBoxAIIntegration.initialize(process.env.CONVEX_URL);

// Process ticket
const result = await BlackBoxAIIntegration.processTicket(ticketData, repoData);

// Create PR
const pr = await BlackBoxAIIntegration.createPullRequest(result.task._id, userId);
```

## API Reference

- `BlackBoxAIIntegration.processTicket()` - Process development ticket with AI
- `BlackBoxAIIntegration.createPullRequest()` - Create GitHub pull request
- `BlackBoxAIIntegration.getTaskStatus()` - Check task processing status

## Files

- `index.ts` - Main integration wrapper
- `convex/` - Backend functions (Convex)
- `types/` - TypeScript definitions
- `example.ts` - Usage examples
EOF

echo -e "${GREEN}✅ Created: integration README${NC}"

# Create environment template
cat > "$TARGET_DIR/api/blackbox-ai/.env.example" << 'EOF'
# BlackBox AI Integration Configuration

# Convex Configuration
CONVEX_DEPLOYMENT=dev:your-deployment-name

# BlackBox AI Configuration  
BLACKBOX_API_KEY=sk-your-blackbox-api-key
BLACKBOX_API_BASE_URL=https://api.blackbox.ai/v1

# GitHub Configuration (optional - users can provide their own)
GITHUB_API_URL=https://api.github.com
EOF

echo -e "\n${GREEN}🎉 Migration completed successfully!${NC}"
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo "1. cd $TARGET_DIR/api/blackbox-ai"
echo "2. npm install"
echo "3. cp .env.example .env.local && edit .env.local"
echo "4. npx convex dev --configure"
echo "5. Test integration with example.ts"
echo -e "\n${YELLOW}⚠️  Remember to:${NC}"
echo "- Update import paths if needed"
echo "- Add error handling for your use case"
echo "- Test all functions before production use"
echo "- Set up proper monitoring and logging"

echo -e "\n${GREEN}✅ Integration ready at: $TARGET_DIR/api/blackbox-ai/${NC}"
