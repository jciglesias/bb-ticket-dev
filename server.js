const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 8000;

// GitHub API helper function to get repository contents
const getRepoContents = async (owner, repo, githubToken, path = '') => {
    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching repo contents:', error.response?.data || error.message);
        throw error;
    }
};

// GitHub API helper function to get file content
const getFileContent = async (owner, repo, path, githubToken) => {
    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.data.content) {
            return Buffer.from(response.data.content, 'base64').toString('utf-8');
        }
        return null;
    } catch (error) {
        console.error(`Error fetching file ${path}:`, error.response?.data || error.message);
        return null;
    }
};

// Recursively get all files from repository
const getAllRepoFiles = async (owner, repo, githubToken, path = '', files = []) => {
    try {
        const contents = await getRepoContents(owner, repo, githubToken, path);
        
        for (const item of contents) {
            if (item.type === 'file') {
                const fileContent = await getFileContent(owner, repo, item.path, githubToken);
                if (fileContent) {
                    files.push({
                        path: item.path,
                        content: fileContent
                    });
                }
            } else if (item.type === 'dir') {
                await getAllRepoFiles(owner, repo, githubToken, item.path, files);
            }
        }
        
        return files;
    } catch (error) {
        console.error('Error getting all repo files:', error.message);
        throw error;
    }
};

// GitHub API helper function to create a commit
const createGitHubCommit = async (owner, repo, files, commitMessage, githubToken) => {
    try {
        // Get the latest commit SHA
        const branchResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        const latestCommitSha = branchResponse.data.object.sha;
        
        // Get the tree SHA from the latest commit
        const commitResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        const baseTreeSha = commitResponse.data.tree.sha;
        
        // Create blobs for each file
        const tree = [];
        for (const file of files) {
            const blobResponse = await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
                content: file.content,
                encoding: 'utf-8'
            }, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            tree.push({
                path: file.path,
                mode: '100644',
                type: 'blob',
                sha: blobResponse.data.sha
            });
        }
        
        // Create a new tree
        const treeResponse = await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
            base_tree: baseTreeSha,
            tree: tree
        }, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        // Create a new commit
        const newCommitResponse = await axios.post(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            message: commitMessage,
            tree: treeResponse.data.sha,
            parents: [latestCommitSha]
        }, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        // Update the reference
        await axios.patch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
            sha: newCommitResponse.data.sha
        }, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        return newCommitResponse.data;
    } catch (error) {
        console.error('Error creating GitHub commit:', error.response?.data || error.message);
        throw error;
    }
};

// Main API endpoint
app.post('/api/develop-ticket', async (req, res) => {
    try {
        const { repoUrl, ticket, githubToken } = req.body;
        
        // Validate input
        if (!repoUrl || !ticket || !githubToken) {
            return res.status(400).json({ 
                error: 'Missing required fields: repoUrl, ticket, and githubToken are required' 
            });
        }
        
        // Parse repository URL
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!repoMatch) {
            return res.status(400).json({ 
                error: 'Invalid GitHub repository URL format' 
            });
        }
        
        const owner = repoMatch[1];
        const repo = repoMatch[2].replace('.git', '');
        
        console.log(`Processing ticket for ${owner}/${repo}`);
        
        // Get all repository files
        console.log('Fetching repository contents...');
        const repoFiles = await getAllRepoFiles(owner, repo, githubToken);
        
        // Prepare repository context for AI
        const repoContext = repoFiles.map(file => 
            `File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``
        ).join('\n\n');
        
        // Call BlackBox AI API
        console.log('Sending request to BlackBox AI...');
        const aiResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'blackboxai/anthropic/claude-3.5-sonnet:beta',
            messages: [
                {
                    role: 'system',
                    content: 'You are a senior software developer. Analyze the provided repository and implement the requested ticket/feature. Provide the complete updated file contents for any files that need to be modified or created. Format your response as JSON with the following structure: {"files": [{"path": "file/path", "content": "complete file content"}], "commitMessage": "descriptive commit message"}'
                },
                {
                    role: 'user',
                    content: `Repository Context:\n${repoContext}\n\nTicket to implement:\n${ticket}\n\nPlease analyze the repository and implement the requested changes. Return the complete updated files and a commit message.`
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.BLACKBOX_API_KEY}`
            }
        });
        
        console.log('Received response from BlackBox AI');
        
        // Parse AI response
        let aiResult;
        try {
            const aiContent = aiResponse.data.choices[0].message.content;
            // Try to extract JSON from the response
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in AI response');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            return res.status(500).json({ 
                error: 'Failed to parse AI response',
                details: parseError.message
            });
        }
        
        if (!aiResult.files || !aiResult.commitMessage) {
            return res.status(500).json({ 
                error: 'Invalid AI response format' 
            });
        }
        
        // Create commit with the changes
        console.log('Creating GitHub commit...');
        const commit = await createGitHubCommit(
            owner, 
            repo, 
            aiResult.files, 
            aiResult.commitMessage, 
            githubToken
        );
        
        console.log('Commit created successfully');
        
        res.status(200).json({ 
            message: 'Ticket developed and committed successfully',
            commitSha: commit.sha,
            commitMessage: aiResult.commitMessage,
            filesModified: aiResult.files.length
        });
        
    } catch (error) {
        console.error('Error processing request:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to process ticket',
            details: error.response?.data || error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`GitHub Ticket Development API is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Main endpoint: POST http://localhost:${PORT}/api/develop-ticket`);
});

module.exports = app;
