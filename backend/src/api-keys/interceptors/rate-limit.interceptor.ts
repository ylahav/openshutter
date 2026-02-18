import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { RateLimitService } from '../rate-limit.service';
import { IApiKey } from '../api-key.schema';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(private rateLimitService: RateLimitService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const apiKey = (request as any).apiKey as IApiKey | undefined;

    // Only apply rate limiting if API key is present (public API routes)
    if (!apiKey) {
      return next.handle();
    }

    // Check all three windows
    const [minuteCheck, hourCheck, dayCheck] = await Promise.all([
      this.rateLimitService.checkRateLimit(apiKey, 'minute'),
      this.rateLimitService.checkRateLimit(apiKey, 'hour'),
      this.rateLimitService.checkRateLimit(apiKey, 'day'),
    ]);

    // Set rate limit headers (use the most restrictive window)
    const mostRestrictive = [minuteCheck, hourCheck, dayCheck].find((check) => !check.allowed) || minuteCheck;

    response.setHeader('X-RateLimit-Limit', mostRestrictive.limit.toString());
    response.setHeader('X-RateLimit-Remaining', mostRestrictive.remaining.toString());
    response.setHeader('X-RateLimit-Reset', Math.floor(mostRestrictive.resetAt / 1000).toString());

    // If any window is exceeded, reject the request
    if (!minuteCheck.allowed || !hourCheck.allowed || !dayCheck.allowed) {
      const retryAfter = Math.ceil((mostRestrictive.resetAt - Date.now()) / 1000);

      throw new HttpException(
        {
          error: {
            code: 'rate_limit_exceeded',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            retryAfter,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
