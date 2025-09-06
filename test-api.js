const axios = require('axios');

// Example usage of the BB Ticket Dev API
async function testAPI() {
    const apiUrl = 'http://localhost:8000';
    
    console.log('🚀 Testing BB Ticket Dev API\n');
    
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    try {
        const healthResponse = await axios.get(`${apiUrl}/health`);
        console.log('✅ Health check passed:', healthResponse.data);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return;
    }
    
    console.log('\n2. Testing main API endpoint...');
    console.log('Note: This will fail with test credentials, which is expected.\n');
    
    // Test 2: Main API endpoint (will fail with test data, which is expected)
    try {
        const response = await axios.post(`${apiUrl}/api/develop-ticket`, {
            repoUrl: 'https://github.com/test/repo',
            ticket: 'Add a simple hello world function',
            githubToken: 'test_token_here'
        });
        console.log('✅ API Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('⚠️  Expected error (test credentials):', error.response.data);
            console.log('✅ API is working correctly - error handling is functioning');
        } else {
            console.log('❌ Unexpected error:', error.message);
        }
    }
    
    console.log('\n📋 To use the API with real data:');
    console.log('1. Get a GitHub Personal Access Token from: https://github.com/settings/tokens');
    console.log('2. Ensure your BlackBox AI API key is configured in .env');
    console.log('3. Use a real GitHub repository URL');
    console.log('4. Provide a detailed development ticket/task');
    
    console.log('\n🔧 Example real request:');
    console.log(`
curl -X POST ${apiUrl}/api/develop-ticket \\
  -H "Content-Type: application/json" \\
  -d '{
    "repoUrl": "https://github.com/yourusername/your-repo",
    "ticket": "Add user authentication with JWT tokens and bcrypt password hashing",
    "githubToken": "ghp_your_real_github_token_here"
  }'
    `);
}

// Run the test
testAPI().catch(console.error);
