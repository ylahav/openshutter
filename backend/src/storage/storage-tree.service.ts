import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getJob, setJob, updateJob } from '../migration/job-store';
import { StorageManager } from '../services/storage/manager';
import type { StorageProviderId } from '../services/storage/types';

export interface StorageTreeScanProgress {
  foldersScanned: number;
  filesScanned: number;
  currentPath: string;
}

@Injectable()
export class StorageTreeService {
  private readonly logger = new Logger(StorageTreeService.name);

  startTreeScan(
    providerId: StorageProviderId,
    options?: { path?: string; maxDepth?: number },
  ): { jobId: string } {
    const depth = options?.maxDepth ?? 3;
    if (depth < 1 || depth > 10) {
      throw new BadRequestException('maxDepth must be between 1 and 10');
    }

    const jobId = randomUUID();
    setJob({
      jobId,
      type: 'storage-tree-scan',
      status: 'pending',
      progress: 0,
      total: 100,
      current: 'Starting folder tree scan…',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    void this.runTreeScanJob(jobId, providerId, options?.path, depth);
    return { jobId };
  }

  getTreeScanJobStatus(jobId: string) {
    const job = getJob(jobId);
    if (!job || job.type !== 'storage-tree-scan') {
      throw new BadRequestException('Tree scan job not found');
    }

    const result = job.result as
      | {
          providerId?: string;
          data?: unknown;
          progress?: StorageTreeScanProgress;
        }
      | undefined;

    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      total: job.total,
      current: job.current,
      error: job.error,
      providerId: result?.providerId,
      tree: result?.data,
      scanProgress: result?.progress,
    };
  }

  private async runTreeScanJob(
    jobId: string,
    providerId: StorageProviderId,
    path: string | undefined,
    maxDepth: number,
  ): Promise<void> {
    updateJob(jobId, { status: 'running', progress: 2, current: 'Connecting to storage…' });

    const scanStats: StorageTreeScanProgress = {
      foldersScanned: 0,
      filesScanned: 0,
      currentPath: path || '/',
    };

    try {
      const storageManager = StorageManager.getInstance();
      const provider = await storageManager.getProviderForConfigTest(providerId);

      if (typeof (provider as { getFolderTree?: unknown }).getFolderTree !== 'function') {
        throw new BadRequestException(`Folder tree listing is not supported for ${providerId}`);
      }

      const tree = await (provider as {
        getFolderTree: (
          parentPath?: string,
          maxDepth?: number,
          options?: Record<string, unknown>,
        ) => Promise<unknown>;
      }).getFolderTree(path, maxDepth, {
        skipVariantFolders: true,
        previewMode: true,
        onProgress: (p: StorageTreeScanProgress) => {
          scanStats.foldersScanned = p.foldersScanned;
          scanStats.filesScanned = p.filesScanned;
          scanStats.currentPath = p.currentPath;
          const label = p.currentPath && p.currentPath !== '/' ? p.currentPath : 'root';
          updateJob(jobId, {
            progress: Math.min(95, 5 + Math.floor(p.foldersScanned / 2)),
            current: `Scanning ${label}… (${p.foldersScanned} folders, ${p.filesScanned} files)`,
            result: {
              providerId,
              progress: { ...scanStats },
            },
          });
        },
      });

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        current: 'Scan complete',
        result: {
          providerId,
          data: tree,
          progress: scanStats,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Tree scan job ${jobId} failed: ${message}`);
      updateJob(jobId, {
        status: 'failed',
        error: message,
        current: 'Scan failed',
        result: { providerId, progress: scanStats },
      });
    }
  }
}
