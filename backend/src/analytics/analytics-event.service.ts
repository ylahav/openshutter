import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';
import { IAnalyticsEvent } from './analytics-event.schema';
import * as crypto from 'crypto';

/**
 * Service for logging analytics events
 */
@Injectable()
export class AnalyticsEventService {
  private readonly logger = new Logger(AnalyticsEventService.name);

  /**
   * Hash IP address for privacy
   */
  private hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }

  /**
   * Anonymize user agent (remove version numbers, keep only browser/OS)
   */
  private anonymizeUserAgent(ua: string): string {
    if (!ua) return '';
    // Remove version numbers and specific device identifiers
    return ua
      .replace(/\d+\.\d+\.\d+\.\d+/g, 'x.x.x.x') // IP addresses
      .replace(/\/\d+\.\d+/g, '/x.x') // Version numbers
      .substring(0, 100); // Limit length
  }

  /**
   * Log a photo view event
   */
  async logPhotoView(
    photoId: string,
    options?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      albumId?: string;
      referrer?: string;
    }
  ): Promise<void> {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) {
        this.logger.warn('Database not connected, skipping analytics event');
        return;
      }

      const event: Partial<IAnalyticsEvent> = {
        type: 'photo_view',
        resourceId: photoId,
        userId: options?.userId,
        ipAddress: options?.ipAddress ? this.hashIP(options.ipAddress) : undefined,
        userAgent: options?.userAgent ? this.anonymizeUserAgent(options.userAgent) : undefined,
        timestamp: new Date(),
        metadata: {
          albumId: options?.albumId,
          referrer: options?.referrer,
        },
      };

      await db.collection('analytics_events').insertOne(event);
    } catch (error) {
      // Don't let analytics errors break the main flow
      this.logger.error(`Error logging photo view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Log an album view event
   */
  async logAlbumView(
    albumId: string,
    options?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    }
  ): Promise<void> {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) {
        this.logger.warn('Database not connected, skipping analytics event');
        return;
      }

      const event: Partial<IAnalyticsEvent> = {
        type: 'album_view',
        resourceId: albumId,
        userId: options?.userId,
        ipAddress: options?.ipAddress ? this.hashIP(options.ipAddress) : undefined,
        userAgent: options?.userAgent ? this.anonymizeUserAgent(options.userAgent) : undefined,
        timestamp: new Date(),
        metadata: {
          referrer: options?.referrer,
        },
      };

      await db.collection('analytics_events').insertOne(event);
    } catch (error) {
      // Don't let analytics errors break the main flow
      this.logger.error(`Error logging album view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Log a search event
   */
  async logSearch(
    searchData: {
      query?: string;
      searchType: 'photos' | 'albums' | 'people' | 'locations' | 'all';
      resultCount: number;
      /** When set (e.g. owner mini-site host), owner analytics can attribute anonymous searches to this owner. */
      ownerScopeId?: string;
      filters?: {
        tags?: string[];
        people?: string[];
        locationIds?: string[];
        dateFrom?: string;
        dateTo?: string;
      };
    },
    options?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) {
        this.logger.warn('Database not connected, skipping analytics event');
        return;
      }

      // Normalize query (lowercase, trim) for aggregation
      const normalizedQuery = searchData.query?.toLowerCase().trim() || '';

      const event: Partial<IAnalyticsEvent> = {
        type: 'search',
        userId: options?.userId,
        ipAddress: options?.ipAddress ? this.hashIP(options.ipAddress) : undefined,
        userAgent: options?.userAgent ? this.anonymizeUserAgent(options.userAgent) : undefined,
        timestamp: new Date(),
        metadata: {
          query: normalizedQuery,
          searchType: searchData.searchType,
          resultCount: searchData.resultCount,
          filters: searchData.filters,
          ...(searchData.ownerScopeId ? { ownerScopeId: searchData.ownerScopeId } : {}),
        },
      };

      await db.collection('analytics_events').insertOne(event);
    } catch (error) {
      // Don't let analytics errors break the main flow
      this.logger.error(`Error logging search: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
