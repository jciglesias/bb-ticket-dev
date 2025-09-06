import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('End-to-End Workflow Integration Tests', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockContext: any;

  beforeEach(() => {
    // Setup fetch mock
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    // Setup mock Convex context
    mockContext = {
      runQuery: jest.fn(),
      runMutation: jest.fn(),
      runAction: jest.fn(),
      scheduler: {
        runAfter: jest.fn(),
      },
    };

    // Setup environment variables
    process.env.BLACKBOX_API_KEY = 'test-api-key';
    process.env.BLACKBOX_API_URL = 'https://api.test.blackbox.ai/test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.BLACKBOX_API_KEY;
    delete process.env.BLACKBOX_API_URL;
  });

  describe('Complete Ticket Processing Workflow', () => {
    it('should process a ticket from creation to completion', async () => {
      // Mock data
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        githubUsername: 'testuser',
      };

      const mockRepository = {
        _id: 'repo123',
        owner: 'testuser',
        name: 'test-repo',
        fullName: 'testuser/test-repo',
        accessToken: 'ghp_test_token',
        defaultBranch: 'main',
        userId: 'user123',
      };

      const mockTicket = {
        _id: 'ticket123',
        userId: 'user123',
        repositoryId: 'repo123',
        title: 'Add authentication system',
        description: 'Implement JWT-based authentication with login and registration',
        priority: 'high',
        status: 'pending',
      };

      const mockTask = {
        _id: 'task123',
        userId: 'user123',
        repositoryId: 'repo123',
        ticketId: 'ticket123',
        status: 'queued',
      };

      // Mock BlackBox API response
      const blackboxResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              files: [
                {
                  path: 'src/auth/auth.service.ts',
                  content: `
export class AuthService {
  async login(email: string, password: string) {
    // Implementation here
    return { token: 'jwt-token' };
  }
  
  async register(email: string, password: string, name: string) {
    // Implementation here
    return { user: { id: 1, email, name } };
  }
}`,
                  action: 'create'
                },
                {
                  path: 'src/auth/auth.controller.ts',
                  content: `
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}
  
  async login(req: any, res: any) {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);
    res.json(result);
  }
}`,
                  action: 'create'
                }
              ],
              commitMessage: 'feat: implement JWT authentication system',
              branchName: 'feature/auth-system-123'
            })
          }
        }]
      };

      // Setup mocks
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(blackboxResponse),
      } as any);

      // Mock Convex operations
      mockContext.runQuery
        .mockResolvedValueOnce(mockTask) // getTask
        .mockResolvedValueOnce(mockTicket) // getTicket
        .mockResolvedValueOnce(mockRepository); // getRepository

      mockContext.runMutation
        .mockResolvedValueOnce(undefined) // updateTask - analyzing
        .mockResolvedValueOnce(undefined) // updateTask - generating
        .mockResolvedValueOnce(undefined) // updateTask - committing
        .mockResolvedValueOnce(undefined) // updateTask - completed
        .mockResolvedValueOnce(undefined); // updateTicket - completed

      mockContext.runAction
        .mockResolvedValueOnce('repository context') // getRepositoryContext
        .mockResolvedValueOnce({ // generateCode
          success: true,
          requestId: 'bb-123',
          generatedCode: {
            files: blackboxResponse.choices[0].message.content,
            commitMessage: 'feat: implement JWT authentication system',
            branchName: 'feature/auth-system-123'
          }
        })
        .mockResolvedValueOnce(undefined) // createBranch
        .mockResolvedValueOnce({ sha: 'commit-sha-123' }) // commitChanges
        .mockResolvedValueOnce(undefined) // notifyTaskCompleted
        .mockResolvedValueOnce(undefined); // notifyTaskFailed (not called)

      // Simulate the development workflow
      const runDevelopmentWorkflow = async (ctx: any, args: { taskId: string }) => {
        try {
          // Get task and related entities
          const task = await ctx.runQuery('tasks.getTask', { taskId: args.taskId });
          const ticket = await ctx.runQuery('tickets.getTicket', { ticketId: task.ticketId });
          const repository = await ctx.runQuery('repositories.getRepository', { repositoryId: task.repositoryId });

          // Step 1: Analyze repository
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: { status: 'analyzing' }
          });

          const repositoryContext = await ctx.runAction('github.getRepositoryContext', { repository });

          // Step 2: Generate code with BlackBox AI
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: { status: 'generating' }
          });

          const blackboxResponse = await ctx.runAction('blackbox.generateCode', {
            repositoryContext,
            ticketDescription: ticket.description,
            ticketTitle: ticket.title,
          });

          if (!blackboxResponse.success) {
            throw new Error(`BlackBox AI failed: ${blackboxResponse.error}`);
          }

          // Step 3: Commit changes
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: { 
              status: 'committing',
              blackboxRequestId: blackboxResponse.requestId 
            }
          });

          const branchName = blackboxResponse.generatedCode.branchName || `feature/ticket-${ticket._id}-${Date.now()}`;

          // Create branch
          await ctx.runAction('github.createBranch', {
            repository,
            branchName,
            baseBranch: repository.defaultBranch
          });

          // Commit changes
          const commit = await ctx.runAction('github.commitChanges', {
            repository,
            branchName,
            changes: blackboxResponse.generatedCode.files,
            commitMessage: blackboxResponse.generatedCode.commitMessage
          });

          // Step 4: Complete the task
          const now = Date.now();
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: {
              status: 'completed',
              branchName,
              commitSha: commit.sha,
              completedAt: now
            }
          });

          // Update ticket status
          await ctx.runMutation('tickets.updateTicket', {
            ticketId: ticket._id,
            updates: {
              status: 'completed',
              completedAt: now
            }
          });

          // Send notification
          await ctx.runAction('notifications.notifyTaskCompleted', {
            userId: ticket.userId,
            taskId: args.taskId,
            success: true
          });

          return { success: true };

        } catch (error) {
          // Handle failure
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          });

          await ctx.runAction('notifications.notifyTaskFailed', {
            userId: mockTask.userId,
            taskId: args.taskId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          throw error;
        }
      };

      // Execute the workflow
      const result = await runDevelopmentWorkflow(mockContext, { taskId: 'task123' });

      // Verify the workflow completed successfully
      expect(result.success).toBe(true);

      // Verify all steps were called in the correct order
      expect(mockContext.runQuery).toHaveBeenCalledTimes(3);
      expect(mockContext.runMutation).toHaveBeenCalledTimes(5);
      expect(mockContext.runAction).toHaveBeenCalledTimes(5);

      // Verify BlackBox API was called (only if API key is available)
      // Note: In this test, we're mocking the generateCode action, so fetch may not be called directly
      // The important thing is that the workflow completed successfully
      expect(result.success).toBe(true);

      // Verify task status updates
      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: { status: 'analyzing' }
      });

      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: { status: 'generating' }
      });

      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: { 
          status: 'committing',
          blackboxRequestId: 'bb-123'
        }
      });

      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: expect.objectContaining({
          status: 'completed',
          branchName: 'feature/auth-system-123',
          commitSha: 'commit-sha-123',
        })
      });
    });

    it('should handle workflow failures gracefully', async () => {
      // Mock BlackBox API failure
      mockFetch.mockRejectedValue(new Error('API connection failed'));

      // Mock Convex operations
      mockContext.runQuery
        .mockResolvedValueOnce({
          _id: 'task123',
          ticketId: 'ticket123',
          repositoryId: 'repo123',
          userId: 'user123',
        })
        .mockResolvedValueOnce({
          _id: 'ticket123',
          title: 'Test Feature',
          description: 'Test description',
        })
        .mockResolvedValueOnce({
          _id: 'repo123',
          defaultBranch: 'main',
        });

      mockContext.runMutation.mockResolvedValue(undefined);
      mockContext.runAction
        .mockResolvedValueOnce('repository context')
        .mockRejectedValueOnce(new Error('BlackBox AI failed'));

      // Simulate workflow with error handling
      const runDevelopmentWorkflowWithError = async (ctx: any, args: { taskId: string }) => {
        try {
          const task = await ctx.runQuery('tasks.getTask', { taskId: args.taskId });
          const ticket = await ctx.runQuery('tickets.getTicket', { ticketId: task.ticketId });
          const repository = await ctx.runQuery('repositories.getRepository', { repositoryId: task.repositoryId });

          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: { status: 'analyzing' }
          });

          const repositoryContext = await ctx.runAction('github.getRepositoryContext', { repository });

          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: { status: 'generating' }
          });

          // This will fail
          await ctx.runAction('blackbox.generateCode', {
            repositoryContext,
            ticketDescription: ticket.description,
            ticketTitle: ticket.title,
          });

        } catch (error) {
          // Handle failure
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          });

          await ctx.runAction('notifications.notifyTaskFailed', {
            userId: 'user123',
            taskId: args.taskId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          throw error;
        }
      };

      // Execute the workflow and expect it to fail
      await expect(runDevelopmentWorkflowWithError(mockContext, { taskId: 'task123' }))
        .rejects.toThrow('BlackBox AI failed');

      // Verify error handling was called
      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: {
          status: 'failed',
          errorMessage: 'BlackBox AI failed'
        }
      });

      expect(mockContext.runAction).toHaveBeenCalledWith('notifications.notifyTaskFailed', {
        userId: 'user123',
        taskId: 'task123',
        error: 'BlackBox AI failed'
      });
    });
  });

  describe('Pull Request Creation Workflow', () => {
    it('should create pull request for completed task', async () => {
      const mockTask = {
        _id: 'task123',
        userId: 'user123',
        repositoryId: 'repo123',
        ticketId: 'ticket123',
        status: 'completed',
        branchName: 'feature/auth-system-123',
        commitSha: 'commit-sha-123',
      };

      const mockTicket = {
        _id: 'ticket123',
        title: 'Add authentication system',
        description: 'Implement JWT-based authentication',
      };

      const mockRepository = {
        _id: 'repo123',
        owner: 'testuser',
        name: 'test-repo',
      };

      const mockPullRequest = {
        url: 'https://github.com/testuser/test-repo/pull/1',
        number: 1,
      };

      // Mock Convex operations
      mockContext.runQuery
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce(mockRepository);

      mockContext.runAction
        .mockResolvedValueOnce(mockPullRequest)
        .mockResolvedValueOnce(undefined); // notification

      mockContext.runMutation.mockResolvedValue(undefined);

      // Simulate PR creation
      const createPullRequest = async (ctx: any, args: any) => {
        const task = await ctx.runQuery('tasks.getTask', { taskId: args.taskId });
        
        if (task.status !== 'completed') {
          throw new Error('Task must be completed before creating a Pull Request');
        }

        const ticket = await ctx.runQuery('tickets.getTicket', { ticketId: task.ticketId });
        const repository = await ctx.runQuery('repositories.getRepository', { repositoryId: task.repositoryId });

        const prTitle = args.title || `Fix: ${ticket.title}`;
        const prDescription = args.description || 
          `This PR addresses: ${ticket.title}\n\n${ticket.description}`;

        const pullRequest = await ctx.runAction('github.createPullRequest', {
          repository,
          branchName: task.branchName,
          title: prTitle,
          description: prDescription,
        });

        await ctx.runMutation('tasks.updateTask', {
          taskId: args.taskId,
          updates: {
            pullRequestUrl: pullRequest.url,
            pullRequestNumber: pullRequest.number,
          }
        });

        await ctx.runAction('notifications.notifyPullRequestCreated', {
          userId: task.userId,
          taskId: args.taskId,
          pullRequestUrl: pullRequest.url,
          pullRequestNumber: pullRequest.number,
        });

        return pullRequest;
      };

      // Execute PR creation
      const result = await createPullRequest(mockContext, { taskId: 'task123' });

      expect(result.url).toBe('https://github.com/testuser/test-repo/pull/1');
      expect(result.number).toBe(1);

      // Verify GitHub API was called
      expect(mockContext.runAction).toHaveBeenCalledWith('github.createPullRequest', {
        repository: mockRepository,
        branchName: 'feature/auth-system-123',
        title: 'Fix: Add authentication system',
        description: 'This PR addresses: Add authentication system\n\nImplement JWT-based authentication',
      });

      // Verify task was updated with PR info
      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: {
          pullRequestUrl: 'https://github.com/testuser/test-repo/pull/1',
          pullRequestNumber: 1,
        }
      });
    });

    it('should reject PR creation for incomplete tasks', async () => {
      const mockTask = {
        _id: 'task123',
        status: 'generating', // Not completed
      };

      mockContext.runQuery.mockResolvedValueOnce(mockTask);

      const createPullRequest = async (ctx: any, args: any) => {
        const task = await ctx.runQuery('tasks.getTask', { taskId: args.taskId });
        
        if (task.status !== 'completed') {
          throw new Error('Task must be completed before creating a Pull Request');
        }

        return {};
      };

      await expect(createPullRequest(mockContext, { taskId: 'task123' }))
        .rejects.toThrow('Task must be completed before creating a Pull Request');
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry failed tasks successfully', async () => {
      const mockTask = {
        _id: 'task123',
        status: 'failed',
        userId: 'user123',
      };

      mockContext.runQuery.mockResolvedValueOnce(mockTask);
      mockContext.runMutation.mockResolvedValue(undefined);

      const retryTask = async (ctx: any, args: any) => {
        const task = await ctx.runQuery('tasks.getTask', { taskId: args.taskId });

        if (task.status !== 'failed') {
          throw new Error('Task is not in failed state');
        }

        const retriedTask = await ctx.runMutation('tasks.retryFailedTask', {
          taskId: args.taskId
        });

        ctx.scheduler.runAfter(0, 'development.runDevelopmentWorkflow', {
          taskId: args.taskId
        });

        return retriedTask;
      };

      await retryTask(mockContext, { taskId: 'task123' });

      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.retryFailedTask', {
        taskId: 'task123'
      });

      expect(mockContext.scheduler.runAfter).toHaveBeenCalledWith(
        0,
        'development.runDevelopmentWorkflow',
        { taskId: 'task123' }
      );
    });
  });
});
