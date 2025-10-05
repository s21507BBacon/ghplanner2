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
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status "Please edit .env file with your configuration"
        else
            print_error ".env.example not found. Please create .env manually"
            exit 1
        fi
    fi
}

# Function to wait for MongoDB to be ready
wait_for_mongo() {
    print_status "Waiting for MongoDB to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if podman exec github-planner-mongo mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            print_success "MongoDB is ready!"
            return 0
        fi

        print_status "Attempt $attempt/$max_attempts: MongoDB not ready yet..."
        sleep 2
        ((attempt++))
    done

    print_error "MongoDB failed to start within expected time"
    return 1
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment with hot reload..."
    check_podman_compose
    check_env_file

    print_status "Starting MongoDB..."
    podman-compose -f $COMPOSE_FILE up -d mongo

    if wait_for_mongo; then
        print_status "Starting development web server with file watching..."
        print_status "Hot reload enabled - local changes will automatically update the application"
        print_status "Files are mounted from: $(pwd)"
        print_status "Application will be available at: http://localhost:3000"
        echo ""
        print_warning "To stop the development server, press Ctrl+C"
        echo ""

        # Start the dev server in foreground so we can see logs and stop with Ctrl+C
        podman-compose -f $COMPOSE_FILE --profile dev up --no-deps web-dev
    else
        print_error "Failed to start MongoDB, aborting..."
        exit 1
    fi
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    check_podman_compose
    check_env_file

    print_status "Building and starting all services..."
    podman-compose -f $COMPOSE_FILE up -d --build

    if wait_for_mongo; then
        print_success "Production environment started successfully!"
        print_status "Application available at: http://localhost:3000"
        print_status "MongoDB available at: localhost:27017"
    else
        print_error "Failed to start MongoDB, aborting..."
        exit 1
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
    echo "  $0 dev                # Start development environment"
    echo "  $0 prod               # Start production environment"
    echo "  $0 logs web           # Show logs for web service only"
    echo "  $0 down               # Stop all services"
    echo ""
    echo "Environment variables (set in .env file):"
    echo "  GITHUB_TOKEN          # Your GitHub personal access token"
    echo "  JWT_SECRET            # Secret for JWT token signing"
    echo "  MONGODB_URI           # MongoDB connection string (set automatically)"
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