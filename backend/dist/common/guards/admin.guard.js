"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const crypto_1 = require("crypto");
let AdminGuard = class AdminGuard {
    constructor(configService) {
        this.configService = configService;
    }
    // Derive JWT secret from base secret + server start time
    // Both frontend and backend use the same shared timestamp file, ensuring they use the same secret
    getJWTSecret() {
        const baseSecret = this.configService.get('AUTH_JWT_SECRET') ||
            'dev-secret-change-me-in-production';
        const serverStartTime = global.SERVER_START_TIME || Date.now().toString();
        const combinedSecret = `${baseSecret}:${serverStartTime}`;
        const hash = (0, crypto_1.createHash)('sha256').update(combinedSecret).digest();
        const secret = new TextEncoder().encode(Buffer.from(hash).toString('base64'));
        // Debug logging (only in development or when explicitly enabled)
        if (process.env.DEBUG_JWT_SECRET === 'true') {
            console.log('[AdminGuard] JWT Secret derived:', {
                serverStartTime,
                secretLength: secret.length,
                secretPreview: Buffer.from(secret).toString('base64').substring(0, 20) + '...'
            });
        }
        return secret;
    }
    canActivate(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = context.switchToHttp().getRequest();
            const token = this.extractTokenFromRequest(request);
            if (!token) {
                throw new common_1.UnauthorizedException('Authentication required');
            }
            try {
                const JWT_SECRET = this.getJWTSecret();
                const serverStartTime = global.SERVER_START_TIME || 'unknown';
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
                // Enhanced error logging for debugging token verification failures
                if ((error === null || error === void 0 ? void 0 : error.code) === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
                    const serverStartTime = global.SERVER_START_TIME || 'unknown';
                    console.error('[AdminGuard] Token signature verification failed:', {
                        serverStartTime,
                        tokenLength: token.length,
                        tokenPreview: token.substring(0, 20) + '...',
                        error: error.message
                    });
                    // Try to decode the token without verification to see when it was issued
                    try {
                        const { decodeJwt } = yield Promise.resolve().then(() => __importStar(require('jose')));
                        const unverifiedPayload = decodeJwt(token);
                        console.error('[AdminGuard] Token was issued at:', {
                            iat: unverifiedPayload.iat ? new Date(unverifiedPayload.iat * 1000).toISOString() : 'unknown',
                            exp: unverifiedPayload.exp ? new Date(unverifiedPayload.exp * 1000).toISOString() : 'unknown',
                            email: unverifiedPayload.email,
                            note: 'Token was likely signed with a different JWT secret. User needs to log in again.'
                        });
                    }
                    catch (_a) {
                        // Ignore decode errors
                    }
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
