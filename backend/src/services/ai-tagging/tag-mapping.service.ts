import { Injectable, Logger } from '@nestjs/common';
import { connectDB } from '../../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../../types/multi-lang';

export interface TagMatch {
  tagId: string;
  tagName: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy';
}

export interface CategoryMapping {
  [key: string]: string;
}

/**
 * Service for mapping AI-generated labels to existing tags
 */
@Injectable()
export class TagMappingService {
  private readonly logger = new Logger(TagMappingService.name);
  
  // Common label-to-category mappings
  private readonly categoryMappings: CategoryMapping = {
    // Objects
    'dog': 'object',
    'cat': 'object',
    'car': 'object',
    'building': 'object',
    'tree': 'object',
    'flower': 'object',
    'person': 'object',
    'animal': 'object',
    
    // Locations
    'beach': 'location',
    'mountain': 'location',
    'forest': 'location',
    'city': 'location',
    'park': 'location',
    'street': 'location',
    'indoor': 'location',
    'outdoor': 'location',
    
    // Mood/Atmosphere
    'sunset': 'mood',
    'sunrise': 'mood',
    'foggy': 'mood',
    'bright': 'mood',
    'dark': 'mood',
    'sunny': 'mood',
    'cloudy': 'mood',
    
    // Events
    'wedding': 'event',
    'birthday': 'event',
    'party': 'event',
    'celebration': 'event',
    
    // Technical
    'macro': 'technical',
    'panorama': 'technical',
    'hdr': 'technical',
    'black and white': 'technical',
    'portrait': 'technical',
    'landscape': 'technical',
  };

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calculate similarity score between two strings (0-1)
   */
  private similarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - distance / maxLen;
  }

  /**
   * Find matching tag for a label
   */
  async findMatchingTag(label: string, minSimilarity: number = 0.7): Promise<TagMatch | null> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      this.logger.error('Database connection not established');
      return null;
    }

    const normalizedLabel = label.toLowerCase().trim();
    const escapedLabel = normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try exact match (case-insensitive)
    const exactMatch = await db.collection('tags').findOne({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: new RegExp(`^${escapedLabel}$`, 'i') } },
            ...SUPPORTED_LANGUAGES.map((lang) => ({
              [`name.${lang.code}`]: { $regex: new RegExp(`^${escapedLabel}$`, 'i') },
            })),
          ],
        },
      ],
    });

    if (exactMatch) {
      return {
        tagId: exactMatch._id.toString(),
        tagName: exactMatch.name,
        confidence: 1.0,
        matchType: 'exact'
      };
    }

    // Try fuzzy match
    const allTags = await db.collection('tags')
      .find({ isActive: true })
      .toArray();

    let bestMatch: TagMatch | null = null;
    let bestSimilarity = 0;

    for (const tag of allTags) {
      const tagName = typeof tag.name === 'string' ? tag.name : tag.name?.en || '';
      const sim = this.similarity(normalizedLabel, tagName.toLowerCase());
      
      if (sim > bestSimilarity && sim >= minSimilarity) {
        bestSimilarity = sim;
        bestMatch = {
          tagId: tag._id.toString(),
          tagName: tagName,
          confidence: sim,
          matchType: 'fuzzy'
        };
      }
    }

    return bestMatch;
  }

  /**
   * Suggest category for a label based on mappings
   */
  suggestCategory(label: string): string {
    const normalizedLabel = label.toLowerCase().trim();
    
    // Check direct mappings
    if (this.categoryMappings[normalizedLabel]) {
      return this.categoryMappings[normalizedLabel];
    }

    // Check partial matches
    for (const [key, category] of Object.entries(this.categoryMappings)) {
      if (normalizedLabel.includes(key) || key.includes(normalizedLabel)) {
        return category;
      }
    }

    // Default to 'general'
    return 'general';
  }

  /**
   * Map multiple labels to tags
   */
  async mapLabelsToTags(
    labels: Array<{ label: string; confidence: number }>,
    minConfidence: number = 0.5,
    minSimilarity: number = 0.7
  ): Promise<Array<{
    label: string;
    confidence: number;
    category: string;
    matchedTag?: TagMatch;
    isNewTag: boolean;
  }>> {
    const results = [];

    for (const { label, confidence } of labels) {
      if (confidence < minConfidence) {
        continue;
      }

      const matchedTag = await this.findMatchingTag(label, minSimilarity);
      const category = this.suggestCategory(label);

      results.push({
        label,
        confidence,
        category,
        matchedTag: matchedTag || undefined,
        isNewTag: !matchedTag
      });
    }

    return results;
  }
}
