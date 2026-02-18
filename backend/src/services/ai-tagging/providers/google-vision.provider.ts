import { Injectable, Logger } from '@nestjs/common';
import { BaseAIProvider } from './base.provider';
import { TagSuggestion, SuggestTagsOptions } from '../types';
import * as fs from 'fs/promises';

/**
 * Google Cloud Vision API provider for AI tagging
 * 
 * Requires:
 * - GOOGLE_CLOUD_VISION_API_KEY environment variable
 * - @google-cloud/vision package (to be added to package.json)
 */
@Injectable()
export class GoogleVisionProvider extends BaseAIProvider {
  private readonly logger = new Logger(GoogleVisionProvider.name);
  private visionClient: any = null;

  constructor() {
    super();
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
      if (!apiKey) {
        this.logger.warn('Google Cloud Vision API key not configured');
        return;
      }

      // Lazy load @google-cloud/vision
      // Note: This package needs to be added to package.json
      try {
        const vision = require('@google-cloud/vision');
        this.visionClient = new vision.ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          // Or use API key directly if available
        });
        this.logger.log('Google Cloud Vision client initialized');
      } catch (error) {
        this.logger.warn('@google-cloud/vision package not installed. Install it to use Google Vision API.');
      }
    } catch (error) {
      this.logger.error(`Error initializing Google Vision client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return false;
    }

    // Check if client is initialized
    if (!this.visionClient) {
      await this.initializeClient();
    }

    return this.visionClient !== null;
  }

  async suggestTags(imagePath: string, options: SuggestTagsOptions): Promise<TagSuggestion[]> {
    if (!this.visionClient) {
      throw new Error('Google Cloud Vision client not initialized. Check API key configuration.');
    }

    try {
      // Read image file
      const imageBuffer = await fs.readFile(imagePath);

      // Call Google Vision API
      const [result] = await this.visionClient.labelDetection({
        image: { content: imageBuffer },
        maxResults: options.maxSuggestions || 10,
      });

      const labels = result.labelAnnotations || [];
      
      // Map Google Vision labels to TagSuggestion format
      const suggestions: TagSuggestion[] = labels.map((label: any) => ({
        label: label.description || '',
        confidence: label.score || 0,
        category: undefined, // Will be set by TagMappingService
        isNewTag: true,
      }));

      // Filter by confidence
      const minConfidence = options.minConfidence || 0.5;
      const filtered = this.filterByConfidence(suggestions, minConfidence);
      
      // Sort and limit
      const sorted = this.sortByConfidence(filtered);
      const limited = this.limitSuggestions(sorted, options.maxSuggestions || 10);

      return limited;
    } catch (error) {
      this.logger.error(`Error calling Google Vision API: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
