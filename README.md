# Gh Planner

A comprehensive GitHub PR inspector and project planning tool built with Next.js, featuring real-time PR analysis, CI status monitoring, and Kanban-style task management.
gg
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
- **Neon PostgreSQL**: Serverless PostgreSQL database for scalable data storage

## New: Authentication, Companies, and Projects (beta)

The app now includes a basic sign up / sign in flow (Credentials via NextAuth), multi-tenant Companies and Projects, member preferences and a draft auto-allocation API, plus task locking and PR-number support.

Quick start:

1. Environment
   - Set `DATABASE_URL` and `NEXTAUTH_SECRET` (or `JWT_SECRET`) in `.env`.
2. Run the app and visit `/signup` to create an account, then sign in at `/signin`.
3. Onboarding at `/onboarding`: create a company or join with a code.
4. Dashboard at `/dashboard`: manage projects and grab your join code.
5. Planner tasks now support locking (Edit → Lock this task). Locked tasks can only be edited by the locker (admins/staff support coming next).
6. If a project is configured with a GitHub repo, the tasks API accepts `prNumber` to build the PR URL automatically.

API additions (beta):

- `POST /api/auth/signup` → Create an account
- `GET/POST /api/companies` → List or create companies
- `POST /api/companies/join` → Join with code
- `GET/POST/PUT/DELETE /api/projects` → Manage projects; `PUT` accepts `repoOwner`, `repoName`, and `repoToken`
- `GET/PUT /api/preferences` → Save ranked project preferences
- `POST /api/allocations/preview` and `/api/allocations/commit` → Greedy allocation
- Planner tasks `POST` now also accepts `{ prNumber, projectId }` and will derive `prUrl` if the project has a configured repo

Notes:

- Admin/staff role enforcement and full UI for assignments are being implemented next.
- Existing boards/tasks continue to work; new fields are optional for backward compatibility.
- **Containerized Deployment**: Full Podman/Docker support with development and production environments
- **Type Safety**: Full TypeScript implementation with comprehensive type definitions
- **SaaS-Grade UI**: Modern, accessible design with Tailwind CSS

## Quick Start

### Prerequisites
- Node.js 18+
- Podman or Docker
- Neon PostgreSQL account (free tier available at neon.tech)

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

   # Database - Neon PostgreSQL
   DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
   ```

3. **Start development environment**:
   ```bash
   ./run.sh dev
   ```

   This will:
   - Start Next.js development server with hot reload
   - Connect to Neon PostgreSQL database
   - Bind mount source code for live editing

4. **Access the application**:
   - Application: http://localhost:3000
   - Database: Managed by Neon (cloud-hosted)

### Production Deployment

#### Local/Server Deployment

```bash
./run.sh prod
```

This will:
- Build optimised production containers
- Start all services with health checks
- Run detached for production use

#### Cloud Deployment with GitLab CI/CD

For deploying to production with GitLab pipelines, Neon PostgreSQL, and Cloudflare:

1. **📋 Step-by-Step Guide**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md) - **START HERE!** Complete walkthrough with every step
2. **✅ Checklist**: See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Track your progress
3. **⚡ Quick Start**: See [QUICKSTART.md](./QUICKSTART.md) - 15-minute abbreviated guide
4. **📖 Full Reference**: See [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive documentation
5. **⚙️ Environment Variables**: See [ENV_VARIABLES.md](./ENV_VARIABLES.md) - All configuration options

**Quick deployment steps:**
```bash
# Generate secrets
./scripts/setup-secrets.sh

# Manual deployment (optional)
./scripts/deploy-manual.sh

# Test deployment
./scripts/test-deployment.sh https://yourdomain.com
```

The GitLab CI/CD pipeline (`.gitlab-ci.yml`) automatically:
- Runs tests and type checking
- Builds Docker images
- Pushes to GitLab Container Registry
- Deploys to staging/production environments

**Supported deployment targets:**
- Your own server via SSH (recommended with Cloudflare CDN)
- Google Cloud Run
- AWS App Runner
- Any Docker-compatible platform

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
- **Neon PostgreSQL** for scalable data persistence
- **GitHub API** integration with rate limiting
- **NextAuth** for authentication

### Infrastructure
- **Containerized** with Podman/Docker
- **Multi-stage builds** for optimized production images
- **Health checks** for service monitoring
- **Volume persistence** for data retention

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Required |
| `GITHUB_TOKEN` | GitHub personal access token | None (optional) |
| `JWT_SECRET` | Secret for JWT signing | Required for production |
| `NEXTAUTH_SECRET` | NextAuth session secret | Required for production |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `RESEND_API_KEY` | Email service API key | Optional |
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
│   ├── database.ts        # Neon PostgreSQL connection
│   ├── db.ts              # Database helpers and types
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
