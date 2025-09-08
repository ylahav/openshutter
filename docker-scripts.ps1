# OpenShutter Docker Management Scripts (PowerShell)

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        exit 1
    }
}

# Function to build the application
function Build-App {
    Write-Status "Building OpenShutter application..."
    docker build -t openshutter:latest .
    Write-Success "Application built successfully!"
}

# Function to start with external MongoDB
function Start-External {
    Write-Status "Starting OpenShutter with external MongoDB..."
    docker-compose up -d
    Write-Success "Application started! Access at http://localhost:4000"
}

# Function to start with included MongoDB
function Start-WithMongo {
    Write-Status "Starting OpenShutter with MongoDB..."
    docker-compose -f docker-compose.with-mongo.yml up -d
    Write-Success "Application started! Access at http://localhost:4000"
    Write-Warning "MongoDB credentials: admin/password123"
}

# Function to stop the application
function Stop-App {
    Write-Status "Stopping OpenShutter..."
    docker-compose down
    docker-compose -f docker-compose.with-mongo.yml down
    Write-Success "Application stopped!"
}

# Function to view logs
function View-Logs {
    Write-Status "Viewing application logs..."
    docker-compose logs -f
}

# Function to view logs with MongoDB
function View-LogsMongo {
    Write-Status "Viewing application logs (with MongoDB)..."
    docker-compose -f docker-compose.with-mongo.yml logs -f
}

# Function to reset everything
function Reset-All {
    $response = Read-Host "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    if ($response -match "^[yY]([eE][sS])?$") {
        Write-Status "Resetting OpenShutter..."
        docker-compose down -v
        docker-compose -f docker-compose.with-mongo.yml down -v
        docker rmi openshutter:latest 2>$null
        docker volume prune -f
        Write-Success "Reset complete!"
    }
    else {
        Write-Status "Reset cancelled."
    }
}

# Function to show status
function Show-Status {
    Write-Status "OpenShutter Status:"
    Write-Host ""
    Write-Host "Containers:"
    docker ps --filter "name=openshutter" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host ""
    Write-Host "Images:"
    docker images --filter "reference=openshutter" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    Write-Host ""
    Write-Host "Volumes:"
    docker volume ls --filter "name=openshutter" --format "table {{.Name}}\t{{.Driver}}"
}

# Function to show help
function Show-Help {
    Write-Host "OpenShutter Docker Management Script (PowerShell)"
    Write-Host ""
    Write-Host "Usage: .\docker-scripts.ps1 [COMMAND]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  build              Build the application image"
    Write-Host "  start              Start with external MongoDB"
    Write-Host "  start-mongo        Start with included MongoDB"
    Write-Host "  stop               Stop the application"
    Write-Host "  logs               View application logs"
    Write-Host "  logs-mongo         View logs (with MongoDB)"
    Write-Host "  status             Show container status"
    Write-Host "  reset              Reset everything (containers, images, volumes)"
    Write-Host "  help               Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\docker-scripts.ps1 build           # Build the application"
    Write-Host "  .\docker-scripts.ps1 start-mongo     # Start with MongoDB included"
    Write-Host "  .\docker-scripts.ps1 logs            # View logs"
    Write-Host "  .\docker-scripts.ps1 status          # Check status"
}

# Main script logic
function Main {
    Test-Docker
    
    switch ($Command.ToLower()) {
        "build" {
            Build-App
        }
        "start" {
            Start-External
        }
        "start-mongo" {
            Start-WithMongo
        }
        "stop" {
            Stop-App
        }
        "logs" {
            View-Logs
        }
        "logs-mongo" {
            View-LogsMongo
        }
        "status" {
            Show-Status
        }
        "reset" {
            Reset-All
        }
        "help" {
            Show-Help
        }
        default {
            Write-Error "Unknown command: $Command"
            Write-Host ""
            Show-Help
            exit 1
        }
    }
}

# Run main function
Main
