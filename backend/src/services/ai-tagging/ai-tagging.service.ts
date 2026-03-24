import { Injectable, Logger } from '@nestjs/common';
import { AITaggingProvider, TagSuggestion, SuggestTagsOptions, AIProvider } from './types';
import { LocalAIProvider } from './providers/local.provider';
import { GoogleVisionProvider } from './providers/google-vision.provider';
import { ClipAIProvider } from './providers/clip.provider';
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
    private readonly clipProvider: ClipAIProvider,
    private readonly tagMappingService: TagMappingService
  ) {
    this.providers.set('local', localProvider);
    this.providers.set('google-vision', googleVisionProvider);
    this.providers.set('clip', clipProvider);
  }

  /**
   * Resolve which backend implementation to use.
   * - Explicit `local` / `google-vision` / `clip`: only that provider.
   * - `auto` or unset: if AI_TAGGING_PROVIDER is pinned, use it; otherwise try google-vision, then clip, then local.
   */
  private async resolveProvider(requested?: AIProvider): Promise<{
    impl: AITaggingProvider;
    name: 'local' | 'google-vision' | 'clip';
  }> {
    if (requested === 'disabled') {
      throw new Error('AI tagging is disabled');
    }

    const env = (process.env.AI_TAGGING_PROVIDER || '').trim();

    const order = (): Array<'local' | 'google-vision' | 'clip'> => {
      if (requested === 'local' || requested === 'google-vision' || requested === 'clip') {
        return [requested];
      }
      // auto or undefined
      if (env === 'local') {
        return ['local'];
      }
      if (env === 'google-vision') {
        return ['google-vision'];
      }
      if (env === 'clip') {
        return ['clip'];
      }
      return ['google-vision', 'clip', 'local'];
    };

    const tried: Array<'local' | 'google-vision' | 'clip'> = [];
    for (const name of order()) {
      tried.push(name);
      const impl = this.providers.get(name);
      if (!impl) {
        continue;
      }
      if (await impl.isAvailable()) {
        return { impl, name };
      }
    }

    const localDetail = this.localProvider.getLastLoadError?.() ?? 'see Nest logs for LocalAIProvider';
    throw new Error(
      `No AI tagging provider is available. Tried: ${[...new Set(tried)].join(', ')}. ` +
        `Google Vision: set GOOGLE_CLOUD_VISION_API_KEY on the Nest backend (PM2/env for the API), not the frontend; enable Cloud Vision API and create an API key. ` +
        `Local MobileNet last error: ${localDetail}. ` +
        `Hints: deploy latest backend (util polyfill runs from main.ts); or use Node 22 LTS; on Linux try \`pnpm rebuild @tensorflow/tfjs-node\` in the backend directory.`,
    );
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
      const { impl: provider, name: usedProviderName } = await this.resolveProvider(options.provider);

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
      // CLIP zero-shot scores are typically lower than classifier-style probabilities.
      // Use provider-specific defaults when caller did not supply minConfidence.
      const minConfidence =
        options.minConfidence ??
        (usedProviderName === 'clip' ? 0.18 : 0.5);
      const filtered = mappedSuggestions.filter(s => s.confidence >= minConfidence);
      const sorted = filtered.sort((a, b) => b.confidence - a.confidence);
      const limited = sorted.slice(0, options.maxSuggestions || 10);

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `AI tagging completed: ${limited.length}/${mappedSuggestions.length} suggestions using ${usedProviderName} in ${processingTime}ms (minConfidence=${minConfidence})`,
      );

      return {
        suggestions: limited,
        provider: usedProviderName,
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

    try {
      await this.resolveProvider(provider === 'auto' ? undefined : provider);
      return true;
    } catch {
      return false;
    }
  }
}
