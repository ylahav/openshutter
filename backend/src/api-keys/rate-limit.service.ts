import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { IApiKey, RateLimitTier } from './api-key.schema';

interface RateLimitWindow {
  count: number;
  resetAt: number; // Unix timestamp in milliseconds
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly rateLimitStore = new Map<string, Map<string, RateLimitWindow>>();

  constructor(private apiKeyService: ApiKeyService) {}

  /**
   * Check if request is within rate limit
   * Returns { allowed: boolean, remaining: number, resetAt: number }
   */
  async checkRateLimit(apiKey: IApiKey, window: 'minute' | 'hour' | 'day'): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    limit: number;
  }> {
    const config = this.apiKeyService.getRateLimitConfig(apiKey.rateLimitTier);
    const keyId = apiKey._id.toString();
    const storeKey = `${keyId}:${window}`;

    // Get or create store for this API key
    if (!this.rateLimitStore.has(keyId)) {
      this.rateLimitStore.set(keyId, new Map());
    }
    const keyStore = this.rateLimitStore.get(keyId)!;

    // Get current window
    const now = Date.now();
    const currentWindow = keyStore.get(storeKey);

    // Determine limit and window duration
    let limit: number;
    let windowDuration: number;

    switch (window) {
      case 'minute':
        limit = config.requestsPerMinute;
        windowDuration = 60 * 1000; // 1 minute
        break;
      case 'hour':
        limit = config.requestsPerHour;
        windowDuration = 60 * 60 * 1000; // 1 hour
        break;
      case 'day':
        limit = config.requestsPerDay;
        windowDuration = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    // Check if window has expired or doesn't exist
    if (!currentWindow || currentWindow.resetAt < now) {
      // Create new window
      const resetAt = now + windowDuration;
      keyStore.set(storeKey, {
        count: 1,
        resetAt,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
        limit,
      };
    }

    // Check if limit exceeded
    if (currentWindow.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: currentWindow.resetAt,
        limit,
      };
    }

    // Increment count
    currentWindow.count++;
    return {
      allowed: true,
      remaining: limit - currentWindow.count,
      resetAt: currentWindow.resetAt,
      limit,
    };
  }

  /**
   * Clean up expired rate limit entries (should be called periodically)
   */
  cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [keyId, keyStore] of this.rateLimitStore.entries()) {
      for (const [storeKey, window] of keyStore.entries()) {
        if (window.resetAt < now) {
          keyStore.delete(storeKey);
          cleaned++;
        }
      }

      // Remove empty key stores
      if (keyStore.size === 0) {
        this.rateLimitStore.delete(keyId);
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get rate limit info for an API key (without incrementing)
   */
  async getRateLimitInfo(apiKey: IApiKey): Promise<{
    minute: { remaining: number; limit: number; resetAt: number };
    hour: { remaining: number; limit: number; resetAt: number };
    day: { remaining: number; limit: number; resetAt: number };
  }> {
    const config = this.apiKeyService.getRateLimitConfig(apiKey.rateLimitTier);
    const keyId = apiKey._id.toString();

    const getWindowInfo = (window: 'minute' | 'hour' | 'day') => {
      const storeKey = `${keyId}:${window}`;
      const keyStore = this.rateLimitStore.get(keyId);
      const currentWindow = keyStore?.get(storeKey);

      let limit: number;
      let windowDuration: number;

      switch (window) {
        case 'minute':
          limit = config.requestsPerMinute;
          windowDuration = 60 * 1000;
          break;
        case 'hour':
          limit = config.requestsPerHour;
          windowDuration = 60 * 60 * 1000;
          break;
        case 'day':
          limit = config.requestsPerDay;
          windowDuration = 24 * 60 * 60 * 1000;
          break;
      }

      const now = Date.now();

      if (!currentWindow || currentWindow.resetAt < now) {
        return {
          remaining: limit,
          limit,
          resetAt: now + windowDuration,
        };
      }

      return {
        remaining: Math.max(0, limit - currentWindow.count),
        limit,
        resetAt: currentWindow.resetAt,
      };
    };

    return {
      minute: getWindowInfo('minute'),
      hour: getWindowInfo('hour'),
      day: getWindowInfo('day'),
    };
  }
}
