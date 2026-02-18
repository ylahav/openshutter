import { Schema, Document } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  type: 'photo_view' | 'album_view' | 'search';
  resourceId?: string; // Photo or album ID for views
  userId?: string; // Optional user ID
  ipAddress?: string; // Hashed for privacy
  userAgent?: string; // Anonymized
  timestamp: Date;
  metadata?: {
    // For photo views
    albumId?: string;
    referrer?: string;
    // For search events
    query?: string;
    searchType?: 'photos' | 'albums' | 'people' | 'locations' | 'all';
    resultCount?: number;
    filters?: {
      tags?: string[];
      people?: string[];
      locationIds?: string[];
      dateFrom?: string;
      dateTo?: string;
    };
    [key: string]: any;
  };
}

export const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: {
      type: String,
      required: true,
      enum: ['photo_view', 'album_view', 'search'],
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, // We use custom timestamp field
  }
);

// Compound indexes for common queries
AnalyticsEventSchema.index({ type: 1, timestamp: -1 });
AnalyticsEventSchema.index({ type: 1, resourceId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ type: 1, userId: 1, timestamp: -1 });
