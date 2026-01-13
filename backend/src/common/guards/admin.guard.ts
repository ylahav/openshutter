import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { createHash } from 'crypto';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  // Derive JWT secret from base secret + server start time
  // Both frontend and backend use the same shared timestamp file, ensuring they use the same secret
  private getJWTSecret(): Uint8Array {
    const baseSecret = this.configService.get<string>('AUTH_JWT_SECRET') ||
      'dev-secret-change-me-in-production';
    const serverStartTime = (global as any).SERVER_START_TIME || Date.now().toString();
    const combinedSecret = `${baseSecret}:${serverStartTime}`;
    const hash = createHash('sha256').update(combinedSecret).digest();
    const secret = new TextEncoder().encode(Buffer.from(hash).toString('base64'));
    
    // Debug logging (always log in production to help diagnose issues)
    if (process.env.NODE_ENV === 'production' || process.env.DEBUG_JWT_SECRET === 'true') {
      console.log('[AdminGuard] JWT Secret derived:', {
        serverStartTime,
        baseSecretLength: baseSecret.length,
        baseSecretPreview: baseSecret.substring(0, 10) + '...',
        secretLength: secret.length,
        secretHash: Buffer.from(hash).toString('hex').substring(0, 16) + '...'
      });
    }
    
    return secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
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
