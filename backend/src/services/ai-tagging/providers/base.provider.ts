import { AITaggingProvider, TagSuggestion, SuggestTagsOptions } from '../types';

/**
 * Base abstract class for AI tagging providers
 */
export abstract class BaseAIProvider implements AITaggingProvider {
  abstract suggestTags(imagePath: string, options: SuggestTagsOptions): Promise<TagSuggestion[]>;
  abstract isAvailable(): Promise<boolean>;

  /**
   * Filter suggestions by confidence threshold
   */
  protected filterByConfidence(
    suggestions: TagSuggestion[],
    minConfidence: number
  ): TagSuggestion[] {
    return suggestions.filter(s => s.confidence >= minConfidence);
  }

  /**
   * Limit number of suggestions
   */
  protected limitSuggestions(
    suggestions: TagSuggestion[],
    maxSuggestions: number
  ): TagSuggestion[] {
    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Sort suggestions by confidence (highest first)
   */
  protected sortByConfidence(suggestions: TagSuggestion[]): TagSuggestion[] {
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}
