#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="compose.podman.yaml"
PROJECT_NAME="github-planner"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if podman-compose is available
check_podman_compose() {
    if ! command -v podman-compose &> /dev/null; then
        print_error "podman-compose not found. Please install it first:"
        echo "  pip install podman-compose"
        exit 1
    fi
}

# Function to check environment file
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Using default configuration..."
        print_status "For production use, create a .env file with:"
        echo "  NEXTAUTH_SECRET=<your-secret>"
        echo "  JWT_SECRET=<your-secret>"
        echo "  GITHUB_TOKEN=<your-token>"
        echo "  RESEND_API_KEY=<your-key>"
        echo ""
    fi
}

# Function to wait for application to be ready
wait_for_app() {
    print_status "Waiting for application to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/api/health &> /dev/null; then
            print_success "Application is ready!"
            return 0
        fi

        print_status "Attempt $attempt/$max_attempts: Application not ready yet..."
        sleep 2
        ((attempt++))
    done

    print_error "Application failed to start within expected time"
    return 1
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment with hot reload..."
    check_podman_compose
    check_env_file

    print_status "Starting development web server with file watching..."
    print_status "Hot reload enabled - local changes will automatically update the application"
    print_status "Files are mounted from: $(pwd)"
    print_status "Using Neon PostgreSQL database (configured via DATABASE_URL)"
    print_status "Application will be available at: http://localhost:3000"
    echo ""
    print_warning "To stop the development server, press Ctrl+C"
    echo ""

    # Start the dev server in foreground so we can see logs and stop with Ctrl+C
    podman-compose -f $COMPOSE_FILE --profile dev up app-dev
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    check_podman_compose
    check_env_file

    print_status "Building and starting application..."
    podman-compose -f $COMPOSE_FILE up -d --build app

    if wait_for_app; then
        print_success "Production environment started successfully!"
        print_status "Application available at: http://localhost:3000"
        print_status "Database: Neon PostgreSQL (cloud-hosted)"
        print_status ""
        print_status "To view logs: ./run.sh logs"
        print_status "To stop: ./run.sh down"
    else
        print_warning "Application may still be starting. Check logs with: ./run.sh logs"
    fi
}

# Function to stop all services
stop_services() {
    print_status "Stopping all services..."
    check_podman_compose

    podman-compose -f $COMPOSE_FILE down
    print_success "All services stopped"
}

# Function to show logs
show_logs() {
    check_podman_compose

    if [ -n "$2" ]; then
        print_status "Showing logs for service: $2"
        podman-compose -f $COMPOSE_FILE logs -f "$2"
    else
        print_status "Showing logs for all services..."
        podman-compose -f $COMPOSE_FILE logs -f
    fi
}

# Function to show status
show_status() {
    check_podman_compose

    print_status "Service status:"
    podman-compose -f $COMPOSE_FILE ps

    echo ""
    print_status "Container health:"
    podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up containers and volumes..."
    check_podman_compose

    podman-compose -f $COMPOSE_FILE down -v
    podman system prune -f
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "GitHub Planner Container Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev       Start development environment with hot reload"
    echo "  prod      Start production environment"
    echo "  down      Stop all services"
    echo "  logs      Show logs (add service name as second argument for specific service)"
    echo "  status    Show status of all services"
    echo "  clean     Stop services and clean up volumes"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev                # Start development environment with hot reload"
    echo "  $0 prod               # Start production environment"
    echo "  $0 logs app           # Show logs for production app"
    echo "  $0 logs app-dev       # Show logs for development app"
    echo "  $0 down               # Stop all services"
    echo "  $0 clean              # Clean up volumes and containers"
    echo ""
    echo "Environment variables (optional, set in .env file):"
    echo "  NEXTAUTH_SECRET       # Secret for NextAuth session signing"
    echo "  JWT_SECRET            # Secret for JWT token signing"
    echo "  GITHUB_TOKEN          # Your GitHub personal access token"
    echo "  RESEND_API_KEY        # Resend API key for email sending"
    echo "  EMAIL_FROM            # From address for emails"
    echo ""
    echo "Database:"
    echo "  Database: Neon PostgreSQL (configured via DATABASE_URL env var)"
    echo "  Schema is automatically initialised from schema.sql on first run"
}

# Main script logic
case "${1:-help}" in
    "dev")
        start_dev
        ;;
    "prod")
        start_prod
        ;;
    "down")
        stop_services
        ;;
    "logs")
        show_logs "$@"
        ;;
    "status")
        show_status
        ;;
    "clean")
        cleanup
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac