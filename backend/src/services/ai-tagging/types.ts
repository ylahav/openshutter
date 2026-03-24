/**
 * Types and interfaces for AI-powered photo tagging
 */

export type AIProvider = 'local' | 'google-vision' | 'clip' | 'auto' | 'disabled';

export interface TagSuggestion {
  label: string;
  confidence: number;
  category?: string;
  matchedTag?: {
    id: string;
    name: string;
  };
  isNewTag: boolean;
}

export interface SuggestTagsOptions {
  provider?: AIProvider;
  minConfidence?: number;
  maxSuggestions?: number;
  createNewTags?: boolean;
}

export interface SuggestTagsResult {
  suggestions: TagSuggestion[];
  provider: AIProvider;
  processingTime: number;
}

export interface BulkSuggestTagsRequest {
  photoIds: string[];
  provider?: AIProvider;
  minConfidence?: number;
  maxSuggestions?: number;
  createNewTags?: boolean;
}

export interface BulkSuggestTagsJobResult {
  photoId: string;
  suggestions: TagSuggestion[];
  error?: string;
}

export interface BulkSuggestTagsStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    processed: number;
    total: number;
    current?: string;
  };
  results: BulkSuggestTagsJobResult[];
  error?: string;
}

export interface AITaggingProvider {
  suggestTags(imagePath: string, options: SuggestTagsOptions): Promise<TagSuggestion[]>;
  isAvailable(): Promise<boolean>;
}
