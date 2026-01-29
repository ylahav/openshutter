import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  const mode = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
  logger.log(`🚀 Backend server started (${mode})`);
  
  // Enable cookie parser for JWT tokens
  app.use(cookieParser());
  
  // Enable CORS with proper configuration
  // Support multiple origins for development and production
  // Check both FRONTEND_URL and CORS_ORIGINS environment variables
  const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGINS || '';
  const defaultOrigins = ['http://localhost:4000', 'http://localhost:3000', 'http://0.0.0.0:3000'];
  
  const allowedOrigins = frontendUrl
    ? [
        ...frontendUrl.split(',').reduce((acc: string[], url: string) => {
          const trimmed = url.trim();
          if (trimmed) acc.push(trimmed);
          return acc;
        }, []),
        ...defaultOrigins
      ]
    : defaultOrigins;
  
  // Remove duplicates
  const uniqueOrigins = [...new Set(allowedOrigins)];
  
  // Log allowed origins for debugging
  logger.log('🌐 CORS allowed origins: ' + uniqueOrigins.join(', '));
  
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
      const isAllowed = uniqueOrigins.some(allowed => {
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
      logger.warn(`🚫 CORS blocked origin: ${origin}`);
      logger.warn(`💡 To fix: Set FRONTEND_URL or CORS_ORIGINS environment variable in backend/.env`);
      logger.warn('   Example: FRONTEND_URL=https://yairl.com,http://localhost:3021');
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
  
  logger.log(`🚀 NestJS server running on port ${port}`);
}

bootstrap();
