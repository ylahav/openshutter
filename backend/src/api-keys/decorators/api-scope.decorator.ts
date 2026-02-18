import { SetMetadata } from '@nestjs/common';

export const API_SCOPE_KEY = 'api_scope';

/**
 * Decorator to specify required API scope for an endpoint
 * Usage: @ApiScope('albums:read')
 *        @ApiScope(['albums:read', 'photos:read'])
 */
export const ApiScope = (...scopes: string[]) => SetMetadata(API_SCOPE_KEY, scopes);
