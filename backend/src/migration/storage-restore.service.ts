import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { storageManager } from '../services/storage/manager';
import { storageConfigService } from '../services/storage/config';
import type { IStorageService, StorageProviderId } from '../services/storage/types';
import { IAlbum } from '../models/Album';
import { IPhoto } from '../models/Photo';
import { ThumbnailGenerator } from '../services/thumbnail-generator';

const VARIANT_FOLDERS = new Set(['hero', 'large', 'medium', 'small', 'micro', 'thumb']);
const THUMBNAIL_SIZE_NAMES = ['hero', 'large', 'medium', 'small', 'micro'] as const;
const PHOTO_FILENAME_PATTERN = /^\d{13}-/;
const THUMBNAIL_FILE_PATTERN = /^(hero|large|medium|small|micro)-\d{13}-/i;
const IMAGE_EXTENSIONS = new Set(
  ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.tiff', '.tif'].map((e) => e.toLowerCase()),
);

export type StorageRestoreItemStatus = 'exists' | 'create' | 'orphan';

export interface StorageRestoreAlbumScanItem {
  id: string;
  storagePath: string;
  folderName: string;
  parentStoragePath: string;
  status: 'exists' | 'create';
  existingAlbumId?: string;
  proposedAlias: string;
  proposedName: { en: string };
}

export interface StorageRestorePhotoScanItem {
  id: string;
  storagePath: string;
  filename: string;
  originalFilename: string;
  albumStoragePath: string;
  albumId?: string;
  albumName?: string;
  status: StorageRestoreItemStatus;
  existingPhotoId?: string;
  size: number;
  mimeType: string;
}

export interface StorageRestoreAlbumScanReport {
  providerId: StorageProviderId;
  rootPrefix: string;
  summary: { total: number; existing: number; toCreate: number };
  items: StorageRestoreAlbumScanItem[];
}

export interface StorageRestorePhotoScanReport {
  providerId: StorageProviderId;
  rootPrefix: string;
  summary: { total: number; existing: number; toCreate: number; orphan: number };
  items: StorageRestorePhotoScanItem[];
}

export interface StorageRestoreExecuteResult {
  created: number;
  skipped: number;
  errors: Array<{ id: string; message: string }>;
}

interface ScannedAlbumFolder {
  storagePath: string;
  folderName: string;
  parentStoragePath: string;
}

interface FolderTreeNode {
  path: string;
  folders?: FolderTreeNode[];
  files?: Array<{ name: string; path: string; size?: number; mimeType?: string }>;
}

@Injectable()
export class StorageRestoreService {
  private readonly logger = new Logger(StorageRestoreService.name);

  constructor(
    @InjectModel('Album') private readonly albumModel: Model<IAlbum>,
    @InjectModel('Photo') private readonly photoModel: Model<IPhoto>,
  ) {}

  async getProviders(): Promise<StorageProviderId[]> {
    const active = await storageConfigService.getActiveProviders();
    return active.filter((p) => p !== 'google-drive');
  }

  async scanAlbums(
    providerId: StorageProviderId,
    rootPrefix?: string,
  ): Promise<StorageRestoreAlbumScanReport> {
    const service = await this.getStorageService(providerId);
    const tree = await this.loadFolderTree(service, rootPrefix);
    const folders = this.collectAlbumFolders(tree);
    const albumsByPath = await this.buildAlbumPathIndex(providerId);
    const usedAliases = await this.loadUsedAliases();

    const items: StorageRestoreAlbumScanItem[] = folders.map((folder) => {
      const normPath = normalizeStoragePath(folder.storagePath);
      const existing = albumsByPath.get(normPath);
      const proposedAlias = this.proposeAlias(folder.folderName, normPath, usedAliases);
      return {
        id: normPath,
        storagePath: normPath,
        folderName: folder.folderName,
        parentStoragePath: folder.parentStoragePath,
        status: existing ? 'exists' : 'create',
        existingAlbumId: existing?._id?.toString(),
        proposedAlias,
        proposedName: { en: humanizeFolderName(folder.folderName) },
      };
    });

    items.sort((a, b) => a.storagePath.localeCompare(b.storagePath));
    const existing = items.filter((i) => i.status === 'exists').length;
    return {
      providerId,
      rootPrefix: normalizeStoragePath(rootPrefix ?? ''),
      summary: { total: items.length, existing, toCreate: items.length - existing },
      items,
    };
  }

  async executeAlbums(
    providerId: StorageProviderId,
    userId: string,
    options?: { rootPrefix?: string; itemIds?: string[] },
  ): Promise<StorageRestoreExecuteResult> {
    const report = await this.scanAlbums(providerId, options?.rootPrefix);
    const idSet = options?.itemIds?.length ? new Set(options.itemIds) : null;
    const toCreate = report.items.filter(
      (i) => i.status === 'create' && (!idSet || idSet.has(i.id)),
    );
    toCreate.sort(
      (a, b) => a.storagePath.split('/').length - b.storagePath.split('/').length,
    );

    const userObjectId = new Types.ObjectId(userId);
    const pathToAlbumId = new Map<string, Types.ObjectId>();
    const existingAlbums = await this.albumModel.find({ storageProvider: providerId }).lean().exec();
    for (const a of existingAlbums) {
      const key = normalizeStoragePath((a as any).storagePath ?? '');
      if (key) pathToAlbumId.set(key, a._id as Types.ObjectId);
    }

    const result: StorageRestoreExecuteResult = { created: 0, skipped: 0, errors: [] };

    for (const item of toCreate) {
      try {
        let parentAlbumId: Types.ObjectId | null = null;
        let parentPath = '';
        let level = 0;
        if (item.parentStoragePath) {
          const parentKey = normalizeStoragePath(item.parentStoragePath);
          parentAlbumId = pathToAlbumId.get(parentKey) ?? null;
          if (!parentAlbumId) {
            const parentDoc = await this.albumModel
              .findOne({
                storageProvider: providerId,
                storagePath: { $in: pathVariants(parentKey) },
              })
              .lean()
              .exec();
            if (parentDoc) {
              parentAlbumId = parentDoc._id as Types.ObjectId;
              pathToAlbumId.set(parentKey, parentAlbumId);
            }
          }
          if (parentAlbumId) {
            const parent = await this.albumModel.findById(parentAlbumId).lean().exec();
            parentPath = (parent as any)?.storagePath ?? '';
            level = ((parent as any)?.level ?? 0) + 1;
          }
        }

        const alias = await this.ensureUniqueAlias(item.proposedAlias);
        const dbStoragePath = toDbStoragePath(item.storagePath);
        const maxOrderResult = await this.albumModel
          .find({ parentAlbumId: parentAlbumId ?? null })
          .sort({ order: -1 })
          .limit(1)
          .lean()
          .exec();
        const order = maxOrderResult.length > 0 ? ((maxOrderResult[0] as any).order ?? 0) + 1 : 0;

        const created = await this.albumModel.create({
          name: item.proposedName,
          alias,
          description: '',
          isPublic: false,
          isPublished: true,
          isFeatured: false,
          storageProvider: providerId,
          storagePath: dbStoragePath,
          parentAlbumId: parentAlbumId ?? undefined,
          parentPath: parentPath || '',
          level,
          order,
          photoCount: 0,
          createdBy: userObjectId,
          tags: [],
          allowedGroups: [],
          allowedUsers: [],
        });

        pathToAlbumId.set(item.storagePath, created._id as Types.ObjectId);
        result.created++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Storage restore album failed ${item.storagePath}: ${message}`);
        result.errors.push({ id: item.id, message });
      }
    }

    result.skipped = report.items.length - toCreate.length - result.created;
    return result;
  }

  async scanPhotos(
    providerId: StorageProviderId,
    rootPrefix?: string,
  ): Promise<StorageRestorePhotoScanReport> {
    const service = await this.getStorageService(providerId);
    const tree = await this.loadFolderTree(service, rootPrefix);
    const albumFolders = this.collectAlbumFolders(tree);
    const albumsByPath = await this.buildAlbumPathIndex(providerId);
    const photoPaths = await this.buildPhotoPathIndex(providerId);

    const items: StorageRestorePhotoScanItem[] = [];

    for (const album of albumFolders) {
      const node = this.findTreeNode(tree, album.storagePath);
      if (!node) continue;
      const albumKey = normalizeStoragePath(album.storagePath);
      const albumDoc = albumsByPath.get(albumKey);
      const directFiles = (node.files ?? []).filter((f) => isRestorablePhotoFile(f.name));

      for (const file of directFiles) {
        const fileKey = normalizeStoragePath(file.path);
        const existingPhoto = photoPaths.get(fileKey);
        let status: StorageRestoreItemStatus = 'create';
        if (existingPhoto) status = 'exists';
        else if (!albumDoc) status = 'orphan';

        items.push({
          id: fileKey,
          storagePath: fileKey,
          filename: file.name,
          originalFilename: stripTimestampPrefix(file.name),
          albumStoragePath: albumKey,
          albumId: albumDoc?._id?.toString(),
          albumName: albumDoc ? displayAlbumName(albumDoc) : album.folderName,
          status,
          existingPhotoId: existingPhoto?._id?.toString(),
          size: file.size ?? 0,
          mimeType: file.mimeType && file.mimeType !== 'application/octet-stream'
            ? file.mimeType
            : guessMimeType(file.name),
        });
      }
    }

    items.sort((a, b) => a.storagePath.localeCompare(b.storagePath));
    const existing = items.filter((i) => i.status === 'exists').length;
    const orphan = items.filter((i) => i.status === 'orphan').length;
    return {
      providerId,
      rootPrefix: normalizeStoragePath(rootPrefix ?? ''),
      summary: {
        total: items.length,
        existing,
        toCreate: items.filter((i) => i.status === 'create').length,
        orphan,
      },
      items,
    };
  }

  async executePhotos(
    providerId: StorageProviderId,
    userId: string,
    options?: { rootPrefix?: string; itemIds?: string[] },
  ): Promise<StorageRestoreExecuteResult> {
    const service = await this.getStorageService(providerId);
    const report = await this.scanPhotos(providerId, options?.rootPrefix);
    const idSet = options?.itemIds?.length ? new Set(options.itemIds) : null;
    const toCreate = report.items.filter(
      (i) => i.status === 'create' && i.albumId && (!idSet || idSet.has(i.id)),
    );

    const userObjectId = new Types.ObjectId(userId);
    const result: StorageRestoreExecuteResult = { created: 0, skipped: 0, errors: [] };
    const tree = await this.loadFolderTree(service, options?.rootPrefix);

    for (const item of toCreate) {
      try {
        const album = await this.albumModel.findById(item.albumId).lean().exec();
        if (!album) {
          result.errors.push({ id: item.id, message: 'Album not found' });
          continue;
        }

        const albumPath = normalizeStoragePath((album as any).storagePath ?? item.albumStoragePath);
        const thumbnails = await this.resolveThumbnails(service, tree, albumPath, item.filename, providerId);
        const serveUrl = `/api/storage/serve/${providerId}/${encodeURIComponent(item.storagePath)}`;
        const mediumThumb =
          thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0] || serveUrl;

        await this.photoModel.create({
          title: { en: item.originalFilename },
          description: {},
          filename: item.filename,
          originalFilename: item.originalFilename,
          mimeType: item.mimeType,
          size: item.size,
          dimensions: { width: 0, height: 0 },
          storage: {
            provider: providerId,
            fileId: item.storagePath,
            url: serveUrl,
            path: item.storagePath,
            thumbnailPath: mediumThumb,
            thumbnails,
          },
          albumId: new Types.ObjectId(item.albumId!),
          tags: [],
          people: [],
          isPublished: true,
          isLeading: false,
          isGalleryLeading: false,
          uploadedBy: userObjectId,
          uploadedAt: new Date(),
          updatedAt: new Date(),
        });

        await this.albumModel.updateOne(
          { _id: item.albumId },
          { $inc: { photoCount: 1 }, $set: { updatedAt: new Date() } },
        );

        result.created++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Storage restore photo failed ${item.storagePath}: ${message}`);
        result.errors.push({ id: item.id, message });
      }
    }

    result.skipped =
      report.items.filter((i) => i.status === 'exists').length +
      report.items.filter((i) => i.status === 'orphan').length +
      (report.items.filter((i) => i.status === 'create').length - toCreate.length);
    return result;
  }

  private async getStorageService(providerId: StorageProviderId): Promise<IStorageService> {
    const active = await storageConfigService.getActiveProviders();
    if (!active.includes(providerId)) {
      throw new BadRequestException(`Storage provider "${providerId}" is not enabled`);
    }
    if (providerId === 'google-drive') {
      throw new BadRequestException('Google Drive restore scan is not supported; use S3-compatible or local storage');
    }
    return storageManager.getProvider(providerId);
  }

  private async loadFolderTree(service: IStorageService, rootPrefix?: string): Promise<FolderTreeNode> {
    if (!service.getFolderTree) {
      throw new BadRequestException(`Provider does not support repository scanning`);
    }
    const prefix = normalizeStoragePath(rootPrefix ?? '');
    const prefixArg = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : undefined;
    return (await service.getFolderTree(prefixArg, 20)) as FolderTreeNode;
  }

  private collectAlbumFolders(tree: FolderTreeNode): ScannedAlbumFolder[] {
    const results: ScannedAlbumFolder[] = [];

    const walk = (node: FolderTreeNode, parentPath: string) => {
      const nodePath = normalizeStoragePath(node.path === '/' ? '' : node.path);
      const isRoot = !nodePath || node.path === '/';

      if (!isRoot) {
        const folderName = nodePath.split('/').pop() || nodePath;
        if (!VARIANT_FOLDERS.has(folderName.toLowerCase())) {
          results.push({
            storagePath: nodePath,
            folderName,
            parentStoragePath: parentPath,
          });
        } else {
          return;
        }
      }

      const currentParent = isRoot ? '' : nodePath;
      for (const child of node.folders ?? []) {
        const childName = normalizeStoragePath(child.path).split('/').pop() || '';
        if (VARIANT_FOLDERS.has(childName.toLowerCase())) continue;
        walk(child, currentParent);
      }
    };

    walk(tree, '');
    return results;
  }

  private findTreeNode(tree: FolderTreeNode, albumStoragePath: string): FolderTreeNode | null {
    const target = normalizeStoragePath(albumStoragePath);
    const nodePath = normalizeStoragePath(tree.path === '/' ? '' : tree.path);
    if (nodePath === target) return tree;
    for (const child of tree.folders ?? []) {
      const found = this.findTreeNode(child, target);
      if (found) return found;
    }
    return null;
  }

  private async buildAlbumPathIndex(providerId: StorageProviderId): Promise<Map<string, IAlbum>> {
    const map = new Map<string, IAlbum>();
    const albums = await this.albumModel.find({ storageProvider: providerId }).lean().exec();
    for (const a of albums) {
      const key = normalizeStoragePath((a as any).storagePath ?? '');
      if (key) map.set(key, a as IAlbum);
      for (const variant of pathVariants(key)) {
        if (!map.has(variant)) map.set(variant, a as IAlbum);
      }
    }
    return map;
  }

  private async buildPhotoPathIndex(providerId: StorageProviderId): Promise<Map<string, IPhoto>> {
    const map = new Map<string, IPhoto>();
    const photos = await this.photoModel.find({ 'storage.provider': providerId }).select('storage.path _id').lean().exec();
    for (const p of photos) {
      const key = normalizeStoragePath((p as any).storage?.path ?? '');
      if (key) map.set(key, p as IPhoto);
    }
    return map;
  }

  private async loadUsedAliases(): Promise<Set<string>> {
    const rows = await this.albumModel.find({}).select('alias').lean().exec();
    return new Set(rows.map((a) => String((a as any).alias ?? '').toLowerCase()));
  }

  private proposeAlias(folderName: string, storagePath: string, usedAliases: Set<string>): string {
    const base = slugify(folderName) || slugify(storagePath.split('/').pop() || 'album');
    if (!usedAliases.has(base)) {
      usedAliases.add(base);
      return base;
    }
    const suffix = storagePath.replace(/\//g, '-').slice(-12) || 'x';
    let candidate = `${base}-${suffix}`;
    let n = 0;
    while (usedAliases.has(candidate)) {
      n++;
      candidate = `${base}-${suffix}-${n}`;
    }
    usedAliases.add(candidate);
    return candidate;
  }

  private async ensureUniqueAlias(baseAlias: string): Promise<string> {
    let alias = baseAlias.toLowerCase().trim();
    let n = 0;
    while (await this.albumModel.exists({ alias })) {
      n++;
      alias = `${baseAlias}-${n}`;
    }
    return alias;
  }

  private async resolveThumbnails(
    service: IStorageService,
    tree: FolderTreeNode,
    albumPath: string,
    filename: string,
    providerId: StorageProviderId,
  ): Promise<Record<string, string>> {
    const thumbnails: Record<string, string> = {};
    const albumNode = this.findTreeNode(tree, albumPath);

    for (const sizeName of THUMBNAIL_SIZE_NAMES) {
      const sizeConfig = ThumbnailGenerator.getThumbnailSize(sizeName);
      const thumbFilename = `${sizeName}-${filename}`;
      const thumbPath = `${albumPath}/${sizeConfig.folder}/${thumbFilename}`;
      const normalized = normalizeStoragePath(thumbPath);

      let exists = false;
      if (albumNode) {
        const variantNode = (albumNode.folders ?? []).find(
          (f) => normalizeStoragePath(f.path).endsWith(`/${sizeConfig.folder}`),
        );
        if (variantNode?.files?.some((f) => normalizeStoragePath(f.path) === normalized)) {
          exists = true;
        }
      }
      if (!exists) {
        try {
          exists = await service.fileExists(normalized);
        } catch {
          exists = false;
        }
      }
      if (exists) {
        thumbnails[sizeName] = `/api/storage/serve/${providerId}/${encodeURIComponent(normalized)}`;
      }
    }
    return thumbnails;
  }
}

function normalizeStoragePath(p: string): string {
  return p.replace(/^\/+/, '').replace(/\/+$/, '');
}

function pathVariants(p: string): string[] {
  const norm = normalizeStoragePath(p);
  if (!norm) return [];
  return [norm, `/${norm}`, `${norm}/`, `/${norm}/`];
}

function toDbStoragePath(storagePath: string): string {
  const norm = normalizeStoragePath(storagePath);
  return norm.includes('/') ? `/${norm}` : `/${norm}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function humanizeFolderName(name: string): string {
  return name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || name;
}

function displayAlbumName(album: IAlbum): string {
  const n = album.name as any;
  if (typeof n === 'string') return n;
  return n?.en || n?.he || album.alias || '';
}

function stripTimestampPrefix(filename: string): string {
  return filename.replace(/^\d{13}-/, '');
}

function isRestorablePhotoFile(name: string): boolean {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  if (!IMAGE_EXTENSIONS.has(ext)) return false;
  if (THUMBNAIL_FILE_PATTERN.test(name)) return false;
  return PHOTO_FILENAME_PATTERN.test(name);
}

function guessMimeType(filename: string): string {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
  };
  return map[ext] || 'image/jpeg';
}
