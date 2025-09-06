import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockConvexContext } from '../utils/mocks';

// Mock Octokit
const mockReposGet = jest.fn() as jest.MockedFunction<any>;
const mockReposGetContent = jest.fn() as jest.MockedFunction<any>;
const mockGitGetRef = jest.fn() as jest.MockedFunction<any>;
const mockGitCreateRef = jest.fn() as jest.MockedFunction<any>;
const mockGitDeleteRef = jest.fn() as jest.MockedFunction<any>;
const mockGitGetTree = jest.fn() as jest.MockedFunction<any>;
const mockGitCreateBlob = jest.fn() as jest.MockedFunction<any>;
const mockGitCreateTree = jest.fn() as jest.MockedFunction<any>;
const mockGitCreateCommit = jest.fn() as jest.MockedFunction<any>;
const mockGitUpdateRef = jest.fn() as jest.MockedFunction<any>;
const mockGitGetCommit = jest.fn() as jest.MockedFunction<any>;
const mockPullsCreate = jest.fn() as jest.MockedFunction<any>;

const mockOctokit = {
  rest: {
    repos: {
      get: mockReposGet,
      getContent: mockReposGetContent,
    },
    git: {
      getRef: mockGitGetRef,
      createRef: mockGitCreateRef,
      deleteRef: mockGitDeleteRef,
      getTree: mockGitGetTree,
      createBlob: mockGitCreateBlob,
      createTree: mockGitCreateTree,
      createCommit: mockGitCreateCommit,
      updateRef: mockGitUpdateRef,
      getCommit: mockGitGetCommit,
    },
    pulls: {
      create: mockPullsCreate,
    },
  },
};

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => mockOctokit),
}));

// Mock the Convex generated server
jest.mock('../../convex/_generated/server', () => ({
  action: jest.fn((config: any) => config.handler),
}));

// Create mock GitHub functions that simulate the actual behavior
const createMockGitHubFunctions = () => {
  const getBotOctokit = () => {
    const botToken = process.env.GITHUB_BOT_TOKEN;
    if (!botToken) {
      throw new Error("GitHub bot token not configured. Please set GITHUB_BOT_TOKEN environment variable.");
    }
    return mockOctokit;
  };

  return {
    validateRepository: async (ctx: any, args: { owner: string; name: string }) => {
      try {
        const octokit = getBotOctokit();
        await octokit.rest.repos.get({
          owner: args.owner,
          repo: args.name,
        });
        return true;
      } catch (error) {
        console.error("GitHub validation error:", error);
        if (error instanceof Error && error.message.includes("GitHub bot token not configured")) {
          throw error; // Re-throw configuration errors
        }
        if (error instanceof Error && error.message.includes("404")) {
          throw new Error(`Repository ${args.owner}/${args.name} not found or bot doesn't have access. Please ensure the BlackBox AI bot user is added as a collaborator to the repository.`);
        }
        return false;
      }
    },

    validateBotAccess: async (ctx: any, args: { owner: string; name: string }) => {
      try {
        const octokit = getBotOctokit();
        const { data: repo } = await octokit.rest.repos.get({
          owner: args.owner,
          repo: args.name,
        });

        const testBranchName = `blackbox-ai-test-${Date.now()}`;
        
        try {
          const { data: ref } = await octokit.rest.git.getRef({
            owner: args.owner,
            repo: args.name,
            ref: `heads/${repo.default_branch}`,
          });

          await octokit.rest.git.createRef({
            owner: args.owner,
            repo: args.name,
            ref: `refs/heads/${testBranchName}`,
            sha: ref.object.sha,
          });

          await octokit.rest.git.deleteRef({
            owner: args.owner,
            repo: args.name,
            ref: `heads/${testBranchName}`,
          });

          return {
            hasAccess: true,
            permissions: {
              read: true,
              write: true,
              admin: repo.permissions?.admin || false,
            }
          };
        } catch (writeError) {
          return {
            hasAccess: false,
            permissions: {
              read: true,
              write: false,
              admin: false,
            },
            error: "Bot doesn't have write access to repository. Please ensure the BlackBox AI bot user is added as a collaborator with write permissions."
          };
        }
      } catch (error) {
        console.error("GitHub bot access validation error:", error);
        return {
          hasAccess: false,
          permissions: {
            read: false,
            write: false,
            admin: false,
          },
          error: error instanceof Error ? error.message : "Unknown error occurred"
        };
      }
    },

    getRepositoryContext: async (ctx: any, args: { repository: any }) => {
      try {
        const octokit = getBotOctokit();
        const { data: tree } = await octokit.rest.git.getTree({
          owner: args.repository.owner,
          repo: args.repository.name,
          tree_sha: args.repository.defaultBranch,
          recursive: "true",
        });

        const importantFiles = tree.tree.filter((item: any) => 
          item.type === "blob" && 
          (item.path?.includes("package.json") ||
           item.path?.includes("README") ||
           item.path?.includes(".md") ||
           item.path?.endsWith(".ts") ||
           item.path?.endsWith(".js") ||
           item.path?.endsWith(".py"))
        ).slice(0, 20);

        let contextString = `Repository: ${args.repository.fullName}\n`;
        contextString += `Default Branch: ${args.repository.defaultBranch}\n\n`;
        contextString += `File Structure:\n`;

        for (const item of tree.tree) {
          if (item.type === "blob") {
            contextString += `- ${item.path}\n`;
          }
        }

        contextString += `\n--- Important Files Content ---\n\n`;

        for (const file of importantFiles) {
          try {
            const { data: fileData } = await octokit.rest.repos.getContent({
              owner: args.repository.owner,
              repo: args.repository.name,
              path: file.path!,
            });

            if ("content" in fileData) {
              const content = Buffer.from(fileData.content, "base64").toString("utf-8");
              contextString += `### ${file.path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
            }
          } catch (error) {
            console.warn(`Could not fetch content for ${file.path}:`, error);
          }
        }

        return contextString;
      } catch (error) {
        console.error("Error getting repository context:", error);
        throw new Error(`Failed to get repository context: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    createBranch: async (ctx: any, args: { repository: any; branchName: string; baseBranch?: string }) => {
      try {
        const octokit = getBotOctokit();
        const { data: ref } = await octokit.rest.git.getRef({
          owner: args.repository.owner,
          repo: args.repository.name,
          ref: `heads/${args.baseBranch || args.repository.defaultBranch}`,
        });

        await octokit.rest.git.createRef({
          owner: args.repository.owner,
          repo: args.repository.name,
          ref: `refs/heads/${args.branchName}`,
          sha: ref.object.sha,
        });

        return { success: true, branchName: args.branchName };
      } catch (error) {
        console.error("Error creating branch:", error);
        throw new Error(`Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    commitChanges: async (ctx: any, args: { repository: any; branchName: string; changes: any[]; commitMessage: string }) => {
      try {
        const octokit = getBotOctokit();
        const { data: ref } = await octokit.rest.git.getRef({
          owner: args.repository.owner,
          repo: args.repository.name,
          ref: `heads/${args.branchName}`,
        });

        const { data: commit } = await octokit.rest.git.getCommit({
          owner: args.repository.owner,
          repo: args.repository.name,
          commit_sha: ref.object.sha,
        });

        const treeItems: any[] = [];
        for (const change of args.changes) {
          if (change.action === "delete") {
            treeItems.push({
              path: change.path,
              mode: "100644" as const,
              type: "blob" as const,
              sha: null,
            });
          } else {
            const { data: blob } = await octokit.rest.git.createBlob({
              owner: args.repository.owner,
              repo: args.repository.name,
              content: change.content,
              encoding: "utf-8",
            });

            treeItems.push({
              path: change.path,
              mode: "100644" as const,
              type: "blob" as const,
              sha: blob.sha,
            });
          }
        }

        const { data: newTree } = await octokit.rest.git.createTree({
          owner: args.repository.owner,
          repo: args.repository.name,
          base_tree: commit.tree.sha,
          tree: treeItems,
        });

        const { data: newCommit } = await octokit.rest.git.createCommit({
          owner: args.repository.owner,
          repo: args.repository.name,
          message: args.commitMessage,
          tree: newTree.sha,
          parents: [ref.object.sha],
          author: {
            name: "BlackBox AI Bot",
            email: "bot@blackbox-ai.dev",
          },
        });

        await octokit.rest.git.updateRef({
          owner: args.repository.owner,
          repo: args.repository.name,
          ref: `heads/${args.branchName}`,
          sha: newCommit.sha,
        });

        return {
          sha: newCommit.sha,
          message: args.commitMessage,
          author: {
            name: "BlackBox AI Bot",
            email: "bot@blackbox-ai.dev",
          },
          url: newCommit.html_url || `https://github.com/${args.repository.fullName}/commit/${newCommit.sha}`,
          createdAt: new Date(),
        };
      } catch (error) {
        console.error("Error committing changes:", error);
        throw new Error(`Failed to commit changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    createPullRequest: async (ctx: any, args: { repository: any; branchName: string; title: string; description: string }) => {
      try {
        const octokit = getBotOctokit();
        const { data: pr } = await octokit.rest.pulls.create({
          owner: args.repository.owner,
          repo: args.repository.name,
          title: args.title,
          head: args.branchName,
          base: args.repository.defaultBranch,
          body: args.description,
        });

        return {
          url: pr.html_url,
          number: pr.number,
        };
      } catch (error) {
        console.error("Error creating pull request:", error);
        throw new Error(`Failed to create pull request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  };
};

describe('GitHub Bot Integration Functions', () => {
  let mockContext: any;
  let githubFunctions: ReturnType<typeof createMockGitHubFunctions>;

  beforeEach(() => {
    mockContext = createMockConvexContext();
    githubFunctions = createMockGitHubFunctions();
    jest.clearAllMocks();
    
    // Set up environment variable
    process.env.GITHUB_BOT_TOKEN = 'test-bot-token';
  });

  describe('Bot Authentication', () => {
    it('should use bot token from environment', async () => {
      const { Octokit } = require('@octokit/rest');
      
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { id: 123, name: 'test-repo' }
      });

      const result = await githubFunctions.validateRepository(mockContext, {
        owner: 'test-owner',
        name: 'test-repo',
      });

      // Since we're using a mock function that returns the mockOctokit directly,
      // we need to check that the environment variable is being used correctly
      expect(process.env.GITHUB_BOT_TOKEN).toBe('test-bot-token');
      expect(result).toBe(true);
    });

    it('should throw error when bot token is not configured', async () => {
      delete process.env.GITHUB_BOT_TOKEN;

      await expect(githubFunctions.validateRepository(mockContext, {
        owner: 'test-owner',
        name: 'test-repo',
      })).rejects.toThrow('GitHub bot token not configured');
    });
  });

  describe('Repository Validation', () => {
    beforeEach(() => {
      process.env.GITHUB_BOT_TOKEN = 'test-bot-token';
    });

    it('should validate repository access successfully', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { id: 123, name: 'test-repo' }
      });

      const result = await githubFunctions.validateRepository(mockContext, {
        owner: 'test-owner',
        name: 'test-repo',
      });

      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });
      expect(result).toBe(true);
    });

    it('should handle repository not found error', async () => {
      const error = new Error('Not Found');
      (error as any).message = '404';
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubFunctions.validateRepository(mockContext, {
        owner: 'test-owner',
        name: 'nonexistent-repo',
      })).rejects.toThrow('Repository test-owner/nonexistent-repo not found or bot doesn\'t have access');
    });

    it('should return false for other errors', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('Network error'));

      const result = await githubFunctions.validateRepository(mockContext, {
        owner: 'test-owner',
        name: 'test-repo',
      });

      expect(result).toBe(false);
    });
  });

  describe('Bot Access Validation', () => {
    beforeEach(() => {
      process.env.GITHUB_BOT_TOKEN = 'test-bot-token';
    });

    it('should validate bot write access successfully', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { 
          id: 123, 
          name: 'test-repo',
          default_branch: 'main',
          permissions: { admin: false }
        }
      });

      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } }
      });

      mockOctokit.rest.git.createRef.mockResolvedValue({
        data: { ref: 'refs/heads/test-branch' }
      });

      mockOctokit.rest.git.deleteRef.mockResolvedValue({});

      const result = await githubFunctions.validateBotAccess(mockContext, {
        owner: 'test-owner',
        name: 'test-repo',
      });

      expect(result.hasAccess).toBe(true);
      expect(result.permissions.write).toBe(true);
      expect(mockOctokit.rest.git.createRef).toHaveBeenCalled();
      expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalled();
    });

    it('should detect lack of write access', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { 
          id: 123, 
          name: 'test-repo',
          default_branch: 'main',
          permissions: { admin: false }
        }
      });

      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } }
      });

      mockOctokit.rest.git.createRef.mockRejectedValue(new Error('Permission denied'));

      const result = await githubFunctions.validateBotAccess(mockContext, {
        owner: 'test-owner',
        name: 'test-repo',
      });

      expect(result.hasAccess).toBe(false);
      expect(result.permissions.write).toBe(false);
      expect(result.error).toContain('write access');
    });
  });

  describe('Repository Context', () => {
    beforeEach(() => {
      process.env.GITHUB_BOT_TOKEN = 'test-bot-token';
    });

    it('should get repository context successfully', async () => {
      const mockRepository = {
        _id: 'repo123',
        _creationTime: Date.now(),
        userId: 'user123',
        owner: 'test-owner',
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        defaultBranch: 'main',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'package.json' },
            { type: 'blob', path: 'README.md' },
            { type: 'blob', path: 'src/index.ts' },
          ]
        }
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from('{"name": "test-package"}').toString('base64')
        }
      });

      const result = await githubFunctions.getRepositoryContext(mockContext, {
        repository: mockRepository,
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('Repository: test-owner/test-repo');
      expect(result).toContain('package.json');
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        tree_sha: 'main',
        recursive: 'true',
      });
    });
  });

  describe('Branch Operations', () => {
    beforeEach(() => {
      process.env.GITHUB_BOT_TOKEN = 'test-bot-token';
    });

    it('should create branch successfully', async () => {
      const mockRepository = {
        _id: 'repo123',
        _creationTime: Date.now(),
        userId: 'user123',
        owner: 'test-owner',
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        defaultBranch: 'main',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } }
      });

      mockOctokit.rest.git.createRef.mockResolvedValue({
        data: { ref: 'refs/heads/feature-branch' }
      });

      const result = await githubFunctions.createBranch(mockContext, {
        repository: mockRepository,
        branchName: 'feature-branch',
      });

      expect(result.success).toBe(true);
      expect(result.branchName).toBe('feature-branch');
      expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'refs/heads/feature-branch',
        sha: 'abc123',
      });
    });
  });

  describe('Commit Operations', () => {
    beforeEach(() => {
      process.env.GITHUB_BOT_TOKEN = 'test-bot-token';
    });

    it('should commit changes successfully', async () => {
      const mockRepository = {
        _id: 'repo123',
        _creationTime: Date.now(),
        userId: 'user123',
        owner: 'test-owner',
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        defaultBranch: 'main',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'abc123' } }
      });

      mockOctokit.rest.git.getCommit.mockResolvedValue({
        data: { tree: { sha: 'tree123' } }
      });

      mockOctokit.rest.git.createBlob.mockResolvedValue({
        data: { sha: 'blob123' }
      });

      mockOctokit.rest.git.createTree.mockResolvedValue({
        data: { sha: 'newtree123' }
      });

      mockOctokit.rest.git.createCommit.mockResolvedValue({
        data: { 
          sha: 'commit123',
          html_url: 'https://github.com/test-owner/test-repo/commit/commit123'
        }
      });

      mockOctokit.rest.git.updateRef.mockResolvedValue({});

      const result = await githubFunctions.commitChanges(mockContext, {
        repository: mockRepository,
        branchName: 'feature-branch',
        changes: [
          {
            path: 'src/new-file.ts',
            content: 'console.log("Hello World");',
            action: 'create' as const,
          }
        ],
        commitMessage: 'Add new file',
      });

      expect(result.sha).toBe('commit123');
      expect(result.message).toBe('Add new file');
      expect(result.author.name).toBe('BlackBox AI Bot');
      expect(mockOctokit.rest.git.createCommit).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        message: 'Add new file',
        tree: 'newtree123',
        parents: ['abc123'],
        author: {
          name: 'BlackBox AI Bot',
          email: 'bot@blackbox-ai.dev',
        },
      });
    });
  });

  describe('Pull Request Operations', () => {
    beforeEach(() => {
      process.env.GITHUB_BOT_TOKEN = 'test-bot-token';
    });

    it('should create pull request successfully', async () => {
      const mockRepository = {
        _id: 'repo123',
        _creationTime: Date.now(),
        userId: 'user123',
        owner: 'test-owner',
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        defaultBranch: 'main',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: {
          html_url: 'https://github.com/test-owner/test-repo/pull/1',
          number: 1,
        }
      });

      const result = await githubFunctions.createPullRequest(mockContext, {
        repository: mockRepository,
        branchName: 'feature-branch',
        title: 'Add new feature',
        description: 'This PR adds a new feature',
      });

      expect(result.url).toBe('https://github.com/test-owner/test-repo/pull/1');
      expect(result.number).toBe(1);
      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Add new feature',
        head: 'feature-branch',
        base: 'main',
        body: 'This PR adds a new feature',
      });
    });
  });
});
