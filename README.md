# figcli

A powerful CLI tool for GitHub and Figma API interactions built with TypeScript.

## Features

- **GitHub Integration**: List repositories with sorting options
- **Figma Integration**: Fetch frames and metadata from Figma files
- Built with TypeScript and Commander.js
- Secure token-based authentication for both services

## Installation

1. Install globally:
```bash
npm install -g .
```

2. Set your API tokens as environment variables:
```bash
export GITHUB_TOKEN=your_github_personal_access_token_here
export FIGMA_TOKEN=your_figma_personal_access_token_here
```

## Setup

### GitHub Personal Access Token

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the required scopes:
   - `repo` - for private repositories
   - `public_repo` - for public repositories only
4. Copy the generated token
5. Set it as an environment variable:
   ```bash
   export GITHUB_TOKEN=your_token_here
   ```

### Figma Personal Access Token

1. Go to [Figma Account Settings](https://www.figma.com/developers/api#authentication)
2. Generate a new personal access token
3. Copy the generated token
4. Set it as an environment variable:
   ```bash
   export FIGMA_TOKEN=your_token_here
   ```

## Usage

### GitHub Commands

```bash
# Show GitHub commands help
figcli github --help

# List repositories sorted by update date
figcli github list-repos updated

# List repositories sorted by stars
figcli github list-repos stars

# Available sort options: created, updated, pushed, full_name
```

### Figma Commands

```bash
# Show Figma commands help
figcli figma --help

# List all frames in a Figma file
figcli figma frames <file-key>

# Get detailed metadata for a specific frame
figcli figma frame <file-key> <frame-id>
```

### General Commands

```bash
# Show main help
figcli --help

# Show version
figcli --version
```

## Configuration

Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

Then edit `.env` and add your API tokens:
```
GITHUB_TOKEN=your_github_personal_access_token_here
FIGMA_TOKEN=your_figma_personal_access_token_here
```

## Examples

### GitHub Examples
```bash
# List repositories sorted by creation date
figcli github list-repos created

# List repositories sorted by full name
figcli github list-repos full_name
```

### Figma Examples
```bash
# List frames in a Figma file (file key from URL: figma.com/file/{file-key}/...)
figcli figma frames abc123def456

# Get detailed info for a specific frame
figcli figma frame abc123def456 ghi789jkl012
```

## Security

- Never commit your actual API tokens to version control
- Use environment variables for sensitive data
- Tokens are only used locally and not stored anywhere
- Each service requires its own authentication token

## Development

```bash
# Build the project
npm run build

# Test GitHub commands locally
node dist/index.js github list-repos updated

# Test Figma commands locally
node dist/index.js figma frames <file-key>
