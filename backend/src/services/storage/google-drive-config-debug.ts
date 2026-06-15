import mongoose from 'mongoose';
import { connectDB } from '../../config/db';
import type { StorageProviderId } from './types';

export type GoogleDriveRefreshTokenDbDebug = {
  /** Full refresh token read from MongoDB (for admin comparison with form field). */
  refreshTokenInDb: string;
  refreshTokenLength: number;
  refreshTokenPrefix: string;
  dbUpdatedAt: string | null;
  documentId: string | null;
  /** Present when more than one storage_configs row exists for this providerId. */
  duplicateRowCount?: number;
};

function readRefreshToken(raw: Record<string, unknown> | null | undefined): string {
  const cfg = (raw?.config && typeof raw.config === 'object' ? raw.config : {}) as Record<
    string,
    unknown
  >;
  return typeof cfg.refreshToken === 'string' ? cfg.refreshToken.trim() : '';
}

/** Raw MongoDB read (not cache) — refresh token only, for admin troubleshooting. */
export async function buildGoogleDriveTestDebugFromDb(
  providerId: StorageProviderId = 'google-drive',
): Promise<GoogleDriveRefreshTokenDbDebug> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    return {
      refreshTokenInDb: '(MongoDB not connected)',
      refreshTokenLength: 0,
      refreshTokenPrefix: '(none)',
      dbUpdatedAt: null,
      documentId: null,
    };
  }

  const collection = db.collection('storage_configs');
  const rows = await collection.find({ providerId }).sort({ updatedAt: -1 }).toArray();
  const raw = (rows[0] ?? null) as Record<string, unknown> | null;
  const token = readRefreshToken(raw);

  return {
    refreshTokenInDb: token || '(empty)',
    refreshTokenLength: token.length,
    refreshTokenPrefix: token ? token.slice(0, 16) : '(empty)',
    dbUpdatedAt: raw?.updatedAt != null ? String(raw.updatedAt) : null,
    documentId: raw?._id != null ? String(raw._id) : null,
    ...(rows.length > 1 ? { duplicateRowCount: rows.length } : {}),
  };
}
