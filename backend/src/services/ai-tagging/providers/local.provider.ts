import { Injectable, Logger } from '@nestjs/common';
import { BaseAIProvider } from './base.provider';
import { TagSuggestion, SuggestTagsOptions } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs-node';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as sharp from 'sharp';

/**
 * Local AI provider using TensorFlow.js with MobileNet model
 * 
 * Uses MobileNet v2 for image classification, which provides:
 * - Lightweight model suitable for server-side inference
 * - Good accuracy for common objects and scenes
 * - Fast inference times
 * - Built-in ImageNet class names (1000 classes)
 * 
 * Model is loaded on first use and cached.
 */
@Injectable()
export class LocalAIProvider extends BaseAIProvider {
  private readonly logger = new Logger(LocalAIProvider.name);
  private model: mobilenet.MobileNet | null = null;
  private modelLoaded = false;
  private modelLoadingPromise: Promise<void> | null = null;

  async isAvailable(): Promise<boolean> {
    try {
      // Try to load model if not already loaded
      if (!this.modelLoaded) {
        await this.loadModel();
      }
      return this.model !== null;
    } catch (error) {
      this.logger.warn(`LocalAIProvider not available: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async suggestTags(imagePath: string, options: SuggestTagsOptions): Promise<TagSuggestion[]> {
    try {
      // Verify image file exists
      try {
        await fs.access(imagePath);
        this.logger.debug(`LocalAIProvider: Image file found at ${imagePath}`);
      } catch (accessError) {
        this.logger.error(`LocalAIProvider: Image file not found at ${imagePath}: ${accessError instanceof Error ? accessError.message : String(accessError)}`);
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Load model if not already loaded
      await this.loadModel();

      if (!this.model) {
        throw new Error('MobileNet model failed to load');
      }

      // Read and preprocess image
      const imageBuffer = await fs.readFile(imagePath);
      const preprocessedImage = await this.preprocessImage(imageBuffer);

      // Run inference using MobileNet's classify method
      // This returns predictions with class names and confidence scores
      const predictions = await this.model.classify(preprocessedImage);

      // Map predictions to tag suggestions
      const suggestions: TagSuggestion[] = predictions.map((prediction) => ({
        label: prediction.className,
        confidence: prediction.probability,
        category: undefined, // Will be set by TagMappingService
        isNewTag: true,
      }));

      // Clean up tensor
      preprocessedImage.dispose();

      // Filter by confidence threshold
      const minConfidence = options.minConfidence || 0.5;
      const filtered = this.filterByConfidence(suggestions, minConfidence);

      // Sort and limit
      const sorted = this.sortByConfidence(filtered);
      const limited = this.limitSuggestions(sorted, options.maxSuggestions || 10);

      this.logger.debug(`LocalAIProvider: Generated ${limited.length} tag suggestions`);
      return limited;

    } catch (error) {
      this.logger.error(`Error in LocalAIProvider.suggestTags: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Load TensorFlow.js MobileNet model
   * Model is loaded from TensorFlow Hub and cached
   */
  private async loadModel(): Promise<void> {
    // If already loaded, return
    if (this.modelLoaded && this.model) {
      return;
    }

    // If loading is in progress, wait for it
    if (this.modelLoadingPromise) {
      await this.modelLoadingPromise;
      return;
    }

    // Start loading
    this.modelLoadingPromise = this.doLoadModel();
    await this.modelLoadingPromise;
  }

  private async doLoadModel(): Promise<void> {
    try {
      this.logger.log('Loading MobileNet model...');
      
      // Load MobileNet v2 using the @tensorflow-models/mobilenet package
      // This package includes the model and ImageNet class names
      // version: 2 - MobileNet v2 (more accurate)
      // alpha: 1.0 - width multiplier (1.0 = full width, good balance of speed/accuracy)
      this.model = await mobilenet.load({ version: 2, alpha: 1.0 });

      this.modelLoaded = true;
      this.logger.log('MobileNet model loaded successfully');
    } catch (error) {
      this.logger.error(`Failed to load MobileNet model: ${error instanceof Error ? error.message : String(error)}`);
      this.model = null;
      this.modelLoaded = false;
      throw error;
    } finally {
      this.modelLoadingPromise = null;
    }
  }

  /**
   * Preprocess image for MobileNet model
   * MobileNet expects 224x224 RGB images
   * The mobilenet package handles normalization internally
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<tf.Tensor3D> {
    try {
      // Resize image to 224x224 and convert to RGB (remove alpha channel if present)
      const resizedBuffer = await sharp(imageBuffer)
        .resize(224, 224, {
          fit: 'cover',
          position: 'center'
        })
        .removeAlpha()
        .toFormat('rgb')
        .toBuffer();

      // Convert buffer to tensor (3 channels: RGB)
      // MobileNet package expects Tensor3D (height, width, channels)
      const imageTensor = tf.node.decodeImage(resizedBuffer, 3) as tf.Tensor3D;

      return imageTensor;
    } catch (error) {
      this.logger.error(`Error preprocessing image: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
