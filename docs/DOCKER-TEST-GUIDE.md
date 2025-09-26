# Docker Test Guide

## Step 1: Start Docker Desktop

1. **Start Docker Desktop** from:
   - Start menu → Docker Desktop
   - Or system tray → Docker Desktop icon
   - Or run: `"C:\Program Files\Docker\Docker\Docker Desktop.exe"`

2. **Wait for Docker to start** (you'll see the Docker whale icon in the system tray)

## Step 2: Test Docker Setup

Run the test script to verify everything is working:

```bash
pnpm docker:test
```

This will:
- ✅ Check if Docker is running
- ✅ Check if Docker Compose is available  
- ✅ Create a test `.env.local` file
- ✅ Build the Docker image
- ✅ Verify the setup is working

## Step 3: Deploy the Application

Once the test passes, you can deploy:

### Production Deployment
```bash
pnpm docker:prod
```

### Development Deployment
```bash
pnpm docker:dev
```

## Step 4: Access the Application

- **URL**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

## Troubleshooting

### Docker Desktop Won't Start
1. Check if virtualization is enabled in BIOS
2. Check if Hyper-V is enabled (Windows Pro/Enterprise)
3. Restart Docker Desktop
4. Check Windows version compatibility

### Build Fails
1. Check if all files are present
2. Check if `.env.local` exists
3. Check Docker logs: `pnpm docker:logs`

### Container Won't Start
1. Check environment variables
2. Check MongoDB connection
3. Check port 4000 is available
4. Check Docker logs: `pnpm docker:logs`

## Useful Commands

```bash
# Test Docker setup
pnpm docker:test

# Build image only
pnpm docker:build

# Start production
pnpm docker:prod

# Start development
pnpm docker:dev

# View logs
pnpm docker:logs

# Stop containers
pnpm docker:stop

# Clean up
pnpm docker:clean
```

## Next Steps After Testing

1. **Configure MongoDB**: Make sure your MongoDB is running and accessible
2. **Update Environment**: Edit `.env.local` with your actual values
3. **Deploy**: Use `pnpm docker:prod` for production
4. **Monitor**: Use `pnpm docker:logs` to monitor the application

## Production Considerations

- Use a proper MongoDB instance (not localhost)
- Set strong secrets in `.env.local`
- Configure proper storage paths
- Set up monitoring and logging
- Consider using a reverse proxy (nginx)
