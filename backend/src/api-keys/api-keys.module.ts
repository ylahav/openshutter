import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeySchema } from './api-key.schema';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiScopeGuard } from './guards/api-scope.guard';
import { RateLimitService } from './rate-limit.service';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { ApiKeysController } from './api-keys.controller';
import { RateLimitCleanupTask } from './tasks/rate-limit-cleanup.task';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ApiKey', schema: ApiKeySchema },
    ]),
  ],
  controllers: [ApiKeysController],
  providers: [
    ApiKeyService,
    ApiKeyGuard,
    ApiScopeGuard,
    RateLimitService,
    RateLimitInterceptor,
    RateLimitCleanupTask,
  ],
  exports: [
    ApiKeyService,
    ApiKeyGuard,
    ApiScopeGuard,
    RateLimitService,
    RateLimitInterceptor,
  ],
})
export class ApiKeysModule {}
