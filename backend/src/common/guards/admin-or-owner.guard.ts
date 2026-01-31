import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

/**
 * Allows admin or owner. Sets req.user for use in controllers.
 * Use when owners may perform the same action as admin (e.g. edit/delete their album photos).
 * Controllers must enforce ownership for owners (e.g. photo's album.createdBy === user.id).
 */
@Injectable()
export class AdminOrOwnerGuard implements CanActivate {
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
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const JWT_SECRET = this.getJWTSecret();
      const { payload } = await jwtVerify(token, JWT_SECRET);

      if (payload.role !== 'admin' && payload.role !== 'owner') {
        throw new UnauthorizedException('Admin or owner access required');
      }

      request.user = {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      };

      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
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
