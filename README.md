# GitHub Planner

A comprehensive GitHub PR inspector and project planning tool built with Next.js, featuring real-time PR analysis, CI status monitoring, and Kanban-style task management.

## Features

### 🔍 GitHub PR Inspector
- **Comprehensive PR Analysis**: Fetch and display detailed PR information including stats, reviews, and file changes
- **CI/CD Integration**: Real-time status checks and check runs with direct links to details
- **File Change Visualization**: View modified files with additions/deletions and direct GitHub blob links
- **Review Summary**: Latest reviews by user with status indicators
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 📋 Project Planner
- **Kanban Board**: Interactive task management with drag-and-drop functionality
- **Task Management**: Create, update, and organize tasks across different buckets (Backlog, Active, Review, Done, Icebox)
- **GitHub Integration**: Link tasks to GitHub PRs for seamless workflow
- **Progress Tracking**: Visual progress indicators and checklist management
- **Collaborative Features**: Comments and discussion threads for each PR

### 🛠 Technical Features
- **Robust API**: RESTful endpoints with comprehensive error handling and validation
- **MongoDB Integration**: Persistent storage for comments, tasks, and boards
- **Containerized Deployment**: Full Podman/Docker support with development and production environments
- **Type Safety**: Full TypeScript implementation with comprehensive type definitions
- **SaaS-Grade UI**: Modern, accessible design with Tailwind CSS

## Quick Start

### Prerequisites
- Node.js 18+
- Podman or Docker
- MongoDB (handled automatically in containerized setup)

### Local Development

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd githubplanner
   cp .env.example .env
   ```

2. **Configure environment**:
   Edit `.env` with your settings:
   ```bash
   # Required for GitHub integration
   GITHUB_TOKEN=your_github_token_here

   # Required for authentication
   JWT_SECRET=your-secure-secret-here

   # Database (automatically configured for containers)
   MONGODB_URI=mongodb://admin:password@mongo:27017/github_planner?authSource=admin
   ```

3. **Start development environment**:
   ```bash
   ./run.sh dev
   ```

   This will:
   - Start MongoDB container
   - Start Next.js development server with hot reload
   - Bind mount source code for live editing

4. **Access the application**:
   - Application: http://localhost:3000
   - MongoDB: localhost:27017

### Production Deployment

```bash
./run.sh prod
```

This will:
- Build optimized production containers
- Start all services with health checks
- Run detached for production use

### Available Commands

```bash
./run.sh dev      # Start development environment
./run.sh prod     # Start production environment
./run.sh down     # Stop all services
./run.sh logs     # View logs (add service name for specific logs)
./run.sh status   # Check service status
./run.sh clean    # Clean up containers and volumes
./run.sh help     # Show detailed help
```

## API Reference

### GitHub PR Analysis
```
GET /api/github/pr?url=https://github.com/owner/repo/pull/123
```

Returns comprehensive PR data including:
- Basic PR information (title, description, state, etc.)
- Statistics (commits, files changed, additions/deletions)
- Review summaries by user
- CI status and check runs
- Changed files with GitHub blob links

### Comments System
```
GET    /api/github/pr/comments?url=<pr_url>  # Get comments
POST   /api/github/pr/comments               # Create comment
PUT    /api/github/pr/comments               # Update comment
DELETE /api/github/pr/comments?id=<id>      # Delete comment
```

### Task Management
```
GET    /api/planner/tasks?boardId=<id>       # Get tasks
POST   /api/planner/tasks                    # Create task
PATCH  /api/planner/tasks                    # Update task
DELETE /api/planner/tasks?id=<id>           # Delete task
```

### Board Management
```
GET  /api/planner/boards                     # Get boards
POST /api/planner/boards                     # Create board
```

## Architecture

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide Icons** for consistent iconography

### Backend
- **Next.js API Routes** for serverless functions
- **MongoDB** for data persistence
- **GitHub API** integration with rate limiting
- **JWT** for authentication (future feature)

### Infrastructure
- **Containerized** with Podman/Docker
- **Multi-stage builds** for optimized production images
- **Health checks** for service monitoring
- **Volume persistence** for data retention

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongo:27017/github_planner` |
| `GITHUB_TOKEN` | GitHub personal access token | None (optional) |
| `JWT_SECRET` | Secret for JWT signing | Required for production |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `3000` |

### GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with scopes:
   - `repo` (for private repositories)
   - `read:org` (for organization repositories)
3. Add the token to your `.env` file

## Development

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── github/        # GitHub integration
│   │   └── planner/       # Task management
│   ├── pr/                # PR Inspector page
│   ├── planner/           # Planner board page
│   └── layout.tsx         # Root layout
├── lib/                   # Shared utilities
│   ├── github.ts          # GitHub API utilities
│   ├── mongodb.ts         # Database connection
│   └── types.ts           # TypeScript definitions
```

### Key Features

#### URL Parsing
Robust GitHub PR URL parsing with support for:
- Standard URLs: `https://github.com/owner/repo/pull/123`
- Scheme-less URLs: `github.com/owner/repo/pull/123`
- Validation and error handling

#### Error Handling
Comprehensive error responses with helpful hints:
- 400: Invalid URL format with formatting guidance
- 403: Access forbidden with SSO/token scope hints
- 404: PR not found with verification suggestions

#### Data Models
Type-safe interfaces for all data structures:
- PR data with nested objects for clean organization
- Task management with status tracking
- Comment system with user attribution

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper TypeScript types
4. Test with both dev and prod containers
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub Issues tab.

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**