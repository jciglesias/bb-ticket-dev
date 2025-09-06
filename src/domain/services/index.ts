import { 
  User, 
  Repository, 
  Ticket, 
  DevelopmentTask, 
  BlackBoxRequest, 
  BlackBoxResponse,
  GitCommit,
  TaskStatus,
  TicketStatus 
} from '../entities/index.js';

// User Management Service
export interface UserService {
  createUser(userData: {
    email: string;
    name: string;
    githubUsername?: string;
  }): Promise<User>;
  
  getUserById(userId: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
}

// Repository Management Service
export interface RepositoryService {
  addRepository(userId: string, repositoryData: {
    owner: string;
    name: string;
    accessToken: string;
    defaultBranch?: string;
  }): Promise<Repository>;
  
  getUserRepositories(userId: string): Promise<Repository[]>;
  getRepositoryById(repositoryId: string): Promise<Repository>;
  updateRepository(repositoryId: string, updates: Partial<Repository>): Promise<Repository>;
  removeRepository(repositoryId: string): Promise<void>;
  validateRepositoryAccess(repositoryId: string, userId: string): Promise<boolean>;
}

// Ticket Management Service
export interface TicketService {
  createTicket(userId: string, ticketData: {
    repositoryId: string;
    title: string;
    description: string;
    priority?: string;
  }): Promise<Ticket>;
  
  getUserTickets(userId: string): Promise<Ticket[]>;
  getRepositoryTickets(repositoryId: string): Promise<Ticket[]>;
  getTicketById(ticketId: string): Promise<Ticket>;
  updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<Ticket>;
  deleteTicket(ticketId: string): Promise<void>;
  assignTicketForDevelopment(ticketId: string): Promise<DevelopmentTask>;
}

// Development Service - orchestrates the main workflow
export interface DevelopmentService {
  processTicket(ticketId: string): Promise<DevelopmentTask>;
  getTaskStatus(taskId: string): Promise<DevelopmentTask>;
  getUserTasks(userId: string): Promise<DevelopmentTask[]>;
  retryFailedTask(taskId: string): Promise<DevelopmentTask>;
}

// GitHub Integration Service
export interface GitHubService {
  validateRepository(owner: string, name: string, accessToken: string): Promise<boolean>;
  getRepositoryContext(repository: Repository): Promise<string>;
  createBranch(repository: Repository, branchName: string, baseBranch?: string): Promise<void>;
  commitChanges(
    repository: Repository,
    branchName: string,
    changes: Array<{
      path: string;
      content: string;
      action: 'create' | 'update' | 'delete';
    }>,
    commitMessage: string
  ): Promise<GitCommit>;
  createPullRequest(
    repository: Repository,
    branchName: string,
    title: string,
    description: string
  ): Promise<{ url: string; number: number }>;
}

// BlackBox AI Integration Service
export interface BlackBoxAIService {
  generateCode(request: BlackBoxRequest): Promise<BlackBoxResponse>;
  checkRequestStatus(requestId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: BlackBoxResponse;
  }>;
}

// Notification Service (for future extensibility)
export interface NotificationService {
  notifyTaskCompleted(userId: string, taskId: string, success: boolean): Promise<void>;
  notifyTaskFailed(userId: string, taskId: string, error: string): Promise<void>;
}
