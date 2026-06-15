import mongoose, { Schema, Document } from 'mongoose';

export interface IStorageRestoreScanCache extends Document {
  cacheKey: string;
  providerId: string;
  stage: 'albums' | 'photos';
  rootPrefix: string;
  report?: Record<string, unknown>;
  folderTree?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

export const StorageRestoreScanCacheSchema = new Schema<IStorageRestoreScanCache>(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    providerId: { type: String, required: true },
    stage: { type: String, enum: ['albums', 'photos'], required: true },
    rootPrefix: { type: String, default: '' },
    report: { type: Schema.Types.Mixed },
    folderTree: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
  },
  { collection: 'storage_restore_scan_cache' },
);

StorageRestoreScanCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
