import {
  UserService,
  RepositoryService,
  TicketService,
  DevelopmentService,
  GitHubService,
  BlackBoxAIService,
  NotificationService
} from '../domain/services/index.js';
import {
  User,
  Repository,
  Ticket,
  DevelopmentTask,
  TaskStatus,
  TicketStatus
} from '../domain/entities/index.js';

// Create User Use Case
export class CreateUserUseCase {
  constructor(private userService: UserService) {}

  async execute(userData: {
    email: string;
    name: string;
    githubUsername?: string;
  }): Promise<User> {
    return await this.userService.createUser(userData);
  }
}

// Add Repository Use Case
export class AddRepositoryUseCase {
  constructor(
    private repositoryService: RepositoryService,
    private githubService: GitHubService
  ) {}

  async execute(userId: string, repositoryData: {
    owner: string;
    name: string;
    accessToken: string;
    defaultBranch?: string;
  }): Promise<Repository> {
    // Validate GitHub repository access
    const isValid = await this.githubService.validateRepository(
      repositoryData.owner,
      repositoryData.name,
      repositoryData.accessToken
    );

    if (!isValid) {
      throw new Error('Invalid GitHub repository or access token');
    }

    return await this.repositoryService.addRepository(userId, repositoryData);
  }
}

// Create Ticket Use Case
export class CreateTicketUseCase {
  constructor(
    private ticketService: TicketService,
    private repositoryService: RepositoryService
  ) {}

  async execute(userId: string, ticketData: {
    repositoryId: string;
    title: string;
    description: string;
    priority?: string;
  }): Promise<Ticket> {
    // Validate that the user owns the repository
    const hasAccess = await this.repositoryService.validateRepositoryAccess(
      ticketData.repositoryId,
      userId
    );

    if (!hasAccess) {
      throw new Error('User does not have access to this repository');
    }

    return await this.ticketService.createTicket(userId, ticketData);
  }
}

// Process Ticket Use Case - Main workflow
export class ProcessTicketUseCase {
  constructor(
    private ticketService: TicketService,
    private repositoryService: RepositoryService,
    private developmentService: DevelopmentService,
    private githubService: GitHubService,
    private blackboxService: BlackBoxAIService,
    private notificationService: NotificationService
  ) {}

  async execute(ticketId: string, userId?: string): Promise<DevelopmentTask> {
    // Get ticket and validate access
    const ticket = await this.ticketService.getTicketById(ticketId);
    
    if (userId && ticket.userId !== userId) {
      throw new Error('User does not have access to this ticket');
    }

    // Check if ticket is already being processed
    if (ticket.status === TicketStatus.PROCESSING) {
      throw new Error('Ticket is already being processed');
    }

    // Start processing
    const task = await this.developmentService.processTicket(ticketId);
    
    // Run the development workflow asynchronously
    this.runDevelopmentWorkflow(task.id).catch(async (error) => {
      console.error(`Development workflow failed for task ${task.id}:`, error);
      await this.notificationService.notifyTaskFailed(
        ticket.userId,
        task.id,
        error.message
      );
    });

    return task;
  }

  private async runDevelopmentWorkflow(taskId: string): Promise<void> {
    let task = await this.developmentService.getTaskStatus(taskId);
    const ticket = await this.ticketService.getTicketById(task.ticketId);
    const repository = await this.repositoryService.getRepositoryById(task.repositoryId);

    try {
      // Step 1: Get repository context
      task.status = TaskStatus.ANALYZING;
      // Update task status in repository here

      const repositoryContext = await this.githubService.getRepositoryContext(repository);

      // Step 2: Generate code with BlackBox AI
      task.status = TaskStatus.GENERATING;
      // Update task status in repository here

      const blackboxResponse = await this.blackboxService.generateCode({
        repositoryContext,
        ticketDescription: ticket.description,
        ticketTitle: ticket.title
      });

      if (!blackboxResponse.success) {
        throw new Error(`BlackBox AI failed: ${blackboxResponse.error}`);
      }

      // Step 3: Create branch and commit changes
      task.status = TaskStatus.COMMITTING;
      // Update task status in repository here

      const branchName = blackboxResponse.generatedCode.branchName || 
        `feature/ticket-${ticket.id}-${Date.now()}`;

      await this.githubService.createBranch(repository, branchName);

      const commit = await this.githubService.commitChanges(
        repository,
        branchName,
        blackboxResponse.generatedCode.files,
        blackboxResponse.generatedCode.commitMessage
      );

      // Step 4: Complete the task
      task.status = TaskStatus.COMPLETED;
      task.branchName = branchName;
      task.commitSha = commit.sha;
      task.completedAt = new Date();
      // Update task in repository here

      // Update ticket status
      await this.ticketService.updateTicket(ticket.id, {
        status: TicketStatus.COMPLETED,
        completedAt: new Date()
      });

      // Notify user of completion
      await this.notificationService.notifyTaskCompleted(ticket.userId, task.id, true);

    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Update task in repository here

      // Update ticket status
      await this.ticketService.updateTicket(ticket.id, {
        status: TicketStatus.FAILED
      });

      throw error;
    }
  }
}

// Get User Tasks Use Case
export class GetUserTasksUseCase {
  constructor(private developmentService: DevelopmentService) {}

  async execute(userId: string): Promise<DevelopmentTask[]> {
    return await this.developmentService.getUserTasks(userId);
  }
}

// Get User Repositories Use Case
export class GetUserRepositoriesUseCase {
  constructor(private repositoryService: RepositoryService) {}

  async execute(userId: string): Promise<Repository[]> {
    return await this.repositoryService.getUserRepositories(userId);
  }
}

// Get User Tickets Use Case
export class GetUserTicketsUseCase {
  constructor(private ticketService: TicketService) {}

  async execute(userId: string): Promise<Ticket[]> {
    return await this.ticketService.getUserTickets(userId);
  }
}

// Retry Failed Task Use Case
export class RetryFailedTaskUseCase {
  constructor(
    private developmentService: DevelopmentService,
    private ticketService: TicketService
  ) {}

  async execute(taskId: string, userId?: string): Promise<DevelopmentTask> {
    const task = await this.developmentService.getTaskStatus(taskId);
    
    if (userId) {
      const ticket = await this.ticketService.getTicketById(task.ticketId);
      if (ticket.userId !== userId) {
        throw new Error('User does not have access to this task');
      }
    }

    if (task.status !== TaskStatus.FAILED) {
      throw new Error('Task is not in failed state');
    }

    return await this.developmentService.retryFailedTask(taskId);
  }
}
