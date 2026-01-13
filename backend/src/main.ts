import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const cookieParser = require('cookie-parser');
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// In production: Use shared timestamp file so frontend and backend use the same JWT secret
// In development: Use shared timestamp file so frontend and backend use the same JWT secret
const isProduction = process.env.NODE_ENV === 'production';
// Use project root directory for shared timestamp file (both frontend and backend can access it)
// Backend is typically at <root>/backend, so go up one level to get to root
const ROOT_DIR = join(process.cwd(), '..');
const TIMESTAMP_FILE = join(ROOT_DIR, '.server-start-time');
const PID_FILE = join(process.cwd(), '.server-pid');

function getServerStartTime(): string {
  // Both production and development use shared timestamp file
  // This ensures frontend and backend always use the same JWT secret
  const serverType = isProduction ? 'BACKEND (PROD)' : 'BACKEND (DEV)';
  
  if (isProduction) {
    // Production: Check if timestamp file exists, if not create new one (restart scenario)
    // If it exists, use it (so both servers use the same secret)
    if (existsSync(TIMESTAMP_FILE)) {
      try {
        const existingTimestamp = readFileSync(TIMESTAMP_FILE, 'utf8').trim();
        console.log(`🔐 ${serverType} - Using existing shared timestamp: ${existingTimestamp} (from ${TIMESTAMP_FILE})`);
        // Use existing timestamp so both servers share the same secret
        return existingTimestamp;
      } catch (error) {
        console.warn(`⚠️  ${serverType} - Failed to read timestamp file:`, error);
        // If read fails, create new timestamp
      }
    }
    // Create new timestamp file (first server to start, or after both restart)
    const timestamp = Date.now().toString();
    try {
      writeFileSync(TIMESTAMP_FILE, timestamp, 'utf8');
      console.log(`🔐 ${serverType} - Created new shared timestamp: ${timestamp} (at ${TIMESTAMP_FILE})`);
    } catch (error) {
      console.warn(`⚠️  ${serverType} - Failed to write timestamp file:`, error);
      // If write fails, just use the timestamp (file might not be writable)
    }
    return timestamp;
  } else {
    // Development: Use shared timestamp file so frontend and backend use the same secret
    // First, check if shared timestamp file already exists (from frontend or previous start)
    if (existsSync(TIMESTAMP_FILE)) {
      try {
        const existingTimestamp = readFileSync(TIMESTAMP_FILE, 'utf8').trim();
        console.log(`🔐 ${serverType} - Using existing shared timestamp: ${existingTimestamp} (from ${TIMESTAMP_FILE})`);
        // Update PID file for hot reload detection
        const currentPid = process.pid.toString();
        try {
          writeFileSync(PID_FILE, currentPid, 'utf8');
        } catch {
          // PID file write failure is not critical
        }
        return existingTimestamp;
      } catch (error) {
        console.warn(`⚠️  ${serverType} - Failed to read timestamp file:`, error);
        // If read fails, continue to create new timestamp
      }
    }
    
    // No existing timestamp file - check if this is a new process (restart) or same process (hot reload)
    const currentPid = process.pid.toString();
    let isNewProcess = true;
    
    if (existsSync(PID_FILE)) {
      try {
        const storedPid = readFileSync(PID_FILE, 'utf8').trim();
        if (storedPid === currentPid) {
          // Same process - this is a hot reload, but no timestamp file exists
          // This shouldn't happen, but create a new one
          isNewProcess = false;
        }
      } catch {
        // If read fails, treat as new process
      }
    }
    
    // Create new timestamp file (first server to start, or after both restart)
    const timestamp = Date.now().toString();
    try {
      writeFileSync(TIMESTAMP_FILE, timestamp, 'utf8');
      writeFileSync(PID_FILE, currentPid, 'utf8');
      if (isNewProcess) {
        console.log(`🔐 ${serverType} - Created new shared timestamp (restart): ${timestamp} (at ${TIMESTAMP_FILE})`);
      } else {
        console.log(`🔐 ${serverType} - Created new shared timestamp (no existing file): ${timestamp} (at ${TIMESTAMP_FILE})`);
      }
    } catch (error) {
      console.warn(`⚠️  ${serverType} - Failed to write timestamp file:`, error);
      // If write fails, just use the timestamp (file might not be writable)
    }
    return timestamp;
  }
}

// Server startup timestamp - store it in a global variable that can be accessed by guards
(global as any).SERVER_START_TIME = getServerStartTime();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Log server start with timestamp
  const mode = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';
  console.log(`🔐 Backend server started (${mode}) at ${new Date(parseInt((global as any).SERVER_START_TIME)).toISOString()}${isProduction ? ' - all previous sessions invalidated' : ''}`);
  
  // Enable cookie parser for JWT tokens
  app.use(cookieParser());
  
  // Enable CORS with proper configuration
  // Support multiple origins for development and production
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:4000', 'http://localhost:3000', 'http://0.0.0.0:3000'];
  
  // Log allowed origins for debugging
  console.log('🌐 CORS allowed origins:', allowedOrigins);
  
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Normalize origin for comparison (remove trailing slash, handle http/https)
      const normalizeOrigin = (url: string) => {
        try {
          const urlObj = new URL(url);
          return `${urlObj.protocol}//${urlObj.host}`;
        } catch {
          return url.replace(/\/$/, ''); // Remove trailing slash if URL parsing fails
        }
      };
      
      const normalizedOrigin = normalizeOrigin(origin);
      
      // Check if origin matches any allowed origin (exact match or starts with)
      const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = normalizeOrigin(allowed);
        // Exact match
        if (normalizedOrigin === normalizedAllowed) return true;
        // Starts with match (for cases like http://localhost:4000 matching http://localhost:4000/)
        if (normalizedOrigin.startsWith(normalizedAllowed) || normalizedAllowed.startsWith(normalizedOrigin)) {
          return true;
        }
        // Check if hostname matches (for http vs https)
        try {
          const originUrl = new URL(origin);
          const allowedUrl = new URL(allowed);
          if (originUrl.hostname === allowedUrl.hostname) return true;
        } catch {
          // Ignore URL parsing errors
        }
        return false;
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      // For development, allow localhost on any port
      if (process.env.NODE_ENV !== 'production') {
        try {
          const originUrl = new URL(origin);
          if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
            return callback(null, true);
          }
        } catch {
          // Ignore URL parsing errors
        }
      }
      
      // Log blocked origin for debugging
      console.warn('🚫 CORS blocked origin:', origin, 'Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Global validation pipe
  // Note: For full validation features, install class-validator and class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Don't forbid, just strip unknown properties
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Global prefix for API routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  await app.listen(port);
  
  console.log(`🚀 NestJS server running on port ${port}`);
}

bootstrap();
