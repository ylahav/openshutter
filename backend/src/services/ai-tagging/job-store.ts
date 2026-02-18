/**
 * Job store for AI tagging bulk operations
 * Extends the migration job store pattern for AI tagging jobs
 */
import { BulkSuggestTagsStatus, BulkSuggestTagsJobResult } from './types';

export type AITaggingJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AITaggingJobState {
  jobId: string;
  type: 'bulk-suggest-tags';
  status: AITaggingJobStatus;
  progress: {
    processed: number;
    total: number;
    current?: string;
  };
  results: BulkSuggestTagsJobResult[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  cancelled?: boolean;
}

const jobs = new Map<string, AITaggingJobState>();

export function setAITaggingJob(job: AITaggingJobState): void {
  jobs.set(job.jobId, { ...job, updatedAt: new Date() });
}

export function getAITaggingJob(jobId: string): AITaggingJobState | undefined {
  return jobs.get(jobId);
}

export function updateAITaggingJob(jobId: string, updates: Partial<AITaggingJobState>): void {
  const job = jobs.get(jobId);
  if (job) {
    jobs.set(jobId, { ...job, ...updates, updatedAt: new Date() });
  }
}

export function deleteAITaggingJob(jobId: string): void {
  jobs.delete(jobId);
}

export function getAllAITaggingJobs(): AITaggingJobState[] {
  return Array.from(jobs.values());
}
