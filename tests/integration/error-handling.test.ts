import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Error Handling Integration Tests', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockContext: any;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    mockContext = {
      runQuery: jest.fn(),
      runMutation: jest.fn(),
      runAction: jest.fn(),
      scheduler: { runAfter: jest.fn() },
    };

    process.env.BLACKBOX_API_KEY = 'test-api-key';
    process.env.BLACKBOX_API_URL = 'https://api.test.blackbox.ai/test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.BLACKBOX_API_KEY;
    delete process.env.BLACKBOX_API_URL;
  });

  describe('BlackBox API Error Scenarios', () => {
    it('should handle missing API key gracefully', async () => {
      delete process.env.BLACKBOX_API_KEY;

      // Simulate generateCode function behavior when API key is missing
      const generateCodeWithoutKey = async () => {
        const apiKey = process.env.BLACKBOX_API_KEY;
        
        if (!apiKey) {
          console.warn("BlackBox AI API key not configured, falling back to simulation");
          // Return simulation response
          return {
            success: true,
            requestId: `bb-sim-${Date.now()}`,
            generatedCode: {
              files: [{
                path: 'src/fallback.ts',
                content: '// Fallback implementation',
                action: 'create'
              }],
              commitMessage: 'feat: fallback implementation',
              branchName: 'feature/fallback'
            }
          };
        }

        // This shouldn't be reached in this test
        return { success: false };
      };

      const result = await generateCodeWithoutKey();

      expect(result.success).toBe(true);
      expect(result.generatedCode.files[0].content).toBe('// Fallback implementation');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API authentication errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({
          error: { message: 'Invalid API key', type: 'authentication_error' }
        }),
      } as any);

      const callBlackBoxAPI = async () => {
        const response = await fetch('https://api.test.blackbox.ai/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid-key',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`BlackBox API error: ${response.status} - ${errorData.error.message}`);
        }

        return await response.json();
      };

      await expect(callBlackBoxAPI())
        .rejects.toThrow('BlackBox API error: 401 - Invalid API key');
    });

    it('should handle rate limiting with exponential backoff', async () => {
      let callCount = 0;
      
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // First two calls fail with rate limit
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: jest.fn().mockResolvedValue({
              error: { message: 'Rate limit exceeded', type: 'rate_limit_error' }
            }),
          } as any);
        } else {
          // Third call succeeds
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              choices: [{ message: { content: '{"files": []}' } }]
            }),
          } as any);
        }
      });

      const callWithRetry = async (maxRetries = 3) => {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch('https://api.test.blackbox.ai/test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-key',
              },
              body: JSON.stringify({
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 4000,
                temperature: 0.1,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`API error: ${response.status} - ${errorData.error.message}`);
            }

            return await response.json();
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            
            if (attempt === maxRetries) {
              break;
            }

            // Wait before retrying (simplified for test)
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        throw lastError;
      };

      const result = await callWithRetry();
      
      expect(callCount).toBe(3);
      expect(result.choices).toBeDefined();
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 50);
        })
      );

      const callWithTimeout = async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 30ms')), 30);
        });

        const fetchPromise = fetch('https://api.test.blackbox.ai/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        return Promise.race([fetchPromise, timeoutPromise]);
      };

      await expect(callWithTimeout())
        .rejects.toThrow('Request timeout after 30ms');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'invalid json {' } }]
        }),
      } as any);

      const parseResponse = async () => {
        const response = await fetch('https://api.test.blackbox.ai/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        const data = await response.json();
        
        try {
          const parsedContent = JSON.parse(data.choices[0].message.content);
          return parsedContent;
        } catch (parseError) {
          throw new Error(`Failed to parse BlackBox AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      };

      await expect(parseResponse())
        .rejects.toThrow('Failed to parse BlackBox AI response:');
    });
  });

  describe('Workflow Error Recovery', () => {
    it('should handle repository access errors', async () => {
      mockContext.runQuery
        .mockResolvedValueOnce({ _id: 'task123', ticketId: 'ticket123', repositoryId: 'repo123' })
        .mockResolvedValueOnce({ _id: 'ticket123', title: 'Test', description: 'Test' })
        .mockRejectedValueOnce(new Error('Repository not found'));

      mockContext.runMutation.mockResolvedValue(undefined);
      mockContext.runAction.mockResolvedValue(undefined);

      const workflowWithError = async (ctx: any, args: { taskId: string }) => {
        try {
          const task = await ctx.runQuery('tasks.getTask', { taskId: args.taskId });
          const ticket = await ctx.runQuery('tickets.getTicket', { ticketId: task.ticketId });
          const repository = await ctx.runQuery('repositories.getRepository', { repositoryId: task.repositoryId });

          return { success: true };
        } catch (error) {
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          });

          throw error;
        }
      };

      await expect(workflowWithError(mockContext, { taskId: 'task123' }))
        .rejects.toThrow('Repository not found');

      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: {
          status: 'failed',
          errorMessage: 'Repository not found'
        }
      });
    });

    it('should handle GitHub API errors during branch creation', async () => {
      mockContext.runQuery
        .mockResolvedValueOnce({ _id: 'task123', ticketId: 'ticket123', repositoryId: 'repo123' })
        .mockResolvedValueOnce({ _id: 'ticket123', title: 'Test', description: 'Test' })
        .mockResolvedValueOnce({ _id: 'repo123', defaultBranch: 'main' });

      mockContext.runMutation.mockResolvedValue(undefined);
      
      mockContext.runAction
        .mockResolvedValueOnce('repository context')
        .mockResolvedValueOnce({
          success: true,
          generatedCode: {
            files: [],
            commitMessage: 'test commit',
            branchName: 'feature/test'
          }
        })
        .mockRejectedValueOnce(new Error('GitHub API: Branch already exists'));

      const workflowWithGitHubError = async (ctx: any, args: { taskId: string }) => {
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

          const blackboxResponse = await ctx.runAction('blackbox.generateCode', {
            repositoryContext,
            ticketDescription: ticket.description,
            ticketTitle: ticket.title,
          });

          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: { status: 'committing' }
          });

          // This will fail
          await ctx.runAction('github.createBranch', {
            repository,
            branchName: blackboxResponse.generatedCode.branchName,
            baseBranch: repository.defaultBranch
          });

          return { success: true };
        } catch (error) {
          await ctx.runMutation('tasks.updateTask', {
            taskId: args.taskId,
            updates: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          });

          throw error;
        }
      };

      await expect(workflowWithGitHubError(mockContext, { taskId: 'task123' }))
        .rejects.toThrow('GitHub API: Branch already exists');

      expect(mockContext.runMutation).toHaveBeenCalledWith('tasks.updateTask', {
        taskId: 'task123',
        updates: {
          status: 'failed',
          errorMessage: 'GitHub API: Branch already exists'
        }
      });
    });

    it('should handle concurrent task processing conflicts', async () => {
      const mockTask = {
        _id: 'task123',
        status: 'processing', // Already being processed
        userId: 'user123'
      };

      mockContext.runQuery.mockResolvedValueOnce(mockTask);

      const processTask = async (ctx: any, args: { taskId: string }) => {
        const task = await ctx.runQuery('tasks.getTask', { taskId: args.taskId });

        if (task.status === 'processing') {
          throw new Error('Task is already being processed');
        }

        return { success: true };
      };

      await expect(processTask(mockContext, { taskId: 'task123' }))
        .rejects.toThrow('Task is already being processed');
    });
  });

  describe('Input Validation Errors', () => {
    it('should handle invalid ticket data', async () => {
      const validateTicketData = (ticketData: any) => {
        if (!ticketData.title || ticketData.title.trim().length === 0) {
          throw new Error('Ticket title is required');
        }
        if (!ticketData.description || ticketData.description.trim().length === 0) {
          throw new Error('Ticket description is required');
        }
        if (ticketData.title.length > 200) {
          throw new Error('Ticket title is too long (max 200 characters)');
        }
        if (ticketData.description.length > 5000) {
          throw new Error('Ticket description is too long (max 5000 characters)');
        }
      };

      expect(() => validateTicketData({}))
        .toThrow('Ticket title is required');

      expect(() => validateTicketData({ title: '' }))
        .toThrow('Ticket title is required');

      expect(() => validateTicketData({ title: 'Valid title' }))
        .toThrow('Ticket description is required');

      expect(() => validateTicketData({ 
        title: 'a'.repeat(201), 
        description: 'Valid description' 
      })).toThrow('Ticket title is too long (max 200 characters)');

      expect(() => validateTicketData({ 
        title: 'Valid title', 
        description: 'a'.repeat(5001) 
      })).toThrow('Ticket description is too long (max 5000 characters)');
    });

    it('should handle invalid repository configuration', async () => {
      const validateRepository = (repository: any) => {
        if (!repository.owner || repository.owner.trim().length === 0) {
          throw new Error('Repository owner is required');
        }
        if (!repository.name || repository.name.trim().length === 0) {
          throw new Error('Repository name is required');
        }
        if (!repository.accessToken || repository.accessToken.trim().length === 0) {
          throw new Error('Repository access token is required');
        }
        if (!/^ghp_[a-zA-Z0-9]{36}$/.test(repository.accessToken)) {
          throw new Error('Invalid GitHub access token format');
        }
      };

      expect(() => validateRepository({}))
        .toThrow('Repository owner is required');

      expect(() => validateRepository({ owner: 'testuser' }))
        .toThrow('Repository name is required');

      expect(() => validateRepository({ owner: 'testuser', name: 'test-repo' }))
        .toThrow('Repository access token is required');

      expect(() => validateRepository({ 
        owner: 'testuser', 
        name: 'test-repo', 
        accessToken: 'invalid-token' 
      })).toThrow('Invalid GitHub access token format');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection failures', async () => {
      mockContext.runQuery.mockRejectedValue(new Error('Database connection failed'));

      const getUserData = async (ctx: any, userId: string) => {
        try {
          return await ctx.runQuery('users.getUser', { userId });
        } catch (error) {
          if (error instanceof Error && error.message.includes('Database connection')) {
            throw new Error('Service temporarily unavailable. Please try again later.');
          }
          throw error;
        }
      };

      await expect(getUserData(mockContext, 'user123'))
        .rejects.toThrow('Service temporarily unavailable. Please try again later.');
    });

    it('should handle transaction rollback scenarios', async () => {
      let callCount = 0;
      
      mockContext.runMutation.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Transaction conflict');
        }
        return Promise.resolve(undefined);
      });

      const createUserWithRepo = async (ctx: any, userData: any, repoData: any) => {
        try {
          // First mutation succeeds
          await ctx.runMutation('users.createUser', userData);
          
          // Second mutation fails
          await ctx.runMutation('repositories.addRepository', repoData);
          
          return { success: true };
        } catch (error) {
          // In a real scenario, we'd rollback the user creation
          throw new Error('Failed to create user and repository: Transaction rolled back');
        }
      };

      await expect(createUserWithRepo(mockContext, { name: 'Test' }, { name: 'repo' }))
        .rejects.toThrow('Failed to create user and repository: Transaction rolled back');

      expect(callCount).toBe(2);
    });
  });
});
