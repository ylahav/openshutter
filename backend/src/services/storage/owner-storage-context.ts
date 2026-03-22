import { Types } from 'mongoose';
import { UserModel } from '../../models/User';
import type { StorageOwnerContext } from './types';

export type { StorageOwnerContext } from './types';

/**
 * When the album (or creating) user has useDedicatedStorage, storage operations must use
 * `owner_storage_configs` for that user id (typically album.createdBy).
 */
export async function resolveOwnerStorageContext(
  ownerUserId: string | undefined | null,
): Promise<StorageOwnerContext | undefined> {
  if (!ownerUserId || !Types.ObjectId.isValid(ownerUserId)) return undefined;
  const u = await UserModel.findById(ownerUserId).select('useDedicatedStorage').lean();
  if (!u || !(u as any).useDedicatedStorage) return undefined;
  return { ownerUserId };
}
