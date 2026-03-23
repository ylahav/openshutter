import { Injectable, Logger } from '@nestjs/common';
import { BaseAIProvider } from './base.provider';
import { TagSuggestion, SuggestTagsOptions } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import '../tfjs-node-util-polyfill';

// Dynamic imports for TensorFlow.js (optional dependencies)
// These will be loaded at runtime, so TypeScript won't complain if packages aren't installed
async function loadTensorFlow(): Promise<any> {
  try {
    // @ts-ignore - Dynamic import, package may not be installed yet
    return await import('@tensorflow/tfjs-node');
  } catch (error) {
    throw new Error('@tensorflow/tfjs-node is not installed. Run: pnpm add @tensorflow/tfjs-node');
  }
}

async function loadMobileNet(): Promise<any> {
  try {
    // @ts-ignore - Dynamic import, package may not be installed yet
    return await import('@tensorflow-models/mobilenet');
  } catch (error) {
    throw new Error('@tensorflow-models/mobilenet is not installed. Run: pnpm add @tensorflow-models/mobilenet');
  }
}

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
  private model: any = null; // MobileNet model type
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`LocalAIProvider not available: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.debug(`Stack trace: ${error.stack}`);
      }
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
      const suggestions: TagSuggestion[] = predictions.map((prediction: { className: string; probability: number }) => ({
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

      // Ensure TensorFlow.js Node backend is loaded BEFORE loading the model,
      // otherwise tfjs-core will have no registered backend and model load will fail
      await loadTensorFlow();

      // Load MobileNet package (it will reuse the already-registered tfjs-node backend)
      const mobilenetModule = await loadMobileNet();

      // Load MobileNet v2 using the @tensorflow-models/mobilenet package
      // This package includes the model and ImageNet class names
      // version: 2 - MobileNet v2 (more accurate)
      // alpha: 1.0 - width multiplier (1.0 = full width, good balance of speed/accuracy)
      this.model = await mobilenetModule.load({ version: 2, alpha: 1.0 });

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
  private async preprocessImage(imageBuffer: Buffer): Promise<any> {
    try {
      // Resize image to 224x224 and convert to RGB (remove alpha channel if present)
      // Use JPEG format to ensure RGB output (no alpha channel)
      const resizedBuffer = await sharp(imageBuffer)
        .resize(224, 224, {
          fit: 'cover',
          position: 'center'
        })
        .removeAlpha()
        .jpeg({ quality: 100 })
        .toBuffer();

      // Load TensorFlow.js
      const tfModule = await loadTensorFlow();
      
      // Convert buffer to tensor (3 channels: RGB)
      // MobileNet package expects Tensor3D (height, width, channels)
      const imageTensor = tfModule.node.decodeImage(resizedBuffer, 3);

      return imageTensor;
    } catch (error) {
      this.logger.error(`Error preprocessing image: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
