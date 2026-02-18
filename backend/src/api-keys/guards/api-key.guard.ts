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
      throw new UnauthorizedException({
        error: {
          code: 'invalid_api_key',
          message: 'API key is required. Provide it via Authorization header or api_key query parameter.',
        },
      });
    }

    const validatedKey = await this.apiKeyService.validateApiKey(apiKey);

    if (!validatedKey) {
      throw new UnauthorizedException({
        error: {
          code: 'invalid_api_key',
          message: 'API key is invalid, expired, or has been revoked.',
        },
      });
    }

    // Attach API key info to request for use in controllers
    (request as any).apiKey = validatedKey;
    (request as any).userId = validatedKey.userId.toString();

    return true;
  }

  private extractApiKey(request: Request): string | null {
    // Try Authorization header first (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Try query parameter
    const queryKey = request.query.api_key;
    if (queryKey && typeof queryKey === 'string') {
      return queryKey.trim();
    }

    return null;
  }
}
