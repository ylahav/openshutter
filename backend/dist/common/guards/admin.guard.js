"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
exports.AdminGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
let AdminGuard = class AdminGuard {
    constructor(configService) {
        this.configService = configService;
    }
    canActivate(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = context.switchToHttp().getRequest();
            const token = this.extractTokenFromRequest(request);
            if (!token) {
                throw new common_1.UnauthorizedException('Authentication required');
            }
            try {
                const JWT_SECRET = new TextEncoder().encode(this.configService.get('AUTH_JWT_SECRET') ||
                    this.configService.get('NEXTAUTH_SECRET') ||
                    'dev-secret-change-me-in-production');
                const { payload } = yield (0, jose_1.jwtVerify)(token, JWT_SECRET);
                // Check if user has admin role
                if (payload.role !== 'admin') {
                    throw new common_1.UnauthorizedException('Admin access required');
                }
                // Attach user info to request for use in controllers
                request.user = {
                    id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    role: payload.role,
                };
                return true;
            }
            catch (error) {
                if (error instanceof common_1.UnauthorizedException) {
                    throw error;
                }
                throw new common_1.UnauthorizedException('Invalid or expired token');
            }
        });
    }
    extractTokenFromRequest(request) {
        // Try to get token from cookie first
        if (request.cookies && request.cookies.auth_token) {
            return request.cookies.auth_token;
        }
        // Fallback to Authorization header
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
};
exports.AdminGuard = AdminGuard;
exports.AdminGuard = AdminGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AdminGuard);
