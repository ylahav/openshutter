import { Logger } from '@nestjs/common';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '../../config/db';
import type { BaseStorageConfig, StorageProviderId } from './types';

const COLLECTION = 'owner_storage_configs';

/**
 * Per-owner storage provider rows (mirrors global `storage_configs` shape, scoped by ownerId).
 * Used when User.useDedicatedStorage is true — uploads and reads use these credentials only.
 */
export class OwnerStorageConfigService {
  private static readonly logger = new Logger(OwnerStorageConfigService.name);
  private static instance: OwnerStorageConfigService;

  static getInstance(): OwnerStorageConfigService {
    if (!OwnerStorageConfigService.instance) {
      OwnerStorageConfigService.instance = new OwnerStorageConfigService();
    }
    return OwnerStorageConfigService.instance;
  }

  private constructor() {}

  async ensureIndexes(): Promise<void> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return;
    await db.collection(COLLECTION).createIndex({ ownerId: 1, providerId: 1 }, { unique: true });
  }

  async listByOwner(ownerId: string): Promise<BaseStorageConfig[]> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db || !Types.ObjectId.isValid(ownerId)) return [];
    const docs = await db
      .collection(COLLECTION)
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .toArray();
    return docs.map((d) => this.docToBase(d));
  }

  async get(ownerId: string, providerId: StorageProviderId): Promise<BaseStorageConfig | null> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db || !Types.ObjectId.isValid(ownerId)) return null;
    const doc = await db.collection(COLLECTION).findOne({
      ownerId: new Types.ObjectId(ownerId),
      providerId,
    });
    return doc ? this.docToBase(doc) : null;
  }

  /**
   * Create or update one provider row for an owner. Invalidates owner storage service cache.
   */
  async upsert(
    ownerId: string,
    providerId: StorageProviderId,
    updates: Partial<BaseStorageConfig>,
  ): Promise<BaseStorageConfig> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db || !Types.ObjectId.isValid(ownerId)) {
      throw new Error('Invalid owner or database');
    }
    const oid = new Types.ObjectId(ownerId);
    const now = new Date();

    const existing = await db.collection(COLLECTION).findOne({ ownerId: oid, providerId });

    let config: Record<string, unknown> =
      updates.config !== undefined && typeof updates.config === 'object' && updates.config
        ? { ...(updates.config as Record<string, unknown>) }
        : existing?.config && typeof existing.config === 'object'
          ? { ...existing.config }
          : {};

    if (providerId === 'local') {
      if (!config.basePath) {
        config.basePath = `./uploads/owners/${ownerId}`;
      }
      if (!config.maxFileSize) {
        config.maxFileSize = '100mb';
      }
    }

    const setDoc: Record<string, unknown> = {
      ownerId: oid,
      providerId,
      name: updates.name !== undefined ? updates.name : existing?.name || providerId,
      isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : existing?.isEnabled !== false,
      config,
      updatedAt: now,
    };

    await db.collection(COLLECTION).updateOne(
      { ownerId: oid, providerId },
      { $set: setDoc, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );

    const out = await this.get(ownerId, providerId);
    if (!out) throw new Error('Failed to read owner storage config after upsert');

    const { StorageManager } = await import('./manager');
    StorageManager.getInstance().clearOwnerCache(ownerId);

    return out;
  }

  private docToBase(doc: any): BaseStorageConfig {
    return {
      providerId: doc.providerId,
      name: doc.name || doc.providerId,
      isEnabled: doc.isEnabled !== false,
      config: doc.config && typeof doc.config === 'object' ? doc.config : {},
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };
  }
}

export const ownerStorageConfigService = OwnerStorageConfigService.getInstance();
