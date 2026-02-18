import { Schema, Document } from 'mongoose';

export type RateLimitTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface IApiKey extends Document {
  keyHash: string; // SHA-256 hash of the API key
  userId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  rateLimitTier: RateLimitTier;
}

export const ApiKeySchema = new Schema<IApiKey>(
  {
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    scopes: {
      type: [String],
      required: true,
      default: [],
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    rateLimitTier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      required: true,
      default: 'free',
    },
  },
  {
    timestamps: false, // We use custom createdAt
  }
);

// Compound indexes for common queries
ApiKeySchema.index({ userId: 1, isActive: 1 });
ApiKeySchema.index({ keyHash: 1, isActive: 1 });
