"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const cookieParser = require('cookie-parser');
const fs_1 = require("fs");
const path_1 = require("path");
// In production: Use shared timestamp file so frontend and backend use the same JWT secret
// In development: Use shared timestamp file so frontend and backend use the same JWT secret
const isProduction = process.env.NODE_ENV === 'production';
// Use project root directory for shared timestamp file (both frontend and backend can access it)
// Backend is typically at <root>/backend, so go up one level to get to root
const ROOT_DIR = (0, path_1.join)(process.cwd(), '..');
const TIMESTAMP_FILE = (0, path_1.join)(ROOT_DIR, '.server-start-time');
const PID_FILE = (0, path_1.join)(process.cwd(), '.server-pid');
function getServerStartTime() {
    // Both production and development use shared timestamp file
    // This ensures frontend and backend always use the same JWT secret
    const serverType = isProduction ? 'BACKEND (PROD)' : 'BACKEND (DEV)';
    if (isProduction) {
        // Production: Check if timestamp file exists, if not create new one (restart scenario)
        // If it exists, use it (so both servers use the same secret)
        if ((0, fs_1.existsSync)(TIMESTAMP_FILE)) {
            try {
                const existingTimestamp = (0, fs_1.readFileSync)(TIMESTAMP_FILE, 'utf8').trim();
                console.log(`🔐 ${serverType} - Using existing shared timestamp: ${existingTimestamp} (from ${TIMESTAMP_FILE})`);
                // Use existing timestamp so both servers share the same secret
                return existingTimestamp;
            }
            catch (error) {
                console.warn(`⚠️  ${serverType} - Failed to read timestamp file:`, error);
                // If read fails, create new timestamp
            }
        }
        // Create new timestamp file (first server to start, or after both restart)
        const timestamp = Date.now().toString();
        try {
            (0, fs_1.writeFileSync)(TIMESTAMP_FILE, timestamp, 'utf8');
            console.log(`🔐 ${serverType} - Created new shared timestamp: ${timestamp} (at ${TIMESTAMP_FILE})`);
        }
        catch (error) {
            console.warn(`⚠️  ${serverType} - Failed to write timestamp file:`, error);
            // If write fails, just use the timestamp (file might not be writable)
        }
        return timestamp;
    }
    else {
        // Development: Use shared timestamp file so frontend and backend use the same secret
        // First, check if shared timestamp file already exists (from frontend or previous start)
        if ((0, fs_1.existsSync)(TIMESTAMP_FILE)) {
            try {
                const existingTimestamp = (0, fs_1.readFileSync)(TIMESTAMP_FILE, 'utf8').trim();
                console.log(`🔐 ${serverType} - Using existing shared timestamp: ${existingTimestamp} (from ${TIMESTAMP_FILE})`);
                // Update PID file for hot reload detection
                const currentPid = process.pid.toString();
                try {
                    (0, fs_1.writeFileSync)(PID_FILE, currentPid, 'utf8');
                }
                catch (_a) {
                    // PID file write failure is not critical
                }
                return existingTimestamp;
            }
            catch (error) {
                console.warn(`⚠️  ${serverType} - Failed to read timestamp file:`, error);
                // If read fails, continue to create new timestamp
            }
        }
        // No existing timestamp file - check if this is a new process (restart) or same process (hot reload)
        const currentPid = process.pid.toString();
        let isNewProcess = true;
        if ((0, fs_1.existsSync)(PID_FILE)) {
            try {
                const storedPid = (0, fs_1.readFileSync)(PID_FILE, 'utf8').trim();
                if (storedPid === currentPid) {
                    // Same process - this is a hot reload, but no timestamp file exists
                    // This shouldn't happen, but create a new one
                    isNewProcess = false;
                }
            }
            catch (_b) {
                // If read fails, treat as new process
            }
        }
        // Create new timestamp file (first server to start, or after both restart)
        const timestamp = Date.now().toString();
        try {
            (0, fs_1.writeFileSync)(TIMESTAMP_FILE, timestamp, 'utf8');
            (0, fs_1.writeFileSync)(PID_FILE, currentPid, 'utf8');
            if (isNewProcess) {
                console.log(`🔐 ${serverType} - Created new shared timestamp (restart): ${timestamp} (at ${TIMESTAMP_FILE})`);
            }
            else {
                console.log(`🔐 ${serverType} - Created new shared timestamp (no existing file): ${timestamp} (at ${TIMESTAMP_FILE})`);
            }
        }
        catch (error) {
            console.warn(`⚠️  ${serverType} - Failed to write timestamp file:`, error);
            // If write fails, just use the timestamp (file might not be writable)
        }
        return timestamp;
    }
}
// Server startup timestamp - store it in a global variable that can be accessed by guards
global.SERVER_START_TIME = getServerStartTime();
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = yield core_1.NestFactory.create(app_module_1.AppModule);
        // Log server start with timestamp
        const mode = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';
        console.log(`🔐 Backend server started (${mode}) at ${new Date(parseInt(global.SERVER_START_TIME)).toISOString()}${isProduction ? ' - all previous sessions invalidated' : ''}`);
        // Enable cookie parser for JWT tokens
        app.use(cookieParser());
        // Enable CORS with proper configuration
        // Support multiple origins for development and production
        const allowedOrigins = process.env.FRONTEND_URL
            ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
            : ['http://localhost:4000', 'http://localhost:3000', 'http://0.0.0.0:3000'];
        app.enableCors({
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin)
                    return callback(null, true);
                // Check if origin is in allowed list
                if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
                    return callback(null, true);
                }
                // For development, allow localhost on any port
                if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
                    return callback(null, true);
                }
                callback(new Error('Not allowed by CORS'));
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        });
        // Global validation pipe
        // Note: For full validation features, install class-validator and class-transformer
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false, // Don't forbid, just strip unknown properties
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }));
        // Global exception filter
        app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
        // Global prefix for API routes
        app.setGlobalPrefix('api');
        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
        yield app.listen(port);
        console.log(`🚀 NestJS server running on port ${port}`);
    });
}
bootstrap();
