import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  // Derive JWT secret from base secret + server start time
  // Both frontend and backend use the same shared timestamp file, ensuring they use the same secret
  // IMPORTANT: Read from file each time to ensure we use the latest timestamp (in case frontend updated it)
  private getServerStartTime(): string {
    const ROOT_DIR = join(process.cwd(), '..');
    const TIMESTAMP_FILE = join(ROOT_DIR, '.server-start-time');
    
    // Try to read from file first (most up-to-date)
    if (existsSync(TIMESTAMP_FILE)) {
      try {
        const timestamp = readFileSync(TIMESTAMP_FILE, 'utf8').trim();
        return timestamp;
      } catch (error) {
        console.warn('[AdminGuard] Failed to read timestamp file, using global:', error);
      }
    }
    
    // Fallback to global (set at startup)
    return (global as any).SERVER_START_TIME || Date.now().toString();
  }

  private getJWTSecret(): Uint8Array {
    const baseSecret = this.configService.get<string>('AUTH_JWT_SECRET') ||
      'dev-secret-change-me-in-production';
    const serverStartTime = this.getServerStartTime();
    const combinedSecret = `${baseSecret}:${serverStartTime}`;
    const hash = createHash('sha256').update(combinedSecret).digest();
    const secret = new TextEncoder().encode(Buffer.from(hash).toString('base64'));
    
    // Always log secret derivation to help diagnose authentication issues
    console.log('[AdminGuard] JWT Secret derived:', {
      serverStartTime,
      baseSecretLength: baseSecret.length,
      baseSecretPreview: baseSecret.substring(0, 10) + '...',
      secretLength: secret.length,
      secretHash: Buffer.from(hash).toString('hex').substring(0, 16) + '...',
      globalServerStartTime: (global as any).SERVER_START_TIME || 'NOT SET',
      timestampFileExists: existsSync(join(process.cwd(), '..', '.server-start-time'))
    });
    
    return secret;
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
      const serverStartTime = (global as any).SERVER_START_TIME || 'unknown';

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
      
      // Enhanced error logging for debugging token verification failures
      if (error?.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        const serverStartTime = (global as any).SERVER_START_TIME || 'unknown';
        console.error('[AdminGuard] Token signature verification failed:', {
          serverStartTime,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...',
          error: error.message
        });
        // Try to decode the token without verification to see when it was issued
        try {
          const { decodeJwt } = await import('jose');
          const unverifiedPayload = decodeJwt(token);
          console.error('[AdminGuard] Token was issued at:', {
            iat: unverifiedPayload.iat ? new Date(unverifiedPayload.iat * 1000).toISOString() : 'unknown',
            exp: unverifiedPayload.exp ? new Date(unverifiedPayload.exp * 1000).toISOString() : 'unknown',
            email: unverifiedPayload.email,
            note: 'Token was likely signed with a different JWT secret. User needs to log in again.'
          });
        } catch {
          // Ignore decode errors
        }
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
