import { Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';

export type TagFeedbackAction = 'applied' | 'removed' | 'dismissed';

export interface TagFeedbackEvent {
  photoId: string;
  tagId: string;
  userId?: string;
  /**
   * How the tag was applied or removed.
   * - "ai": via AI / smart tag suggestion flows
   * - "context": via context-based suggestions (similar/iptc/location/cooccurrence)
   * - "manual": direct user edit (future use)
   */
  source: 'ai' | 'context' | 'manual';
  action: TagFeedbackAction;
  createdAt?: Date;
}

/**
 * Lightweight service for recording tag feedback events.
 * Stored in a dedicated analytics collection (`tag_feedback`) for Phase 4 ML features.
 */
export class TagFeedbackService {
  private static readonly logger = new Logger(TagFeedbackService.name);

  private static async getCollection() {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    return db.collection('tag_feedback');
  }

  static async record(event: TagFeedbackEvent): Promise<void> {
    try {
      const collection = await this.getCollection();
      const now = new Date();
      await collection.insertOne({
        photoId: event.photoId,
        tagId: event.tagId,
        userId: event.userId || null,
        source: event.source,
        action: event.action,
        createdAt: event.createdAt || now,
      });
    } catch (error) {
      // Swallow errors so feedback logging never breaks main flows
      this.logger.error(
        `Failed to record tag feedback: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Convenience helper to record multiple "applied" events at once.
   */
  static async recordAppliedTags(params: {
    photoId: string;
    tagIds: string[];
    userId?: string;
    source: TagFeedbackEvent['source'];
  }): Promise<void> {
    if (!params.tagIds || params.tagIds.length === 0) return;
    try {
      const collection = await this.getCollection();
      const now = new Date();
      const docs = params.tagIds.map((tagId) => ({
        photoId: params.photoId,
        tagId,
        userId: params.userId || null,
        source: params.source,
        action: 'applied' as TagFeedbackAction,
        createdAt: now,
      }));
      await collection.insertMany(docs, { ordered: false });
    } catch (error) {
      this.logger.error(
        `Failed to record applied tag feedback: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Convenience helper to record multiple events with the same action at once.
   */
  static async recordTagEvents(params: {
    photoId: string;
    tagIds: string[];
    userId?: string;
    source: TagFeedbackEvent['source'];
    action: TagFeedbackAction;
  }): Promise<void> {
    if (!params.tagIds || params.tagIds.length === 0) return;
    try {
      const collection = await this.getCollection();
      const now = new Date();
      const docs = params.tagIds.map((tagId) => ({
        photoId: params.photoId,
        tagId,
        userId: params.userId || null,
        source: params.source,
        action: params.action,
        createdAt: now,
      }));
      await collection.insertMany(docs, { ordered: false });
    } catch (error) {
      this.logger.error(
        `Failed to record tag feedback events: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Compute related tags for a given tag based on co-occurrence in tag_feedback.
   * Simple heuristic: count how often other tags are applied to the same photos as the given tag.
   */
  static async getRelatedTags(tagId: string, limit = 10): Promise<Array<{ tagId: string; count: number }>> {
    try {
      const collection = await this.getCollection();

      const pipeline = [
        { $match: { tagId, action: 'applied' } },
        { $project: { photoId: 1 } },
        { $group: { _id: '$photoId' } },
        { $project: { photoId: '$_id', _id: 0 } },
        {
          $lookup: {
            from: 'tag_feedback',
            localField: 'photoId',
            foreignField: 'photoId',
            as: 'coTags',
          },
        },
        { $unwind: '$coTags' },
        {
          $match: {
            'coTags.tagId': { $ne: tagId },
            'coTags.action': 'applied',
          },
        },
        {
          $group: {
            _id: '$coTags.tagId',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      return results.map((r: any) => ({ tagId: r._id, count: r.count }));
    } catch (error) {
      this.logger.error(
        `Failed to compute related tags: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  static async getFeedbackStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    byAction: Record<string, number>;
    bySourceAction: Record<string, Record<string, number>>;
  }> {
    try {
      const collection = await this.getCollection();
      const grouped = await collection
        .aggregate([
          {
            $group: {
              _id: { source: '$source', action: '$action' },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const bySource: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      const bySourceAction: Record<string, Record<string, number>> = {};
      let total = 0;

      for (const row of grouped as Array<{ _id?: { source?: string; action?: string }; count?: number }>) {
        const source = row._id?.source || 'unknown';
        const action = row._id?.action || 'unknown';
        const count = Number(row.count || 0);
        total += count;
        bySource[source] = (bySource[source] || 0) + count;
        byAction[action] = (byAction[action] || 0) + count;
        if (!bySourceAction[source]) bySourceAction[source] = {};
        bySourceAction[source][action] = (bySourceAction[source][action] || 0) + count;
      }

      return {
        total,
        bySource,
        byAction,
        bySourceAction,
      };
    } catch (error) {
      this.logger.error(
        `Failed to compute feedback stats: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        total: 0,
        bySource: {},
        byAction: {},
        bySourceAction: {},
      };
    }
  }
}

