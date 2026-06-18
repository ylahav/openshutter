import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** Simple in-memory rate limiter: max 10 login attempts per IP per minute. */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60_000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown';

    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry || now >= entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      this.scheduleCleanup(ip, this.windowMs);
      return true;
    }

    entry.count += 1;
    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        { message: 'Too many login attempts. Please try again later.', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private scheduleCleanup(ip: string, delayMs: number): void {
    setTimeout(() => this.store.delete(ip), delayMs + 1000).unref?.();
  }
}
