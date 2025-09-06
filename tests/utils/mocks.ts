// Test utilities and mocks
import { jest } from '@jest/globals';

export const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock Convex context
export const createMockConvexContext = () => ({
  runQuery: jest.fn(),
  runMutation: jest.fn(),
  runAction: jest.fn(),
  scheduler: {
    runAfter: jest.fn(),
  },
});

// Mock BlackBox API responses
export const mockBlackBoxSuccessResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        files: [
          {
            path: "src/test.ts",
            content: "// Generated test file\nexport const test = () => console.log('test');",
            action: "create"
          }
        ],
        commitMessage: "feat: implement test feature",
        branchName: "feature/test-123"
      })
    }
  }]
};

export const mockBlackBoxErrorResponse = {
  error: {
    message: "API rate limit exceeded",
    type: "rate_limit_error"
  }
};

// Mock repository data
export const mockRepository = {
  _id: "repo123" as any,
  owner: "testuser",
  name: "test-repo",
  fullName: "testuser/test-repo",
  accessToken: "ghp_test_token",
  defaultBranch: "main",
  isActive: true,
  userId: "user123" as any,
  _creationTime: Date.now(),
};

// Mock user data
export const mockUser = {
  _id: "user123" as any,
  email: "test@example.com",
  name: "Test User",
  githubUsername: "testuser",
  _creationTime: Date.now(),
};

// Mock ticket data
export const mockTicket = {
  _id: "ticket123" as any,
  userId: "user123" as any,
  repositoryId: "repo123" as any,
  title: "Test Feature Implementation",
  description: "Implement a test feature with proper error handling",
  priority: "high" as const,
  status: "pending" as const,
  _creationTime: Date.now(),
};

// Mock task data
export const mockTask = {
  _id: "task123" as any,
  userId: "user123" as any,
  repositoryId: "repo123" as any,
  ticketId: "ticket123" as any,
  status: "queued" as const,
  _creationTime: Date.now(),
};

// Helper to create mock Response objects
export const createMockResponse = (data: any, status = 200, ok = true): Response => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
} as Response);

// Helper to setup fetch mock
export const setupFetchMock = (response: any, shouldReject = false) => {
  if (shouldReject) {
    mockFetch.mockRejectedValue(new Error('Network error'));
  } else {
    mockFetch.mockResolvedValue(createMockResponse(response));
  }
  (global as any).fetch = mockFetch;
};

// Mock Convex utilities
export const mockConvexAction = (config: { args: any; handler: any }) => config.handler;

export const mockConvexV = {
  object: jest.fn((obj: any) => obj),
  string: jest.fn(() => 'string'),
  number: jest.fn(() => 'number'),
  boolean: jest.fn(() => 'boolean'),
  optional: jest.fn((type: any) => type),
  array: jest.fn((type: any) => type),
  union: jest.fn((...types: any[]) => types),
  literal: jest.fn((value: any) => value),
};

// Mock Convex server imports
export const mockConvexServer = {
  action: mockConvexAction,
};

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
};
