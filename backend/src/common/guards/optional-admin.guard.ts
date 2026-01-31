import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

/**
 * Optional admin/auth guard: if a valid JWT is present, sets req.user (id, email, name, role).
 * If no token or invalid token, request continues without req.user (unauthenticated).
 * Use on public routes that should behave differently for logged-in users (e.g. album access).
 */
@Injectable()
export class OptionalAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  private getJWTSecret(): Uint8Array {
    const baseSecret = this.configService.get<string>('AUTH_JWT_SECRET') ||
      'dev-secret-change-me-in-production';
    return new TextEncoder().encode(baseSecret);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      return true;
    }

    try {
      const JWT_SECRET = this.getJWTSecret();
      const { payload } = await jwtVerify(token, JWT_SECRET);

      if (payload.role !== 'admin' && payload.role !== 'owner' && payload.role !== 'guest') {
        return true;
      }

      request.user = {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      };

      return true;
    } catch {
      return true;
    }
  }

  private extractTokenFromRequest(request: any): string | null {
    if (request.cookies && request.cookies.auth_token) {
      return request.cookies.auth_token;
    }

    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      }, {});
      if (cookies.auth_token) {
        return cookies.auth_token;
      }
    }

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
