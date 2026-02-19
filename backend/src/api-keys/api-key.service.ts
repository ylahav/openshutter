import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { IApiKey, RateLimitTier } from './api-key.schema';

export interface CreateApiKeyDto {
  userId: string;
  name: string;
  description?: string;
  scopes: string[];
  rateLimitTier?: RateLimitTier;
  expiresInDays?: number;
}

export interface ApiKeyInfo {
  _id: string;
  name: string;
  description?: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  rateLimitTier: RateLimitTier;
  // Masked key for display (only shown once on creation)
  key?: string; // Only present when creating new key
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectModel('ApiKey') private apiKeyModel: Model<IApiKey>,
  ) {}

  /**
   * Generate a new API key
   * Format: osk_{env}_{32_random_chars}
   */
  private generateApiKey(): string {
    const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
    const randomPart = randomBytes(16).toString('hex'); // 32 hex characters
    return `osk_${env}_${randomPart}`;
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Create a new API key
   * Returns the full key (only shown once) and key info
   */
  async createApiKey(dto: CreateApiKeyDto): Promise<ApiKeyInfo> {
    const key = this.generateApiKey();
    const keyHash = this.hashApiKey(key);

    // Calculate expiration date if provided
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const apiKey = new this.apiKeyModel({
      keyHash,
      userId: dto.userId,
      name: dto.name,
      description: dto.description,
      scopes: dto.scopes.length > 0 ? dto.scopes : ['read'], // Default to read scope
      rateLimitTier: dto.rateLimitTier || 'free',
      expiresAt,
      isActive: true,
    });

    await apiKey.save();

    this.logger.log(`Created API key for user ${dto.userId}: ${dto.name}`);

    return {
      _id: apiKey._id.toString(),
      name: apiKey.name,
      description: apiKey.description,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive,
      rateLimitTier: apiKey.rateLimitTier,
      key, // Return full key only on creation
    };
  }

  /**
   * Validate an API key and return key info
   */
  async validateApiKey(key: string): Promise<IApiKey | null> {
    if (!key || key.trim().length === 0) {
      this.logger.warn('validateApiKey called with empty key');
      return null;
    }

    const keyHash = this.hashApiKey(key);
    this.logger.debug(`Looking up API key with hash: ${keyHash.substring(0, 16)}...`);

    const apiKey = await this.apiKeyModel.findOne({
      keyHash,
      isActive: true,
    }).exec();

    if (!apiKey) {
      this.logger.warn(`No active API key found with hash: ${keyHash.substring(0, 16)}...`);
      return null;
    }

    this.logger.debug(`Found API key ${apiKey._id}, checking expiration...`);

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.warn(`API key ${apiKey._id} has expired (expired at: ${apiKey.expiresAt})`);
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date();
    await apiKey.save().catch((err) => {
      // Don't fail validation if update fails
      this.logger.warn(`Failed to update lastUsedAt for API key ${apiKey._id}: ${err.message}`);
    });

    return apiKey;
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const keys = await this.apiKeyModel.find({ userId } as any).sort({ createdAt: -1 }).exec();

    return keys.map((key) => ({
      _id: key._id.toString(),
      name: key.name,
      description: key.description,
      scopes: key.scopes,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      rateLimitTier: key.rateLimitTier,
    }));
  }

  /**
   * Get a single API key by ID (for the owner)
   */
  async getApiKeyById(keyId: string, userId: string): Promise<ApiKeyInfo | null> {
    const key = await this.apiKeyModel.findOne({
      _id: keyId,
      userId,
    } as any).exec();

    if (!key) {
      return null;
    }

    return {
      _id: key._id.toString(),
      name: key.name,
      description: key.description,
      scopes: key.scopes,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      rateLimitTier: key.rateLimitTier,
    };
  }

  /**
   * Update an API key (name, description, scopes, tier)
   */
  async updateApiKey(
    keyId: string,
    userId: string,
    updates: Partial<Pick<CreateApiKeyDto, 'name' | 'description' | 'scopes' | 'rateLimitTier'>>,
  ): Promise<ApiKeyInfo | null> {
    const key = await this.apiKeyModel.findOne({
      _id: keyId,
      userId,
    } as any).exec();

    if (!key) {
      return null;
    }

    if (updates.name !== undefined) key.name = updates.name;
    if (updates.description !== undefined) key.description = updates.description;
    if (updates.scopes !== undefined) key.scopes = updates.scopes;
    if (updates.rateLimitTier !== undefined) key.rateLimitTier = updates.rateLimitTier;

    await key.save();

    return {
      _id: key._id.toString(),
      name: key.name,
      description: key.description,
      scopes: key.scopes,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      rateLimitTier: key.rateLimitTier,
    };
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    const result = await this.apiKeyModel.updateOne(
      { _id: keyId, userId } as any,
      { isActive: false },
    ).exec();

    return result.modifiedCount > 0;
  }

  /**
   * Check if API key has required scope
   */
  hasScope(apiKey: IApiKey, requiredScope: string): boolean {
    // Check for exact scope match
    if (apiKey.scopes.includes(requiredScope)) {
      return true;
    }

    // Check for wildcard scopes
    if (apiKey.scopes.includes('*') || apiKey.scopes.includes('admin:*')) {
      return true;
    }

    // Check for resource-level wildcards (e.g., 'albums:*' matches 'albums:read')
    const scopeParts = requiredScope.split(':');
    if (scopeParts.length === 2) {
      const resourceWildcard = `${scopeParts[0]}:*`;
      if (apiKey.scopes.includes(resourceWildcard)) {
        return true;
      }
    }

    // Check for 'read' or 'write' wildcards
    if (requiredScope.endsWith(':read') && apiKey.scopes.includes('read')) {
      return true;
    }
    if (requiredScope.endsWith(':write') && apiKey.scopes.includes('write')) {
      return true;
    }

    return false;
  }

  /**
   * Get rate limit configuration for a tier
   */
  getRateLimitConfig(tier: RateLimitTier): {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  } {
    const configs = {
      free: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      basic: {
        requestsPerMinute: 300,
        requestsPerHour: 10000,
        requestsPerDay: 100000,
      },
      pro: {
        requestsPerMinute: 1000,
        requestsPerHour: 50000,
        requestsPerDay: 500000,
      },
      enterprise: {
        requestsPerMinute: 10000,
        requestsPerHour: 500000,
        requestsPerDay: 5000000,
      },
    };

    return configs[tier];
  }
}
