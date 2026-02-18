import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeyService } from '../api-key.service';
import { API_SCOPE_KEY } from '../decorators/api-scope.decorator';
import { IApiKey } from '../api-key.schema';

@Injectable()
export class ApiScopeGuard implements CanActivate {
  private readonly logger = new Logger(ApiScopeGuard.name);

  constructor(
    private reflector: Reflector,
    private apiKeyService: ApiKeyService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      API_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no scope is required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = (request as any).apiKey as IApiKey | undefined;

    if (!apiKey) {
      // This should not happen if ApiKeyGuard runs first
      throw new ForbiddenException({
        error: {
          code: 'authentication_required',
          message: 'API key authentication is required.',
        },
      });
    }

    // Check if API key has at least one of the required scopes
    const hasRequiredScope = requiredScopes.some((scope) =>
      this.apiKeyService.hasScope(apiKey, scope),
    );

    if (!hasRequiredScope) {
      throw new ForbiddenException({
        error: {
          code: 'insufficient_scope',
          message: `This endpoint requires one of the following scopes: ${requiredScopes.join(', ')}`,
          requiredScopes,
          currentScopes: apiKey.scopes,
        },
      });
    }

    return true;
  }
}
