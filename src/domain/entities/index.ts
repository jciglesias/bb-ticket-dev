// User entity - represents a user of the system
export interface User {
  id: string;
  email: string;
  name: string;
  githubUsername?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Repository entity - represents a GitHub repository owned by a user
export interface Repository {
  id: string;
  userId: string; // Reference to the user who owns this repository
  owner: string; // GitHub repository owner
  name: string; // GitHub repository name
  fullName: string; // owner/name format
  accessToken: string; // GitHub access token for this repository
  defaultBranch: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Ticket entity - now belongs to a user and references a specific repo
export interface Ticket {
  id: string;
  userId: string; // Reference to the user who owns this ticket
  repositoryId: string; // Reference to the repository where this ticket should be developed
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Development Task - represents the actual work being done on a ticket
export interface DevelopmentTask {
  id: string;
  ticketId: string;
  repositoryId: string;
  userId: string;
  status: TaskStatus;
  branchName?: string;
  commitSha?: string;
  errorMessage?: string;
  blackboxRequestId?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Enums for better type safety
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TicketStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum TaskStatus {
  QUEUED = 'queued',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMMITTING = 'committing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum FileOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// Value Objects
export class GitHubRepository {
  constructor(
    public readonly owner: string,
    public readonly name: string,
    public readonly accessToken: string
  ) {
    if (!owner || !name || !accessToken) {
      throw new Error('GitHub repository requires owner, name, and access token');
    }
  }

  get fullName(): string {
    return `${this.owner}/${this.name}`;
  }
}

export class CodeChange {
  constructor(
    public readonly filePath: string,
    public readonly content: string,
    public readonly operation: FileOperation
  ) {
    if (!filePath || content === undefined) {
      throw new Error('CodeChange requires filePath and content');
    }
  }
}

export class CommitInfo {
  constructor(
    public readonly message: string,
    public readonly branch: string = 'main',
    public readonly changes: CodeChange[]
  ) {
    if (!message || !changes.length) {
      throw new Error('CommitInfo requires message and at least one change');
    }
  }
}

// BlackBox AI Request/Response interfaces
export interface BlackBoxRequest {
  repositoryContext: string;
  ticketDescription: string;
  ticketTitle: string;
  additionalInstructions?: string;
}

export interface BlackBoxResponse {
  success: boolean;
  requestId: string;
  generatedCode: {
    files: Array<{
      path: string;
      content: string;
      action: FileOperation;
    }>;
    commitMessage: string;
    branchName?: string;
  };
  error?: string;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  url: string;
  createdAt: Date;
}
