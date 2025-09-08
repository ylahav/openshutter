# Docker Deployment Guide

This guide covers deploying OpenShutter using Docker containers.

## 🐳 Docker Options

OpenShutter provides two Docker deployment options:

1. **Standalone Application** - Uses external MongoDB
2. **Full Stack** - Includes MongoDB container

## 📋 Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM available
- Ports 4000 and 27017 available (if using MongoDB container)

## 🚀 Quick Start

### Option 1: Standalone Application (External MongoDB)

1. **Start the application:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Open http://localhost:4000
   - Login with admin credentials (see [Admin Setup](ADMIN_SETUP.md))

### Option 2: Full Stack (with MongoDB)

1. **Start the full stack:**
   ```bash
   docker-compose -f docker-compose.with-mongo.yml up -d
   ```

2. **Access the application:**
   - Open http://localhost:4000
   - Login with admin credentials (see [Admin Setup](ADMIN_SETUP.md))

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file or set environment variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/openshutter
MONGODB_DB=openshutter

# NextAuth Configuration
NEXTAUTH_SECRET=your_secure_secret_here
NEXTAUTH_URL=http://localhost:4000

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:4000
```

### MongoDB Configuration (Full Stack)

The MongoDB container includes:
- **Root User**: `admin` / `password123`
- **App User**: `openshutter` / `openshutter123`
- **Database**: `openshutter`
- **Port**: `27017`

## 📁 Storage Configuration

### Local Storage

The Docker setup includes a `./storage` directory mounted to `/app/storage` in the container for local file storage.

### External Storage

Configure Google Drive, AWS S3, or other storage providers through the admin dashboard at `/admin/storage`.

## 🛠️ Development

### Build Custom Image

```bash
# Build the application image
docker build -t openshutter:latest .

# Build with MongoDB
docker build -f Dockerfile.with-mongo -t openshutter:with-mongo .
```

### Run Development Container

```bash
# Run with external MongoDB
docker-compose up -d

# Run with included MongoDB
docker-compose -f docker-compose.with-mongo.yml up -d
```

## 🔍 Monitoring

### Health Checks

Both containers include health checks:
- **Application**: `http://localhost:4000/api/health`
- **MongoDB**: Internal MongoDB ping check

### View Logs

```bash
# Application logs
docker-compose logs -f openshutter

# MongoDB logs (full stack)
docker-compose -f docker-compose.with-mongo.yml logs -f mongodb

# All logs
docker-compose logs -f
```

## 🗄️ Data Persistence

### MongoDB Data

MongoDB data is persisted in a Docker volume:
- **Volume**: `mongodb_data`
- **Location**: Docker's internal volume storage

### Application Data

- **Storage files**: `./storage` directory (mounted)
- **Configuration**: Stored in MongoDB

## 🔒 Security

### Production Considerations

1. **Change default passwords:**
   - MongoDB root password
   - Application admin credentials
   - NextAuth secret

2. **Use secrets management:**
   ```bash
   # Create secrets file
   echo "your_secure_nextauth_secret" > .env.secrets
   
   # Use in docker-compose
   env_file:
     - .env.secrets
   ```

3. **Enable HTTPS:**
   - Use reverse proxy (nginx, traefik)
   - Configure SSL certificates

## 🚀 Production Deployment

### Using Docker Compose

1. **Prepare environment:**
   ```bash
   # Copy and edit environment file
   cp .env.example .env.production
   
   # Set production values
   NODE_ENV=production
   NEXTAUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

2. **Deploy:**
   ```bash
   # Full stack deployment
   docker-compose -f docker-compose.with-mongo.yml -f docker-compose.prod.yml up -d
   ```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.with-mongo.yml openshutter
```

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check port usage
   netstat -tulpn | grep :4000
   netstat -tulpn | grep :27017
   ```

2. **Permission issues:**
   ```bash
   # Fix storage directory permissions
   sudo chown -R 1001:1001 ./storage
   ```

3. **MongoDB connection issues:**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Test connection
   docker exec -it openshutter-mongodb mongosh
   ```

### Reset Everything

```bash
# Stop and remove containers
docker-compose down -v

# Remove images
docker rmi openshutter:latest

# Clean up volumes
docker volume prune
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)

---

*For more deployment options, see the main [Deployment Guide](deploy.md).*
