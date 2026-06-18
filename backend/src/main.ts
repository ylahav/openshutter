import './services/ai-tagging/tfjs-node-util-polyfill';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './config/swagger.config';
import type { Request, Response, NextFunction } from 'express';

const cookieParser = require('cookie-parser');

function applySecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  const mode = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
  logger.log(`🚀 Backend server started (${mode})`);
  
  // Security headers
  app.use(applySecurityHeaders);

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
  
  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Requests with no Origin header (e.g. curl, server-to-server) — allow in dev, block in prod.
      if (!origin) {
        return isProduction ? callback(new Error('Not allowed by CORS')) : callback(null, true);
      }

      const normalizeOrigin = (url: string) => {
        try {
          const { protocol, host } = new URL(url);
          return `${protocol}//${host}`;
        } catch {
          return url.replace(/\/$/, '');
        }
      };

      const normalizedOrigin = normalizeOrigin(origin);

      // Exact protocol+host match against the explicit allow-list.
      const isAllowed = uniqueOrigins.some(allowed => normalizedOrigin === normalizeOrigin(allowed));
      if (isAllowed) return callback(null, true);

      // In development: also allow any *.localhost subdomain (owner-site dev).
      if (!isProduction) {
        try {
          const h = new URL(origin).hostname;
          if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) {
            return callback(null, true);
          }
        } catch {
          // Ignore URL parsing errors
        }
      }

      logger.warn(`🚫 CORS blocked origin: ${origin}`);
      logger.warn('💡 To fix: Set FRONTEND_URL or CORS_ORIGINS in backend/.env');
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
  
  // Setup Swagger/OpenAPI documentation (only in development or if enabled)
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    setupSwagger(app);
    logger.log('📚 Swagger documentation available at /api/v1/docs');
  }
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  await app.listen(port);
  
  logger.log(`🚀 NestJS server running on port ${port}`);
}

bootstrap();
