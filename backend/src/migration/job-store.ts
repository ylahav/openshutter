/**
 * In-memory job state for export, import, and storage-migration.
 * Keys: jobId (UUID). Values: status, progress, total, current, error, result, cancelled flag.
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobState {
  jobId: string;
  type: 'export' | 'import' | 'storage-migration';
  status: JobStatus;
  progress: number;
  total: number;
  current?: string;
  error?: string;
  result?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  /** When true, the running job should stop gracefully. */
  cancelled?: boolean;
}

const jobs = new Map<string, JobState>();

export function setJob(job: JobState): void {
  jobs.set(job.jobId, { ...job, updatedAt: new Date() });
}

export function getJob(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

export function updateJob(
  jobId: string,
  updates: Partial<Pick<JobState, 'status' | 'progress' | 'total' | 'current' | 'error' | 'result'>>,
): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates, { updatedAt: new Date() });
    jobs.set(jobId, job);
  }
}

export function setJobCancelled(jobId: string): void {
  const job = jobs.get(jobId);
  if (job) {
    job.cancelled = true;
    job.updatedAt = new Date();
    jobs.set(jobId, job);
  }
}

export function isJobCancelled(jobId: string): boolean {
  return jobs.get(jobId)?.cancelled === true;
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}
