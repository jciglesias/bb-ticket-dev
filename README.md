# BB Ticket Dev - GitHub AI Development API

An API service that receives a GitHub repository and development ticket, uses BlackBox AI to generate code changes, and automatically creates commits to the repository.

## Features

- 🤖 **AI-Powered Development**: Uses BlackBox AI (Claude 3.5 Sonnet) to analyze repositories and implement tickets
- 🔄 **Automated Commits**: Automatically creates and pushes commits to GitHub repositories
- 📁 **Full Repository Analysis**: Reads entire repository structure for context-aware development
- 🛡️ **Error Handling**: Comprehensive error handling and validation
- 🚀 **RESTful API**: Simple HTTP API for easy integration

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bb-ticket-dev
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start the server:
```bash
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# BlackBox AI API Configuration
BLACKBOX_API_KEY=your_blackbox_api_key_here

# Server Configuration
PORT=8000
```

## API Endpoints

### POST /api/develop-ticket

Develops a ticket for a GitHub repository using AI and creates a commit.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/username/repository",
  "ticket": "Add user authentication system with JWT tokens",
  "githubToken": "ghp_your_github_personal_access_token"
}
```

**Response:**
```json
{
  "message": "Ticket developed and committed successfully",
  "commitSha": "abc123def456...",
  "commitMessage": "Add user authentication system with JWT tokens",
  "filesModified": 3
}
```

**Error Response:**
```json
{
  "error": "Failed to process ticket",
  "details": "Error description"
}
```

### GET /health

Health check endpoint to verify the API is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Usage Examples

### Using cURL

```bash
curl -X POST http://localhost:8000/api/develop-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/username/my-project",
    "ticket": "Implement user registration endpoint with email validation",
    "githubToken": "ghp_your_token_here"
  }'
```

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const developTicket = async () => {
  try {
    const response = await axios.post('http://localhost:8000/api/develop-ticket', {
      repoUrl: 'https://github.com/username/my-project',
      ticket: 'Add password reset functionality',
      githubToken: 'ghp_your_token_here'
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

developTicket();
```

### Using Python

```python
import requests

url = "http://localhost:8000/api/develop-ticket"
data = {
    "repoUrl": "https://github.com/username/my-project",
    "ticket": "Implement file upload feature with validation",
    "githubToken": "ghp_your_token_here"
}

response = requests.post(url, json=data)
print(response.json())
```

## How It Works

1. **Repository Analysis**: The API fetches all files from the specified GitHub repository
2. **AI Processing**: Sends the repository context and ticket to BlackBox AI for analysis
3. **Code Generation**: AI generates the necessary code changes and file modifications
4. **Commit Creation**: Creates a new commit with the generated changes
5. **Push to GitHub**: Automatically pushes the commit to the repository

## GitHub Token Requirements

Your GitHub personal access token needs the following permissions:
- `repo` (Full control of private repositories)
- `public_repo` (Access to public repositories)

To create a token:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select required scopes
4. Copy the token and add it to your requests

## Error Handling

The API handles various error scenarios:
- Invalid repository URLs
- Missing required fields
- GitHub API errors
- BlackBox AI API errors
- Network connectivity issues

All errors return appropriate HTTP status codes and descriptive error messages.

## Security Considerations

- Never commit your `.env` file with real API keys
- Use environment variables for sensitive configuration
- Validate GitHub tokens before processing requests
- Consider rate limiting for production use
- Use HTTPS in production environments

## Development

### Running in Development Mode

```bash
npm run dev
```

### Testing the API

```bash
# Health check
curl http://localhost:8000/health

# Test with a sample request
curl -X POST http://localhost:8000/api/develop-ticket \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/test/repo", "ticket": "test", "githubToken": "test"}'
```

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please create an issue in the GitHub repository.
