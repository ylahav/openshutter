#!/bin/bash

# OpenShutter Docker Management Scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to build the application
build_app() {
    print_status "Building OpenShutter application..."
    docker build -t openshutter:latest .
    print_success "Application built successfully!"
}

# Function to start with external MongoDB
start_external() {
    print_status "Starting OpenShutter with external MongoDB..."
    docker-compose up -d
    print_success "Application started! Access at http://localhost:4000"
}

# Function to start with included MongoDB
start_with_mongo() {
    print_status "Starting OpenShutter with MongoDB..."
    docker-compose -f docker-compose.with-mongo.yml up -d
    print_success "Application started! Access at http://localhost:4000"
    print_warning "MongoDB credentials: admin/password123"
}

# Function to stop the application
stop_app() {
    print_status "Stopping OpenShutter..."
    docker-compose down
    docker-compose -f docker-compose.with-mongo.yml down
    print_success "Application stopped!"
}

# Function to view logs
view_logs() {
    print_status "Viewing application logs..."
    docker-compose logs -f
}

# Function to view logs with MongoDB
view_logs_mongo() {
    print_status "Viewing application logs (with MongoDB)..."
    docker-compose -f docker-compose.with-mongo.yml logs -f
}

# Function to reset everything
reset_all() {
    print_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Resetting OpenShutter..."
        docker-compose down -v
        docker-compose -f docker-compose.with-mongo.yml down -v
        docker rmi openshutter:latest 2>/dev/null || true
        docker volume prune -f
        print_success "Reset complete!"
    else
        print_status "Reset cancelled."
    fi
}

# Function to show status
show_status() {
    print_status "OpenShutter Status:"
    echo ""
    echo "Containers:"
    docker ps --filter "name=openshutter" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "Images:"
    docker images --filter "reference=openshutter" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    echo ""
    echo "Volumes:"
    docker volume ls --filter "name=openshutter" --format "table {{.Name}}\t{{.Driver}}"
}

# Function to show help
show_help() {
    echo "OpenShutter Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build              Build the application image"
    echo "  start              Start with external MongoDB"
    echo "  start-mongo        Start with included MongoDB"
    echo "  stop               Stop the application"
    echo "  logs               View application logs"
    echo "  logs-mongo         View logs (with MongoDB)"
    echo "  status             Show container status"
    echo "  reset              Reset everything (containers, images, volumes)"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build           # Build the application"
    echo "  $0 start-mongo     # Start with MongoDB included"
    echo "  $0 logs            # View logs"
    echo "  $0 status          # Check status"
}

# Main script logic
main() {
    check_docker
    
    case "${1:-help}" in
        build)
            build_app
            ;;
        start)
            start_external
            ;;
        start-mongo)
            start_with_mongo
            ;;
        stop)
            stop_app
            ;;
        logs)
            view_logs
            ;;
        logs-mongo)
            view_logs_mongo
            ;;
        status)
            show_status
            ;;
        reset)
            reset_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
