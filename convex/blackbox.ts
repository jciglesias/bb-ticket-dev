import { v } from "convex/values";
import { action } from "./_generated/server";

// Input validation schemas
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

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeoutMs: 30000, // 30 seconds
};

// BlackBox AI Integration
export const generateCode = action({
  args: {
    repositoryContext: v.string(),
    ticketDescription: v.string(),
    ticketTitle: v.string(),
    additionalInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate inputs
      validateGenerateCodeArgs(args);

      // Get API configuration
      const apiKey = process.env.BLACKBOX_API_KEY;
      const apiUrl = process.env.BLACKBOX_API_URL || "https://api.blackbox.ai/blackboxai/anthropic/claude-3.5-sonnet:beta";
      
      if (!apiKey) {
        console.warn("BlackBox AI API key not configured, falling back to simulation");
        return await simulateBlackBoxResponse(`${args.ticketTitle}: ${args.ticketDescription}`, args.ticketTitle);
      }

      const prompt = `You are a senior software engineer tasked with implementing a feature based on a development ticket. 

REPOSITORY CONTEXT:
${args.repositoryContext}

TICKET DETAILS:
Title: ${args.ticketTitle}
Description: ${args.ticketDescription}
${args.additionalInstructions ? `Additional Instructions: ${args.additionalInstructions}` : ''}

Please analyze the repository context and generate the necessary code changes to implement the requested feature. 

IMPORTANT: Your response must be ONLY a valid JSON object with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file.js",
      "content": "complete file content here",
      "action": "create" // or "update" or "delete"
    }
  ],
  "commitMessage": "feat: brief description of changes",
  "branchName": "feature/descriptive-branch-name"
}

Focus on creating production-ready code that follows best practices for the detected technology stack. Include proper error handling, validation, and documentation.`;

      // Call the real BlackBox AI API with retry logic
      const response = await callBlackBoxAPIWithRetry(prompt, apiKey, apiUrl);

      const requestId = `bb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Parse the response and format it for our system
      const generatedCode = parseBlackBoxResponse(response, args.ticketTitle);

      return {
        success: true,
        requestId,
        generatedCode,
      };
    } catch (error) {
      console.error("BlackBox AI error:", error);
      
      // Fallback to simulation if API fails
      console.log("Falling back to simulation due to API error");
      try {
        return await simulateBlackBoxResponse(`${args.ticketTitle}: ${args.ticketDescription}`, args.ticketTitle);
      } catch (fallbackError) {
        return {
          success: false,
          requestId: `failed-${Date.now()}`,
          generatedCode: {
            files: [],
            commitMessage: "",
          },
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }
  },
});

// Check the status of a BlackBox AI request
export const checkRequestStatus = action({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // For now, we'll simulate a completed status
      // In a real implementation, you would check the actual BlackBox AI API
      return {
        status: "completed" as const,
        result: {
          success: true,
          requestId: args.requestId,
          generatedCode: {
            files: [],
            commitMessage: "Simulated commit",
          },
        },
      };
    } catch (error) {
      console.error("Error checking BlackBox request status:", error);
      return {
        status: "failed" as const,
        result: undefined,
      };
    }
  },
});

// Simulate BlackBox AI response - replace with actual API integration
async function simulateBlackBoxResponse(prompt: string, ticketTitle: string) {
  // This is a simulation - replace with actual BlackBox AI API call
  const requestId = `bb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Generate a simple response based on the ticket title
  const files = [];
  
  if (ticketTitle.toLowerCase().includes("auth")) {
    files.push({
      path: "src/auth/auth.service.ts",
      content: `// Generated authentication service
export class AuthService {
  async login(email: string, password: string): Promise<{ token: string }> {
    // TODO: Implement authentication logic
    return { token: 'jwt-token' };
  }

  async register(email: string, password: string, name: string): Promise<{ user: any }> {
    // TODO: Implement registration logic
    return { user: { id: 1, email, name } };
  }

  async validateToken(token: string): Promise<boolean> {
    // TODO: Implement token validation
    return true;
  }
}`,
      action: "create" as const,
    });
    
    files.push({
      path: "src/auth/auth.controller.ts",
      content: `// Generated authentication controller
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(req: any, res: any) {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }

  async register(req: any, res: any) {
    try {
      const { email, password, name } = req.body;
      const result = await this.authService.register(email, password, name);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Registration failed' });
    }
  }
}`,
      action: "create" as const,
    });
  } else if (ticketTitle.toLowerCase().includes("api")) {
    files.push({
      path: "src/api/new-endpoint.ts",
      content: `// Generated API endpoint
export class NewEndpoint {
  async handle(req: any, res: any) {
    try {
      // TODO: Implement endpoint logic
      res.json({ message: 'New endpoint created successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}`,
      action: "create" as const,
    });
  } else {
    // Generic implementation
    files.push({
      path: "src/feature/implementation.ts",
      content: `// Generated feature implementation
export class FeatureImplementation {
  async execute(): Promise<void> {
    // TODO: Implement ${ticketTitle}
    console.log('Feature implementation for: ${ticketTitle}');
  }
}`,
      action: "create" as const,
    });
  }

  return {
    success: true,
    requestId,
    generatedCode: {
      files,
      commitMessage: `feat: implement ${ticketTitle}

Generated by BlackBox AI based on the provided requirements.
This implementation includes the basic structure and needs to be reviewed and tested.`,
      branchName: `feature/${ticketTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    },
  };
}

// Helper function to parse BlackBox API response
function parseBlackBoxResponse(response: any, ticketTitle: string) {
  try {
    // Try to parse the response as JSON
    const parsedResponse = typeof response.content === 'string' 
      ? JSON.parse(response.content) 
      : response.content || response;

    return {
      files: parsedResponse.files || [],
      commitMessage: parsedResponse.commitMessage || `feat: implement ${ticketTitle}`,
      branchName: parsedResponse.branchName || `feature/${ticketTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    };
  } catch (parseError) {
    console.error("Error parsing BlackBox AI response:", parseError);
    throw new Error(`Failed to parse BlackBox AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

// Helper function to implement exponential backoff delay
function getRetryDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelay
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

// Helper function to create timeout promise
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });
}

// BlackBox AI API call with retry logic and timeout
async function callBlackBoxAPIWithRetry(prompt: string, apiKey: string, apiUrl: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Create the API call promise with timeout
      const apiCallPromise = callBlackBoxAPI(prompt, apiKey, apiUrl);
      const timeoutPromise = createTimeoutPromise(RETRY_CONFIG.timeoutMs);
      
      // Race between API call and timeout
      const response = await Promise.race([apiCallPromise, timeoutPromise]);
      
      // If we get here, the call succeeded
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on the last attempt
      if (attempt === RETRY_CONFIG.maxRetries) {
        break;
      }
      
      // Log retry attempt
      console.warn(`BlackBox API call failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}):`, lastError.message);
      
      // Wait before retrying
      const delay = getRetryDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  throw new Error(`BlackBox API failed after ${RETRY_CONFIG.maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}

// Real BlackBox AI integration function
async function callBlackBoxAPI(prompt: string, apiKey: string, apiUrl: string) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`BlackBox API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  // Handle different possible response formats
  if (result.choices && result.choices[0] && result.choices[0].message) {
    return { content: result.choices[0].message.content };
  } else if (result.content) {
    return { content: result.content };
  } else if (result.message) {
    return { content: result.message };
  } else {
    return result;
  }
}
