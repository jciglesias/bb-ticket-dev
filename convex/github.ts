import { v } from "convex/values";
import { action } from "./_generated/server";
import { Octokit } from "@octokit/rest";

// GitHub Repository interface (matching our domain)
const repositoryArg = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  owner: v.string(),
  name: v.string(),
  fullName: v.string(),
  accessToken: v.string(),
  defaultBranch: v.string(),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Validate GitHub repository access
export const validateRepository = action({
  args: {
    owner: v.string(),
    name: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const octokit = new Octokit({
        auth: args.accessToken,
      });

      await octokit.rest.repos.get({
        owner: args.owner,
        repo: args.name,
      });

      return true;
    } catch (error) {
      console.error("GitHub validation error:", error);
      return false;
    }
  },
});

// Get repository context (files and structure)
export const getRepositoryContext = action({
  args: {
    repository: repositoryArg,
  },
  handler: async (ctx, args) => {
    try {
      const octokit = new Octokit({
        auth: args.repository.accessToken,
      });

      // Get repository tree
      const { data: tree } = await octokit.rest.git.getTree({
        owner: args.repository.owner,
        repo: args.repository.name,
        tree_sha: args.repository.defaultBranch,
        recursive: "true",
      });

      // Get important files content (package.json, README, etc.)
      const importantFiles = tree.tree.filter(item => 
        item.type === "blob" && 
        (item.path?.includes("package.json") ||
         item.path?.includes("README") ||
         item.path?.includes(".md") ||
         item.path?.endsWith(".ts") ||
         item.path?.endsWith(".js") ||
         item.path?.endsWith(".py"))
      ).slice(0, 20); // Limit to first 20 important files

      let contextString = `Repository: ${args.repository.fullName}\n`;
      contextString += `Default Branch: ${args.repository.defaultBranch}\n\n`;
      contextString += `File Structure:\n`;

      // Add file structure
      for (const item of tree.tree) {
        if (item.type === "blob") {
          contextString += `- ${item.path}\n`;
        }
      }

      contextString += `\n--- Important Files Content ---\n\n`;

      // Get content of important files
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
});

// Create a new branch
export const createBranch = action({
  args: {
    repository: repositoryArg,
    branchName: v.string(),
    baseBranch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const octokit = new Octokit({
        auth: args.repository.accessToken,
      });

      // Get the SHA of the base branch
      const { data: ref } = await octokit.rest.git.getRef({
        owner: args.repository.owner,
        repo: args.repository.name,
        ref: `heads/${args.baseBranch || args.repository.defaultBranch}`,
      });

      // Create new branch
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
});

// Commit changes to a branch
export const commitChanges = action({
  args: {
    repository: repositoryArg,
    branchName: v.string(),
    changes: v.array(v.object({
      path: v.string(),
      content: v.string(),
      action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    })),
    commitMessage: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const octokit = new Octokit({
        auth: args.repository.accessToken,
      });

      // Get current branch reference
      const { data: ref } = await octokit.rest.git.getRef({
        owner: args.repository.owner,
        repo: args.repository.name,
        ref: `heads/${args.branchName}`,
      });

      // Get the current tree
      const { data: commit } = await octokit.rest.git.getCommit({
        owner: args.repository.owner,
        repo: args.repository.name,
        commit_sha: ref.object.sha,
      });

      // Create blobs for new/updated files
      const treeItems = [];
      for (const change of args.changes) {
        if (change.action === "delete") {
          treeItems.push({
            path: change.path,
            mode: "100644" as const,
            type: "blob" as const,
            sha: null, // null means delete
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

      // Create new tree
      const { data: newTree } = await octokit.rest.git.createTree({
        owner: args.repository.owner,
        repo: args.repository.name,
        base_tree: commit.tree.sha,
        tree: treeItems,
      });

      // Create commit
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

      // Update branch reference
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
});

// Create a pull request
export const createPullRequest = action({
  args: {
    repository: repositoryArg,
    branchName: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const octokit = new Octokit({
        auth: args.repository.accessToken,
      });

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
});
