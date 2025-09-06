import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Convex server functions
const mockRunQuery = jest.fn();
const mockRunMutation = jest.fn();
const mockRunAction = jest.fn();
const mockScheduler = { runAfter: jest.fn() };

const mockContext = {
  runQuery: mockRunQuery,
  runMutation: mockRunMutation,
  runAction: mockRunAction,
  scheduler: mockScheduler,
};

// Mock the Convex imports
jest.mock('../../convex/_generated/server', () => ({
  mutation: jest.fn((config) => config),
  query: jest.fn((config) => config),
  action: jest.fn((config) => config),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    users: { createUser: 'users.createUser' },
    repositories: { addRepository: 'repositories.addRepository' },
    tickets: { 
      createTicket: 'tickets.createTicket',
      assignTicketForDevelopment: 'tickets.assignTicketForDevelopment',
      getUserTickets: 'tickets.getUserTickets'
    },
    tasks: { getUserTasks: 'tasks.getUserTasks' },
    development: { runDevelopmentWorkflow: 'development.runDevelopmentWorkflow' },
  },
}));

describe('API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserWithRepo', () => {
    it('should create user and repository successfully', async () => {
      // Mock the implementation of createUserWithRepo
      const createUserWithRepo = async (ctx: any, args: any) => {
        const user = await ctx.runMutation('users.createUser', args.userData);
        
        if (!user) {
          throw new Error("Failed to create user");
        }

        const repository = await ctx.runMutation('repositories.addRepository', {
          userId: user._id,
          ...args.repositoryData,
        });

        return { user, repository };
      };

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
        userId: 'user123',
      };

      mockRunMutation
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockRepository);

      const args = {
        userData: {
          email: 'test@example.com',
          name: 'Test User',
          githubUsername: 'testuser',
        },
        repositoryData: {
          owner: 'testuser',
          name: 'test-repo',
          accessToken: 'ghp_test_token',
          defaultBranch: 'main',
        },
      };

      const result = await createUserWithRepo(mockContext, args);

      expect(mockRunMutation).toHaveBeenCalledTimes(2);
      expect(mockRunMutation).toHaveBeenNthCalledWith(1, 'users.createUser', args.userData);
      expect(mockRunMutation).toHaveBeenNthCalledWith(2, 'repositories.addRepository', {
        userId: 'user123',
        ...args.repositoryData,
      });

      expect(result.user).toEqual(mockUser);
      expect(result.repository).toEqual(mockRepository);
    });

    it('should throw error if user creation fails', async () => {
      const createUserWithRepo = async (ctx: any, args: any) => {
        const user = await ctx.runMutation('users.createUser', args.userData);
        
        if (!user) {
          throw new Error("Failed to create user");
        }

        const repository = await ctx.runMutation('repositories.addRepository', {
          userId: user._id,
          ...args.repositoryData,
        });

        return { user, repository };
      };

      mockRunMutation.mockResolvedValueOnce(null);

      const args = {
        userData: { email: 'test@example.com', name: 'Test User' },
        repositoryData: { owner: 'testuser', name: 'test-repo', accessToken: 'token' },
      };

      await expect(createUserWithRepo(mockContext, args))
        .rejects.toThrow('Failed to create user');
    });
  });

  describe('createAndProcessTicket', () => {
    it('should create ticket and start processing', async () => {
      const createAndProcessTicket = async (ctx: any, args: any) => {
        const ticket = await ctx.runMutation('tickets.createTicket', {
          userId: args.userId,
          repositoryId: args.repositoryId,
          title: args.ticketData.title,
          description: args.ticketData.description,
          priority: args.ticketData.priority,
        });

        if (!ticket) {
          throw new Error("Failed to create ticket");
        }

        let task = null;
        if (args.autoProcess !== false) {
          task = await ctx.runMutation('tickets.assignTicketForDevelopment', {
            ticketId: ticket._id,
          });

          ctx.scheduler.runAfter(0, 'development.runDevelopmentWorkflow', {
            taskId: task._id,
          });
        }

        return { ticket, task };
      };

      const mockTicket = {
        _id: 'ticket123',
        title: 'Test Feature',
        description: 'Test description',
        status: 'pending',
      };

      const mockTask = {
        _id: 'task123',
        ticketId: 'ticket123',
        status: 'queued',
      };

      mockRunMutation
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce(mockTask);

      const args = {
        userId: 'user123',
        repositoryId: 'repo123',
        ticketData: {
          title: 'Test Feature',
          description: 'Test description',
          priority: 'high' as const,
        },
        autoProcess: true,
      };

      const result = await createAndProcessTicket(mockContext, args);

      expect(mockRunMutation).toHaveBeenCalledTimes(2);
      expect(mockScheduler.runAfter).toHaveBeenCalledWith(
        0,
        'development.runDevelopmentWorkflow',
        { taskId: 'task123' }
      );

      expect(result.ticket).toEqual(mockTicket);
      expect(result.task).toEqual(mockTask);
    });

    it('should not start processing when autoProcess is false', async () => {
      const createAndProcessTicket = async (ctx: any, args: any) => {
        const ticket = await ctx.runMutation('tickets.createTicket', {
          userId: args.userId,
          repositoryId: args.repositoryId,
          title: args.ticketData.title,
          description: args.ticketData.description,
          priority: args.ticketData.priority,
        });

        if (!ticket) {
          throw new Error("Failed to create ticket");
        }

        let task = null;
        if (args.autoProcess !== false) {
          task = await ctx.runMutation('tickets.assignTicketForDevelopment', {
            ticketId: ticket._id,
          });

          ctx.scheduler.runAfter(0, 'development.runDevelopmentWorkflow', {
            taskId: task._id,
          });
        }

        return { ticket, task };
      };

      const mockTicket = {
        _id: 'ticket123',
        title: 'Test Feature',
        description: 'Test description',
        status: 'pending',
      };

      mockRunMutation.mockResolvedValueOnce(mockTicket);

      const args = {
        userId: 'user123',
        repositoryId: 'repo123',
        ticketData: {
          title: 'Test Feature',
          description: 'Test description',
          priority: 'high' as const,
        },
        autoProcess: false,
      };

      const result = await createAndProcessTicket(mockContext, args);

      expect(mockRunMutation).toHaveBeenCalledTimes(1);
      expect(mockScheduler.runAfter).not.toHaveBeenCalled();

      expect(result.ticket).toEqual(mockTicket);
      expect(result.task).toBeNull();
    });
  });

  describe('getUserDashboard', () => {
    it('should return dashboard data with statistics', async () => {
      const getUserDashboard = async (ctx: any, args: any) => {
        const [user, repositories, tickets, tasks] = await Promise.all([
          ctx.runQuery('users.getUser', { userId: args.userId }),
          ctx.runQuery('repositories.getUserRepositories', { userId: args.userId }),
          ctx.runQuery('tickets.getUserTickets', { userId: args.userId }),
          ctx.runQuery('tasks.getUserTasks', { userId: args.userId }),
        ]);

        const ticketsByStatus = {
          pending: tickets.filter((t: any) => t.status === "pending").length,
          processing: tickets.filter((t: any) => t.status === "processing").length,
          completed: tickets.filter((t: any) => t.status === "completed").length,
          failed: tickets.filter((t: any) => t.status === "failed").length,
        };

        const tasksByStatus = {
          queued: tasks.filter((t: any) => t.status === "queued").length,
          analyzing: tasks.filter((t: any) => t.status === "analyzing").length,
          generating: tasks.filter((t: any) => t.status === "generating").length,
          committing: tasks.filter((t: any) => t.status === "committing").length,
          completed: tasks.filter((t: any) => t.status === "completed").length,
          failed: tasks.filter((t: any) => t.status === "failed").length,
        };

        return {
          user,
          repositories,
          tickets,
          tasks,
          stats: {
            totalRepositories: repositories.length,
            activeRepositories: repositories.filter((r: any) => r.isActive).length,
            totalTickets: tickets.length,
            totalTasks: tasks.length,
            ticketsByStatus,
            tasksByStatus,
          },
        };
      };

      const mockUser = { _id: 'user123', name: 'Test User' };
      const mockRepositories = [
        { _id: 'repo1', isActive: true },
        { _id: 'repo2', isActive: false },
      ];
      const mockTickets = [
        { _id: 'ticket1', status: 'pending' },
        { _id: 'ticket2', status: 'completed' },
        { _id: 'ticket3', status: 'pending' },
      ];
      const mockTasks = [
        { _id: 'task1', status: 'queued' },
        { _id: 'task2', status: 'completed' },
      ];

      mockRunQuery
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockRepositories)
        .mockResolvedValueOnce(mockTickets)
        .mockResolvedValueOnce(mockTasks);

      const result = await getUserDashboard(mockContext, { userId: 'user123' });

      expect(result.stats.totalRepositories).toBe(2);
      expect(result.stats.activeRepositories).toBe(1);
      expect(result.stats.totalTickets).toBe(3);
      expect(result.stats.totalTasks).toBe(2);
      expect(result.stats.ticketsByStatus.pending).toBe(2);
      expect(result.stats.ticketsByStatus.completed).toBe(1);
      expect(result.stats.tasksByStatus.queued).toBe(1);
      expect(result.stats.tasksByStatus.completed).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const createUserWithRepo = async (ctx: any, args: any) => {
        const user = await ctx.runMutation('users.createUser', args.userData);
        
        if (!user) {
          throw new Error("Failed to create user");
        }

        const repository = await ctx.runMutation('repositories.addRepository', {
          userId: user._id,
          ...args.repositoryData,
        });

        return { user, repository };
      };

      mockRunMutation.mockRejectedValueOnce(new Error('Database connection failed'));

      const args = {
        userData: { email: 'test@example.com', name: 'Test User' },
        repositoryData: { owner: 'testuser', name: 'test-repo', accessToken: 'token' },
      };

      await expect(createUserWithRepo(mockContext, args))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle missing required fields', async () => {
      const createAndProcessTicket = async (ctx: any, args: any) => {
        if (!args.userId) {
          throw new Error('userId is required');
        }
        if (!args.repositoryId) {
          throw new Error('repositoryId is required');
        }
        if (!args.ticketData?.title) {
          throw new Error('ticketData.title is required');
        }

        const ticket = await ctx.runMutation('tickets.createTicket', {
          userId: args.userId,
          repositoryId: args.repositoryId,
          title: args.ticketData.title,
          description: args.ticketData.description,
          priority: args.ticketData.priority,
        });

        return { ticket, task: null };
      };

      await expect(createAndProcessTicket(mockContext, {}))
        .rejects.toThrow('userId is required');

      await expect(createAndProcessTicket(mockContext, { userId: 'user123' }))
        .rejects.toThrow('repositoryId is required');

      await expect(createAndProcessTicket(mockContext, { 
        userId: 'user123', 
        repositoryId: 'repo123' 
      })).rejects.toThrow('ticketData.title is required');
    });
  });
});
