import { Types } from 'mongoose';
import type { StorageOwnerContext } from './types';
import { resolveOwnerStorageContext } from './owner-storage-context';

/**
 * Resolve dedicated storage context for a photo: prefer stored `storage.storageOwnerId`, else album.createdBy.
 */
export async function storageCtxForPhoto(db: any, photo: any): Promise<StorageOwnerContext | undefined> {
  if (photo?.storage?.storageOwnerId) {
    return resolveOwnerStorageContext(String(photo.storage.storageOwnerId));
  }
  if (!photo?.albumId || !Types.ObjectId.isValid(String(photo.albumId))) {
    return undefined;
  }
  const album = await db.collection('albums').findOne({ _id: new Types.ObjectId(String(photo.albumId)) });
  return resolveOwnerStorageContext(album?.createdBy ? String(album.createdBy) : undefined);
}
