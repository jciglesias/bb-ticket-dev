// Global test setup

// Mock environment variables
process.env.BLACKBOX_API_KEY = 'test-api-key';
process.env.BLACKBOX_API_URL = 'https://api.test.blackbox.ai/test';
process.env.CONVEX_URL = 'http://localhost:3210';
process.env.GITHUB_BOT_TOKEN = 'test-github-bot-token';

// Mock Convex imports globally
jest.mock('convex/values', () => ({
  v: {
    object: jest.fn((obj) => obj),
    string: jest.fn(() => 'string'),
    number: jest.fn(() => 'number'),
    boolean: jest.fn(() => 'boolean'),
    optional: jest.fn((type) => type),
    array: jest.fn((type) => type),
    union: jest.fn((...types) => types),
    literal: jest.fn((value) => value),
  },
}));

jest.mock('convex/server', () => ({
  action: jest.fn((config) => config.handler),
  query: jest.fn((config) => config.handler),
  mutation: jest.fn((config) => config.handler),
}));
