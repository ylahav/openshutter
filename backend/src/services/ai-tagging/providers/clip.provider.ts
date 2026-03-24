import { Injectable, Logger } from '@nestjs/common';
import { BaseAIProvider } from './base.provider';
import { SuggestTagsOptions, TagSuggestion } from '../types';
import { connectDB } from '../../../config/db';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import { BtagTagger } from '../../stag/btag-core';

@Injectable()
export class ClipAIProvider extends BaseAIProvider {
  private readonly logger = new Logger(ClipAIProvider.name);
  private pipelinePromise: Promise<any> | null = null;
  private cachedLabels: string[] = [];
  private labelsLoadedAt = 0;

  private readonly fallbackLabels: string[] = [
    'portrait', 'person', 'people', 'family', 'children',
    'wedding', 'birthday', 'party', 'event',
    'dog', 'cat', 'bird', 'animal',
    'car', 'building', 'street', 'city', 'urban',
    'forest', 'mountain', 'beach', 'sea', 'nature', 'landscape',
    'sunset', 'sunrise', 'night', 'indoor', 'outdoor',
    'food', 'travel', 'vacation', 'sport',
  ];

  async isAvailable(): Promise<boolean> {
    try {
      await this.loadPipeline();
      return true;
    } catch (error) {
      this.logger.error(`CLIP provider unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async suggestTags(imagePath: string, options: SuggestTagsOptions): Promise<TagSuggestion[]> {
    const maxSuggestions = options.maxSuggestions || 10;
    const minConfidence = options.minConfidence ?? 0.0;
    const candidateLabels = await this.getCandidateLabels();

    const imageBuffer = await fs.readFile(imagePath);
    let tags = await this.runBtag(imageBuffer, candidateLabels, maxSuggestions);
    if (tags.length === 0) {
      tags = await this.runBtag(imageBuffer, this.fallbackLabels, maxSuggestions);
    }

    const suggestions: TagSuggestion[] = tags.map((label, idx) => ({
        label: label.toLowerCase().trim(),
        confidence: Math.max(0.01, 1 - idx / Math.max(1, tags.length + 1)),
        category: undefined,
        isNewTag: true,
    }));

    return this.limitSuggestions(
      this.sortByConfidence(this.filterByConfidence(suggestions, minConfidence)),
      maxSuggestions,
    );
  }

  private async loadPipeline(): Promise<any> {
    // Kept for availability checks; btag handles model pipeline internally.
    if (!this.pipelinePromise) {
      this.pipelinePromise = Promise.resolve(true);
    }
    return this.pipelinePromise;
  }

  private async runBtag(imageBuffer: Buffer, labels: string[], maxSuggestions: number): Promise<string[]> {
    const tagger = new BtagTagger({
      inferenceBackend: 'clip',
      defaultPrefix: 'st|',
      topK: maxSuggestions,
      candidateLabels: labels,
    });
    const result = await tagger.tagImageFromBuffer(imageBuffer);
    return Array.isArray(result?.tags)
      ? result.tags
          .filter((t) => typeof t === 'string')
          .map((t) => t.replace(/^st\|/i, '').trim())
          .filter((t) => t.length > 0)
      : [];
  }

  private async getCandidateLabels(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedLabels.length > 0 && now - this.labelsLoadedAt < 10 * 60 * 1000) {
      return this.cachedLabels;
    }

    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');

      const tags = await db.collection('tags')
        .find({ isActive: true })
        .project({ name: 1, usageCount: 1 })
        .sort({ usageCount: -1, updatedAt: -1 })
        .limit(400)
        .toArray();

      const fromDb = tags
        .map((t: any) => (typeof t.name === 'string' ? t.name : t.name?.en))
        .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 1)
        .map((v) => v.toLowerCase().trim());

      this.cachedLabels = Array.from(new Set([...fromDb, ...this.fallbackLabels]));
      this.labelsLoadedAt = now;
    } catch (error) {
      this.logger.warn(`Failed loading candidate labels from DB, using fallback list: ${error instanceof Error ? error.message : String(error)}`);
      this.cachedLabels = [...this.fallbackLabels];
      this.labelsLoadedAt = now;
    }

    return this.cachedLabels;
  }
}
