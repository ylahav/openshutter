import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { connectDB } from '../../config/db';
import mongoose, { Types } from 'mongoose';
import { PhotoModel } from '../../models/Photo';
import { TagModel } from '../../models/Tag';

export interface TagSuggestion {
  tagId: string;
  tagName: string;
  category?: string;
  source: 'similar' | 'iptc' | 'location' | 'cooccurrence';
  score: number;
  reason: string;
}

export interface SuggestTagsFromContextOptions {
  maxSuggestions?: number;
  sources?: ('similar' | 'iptc' | 'location' | 'cooccurrence')[];
}

export interface SuggestTagsFromContextResult {
  suggestions: TagSuggestion[];
  sources: {
    similar: number;
    iptc: number;
    location: number;
    cooccurrence: number;
  };
}

@Injectable()
export class TagSuggestionsService {
  private readonly logger = new Logger(TagSuggestionsService.name);

  /**
   * Suggest tags from context (similar photos, IPTC keywords, location, co-occurrence)
   */
  async suggestTagsFromContext(
    photoId: string,
    options: SuggestTagsFromContextOptions = {}
  ): Promise<SuggestTagsFromContextResult> {
    await connectDB();

    const maxSuggestions = options.maxSuggestions || 10;
    const sources = options.sources || ['similar', 'iptc', 'location', 'cooccurrence'];

    // Get the target photo
    const photo = await PhotoModel.findById(photoId)
      .populate('tags')
      .populate('location')
      .populate('albumId')
      .exec();

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    // Get existing tag IDs to exclude
    const existingTagIds = photo.tags
      ? (photo.tags as any[]).map((t) => (t._id ? t._id.toString() : t.toString()))
      : [];

    const allSuggestions: TagSuggestion[] = [];

    // 1. Similar photos analysis
    if (sources.includes('similar')) {
      const similarSuggestions = await this.getSuggestionsFromSimilarPhotos(
        photo,
        existingTagIds
      );
      allSuggestions.push(...similarSuggestions);
    }

    // 2. IPTC/XMP keywords
    if (sources.includes('iptc')) {
      const iptcSuggestions = await this.getSuggestionsFromIPTC(photo, existingTagIds);
      allSuggestions.push(...iptcSuggestions);
    }

    // 3. Location-based suggestions
    if (sources.includes('location')) {
      const locationSuggestions = await this.getSuggestionsFromLocation(
        photo,
        existingTagIds
      );
      allSuggestions.push(...locationSuggestions);
    }

    // 4. Co-occurrence patterns
    if (sources.includes('cooccurrence')) {
      const cooccurrenceSuggestions = await this.getSuggestionsFromCooccurrence(
        photo,
        existingTagIds
      );
      allSuggestions.push(...cooccurrenceSuggestions);
    }

    // Aggregate and rank suggestions
    const aggregated = this.aggregateSuggestions(allSuggestions);
    const ranked = this.rankSuggestions(aggregated);
    const limited = ranked.slice(0, maxSuggestions);

    // Count suggestions by source
    const sourceCounts = {
      similar: allSuggestions.filter((s) => s.source === 'similar').length,
      iptc: allSuggestions.filter((s) => s.source === 'iptc').length,
      location: allSuggestions.filter((s) => s.source === 'location').length,
      cooccurrence: allSuggestions.filter((s) => s.source === 'cooccurrence').length,
    };

    return {
      suggestions: limited,
      sources: sourceCounts,
    };
  }

  /**
   * Get suggestions from similar photos (same album, location, EXIF)
   */
  private async getSuggestionsFromSimilarPhotos(
    photo: any,
    existingTagIds: string[]
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];
    const tagFrequency = new Map<string, { count: number; source: string }>();

    // Find photos in the same album
    if (photo.albumId) {
      const albumId = photo.albumId._id
        ? photo.albumId._id.toString()
        : photo.albumId.toString();
      const sameAlbumPhotos = await PhotoModel.find({
        albumId: new Types.ObjectId(albumId),
        _id: { $ne: photo._id },
        isPublished: true,
      })
        .populate('tags')
        .limit(50)
        .exec();

      sameAlbumPhotos.forEach((p) => {
        if (p.tags && Array.isArray(p.tags)) {
          p.tags.forEach((tag: any) => {
            const tagId = tag._id ? tag._id.toString() : tag.toString();
            if (!existingTagIds.includes(tagId)) {
              const current = tagFrequency.get(tagId) || { count: 0, source: '' };
              current.count += 1;
              current.source = 'same album';
              tagFrequency.set(tagId, current);
            }
          });
        }
      });
    }

    // Find photos with the same location
    if (photo.location) {
      const locationId = photo.location._id
        ? photo.location._id.toString()
        : photo.location.toString();
      const sameLocationPhotos = await PhotoModel.find({
        location: new Types.ObjectId(locationId),
        _id: { $ne: photo._id },
        isPublished: true,
      })
        .populate('tags')
        .limit(50)
        .exec();

      sameLocationPhotos.forEach((p) => {
        if (p.tags && Array.isArray(p.tags)) {
          p.tags.forEach((tag: any) => {
            const tagId = tag._id ? tag._id.toString() : tag.toString();
            if (!existingTagIds.includes(tagId)) {
              const current = tagFrequency.get(tagId) || { count: 0, source: '' };
              current.count += 1;
              current.source = current.source
                ? `${current.source} + same location`
                : 'same location';
              tagFrequency.set(tagId, current);
            }
          });
        }
      });
    }

    // Find photos with similar EXIF (same make/model)
    if (photo.exif?.make && photo.exif?.model) {
      const similarExifPhotos = await PhotoModel.find({
        'exif.make': photo.exif.make,
        'exif.model': photo.exif.model,
        _id: { $ne: photo._id },
        isPublished: true,
      })
        .populate('tags')
        .limit(30)
        .exec();

      similarExifPhotos.forEach((p) => {
        if (p.tags && Array.isArray(p.tags)) {
          p.tags.forEach((tag: any) => {
            const tagId = tag._id ? tag._id.toString() : tag.toString();
            if (!existingTagIds.includes(tagId)) {
              const current = tagFrequency.get(tagId) || { count: 0, source: '' };
              current.count += 0.5; // Lower weight for EXIF similarity
              current.source = current.source
                ? `${current.source} + similar camera`
                : 'similar camera';
              tagFrequency.set(tagId, current);
            }
          });
        }
      });
    }

    // Convert to suggestions
    const tagIds = Array.from(tagFrequency.keys());
    if (tagIds.length === 0) return suggestions;

    const tags = await TagModel.find({ _id: { $in: tagIds } }).exec();
    const tagMap = new Map(tags.map((t) => [t._id.toString(), t]));

    tagFrequency.forEach((freq, tagId) => {
      const tag = tagMap.get(tagId);
      if (tag) {
        suggestions.push({
          tagId: tag._id.toString(),
          tagName: tag.name,
          category: tag.category,
          source: 'similar',
          score: freq.count * 2, // Base score multiplier for similar photos
          reason: `Found on ${Math.floor(freq.count)} photo(s) (${freq.source})`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Get suggestions from IPTC/XMP keywords
   */
  private async getSuggestionsFromIPTC(
    photo: any,
    existingTagIds: string[]
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];

    if (!photo.iptcXmp) return suggestions;

    // Extract keywords from IPTC/XMP
    let keywords: string[] = [];
    if (photo.iptcXmp.keywords) {
      if (Array.isArray(photo.iptcXmp.keywords)) {
        keywords = photo.iptcXmp.keywords;
      } else if (typeof photo.iptcXmp.keywords === 'string') {
        keywords = photo.iptcXmp.keywords.split(',').map((k: string) => k.trim());
      }
    }

    if (keywords.length === 0) return suggestions;

    // Find matching tags (exact match first, then fuzzy)
    for (const keyword of keywords) {
      if (!keyword || keyword.length < 2) continue;

      // Try exact match (case-insensitive)
      const exactMatch = await TagModel.findOne({
        name: { $regex: new RegExp(`^${keyword}$`, 'i') },
      }).exec();

      if (exactMatch && !existingTagIds.includes(exactMatch._id.toString())) {
        suggestions.push({
          tagId: exactMatch._id.toString(),
          tagName: exactMatch.name,
          category: exactMatch.category,
          source: 'iptc',
          score: 1.5,
          reason: `Matched IPTC keyword: "${keyword}"`,
        });
        continue;
      }

      // Try fuzzy match (Levenshtein distance ≤ 2)
      const allTags = await TagModel.find({}).exec();
      for (const tag of allTags) {
        if (existingTagIds.includes(tag._id.toString())) continue;

        const distance = this.levenshteinDistance(
          keyword.toLowerCase(),
          tag.name.toLowerCase()
        );
        if (distance <= 2 && distance < keyword.length) {
          suggestions.push({
            tagId: tag._id.toString(),
            tagName: tag.name,
            category: tag.category,
            source: 'iptc',
            score: 1.0,
            reason: `Fuzzy matched IPTC keyword: "${keyword}" → "${tag.name}"`,
          });
          break; // Only one fuzzy match per keyword
        }
      }
    }

    return suggestions;
  }

  /**
   * Get suggestions from location-based analysis
   */
  private async getSuggestionsFromLocation(
    photo: any,
    existingTagIds: string[]
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];

    if (!photo.location) return suggestions;

    const locationId = photo.location._id
      ? photo.location._id.toString()
      : photo.location.toString();

    // Find photos at the same location
    const sameLocationPhotos = await PhotoModel.find({
      location: new Types.ObjectId(locationId),
      _id: { $ne: photo._id },
      isPublished: true,
    })
      .populate('tags')
      .limit(100)
      .exec();

    const tagFrequency = new Map<string, number>();
    sameLocationPhotos.forEach((p) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((tag: any) => {
          const tagId = tag._id ? tag._id.toString() : tag.toString();
          if (!existingTagIds.includes(tagId)) {
            tagFrequency.set(tagId, (tagFrequency.get(tagId) || 0) + 1);
          }
        });
      }
    });

    if (tagFrequency.size === 0) return suggestions;

    const tagIds = Array.from(tagFrequency.keys());
    const tags = await TagModel.find({ _id: { $in: tagIds } }).exec();
    const tagMap = new Map(tags.map((t) => [t._id.toString(), t]));

    tagFrequency.forEach((count, tagId) => {
      const tag = tagMap.get(tagId);
      if (tag) {
        suggestions.push({
          tagId: tag._id.toString(),
          tagName: tag.name,
          category: tag.category,
          source: 'location',
          score: count * 1.5, // Base score multiplier for location
          reason: `Found on ${count} photo(s) at the same location`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Get suggestions from tag co-occurrence patterns
   */
  private async getSuggestionsFromCooccurrence(
    photo: any,
    existingTagIds: string[]
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];

    if (!photo.tags || photo.tags.length === 0) return suggestions;

    const photoTagIds = (photo.tags as any[]).map((t) =>
      t._id ? t._id.toString() : t.toString()
    );

    // Find photos with overlapping tags
    const photosWithOverlap = await PhotoModel.find({
      tags: { $in: photoTagIds.map((id) => new Types.ObjectId(id)) },
      _id: { $ne: photo._id },
      isPublished: true,
    })
      .populate('tags')
      .limit(100)
      .exec();

    const cooccurrenceFrequency = new Map<string, number>();
    photosWithOverlap.forEach((p) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((tag: any) => {
          const tagId = tag._id ? tag._id.toString() : tag.toString();
          if (!existingTagIds.includes(tagId) && !photoTagIds.includes(tagId)) {
            cooccurrenceFrequency.set(tagId, (cooccurrenceFrequency.get(tagId) || 0) + 1);
          }
        });
      }
    });

    if (cooccurrenceFrequency.size === 0) return suggestions;

    const tagIds = Array.from(cooccurrenceFrequency.keys());
    const tags = await TagModel.find({ _id: { $in: tagIds } }).exec();
    const tagMap = new Map(tags.map((t) => [t._id.toString(), t]));

    cooccurrenceFrequency.forEach((count, tagId) => {
      const tag = tagMap.get(tagId);
      if (tag) {
        suggestions.push({
          tagId: tag._id.toString(),
          tagName: tag.name,
          category: tag.category,
          source: 'cooccurrence',
          score: count * 1.0, // Base score for co-occurrence
          reason: `Co-occurs with ${count} photo(s) that share tags with this photo`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Aggregate suggestions by tag ID (combine scores from multiple sources)
   */
  private aggregateSuggestions(suggestions: TagSuggestion[]): Map<string, TagSuggestion> {
    const aggregated = new Map<string, TagSuggestion>();

    suggestions.forEach((suggestion) => {
      const existing = aggregated.get(suggestion.tagId);
      if (existing) {
        // Combine scores and sources
        existing.score = Math.max(existing.score, suggestion.score); // Take max score
        existing.reason = `${existing.reason}; ${suggestion.reason}`;
      } else {
        aggregated.set(suggestion.tagId, { ...suggestion });
      }
    });

    return aggregated;
  }

  /**
   * Rank suggestions by score
   */
  private rankSuggestions(aggregated: Map<string, TagSuggestion>): TagSuggestion[] {
    return Array.from(aggregated.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
