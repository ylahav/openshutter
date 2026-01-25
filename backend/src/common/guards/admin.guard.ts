import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  private getJWTSecret(): Uint8Array {
    const baseSecret = this.configService.get<string>('AUTH_JWT_SECRET') ||
      'dev-secret-change-me-in-production';
    
    // Convert string secret to Uint8Array for jose library
    return new TextEncoder().encode(baseSecret);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      // Enhanced logging to help diagnose token extraction issues
      console.error('[AdminGuard] No token found in request:', {
        hasCookies: !!request.cookies,
        cookieKeys: request.cookies ? Object.keys(request.cookies) : [],
        hasCookieHeader: !!request.headers.cookie,
        cookieHeaderPreview: request.headers.cookie ? request.headers.cookie.substring(0, 50) + '...' : null,
        hasAuthHeader: !!request.headers.authorization,
        authHeaderPreview: request.headers.authorization ? request.headers.authorization.substring(0, 30) + '...' : null,
        url: request.url,
        method: request.method
      });
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const JWT_SECRET = this.getJWTSecret();
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
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Log token verification failures for debugging
      if (error?.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        console.error('[AdminGuard] Token signature verification failed:', {
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...',
          error: error.message
        });
      }
      
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromRequest(request: any): string | null {
    // Try to get token from cookie first (works for browser requests)
    if (request.cookies && request.cookies.auth_token) {
      return request.cookies.auth_token;
    }

    // Try to parse cookie from Cookie header (for server-to-server requests)
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

    // Fallback to Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
