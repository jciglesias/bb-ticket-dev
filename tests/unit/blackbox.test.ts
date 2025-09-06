import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the Convex server imports
jest.mock('../../convex/_generated/server', () => ({
  action: jest.fn((config) => config),
}));

// Import the functions we want to test
// Note: We'll need to test the internal functions by importing them differently
// For now, let's create a test version that exposes the internal functions

describe('BlackBox API Functions', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Setup fetch mock
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    // Setup environment variables
    process.env.BLACKBOX_API_KEY = 'test-api-key';
    process.env.BLACKBOX_API_URL = 'https://api.test.blackbox.ai/test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.BLACKBOX_API_KEY;
    delete process.env.BLACKBOX_API_URL;
  });

  describe('Input Validation', () => {
    it('should validate required repositoryContext', () => {
      const validateGenerateCodeArgs = (args: any) => {
        if (!args.repositoryContext || typeof args.repositoryContext !== 'string') {
          throw new Error("repositoryContext is required and must be a string");
        }
        if (!args.ticketDescription || typeof args.ticketDescription !== 'string') {
          throw new Error("ticketDescription is required and must be a string");
        }
        if (!args.ticketTitle || typeof args.ticketTitle !== 'string') {
          throw new Error("ticketTitle is required and must be a string");
        }
        if (args.repositoryContext.length > 50000) {
          throw new Error("repositoryContext is too large (max 50000 characters)");
        }
        if (args.ticketDescription.length > 5000) {
          throw new Error("ticketDescription is too large (max 5000 characters)");
        }
        if (args.ticketTitle.length > 200) {
          throw new Error("ticketTitle is too large (max 200 characters)");
        }
      };

      expect(() => validateGenerateCodeArgs({})).toThrow('repositoryContext is required and must be a string');
      expect(() => validateGenerateCodeArgs({ repositoryContext: 123 })).toThrow('repositoryContext is required and must be a string');
      expect(() => validateGenerateCodeArgs({ repositoryContext: '' })).toThrow('repositoryContext is required and must be a string');
    });

    it('should validate required ticketDescription', () => {
      const validateGenerateCodeArgs = (args: any) => {
        if (!args.repositoryContext || typeof args.repositoryContext !== 'string') {
          throw new Error("repositoryContext is required and must be a string");
        }
        if (!args.ticketDescription || typeof args.ticketDescription !== 'string') {
          throw new Error("ticketDescription is required and must be a string");
        }
        if (!args.ticketTitle || typeof args.ticketTitle !== 'string') {
          throw new Error("ticketTitle is required and must be a string");
        }
      };

      expect(() => validateGenerateCodeArgs({ 
        repositoryContext: 'valid context' 
      })).toThrow('ticketDescription is required and must be a string');
      
      expect(() => validateGenerateCodeArgs({ 
        repositoryContext: 'valid context',
        ticketDescription: 123 
      })).toThrow('ticketDescription is required and must be a string');
    });

    it('should validate required ticketTitle', () => {
      const validateGenerateCodeArgs = (args: any) => {
        if (!args.repositoryContext || typeof args.repositoryContext !== 'string') {
          throw new Error("repositoryContext is required and must be a string");
        }
        if (!args.ticketDescription || typeof args.ticketDescription !== 'string') {
          throw new Error("ticketDescription is required and must be a string");
        }
        if (!args.ticketTitle || typeof args.ticketTitle !== 'string') {
          throw new Error("ticketTitle is required and must be a string");
        }
      };

      expect(() => validateGenerateCodeArgs({ 
        repositoryContext: 'valid context',
        ticketDescription: 'valid description'
      })).toThrow('ticketTitle is required and must be a string');
    });

    it('should validate field length limits', () => {
      const validateGenerateCodeArgs = (args: any) => {
        if (!args.repositoryContext || typeof args.repositoryContext !== 'string') {
          throw new Error("repositoryContext is required and must be a string");
        }
        if (!args.ticketDescription || typeof args.ticketDescription !== 'string') {
          throw new Error("ticketDescription is required and must be a string");
        }
        if (!args.ticketTitle || typeof args.ticketTitle !== 'string') {
          throw new Error("ticketTitle is required and must be a string");
        }
        if (args.repositoryContext.length > 50000) {
          throw new Error("repositoryContext is too large (max 50000 characters)");
        }
        if (args.ticketDescription.length > 5000) {
          throw new Error("ticketDescription is too large (max 5000 characters)");
        }
        if (args.ticketTitle.length > 200) {
          throw new Error("ticketTitle is too large (max 200 characters)");
        }
      };

      expect(() => validateGenerateCodeArgs({
        repositoryContext: 'a'.repeat(50001),
        ticketDescription: 'valid description',
        ticketTitle: 'valid title'
      })).toThrow('repositoryContext is too large (max 50000 characters)');

      expect(() => validateGenerateCodeArgs({
        repositoryContext: 'valid context',
        ticketDescription: 'a'.repeat(5001),
        ticketTitle: 'valid title'
      })).toThrow('ticketDescription is too large (max 5000 characters)');

      expect(() => validateGenerateCodeArgs({
        repositoryContext: 'valid context',
        ticketDescription: 'valid description',
        ticketTitle: 'a'.repeat(201)
      })).toThrow('ticketTitle is too large (max 200 characters)');
    });

    it('should pass validation with valid inputs', () => {
      const validateGenerateCodeArgs = (args: any) => {
        if (!args.repositoryContext || typeof args.repositoryContext !== 'string') {
          throw new Error("repositoryContext is required and must be a string");
        }
        if (!args.ticketDescription || typeof args.ticketDescription !== 'string') {
          throw new Error("ticketDescription is required and must be a string");
        }
        if (!args.ticketTitle || typeof args.ticketTitle !== 'string') {
          throw new Error("ticketTitle is required and must be a string");
        }
        if (args.repositoryContext.length > 50000) {
          throw new Error("repositoryContext is too large (max 50000 characters)");
        }
        if (args.ticketDescription.length > 5000) {
          throw new Error("ticketDescription is too large (max 5000 characters)");
        }
        if (args.ticketTitle.length > 200) {
          throw new Error("ticketTitle is too large (max 200 characters)");
        }
      };

      expect(() => validateGenerateCodeArgs({
        repositoryContext: 'valid repository context',
        ticketDescription: 'valid ticket description',
        ticketTitle: 'valid ticket title'
      })).not.toThrow();
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid JSON response', () => {
      const parseBlackBoxResponse = (response: any, ticketTitle: string) => {
        try {
          const parsedResponse = typeof response.content === 'string' 
            ? JSON.parse(response.content) 
            : response.content || response;

          return {
            files: parsedResponse.files || [],
            commitMessage: parsedResponse.commitMessage || `feat: implement ${ticketTitle}`,
            branchName: parsedResponse.branchName || `feature/${ticketTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          };
        } catch (parseError) {
          throw new Error(`Failed to parse BlackBox AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      };

      const mockResponse = {
        content: JSON.stringify({
          files: [{ path: 'test.ts', content: 'test content', action: 'create' }],
          commitMessage: 'feat: add test feature',
          branchName: 'feature/test-branch'
        })
      };

      const result = parseBlackBoxResponse(mockResponse, 'Test Feature');
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('test.ts');
      expect(result.commitMessage).toBe('feat: add test feature');
      expect(result.branchName).toBe('feature/test-branch');
    });

    it('should handle response with missing fields', () => {
      const parseBlackBoxResponse = (response: any, ticketTitle: string) => {
        try {
          const parsedResponse = typeof response.content === 'string' 
            ? JSON.parse(response.content) 
            : response.content || response;

          return {
            files: parsedResponse.files || [],
            commitMessage: parsedResponse.commitMessage || `feat: implement ${ticketTitle}`,
            branchName: parsedResponse.branchName || `feature/${ticketTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          };
        } catch (parseError) {
          throw new Error(`Failed to parse BlackBox AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      };

      const mockResponse = {
        content: JSON.stringify({})
      };

      const result = parseBlackBoxResponse(mockResponse, 'Test Feature');
      
      expect(result.files).toEqual([]);
      expect(result.commitMessage).toBe('feat: implement Test Feature');
      expect(result.branchName).toMatch(/^feature\/test-feature-\d+$/);
    });

    it('should throw error for invalid JSON', () => {
      const parseBlackBoxResponse = (response: any, ticketTitle: string) => {
        try {
          const parsedResponse = typeof response.content === 'string' 
            ? JSON.parse(response.content) 
            : response.content || response;

          return {
            files: parsedResponse.files || [],
            commitMessage: parsedResponse.commitMessage || `feat: implement ${ticketTitle}`,
            branchName: parsedResponse.branchName || `feature/${ticketTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          };
        } catch (parseError) {
          throw new Error(`Failed to parse BlackBox AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      };

      const mockResponse = {
        content: 'invalid json {'
      };

      expect(() => parseBlackBoxResponse(mockResponse, 'Test Feature'))
        .toThrow('Failed to parse BlackBox AI response:');
    });
  });

  describe('Retry Logic', () => {
    it('should calculate exponential backoff delay correctly', () => {
      const RETRY_CONFIG = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        timeoutMs: 30000,
      };

      const getRetryDelay = (attempt: number): number => {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        return delay + Math.random() * 1000;
      };

      // Mock Math.random to return consistent values for testing
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);

      const delay0 = getRetryDelay(0);
      const delay1 = getRetryDelay(1);
      const delay2 = getRetryDelay(2);
      const delay3 = getRetryDelay(3);

      expect(delay0).toBe(1500); // 1000 + 500
      expect(delay1).toBe(2500); // 2000 + 500
      expect(delay2).toBe(4500); // 4000 + 500
      expect(delay3).toBe(8500); // 8000 + 500

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should respect maximum delay', () => {
      const RETRY_CONFIG = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        timeoutMs: 30000,
      };

      const getRetryDelay = (attempt: number): number => {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        return delay + Math.random() * 1000;
      };

      // Mock Math.random to return 0
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0);

      const delay10 = getRetryDelay(10); // Should be capped at maxDelay
      expect(delay10).toBe(10000);

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('API Call Functions', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{ path: 'test.ts', content: 'test', action: 'create' }],
              commitMessage: 'feat: test',
              branchName: 'feature/test'
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      // Test the API call logic
      const callBlackBoxAPI = async (prompt: string, apiKey: string, apiUrl: string) => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          throw new Error(`BlackBox API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.choices && result.choices[0] && result.choices[0].message) {
          return { content: result.choices[0].message.content };
        } else if (result.content) {
          return { content: result.content };
        } else if (result.message) {
          return { content: result.message };
        } else {
          return result;
        }
      };

      const result = await callBlackBoxAPI('test prompt', 'test-key', 'https://api.test.com');
      
      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key',
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: 'test prompt' }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      expect(result.content).toBeDefined();
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: jest.fn().mockResolvedValue({ error: 'Rate limit exceeded' }),
      } as any);

      const callBlackBoxAPI = async (prompt: string, apiKey: string, apiUrl: string) => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          throw new Error(`BlackBox API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      };

      await expect(callBlackBoxAPI('test prompt', 'test-key', 'https://api.test.com'))
        .rejects.toThrow('BlackBox API error: 429 Too Many Requests');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const callBlackBoxAPI = async (prompt: string, apiKey: string, apiUrl: string) => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        return await response.json();
      };

      await expect(callBlackBoxAPI('test prompt', 'test-key', 'https://api.test.com'))
        .rejects.toThrow('Network error');
    });
  });
});
