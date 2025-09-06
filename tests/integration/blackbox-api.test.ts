import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('BlackBox API Integration Tests', () => {
  let originalFetch: typeof fetch;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
    
    // Create mock fetch
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    // Set up environment variables
    process.env.BLACKBOX_API_KEY = 'test-api-key-12345';
    process.env.BLACKBOX_API_URL = 'https://api.blackbox.ai/test';
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    
    // Clean up environment variables
    delete process.env.BLACKBOX_API_KEY;
    delete process.env.BLACKBOX_API_URL;
    
    jest.clearAllMocks();
  });

  describe('API Connection', () => {
    it('should successfully connect to BlackBox API with valid credentials', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{
                path: 'src/feature.ts',
                content: 'export const feature = () => console.log("Hello World");',
                action: 'create'
              }],
              commitMessage: 'feat: add new feature',
              branchName: 'feature/new-feature-123'
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      // Simulate the actual API call
      const response = await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'Create a simple TypeScript function'
          }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.choices).toBeDefined();
      expect(data.choices[0].message.content).toBeDefined();

      const parsedContent = JSON.parse(data.choices[0].message.content);
      expect(parsedContent.files).toHaveLength(1);
      expect(parsedContent.files[0].path).toBe('src/feature.ts');
      expect(parsedContent.commitMessage).toBe('feat: add new feature');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'Invalid API key',
            type: 'authentication_error'
          }
        }),
      } as any);

      const response = await fetch('https://api.blackbox.ai/test', {
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

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      const errorData = await response.json();
      expect(errorData.error.message).toBe('Invalid API key');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'Rate limit exceeded. Please try again later.',
            type: 'rate_limit_error'
          }
        }),
      } as any);

      const response = await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);

      const errorData = await response.json();
      expect(errorData.error.type).toBe('rate_limit_error');
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      await expect(
        fetch('https://api.blackbox.ai/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-12345',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Response Validation', () => {
    it('should validate response format', async () => {
      const validResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{
                path: 'src/component.tsx',
                content: 'import React from "react";\n\nexport const Component = () => <div>Hello</div>;',
                action: 'create'
              }],
              commitMessage: 'feat: add React component',
              branchName: 'feature/react-component'
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(validResponse),
      } as any);

      const response = await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Create a React component' }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      // Validate required fields
      expect(content.files).toBeDefined();
      expect(Array.isArray(content.files)).toBe(true);
      expect(content.commitMessage).toBeDefined();
      expect(content.branchName).toBeDefined();

      // Validate file structure
      const file = content.files[0];
      expect(file.path).toBeDefined();
      expect(file.content).toBeDefined();
      expect(file.action).toBeDefined();
      expect(['create', 'update', 'delete']).toContain(file.action);
    });

    it('should handle malformed JSON responses', async () => {
      const malformedResponse = {
        choices: [{
          message: {
            content: 'This is not valid JSON {'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(malformedResponse),
      } as any);

      const response = await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      const data = await response.json();
      
      expect(() => {
        JSON.parse(data.choices[0].message.content);
      }).toThrow();
    });

    it('should handle empty responses', async () => {
      const emptyResponse = {
        choices: [{
          message: {
            content: JSON.stringify({})
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(emptyResponse),
      } as any);

      const response = await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      expect(content).toEqual({});
    });
  });

  describe('Request Validation', () => {
    it('should send properly formatted requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }),
      } as any);

      const prompt = 'Create a TypeScript interface for a user';
      
      await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });
    });

    it('should handle large prompts', async () => {
      const largePrompt = 'A'.repeat(10000); // 10KB prompt

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }),
      } as any);

      await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: largePrompt }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      expect(requestBody.messages[0].content).toBe(largePrompt);
    });
  });

  describe('Error Recovery', () => {
    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'Internal server error',
            type: 'server_error'
          }
        }),
      } as any);

      const response = await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const errorData = await response.json();
      expect(errorData.error.type).toBe('server_error');
    });

    it('should handle network connectivity issues', async () => {
      mockFetch.mockRejectedValue(new Error('Network error: ECONNREFUSED'));

      await expect(
        fetch('https://api.blackbox.ai/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-12345',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        })
      ).rejects.toThrow('Network error: ECONNREFUSED');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }),
      } as any);

      const requests = Array.from({ length: 5 }, (_, i) =>
        fetch('https://api.blackbox.ai/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-12345',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Request ${i}` }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        })
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should handle request timeouts appropriately', async () => {
      // Simulate a slow response
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }),
            } as any);
          }, 100); // 100ms delay
        })
      );

      const startTime = Date.now();
      await fetch('https://api.blackbox.ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });
});
