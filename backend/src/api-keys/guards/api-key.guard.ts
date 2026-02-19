import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.debug('API key not found in request');
      throw new UnauthorizedException({
        error: {
          code: 'invalid_api_key',
          message: 'API key is required. Provide it via Authorization header or api_key query parameter.',
        },
      });
    }

    this.logger.debug(`Validating API key: ${apiKey.substring(0, 10)}...`);
    const validatedKey = await this.apiKeyService.validateApiKey(apiKey);

    if (!validatedKey) {
      this.logger.warn(`API key validation failed for: ${apiKey.substring(0, 10)}...`);
      throw new UnauthorizedException({
        error: {
          code: 'invalid_api_key',
          message: 'API key is invalid, expired, or has been revoked.',
        },
      });
    }

    this.logger.debug(`API key validated successfully for user: ${validatedKey.userId}`);

    // Attach API key info to request for use in controllers
    (request as any).apiKey = validatedKey;
    (request as any).userId = validatedKey.userId.toString();

    return true;
  }

  private extractApiKey(request: Request): string | null {
    // Try Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader) {
      this.logger.debug(`Authorization header found: ${authHeader.substring(0, 30)}...`);
      
      // Try Bearer format: "Bearer osk_..."
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      if (bearerMatch && bearerMatch[1]) {
        const key = bearerMatch[1].trim();
        this.logger.debug(`Extracted API key from Bearer header: ${key.substring(0, 10)}...`);
        return key;
      }
      
      // Try direct format: "osk_..." (for convenience, accept API key directly)
      const trimmed = authHeader.trim();
      if (trimmed.startsWith('osk_')) {
        this.logger.debug(`Extracted API key directly from Authorization header: ${trimmed.substring(0, 10)}...`);
        return trimmed;
      }
      
      this.logger.debug(`Authorization header format not recognized: ${authHeader.substring(0, 30)}...`);
    }

    // Try query parameter
    const queryKey = request.query.api_key;
    if (queryKey) {
      this.logger.debug(`api_key query parameter found: ${typeof queryKey}`);
      if (typeof queryKey === 'string') {
        const key = queryKey.trim();
        this.logger.debug(`Extracted API key from query: ${key.substring(0, 10)}...`);
        return key;
      }
    }

    this.logger.debug('No API key found in Authorization header or query parameter');
    return null;
  }
}
