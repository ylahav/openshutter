import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const JWT_SECRET = new TextEncoder().encode(
        this.configService.get<string>('AUTH_JWT_SECRET') ||
          this.configService.get<string>('NEXTAUTH_SECRET') ||
          'dev-secret-change-me-in-production',
      );

      const { payload } = await jwtVerify(token, JWT_SECRET);

      // Check if user has admin role
      if (payload.role !== 'admin') {
        throw new UnauthorizedException('Admin access required');
      }

      // Attach user info to request for use in controllers
      request.user = {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromRequest(request: any): string | null {
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
}
