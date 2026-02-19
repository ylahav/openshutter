import { Injectable, Logger } from '@nestjs/common';
import { AITaggingProvider, TagSuggestion, SuggestTagsOptions, AIProvider } from './types';
import { LocalAIProvider } from './providers/local.provider';
import { GoogleVisionProvider } from './providers/google-vision.provider';
import { TagMappingService } from './tag-mapping.service';

/**
 * Main AI tagging service that coordinates between providers and tag mapping
 */
@Injectable()
export class AITaggingService {
  private readonly logger = new Logger(AITaggingService.name);
  private providers: Map<AIProvider, AITaggingProvider> = new Map();

  constructor(
    private readonly localProvider: LocalAIProvider,
    private readonly googleVisionProvider: GoogleVisionProvider,
    private readonly tagMappingService: TagMappingService
  ) {
    this.providers.set('local', localProvider);
    this.providers.set('google-vision', googleVisionProvider);
  }

  /**
   * Get the configured provider based on environment/config
   */
  private getProvider(providerOverride?: AIProvider): AITaggingProvider {
    const configuredProvider = (process.env.AI_TAGGING_PROVIDER || 'local') as AIProvider;
    
    // Handle 'auto' by using the configured provider
    let provider = providerOverride === 'auto' ? configuredProvider : (providerOverride || configuredProvider);

    if (provider === 'disabled') {
      throw new Error('AI tagging is disabled');
    }

    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`AI tagging provider '${provider}' not found`);
    }

    return providerInstance;
  }

  /**
   * Suggest tags for a single photo
   */
  async suggestTags(
    imagePath: string,
    options: SuggestTagsOptions = {}
  ): Promise<{
    suggestions: TagSuggestion[];
    provider: AIProvider;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const provider = this.getProvider(options.provider);
      
      // Check if provider is available
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        const providerName = options.provider || 'auto';
        throw new Error(
          `AI tagging provider "${providerName}" is not available. ` +
          `Check backend logs for details. Common issues: ` +
          `1) TensorFlow.js model download failed (check network), ` +
          `2) Missing native dependencies, ` +
          `3) Model loading timeout. ` +
          `For local provider, ensure @tensorflow/tfjs-node and @tensorflow-models/mobilenet are installed.`
        );
      }

      // Get raw suggestions from AI provider
      const rawSuggestions = await provider.suggestTags(imagePath, options);

      // Map labels to existing tags using TagMappingService
      const mappedSuggestions = await Promise.all(
        rawSuggestions.map(async (suggestion) => {
          const minSimilarity = 0.7;
          const match = await this.tagMappingService.findMatchingTag(suggestion.label, minSimilarity);
          
          const category = suggestion.category || this.tagMappingService.suggestCategory(suggestion.label);

          return {
            label: suggestion.label,
            confidence: suggestion.confidence,
            category,
            matchedTag: match ? {
              id: match.tagId,
              name: match.tagName,
            } : undefined,
            isNewTag: !match,
          };
        })
      );

      // Filter and sort
      const minConfidence = options.minConfidence || 0.5;
      const filtered = mappedSuggestions.filter(s => s.confidence >= minConfidence);
      const sorted = filtered.sort((a, b) => b.confidence - a.confidence);
      const limited = sorted.slice(0, options.maxSuggestions || 10);

      const processingTime = Date.now() - startTime;
      // Resolve 'auto' to actual provider used
      const resolvedProvider = options.provider === 'auto' 
        ? (process.env.AI_TAGGING_PROVIDER || 'local') as AIProvider
        : (options.provider || process.env.AI_TAGGING_PROVIDER || 'local') as AIProvider;

      this.logger.debug(`AI tagging completed: ${limited.length} suggestions using ${resolvedProvider} in ${processingTime}ms`);

      return {
        suggestions: limited,
        provider: resolvedProvider,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Error in suggestTags: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if a provider is available
   */
  async isProviderAvailable(provider: AIProvider): Promise<boolean> {
    if (provider === 'disabled') {
      return false;
    }

    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      return false;
    }

    return providerInstance.isAvailable();
  }
}
