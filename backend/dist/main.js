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
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = yield core_1.NestFactory.create(app_module_1.AppModule);
        // Enable CORS with proper configuration
        app.enableCors({
            origin: process.env.FRONTEND_URL || 'http://localhost:4000',
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
