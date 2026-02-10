import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import archiver from 'archiver';
import { storageManager } from '../services/storage/manager';
import { storageConfigService } from '../services/storage/config';
import type { StorageProviderId } from '../services/storage/types';
import {
  setJob,
  getJob,
  updateJob,
  setJobCancelled,
  isJobCancelled,
  type JobState,
} from './job-store';
import { IAlbum } from '../models/Album';
import { IPhoto } from '../models/Photo';
import { ITag } from '../models/Tag';
import { IPerson } from '../models/Person';
import { ILocation } from '../models/Location';

const PACKAGE_MANIFEST = 'manifest.json';
const PACKAGE_ALBUMS = 'albums.json';
const PACKAGE_PHOTOS = 'photos.json';
const PACKAGE_TAGS = 'tags.json';
const PACKAGE_PEOPLE = 'people.json';
const PACKAGE_LOCATIONS = 'locations.json';
const PACKAGE_PHOTOS_DIR = 'photos';

const IMAGE_EXTENSIONS = new Set(
  ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.tiff', '.tif'].map((e) => e.toLowerCase()),
);

function toPlainObjectId(id: unknown): string {
  if (id == null) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null && '_id' in (id as any)) return (id as any)._id?.toString?.() ?? '';
  return String(id);
}

/** Resolve path to absolute and ensure it is under basePath. */
function resolveAndValidatePath(basePath: string | undefined, candidatePath: string): string {
  const base = path.resolve(basePath || path.join(process.cwd(), 'migration-data'));
  const resolved = path.resolve(candidatePath);
  const normalizedBase = path.normalize(base) + path.sep;
  const normalizedResolved = path.normalize(resolved) + (resolved.endsWith(path.sep) ? '' : path.sep);
  if (normalizedResolved !== normalizedBase && !normalizedResolved.startsWith(normalizedBase)) {
    throw new BadRequestException(
      `Path must be under allowed base path. Base: ${base}, received: ${candidatePath}`,
    );
  }
  return resolved;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectModel('Album') private albumModel: Model<IAlbum>,
    @InjectModel('Photo') private photoModel: Model<IPhoto>,
    @InjectModel('Tag') private tagModel: Model<ITag>,
    @InjectModel('Person') private personModel: Model<IPerson>,
    @InjectModel('Location') private locationModel: Model<ILocation>,
    private configService: ConfigService,
  ) {}

  private getMigrationBasePath(): string | undefined {
    return this.configService.get<string>('migrationBasePath') ?? undefined;
  }

  /** Validate and return absolute path for export/import. */
  validatePath(candidatePath: string): string {
    const base = this.getMigrationBasePath() ?? path.join(process.cwd(), 'migration-data');
    return resolveAndValidatePath(base, candidatePath);
  }

  // --- Export ---

  async exportPreview(
    destinationPath: string,
    bundle?: boolean,
  ): Promise<{
    albumCount: number;
    photoCount: number;
    estimatedSizeBytes: number;
    albumTree: Array<{ alias: string; name: string; photoCount: number; children?: unknown[] }>;
    bundle?: boolean;
    bundlePath?: string;
  }> {
    const dest = this.validatePath(destinationPath);
    const albums = await this.albumModel.find({}).sort({ level: 1, order: 1 }).lean().exec();
    const photos = await this.photoModel.find({}).lean().exec();
    const albumIdToCount = new Map<string, number>();
    for (const p of photos) {
      const aid = toPlainObjectId(p.albumId);
      albumIdToCount.set(aid, (albumIdToCount.get(aid) ?? 0) + 1);
    }
    let estimatedSizeBytes = 0;
    for (const p of photos) {
      estimatedSizeBytes += (p as any).size ?? 0;
      const thumbPath = (p as any).storage?.thumbnailPath;
      if (thumbPath) estimatedSizeBytes += Math.floor(((p as any).size ?? 0) * 0.1);
    }
    const buildTree = (parentId: string | null): Array<{ alias: string; name: string; photoCount: number; children?: unknown[] }> => {
      return albums
        .filter((a) => toPlainObjectId((a as any).parentAlbumId) === parentId)
        .sort((a, b) => (a as any).order - (b as any).order)
        .map((a) => {
          const aid = (a as any)._id.toString();
          const name = typeof (a as any).name === 'object' ? (a as any).name?.en ?? (a as any).name?.he ?? (a as any).alias : (a as any).name;
          return {
            alias: (a as any).alias,
            name,
            photoCount: albumIdToCount.get(aid) ?? 0,
            children: buildTree(aid),
          };
        });
    };
    const albumTree = buildTree(null);
    const bundlePath = bundle ? `${dest}.zip` : undefined;
    return {
      albumCount: albums.length,
      photoCount: photos.length,
      estimatedSizeBytes,
      albumTree,
      bundle: !!bundle,
      bundlePath,
    };
  }

  async exportStart(destinationPath: string, bundle?: boolean): Promise<{ jobId: string }> {
    const dest = this.validatePath(destinationPath);
    const jobId = randomUUID();
    const bundleFlag = !!bundle;
    this.logger.log(`Export: Starting export job ${jobId}, destination: ${dest}, bundle requested: ${bundleFlag}`);
    setJob({
      jobId,
      type: 'export',
      status: 'pending',
      progress: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.runExportJob(jobId, dest, bundleFlag).catch((err) => {
      this.logger.error(`Export job ${jobId} failed: ${err instanceof Error ? err.message : String(err)}`);
      updateJob(jobId, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
    });
    return { jobId };
  }

  private async runExportJob(jobId: string, dest: string, bundle: boolean): Promise<void> {
    this.logger.log(`Export: Starting job ${jobId}, destination: ${dest}, bundle: ${bundle}`);
    updateJob(jobId, { status: 'running' });
    const albums = await this.albumModel.find({}).sort({ level: 1, order: 1 }).lean().exec();
    const photos = await this.photoModel.find({}).lean().exec();
    const tags = await this.tagModel.find({}).lean().exec();
    const people = await this.personModel.find({}).lean().exec();
    const locations = await this.locationModel.find({}).lean().exec();

    const albumIdToAliasPath = new Map<string, string>();
    for (const a of albums) {
      const aid = (a as any)._id.toString();
      const parentId = toPlainObjectId((a as any).parentAlbumId);
      const alias = (a as any).alias;
      const parentPath = parentId ? albumIdToAliasPath.get(parentId) : '';
      albumIdToAliasPath.set(aid, parentPath ? `${parentPath}/${alias}` : alias);
    }

    const total = photos.length;
    let skipped = 0;
    updateJob(jobId, { total });

    await fs.mkdir(dest, { recursive: true });
    const photosDir = path.join(dest, PACKAGE_PHOTOS_DIR);
    await fs.mkdir(photosDir, { recursive: true });

    const serializeDoc = (doc: any): any => {
      if (!doc) return doc;
      const out: any = {};
      for (const key of Object.keys(doc)) {
        const v = doc[key];
        if (key === '_id' || key === 'createdBy' || key === 'parentAlbumId' || key === 'coverPhotoId' || key === 'albumId' || key === 'uploadedBy' || key === 'location') {
          out[key] = v != null ? toPlainObjectId(v) : (v ?? null);
        } else if (key === 'tags' || key === 'people' || key === 'allowedUsers') {
          out[key] = Array.isArray(v) ? v.map((x: any) => toPlainObjectId(x)) : v;
        } else if (v && typeof v === 'object' && v.constructor?.name === 'ObjectId') {
          out[key] = v.toString();
        } else if (v instanceof Date) {
          out[key] = v.toISOString();
        } else {
          out[key] = v;
        }
      }
      return out;
    };

    const albumsJson = albums.map((a) => serializeDoc(a));
    const tagsJson = tags.map((t) => serializeDoc(t));
    const peopleJson = people.map((p) => serializeDoc(p));
    const locationsJson = locations.map((l) => serializeDoc(l));

    await fs.writeFile(path.join(dest, PACKAGE_ALBUMS), JSON.stringify(albumsJson, null, 2));
    await fs.writeFile(path.join(dest, PACKAGE_TAGS), JSON.stringify(tagsJson, null, 2));
    await fs.writeFile(path.join(dest, PACKAGE_PEOPLE), JSON.stringify(peopleJson, null, 2));
    await fs.writeFile(path.join(dest, PACKAGE_LOCATIONS), JSON.stringify(locationsJson, null, 2));

    const photosForPackage = photos.map((p) => {
      const albumId = toPlainObjectId((p as any).albumId);
      const albumPath = albumId ? albumIdToAliasPath.get(albumId) ?? '' : '';
      const relPath = albumPath ? `${PACKAGE_PHOTOS_DIR}/${albumPath}/${(p as any).filename}` : `${PACKAGE_PHOTOS_DIR}/${(p as any).filename}`;
      return {
        ...serializeDoc(p),
        storage: {
          ...(p as any).storage,
          path: relPath,
          thumbnailPath: albumPath ? `${PACKAGE_PHOTOS_DIR}/${albumPath}/thumb_${(p as any).filename}` : `${PACKAGE_PHOTOS_DIR}/thumb_${(p as any).filename}`,
        },
      };
    });
    await fs.writeFile(path.join(dest, PACKAGE_PHOTOS), JSON.stringify(photosForPackage, null, 2));

    const manifest = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      albumCount: albums.length,
      photoCount: photos.length,
      photoTreePath: PACKAGE_PHOTOS_DIR,
    };
    await fs.writeFile(path.join(dest, PACKAGE_MANIFEST), JSON.stringify(manifest, null, 2));

    let progress = 0;
    for (const p of photos) {
      if (isJobCancelled(jobId)) {
        updateJob(jobId, { status: 'cancelled' });
        return;
      }
      const albumId = toPlainObjectId((p as any).albumId);
      const albumPath = albumId ? albumIdToAliasPath.get(albumId) ?? '' : '';
      const relDir = albumPath ? path.join(PACKAGE_PHOTOS_DIR, albumPath) : PACKAGE_PHOTOS_DIR;
      const outDir = path.join(dest, relDir);
      await fs.mkdir(outDir, { recursive: true });
      const provider = (p as any).storage?.provider as StorageProviderId;
      const filePath = (p as any).storage?.path;
      const filename = (p as any).filename;
      if (provider && filePath) {
        try {
          const buf = await storageManager.getPhotoBuffer(provider, filePath);
          if (buf) {
            await fs.writeFile(path.join(outDir, filename), buf);
            const thumbPath = (p as any).storage?.thumbnailPath;
            if (thumbPath) {
              const thumbBuf = await storageManager.getPhotoBuffer(provider, thumbPath);
              if (thumbBuf) await fs.writeFile(path.join(outDir, `thumb_${filename}`), thumbBuf);
            }
          } else {
            skipped++;
            this.logger.warn(`Export: skip photo ${(p as any)._id}: could not read buffer from provider ${provider}`);
          }
        } catch (e) {
          skipped++;
          this.logger.warn(`Export: skip photo ${(p as any)._id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      progress++;
      updateJob(jobId, { progress, current: filename });
    }

    // Mark export as completed before optional bundling
    updateJob(jobId, {
      status: 'completed',
      progress: total,
      result: { destinationPath: dest, skippedCount: skipped },
    });

    // Optionally create a ZIP bundle of the exported directory
    if (bundle) {
      // Generate date string in YYYY-MM-DD format
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const siteName = 'openshutter';
      const zipFileName = `${siteName}-${dateStr}.zip`;
      const zipPath = path.join(dest, zipFileName);
      this.logger.log(`Export: Starting bundle creation for job ${jobId}, zipPath: ${zipPath}`);
      try {
        // Verify the destination directory exists before archiving
        try {
          const destStat = await fs.stat(dest);
          if (!destStat.isDirectory()) {
            throw new Error(`Destination path ${dest} exists but is not a directory`);
          }
          this.logger.log(`Export: Verified destination directory exists: ${dest}`);
        } catch (statErr) {
          throw new Error(`Destination directory ${dest} does not exist or is not accessible: ${statErr instanceof Error ? statErr.message : String(statErr)}`);
        }
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        await new Promise<void>((resolve, reject) => {
          let resolved = false;
          const finish = () => {
            if (!resolved) {
              resolved = true;
              this.logger.log(`Export: Bundle created successfully for job ${jobId}, zipPath: ${zipPath}`);
              resolve();
            }
          };
          const fail = (err: Error) => {
            if (!resolved) {
              resolved = true;
              this.logger.error(`Export: Bundle creation error for job ${jobId}: ${err.message}`);
              reject(err);
            }
          };

          output.on('close', () => {
            this.logger.debug(`Export: Output stream closed for job ${jobId}`);
            finish();
          });
          output.on('error', fail);
          archive.on('end', () => {
            this.logger.debug(`Export: Archive finalized for job ${jobId}`);
            finish();
          });
          archive.on('error', fail);

          archive.pipe(output);
          archive.directory(dest, false);
          // In archiver v7, finalize() does not return a Promise; we just call it
          archive.finalize();
        });

        // Verify the zip file was actually created
        try {
          await fs.access(zipPath);
          this.logger.log(`Export: Verified bundle file exists at ${zipPath}`);
        } catch (accessErr) {
          this.logger.error(`Export: Bundle file not found after creation at ${zipPath}`);
          throw new Error(`Bundle file was not created at ${zipPath}`);
        }

        // Remove all temporary export contents so that only the ZIP file remains under dest
        const toRemove: string[] = [];
        try {
          const entries = await fs.readdir(dest, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name === zipFileName) continue; // keep only the ZIP
            toRemove.push(path.join(dest, entry.name));
          }
          for (const fullPath of toRemove) {
            try {
              await fs.rm(fullPath, { recursive: true, force: true });
              this.logger.debug(`Export: Removed: ${fullPath}`);
            } catch (e) {
              this.logger.warn(`Export: Failed to remove ${fullPath}: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          const remaining = await fs.readdir(dest);
          if (remaining.length === 1 && remaining[0] === zipFileName) {
            this.logger.log(`Export: ${dest} now contains only ${zipFileName}`);
          } else if (remaining.length > 1 || (remaining.length === 1 && remaining[0] !== zipFileName)) {
            this.logger.warn(`Export: After cleanup ${dest} still has: ${remaining.join(', ')}`);
          }
        } catch (rmErr) {
          this.logger.warn(
            `Export: Error during cleanup of ${dest}: ${rmErr instanceof Error ? rmErr.message : String(rmErr)}`,
          );
        }

        updateJob(jobId, {
          result: {
            destinationPath: dest,
            bundlePath: zipPath,
            skippedCount: skipped,
          },
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        this.logger.error(`Export: failed to create bundle for job ${jobId}: ${errorMsg}`);
        updateJob(jobId, {
          result: {
            destinationPath: dest,
            skippedCount: skipped,
            bundleError: errorMsg,
          },
        });
      }
    } else {
      this.logger.debug(`Export: Bundle not requested for job ${jobId}`);
    }
  }

  getExportStatus(jobId: string): JobState | undefined {
    return getJob(jobId);
  }

  cancelExport(jobId: string): void {
    setJobCancelled(jobId);
  }

  // --- Import (from package) ---

  async importPreviewFromPackage(sourcePath: string): Promise<{
    albumCount: number;
    photoCount: number;
    albumTree: Array<{ alias: string; photoCount: number }>;
  }> {
    const src = this.validatePath(sourcePath);
    const manifestPath = path.join(src, PACKAGE_MANIFEST);
    await fs.access(manifestPath);
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    const albumsPath = path.join(src, PACKAGE_ALBUMS);
    const albumsRaw = await fs.readFile(albumsPath, 'utf-8');
    const albumsJson = JSON.parse(albumsRaw);
    const photosPath = path.join(src, PACKAGE_PHOTOS);
    const photosRaw = await fs.readFile(photosPath, 'utf-8');
    const photosJson = JSON.parse(photosRaw);
    const albumIdToCount = new Map<string, number>();
    for (const p of photosJson) {
      const aid = p.albumId ?? '';
      albumIdToCount.set(aid, (albumIdToCount.get(aid) ?? 0) + 1);
    }
    const buildTree = (parentId: string | null): Array<{ alias: string; photoCount: number }> => {
      return albumsJson
        .filter((a: any) => (a.parentAlbumId ?? null) === parentId)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((a: any) => ({
          alias: a.alias,
          photoCount: albumIdToCount.get(a._id ?? '') ?? 0,
          children: buildTree(a._id ?? null),
        }));
    };
    const albumTree = buildTree(null);
    return {
      albumCount: manifest.albumCount ?? albumsJson.length,
      photoCount: manifest.photoCount ?? photosJson.length,
      albumTree,
    };
  }

  async importStartFromPackage(sourcePath: string, userId: string, jobId: string): Promise<void> {
    const src = this.validatePath(sourcePath);
    const albumsRaw = await fs.readFile(path.join(src, PACKAGE_ALBUMS), 'utf-8');
    const photosRaw = await fs.readFile(path.join(src, PACKAGE_PHOTOS), 'utf-8');
    const tagsRaw = await fs.readFile(path.join(src, PACKAGE_TAGS), 'utf-8');
    const peopleRaw = await fs.readFile(path.join(src, PACKAGE_PEOPLE), 'utf-8');
    const locationsRaw = await fs.readFile(path.join(src, PACKAGE_LOCATIONS), 'utf-8');
    const albumsJson = JSON.parse(albumsRaw);
    const photosJson = JSON.parse(photosRaw);
    const tagsJson = JSON.parse(tagsRaw);
    const peopleJson = JSON.parse(peopleRaw);
    const locationsJson = JSON.parse(locationsRaw);

    const defaultProvider: StorageProviderId = (await storageConfigService.getActiveProviders())[0] ?? 'local';
    const tagIdMap = new Map<string, Types.ObjectId>();
    const personIdMap = new Map<string, Types.ObjectId>();
    const locationIdMap = new Map<string, Types.ObjectId>();
    const albumIdMap = new Map<string, Types.ObjectId>();
    const userObjectId = new Types.ObjectId(userId);

    for (const t of tagsJson) {
      const existing = await this.tagModel.findOne({ name: t.name }).exec();
      const id = existing ? existing._id : (await this.tagModel.create({ ...t, _id: new Types.ObjectId(), createdBy: userObjectId }))._id;
      tagIdMap.set(t._id, id);
    }
    for (const p of peopleJson) {
      const { _id: _omitP, ...restP } = p;
      // Try to find existing person by fullName / first+last to avoid duplicates
      const fullName = (p as any).fullName;
      const fullEn = typeof fullName === 'object' ? fullName?.en : fullName;
      const fullHe = typeof fullName === 'object' ? fullName?.he : undefined;
      const existingPerson =
        (fullEn || fullHe)
          ? await this.personModel
              .findOne({
                $or: [
                  fullEn ? { 'fullName.en': fullEn } : undefined,
                  fullHe ? { 'fullName.he': fullHe } : undefined,
                ].filter(Boolean) as any[],
              })
              .exec()
          : null;
      const createdOrExisting =
        existingPerson ?? (await this.personModel.create({ ...restP, createdBy: userObjectId }));
      personIdMap.set(p._id, createdOrExisting._id);
    }
    for (const l of locationsJson) {
      const { _id: _omitL, ...restL } = l;
      // Try to find existing location by name/city/country to avoid duplicates
      const name = (l as any).name;
      const city = (l as any).city;
      const country = (l as any).country;
      const existingLocation = await this.locationModel
        .findOne({
          ...(name ? { name } : {}),
          ...(city ? { city } : {}),
          ...(country ? { country } : {}),
        })
        .exec();
      const createdOrExisting =
        existingLocation ?? (await this.locationModel.create({ ...restL, createdBy: userObjectId }));
      locationIdMap.set(l._id, createdOrExisting._id);
    }

    const albumsOrdered = albumsJson
      .slice()
      .sort((a: any, b: any) => (a.level ?? 0) - (b.level ?? 0) || (a.order ?? 0) - (b.order ?? 0));
    for (const a of albumsOrdered) {
      const parentId = a.parentAlbumId ? albumIdMap.get(a.parentAlbumId) : null;
      const parentAlbum = parentId ? await this.albumModel.findById(parentId).lean().exec() : null;
      const parentPath = parentAlbum ? (parentAlbum as any).storagePath : '';
      // Try to find existing album by alias + parent to avoid duplicates
      const existingAlbum = await this.albumModel
        .findOne({
          alias: a.alias,
          parentAlbumId: parentId ?? undefined,
        })
        .lean()
        .exec();
      let albumIdForMap: Types.ObjectId;
      if (existingAlbum) {
        albumIdForMap = (existingAlbum as any)._id as Types.ObjectId;
      } else {
        const folderResult = await storageManager.createAlbum(
          a.name?.en ?? a.name ?? a.alias,
          a.alias,
          defaultProvider,
          parentPath || undefined,
        );
        const newAlbum = await this.albumModel.create({
          name: a.name,
          alias: a.alias,
          description: a.description,
          isPublic: a.isPublic ?? false,
          isFeatured: a.isFeatured ?? false,
          storageProvider: defaultProvider,
          storagePath: folderResult.path,
          parentAlbumId: parentId ?? undefined,
          parentPath: parentPath ? `${parentPath}/${a.alias}` : a.alias,
          level: a.level ?? 0,
          order: a.order ?? 0,
          photoCount: 0,
          createdBy: userObjectId,
        });
        albumIdForMap = newAlbum._id;
      }
      albumIdMap.set(a._id, albumIdForMap);
    }

    let progress = 0;
    const total = photosJson.length;
    updateJob(jobId, { total, status: 'running' });

    for (const p of photosJson) {
      if (isJobCancelled(jobId)) {
        updateJob(jobId, { status: 'cancelled' });
        return;
      }
      const albumId = albumIdMap.get(p.albumId);
      if (!albumId) {
        progress++;
        updateJob(jobId, { progress });
        continue;
      }
      const album = await this.albumModel.findById(albumId).lean().exec();
      const albumPath = (album as any)?.storagePath ?? '';
      const relPath = p.storage?.path ?? `${PACKAGE_PHOTOS_DIR}/${(album as any)?.alias ?? ''}/${p.filename}`;
      const fullPath = path.join(src, relPath);
      let buf: Buffer;
      try {
        buf = await fs.readFile(fullPath);
      } catch {
        progress++;
        updateJob(jobId, { progress, current: p.filename });
        continue;
      }
      const mimeType = p.mimeType ?? 'image/jpeg';
      // Avoid creating duplicate photos: try to find by hash (preferred) or by album+originalFilename
      const existingPhoto = await this.photoModel
        .findOne(
          p.hash
            ? { albumId, hash: p.hash }
            : { albumId, originalFilename: p.originalFilename ?? p.filename },
        )
        .lean()
        .exec();
      if (existingPhoto) {
        progress++;
        updateJob(jobId, { progress, current: p.filename });
        continue;
      }
      const uploadResult = await storageManager.uploadPhoto(buf, p.filename, mimeType, albumPath, defaultProvider);
      const tagIds = (p.tags ?? []).map((tid: string) => tagIdMap.get(tid)).filter(Boolean) as Types.ObjectId[];
      const peopleIds = (p.people ?? []).map((pid: string) => personIdMap.get(pid)).filter(Boolean) as Types.ObjectId[];
      const locationId = p.location ? locationIdMap.get(p.location) : undefined;
      await this.photoModel.create({
        title: p.title ?? {},
        description: p.description ?? {},
        filename: p.filename,
        originalFilename: p.originalFilename ?? p.filename,
        mimeType,
        size: p.size ?? buf.length,
        hash: p.hash,
        dimensions: p.dimensions ?? { width: 0, height: 0 },
        storage: {
          provider: defaultProvider,
          fileId: uploadResult.fileId,
          url: uploadResult.url,
          path: uploadResult.path,
          thumbnailPath: uploadResult.path.replace(/(\.[^.]+)$/, '_thumb$1'),
          bucket: uploadResult.url,
        },
        albumId,
        tags: tagIds,
        people: peopleIds,
        location: locationId,
        isPublished: p.isPublished ?? true,
        isLeading: p.isLeading ?? false,
        isGalleryLeading: p.isGalleryLeading ?? false,
        uploadedBy: userObjectId,
        exif: p.exif,
        metadata: p.metadata,
        iptcXmp: p.iptcXmp,
        rotation: p.rotation ?? 0,
      });
      progress++;
      updateJob(jobId, { progress, current: p.filename });
    }

    updateJob(jobId, { status: 'completed', progress: total });
  }

  // --- Import (from raw folder) ---

  async importScan(sourcePath: string): Promise<{
    folders: Array<{ path: string; name: string; photoCount: number; children?: any[] }>;
    photoCount: number;
  }> {
    const src = this.validatePath(sourcePath);
    async function scanDir(dirPath: string): Promise<{ path: string; name: string; photoCount: number; children: any[] }> {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const subdirs = entries.filter((e) => e.isDirectory());
      const files = entries.filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()));
      const children = await Promise.all(subdirs.map((d) => scanDir(path.join(dirPath, d.name))));
      const photoCount = files.length + children.reduce((s, c) => s + c.photoCount, 0);
      const name = path.basename(dirPath);
      const rel = path.relative(src, dirPath);
      return { path: rel || name, name, photoCount, children };
    }
    const root = await scanDir(src);
    return { folders: [root], photoCount: root.photoCount };
  }

  async importPreviewFromRaw(sourcePath: string): Promise<{ albumCount: number; photoCount: number; folderTree: any }> {
    const scan = await this.importScan(sourcePath);
    const countFolders = (nodes: any[]): number =>
      nodes.reduce((s, n) => 1 + countFolders(n.children ?? []), 0);
    const albumCount = countFolders(scan.folders);
    return { albumCount, photoCount: scan.photoCount, folderTree: scan.folders };
  }

  async importStartFromRaw(sourcePath: string, userId: string, jobId: string): Promise<void> {
    const self = this;
    const src = this.validatePath(sourcePath);
    const scan = await this.importScan(sourcePath);
    const defaultProvider: StorageProviderId = (await storageConfigService.getActiveProviders())[0] ?? 'local';
    const userObjectId = new Types.ObjectId(userId);
    const albumPathToId = new Map<string, Types.ObjectId>();

    async function ensureAlbum(folderPath: string, name: string, parentId: Types.ObjectId | null): Promise<Types.ObjectId> {
      const existing = albumPathToId.get(folderPath);
      if (existing) return existing;
      const parentAlbum = parentId ? await self.albumModel.findById(parentId).lean().exec() : null;
      const parentPath = parentAlbum ? (parentAlbum as any).storagePath : '';
      const folderResult = await storageManager.createAlbum(name, name.replace(/\s+/g, '-').toLowerCase(), defaultProvider, parentPath || undefined);
      const newAlbum = await self.albumModel.create({
        name: { en: name },
        alias: name.replace(/\s+/g, '-').toLowerCase() + '-' + randomUUID().slice(0, 8),
        isPublic: false,
        isFeatured: false,
        storageProvider: defaultProvider,
        storagePath: folderResult.path,
        parentAlbumId: parentId ?? undefined,
        parentPath: parentPath ? `${parentPath}/${name}` : name,
        level: parentId ? 1 : 0,
        order: 0,
        photoCount: 0,
        createdBy: userObjectId,
      });
      albumPathToId.set(folderPath, newAlbum._id);
      return newAlbum._id;
    }

    const total = scan.photoCount;
    updateJob(jobId, { total, status: 'running' });
    let progress = 0;

    async function walk(dirPath: string, relPath: string, parentId: Types.ObjectId | null): Promise<void> {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const subdirs = entries.filter((e) => e.isDirectory());
      const files = entries.filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()));
      const albumId = await ensureAlbum(relPath, relPath ? path.basename(relPath) : path.basename(src), parentId);
      const album = await self.albumModel.findById(albumId).lean().exec();
      const albumStoragePath = (album as any)?.storagePath ?? '';
      for (const f of files) {
        if (isJobCancelled(jobId)) return;
        const fullPath = path.join(dirPath, f.name);
        const buf = await fs.readFile(fullPath);
        const mimeType = f.name.toLowerCase().endsWith('.png')
          ? 'image/png'
          : f.name.toLowerCase().endsWith('.gif')
            ? 'image/gif'
            : 'image/jpeg';
        // Avoid duplicate photos in raw import: skip if a photo with same album+originalFilename already exists
        const existingPhoto = await self.photoModel
          .findOne({ albumId, originalFilename: f.name })
          .lean()
          .exec();
        if (existingPhoto) {
          progress++;
          updateJob(jobId, { progress, current: f.name });
          continue;
        }
        try {
          const uploadResult = await storageManager.uploadPhoto(
            buf,
            f.name,
            mimeType,
            albumStoragePath,
            defaultProvider,
          );
          await self.photoModel.create({
            title: {},
            description: {},
            filename: f.name,
            originalFilename: f.name,
            mimeType,
            size: buf.length,
            dimensions: { width: 0, height: 0 },
            storage: {
              provider: defaultProvider,
              fileId: uploadResult.fileId,
              url: uploadResult.url,
              path: uploadResult.path,
              thumbnailPath: uploadResult.path,
            },
            albumId,
            tags: [],
            people: [],
            isPublished: true,
            isLeading: false,
            isGalleryLeading: false,
            uploadedBy: userObjectId,
          });
        } catch (e) {
          self.logger.warn(
            `Import raw: skip ${fullPath}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
        progress++;
        updateJob(jobId, { progress, current: f.name });
      }
      for (const d of subdirs) {
        const childRel = relPath ? `${relPath}/${d.name}` : d.name;
        await walk(path.join(dirPath, d.name), childRel, albumId);
      }
    }

    await walk(src, '', null);
    updateJob(jobId, { status: 'completed', progress });
  }

  async importStart(sourcePath: string, mode: 'package' | 'raw', userId: string): Promise<{ jobId: string }> {
    this.validatePath(sourcePath);
    const jobId = randomUUID();
    setJob({
      jobId,
      type: 'import',
      status: 'pending',
      progress: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    if (mode === 'package') {
      this.importStartFromPackage(sourcePath, userId, jobId).catch((err) => {
        this.logger.error(`Import package job ${jobId} failed: ${err instanceof Error ? err.message : String(err)}`);
        updateJob(jobId, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
      });
    } else {
      this.importStartFromRaw(sourcePath, userId, jobId).catch((err) => {
        this.logger.error(`Import raw job ${jobId} failed: ${err instanceof Error ? err.message : String(err)}`);
        updateJob(jobId, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
      });
    }
    return { jobId };
  }

  getImportStatus(jobId: string): JobState | undefined {
    return getJob(jobId);
  }

  cancelImport(jobId: string): void {
    setJobCancelled(jobId);
  }

  // --- Storage migration ---

  async getStorageProviders(): Promise<StorageProviderId[]> {
    return storageConfigService.getActiveProviders();
  }

  async getAlbumsByProvider(providerId: StorageProviderId): Promise<string[]> {
    const photos = await this.photoModel.find({ 'storage.provider': providerId }).distinct('albumId').lean().exec();
    const albumIds = photos
      .map((id) => (id ? toPlainObjectId(id) : ''))
      .filter((id) => id && Types.ObjectId.isValid(id));
    return albumIds;
  }

  async storageMigrationPreview(
    targetProviderId: StorageProviderId,
    albumIds?: string[],
    sourceProviderId?: StorageProviderId,
  ): Promise<{ photoCount: number; estimatedSizeBytes: number }> {
    const query: any = {};
    if (sourceProviderId) {
      query['storage.provider'] = sourceProviderId;
    }
    if (albumIds && albumIds.length > 0) {
      const albumObjectIds = albumIds.map((id) => new Types.ObjectId(id));
      const selectedAlbums = await this.albumModel.find({ _id: { $in: albumObjectIds } }).lean().exec();
      const allAlbumIds = new Set<string>();
      for (const album of selectedAlbums) {
        allAlbumIds.add((album as any)._id.toString());
        const children = await this.getAlbumChildrenRecursive((album as any)._id.toString());
        children.forEach((id) => allAlbumIds.add(id));
      }
      query.albumId = { $in: Array.from(allAlbumIds).map((id) => new Types.ObjectId(id)) };
    }
    const photos = await this.photoModel.find(query).lean().exec();
    let estimatedSizeBytes = 0;
    for (const p of photos) {
      estimatedSizeBytes += (p as any).size ?? 0;
    }
    return { photoCount: photos.length, estimatedSizeBytes };
  }

  private async getAlbumChildrenRecursive(albumId: string): Promise<string[]> {
    const children = await this.albumModel.find({ parentAlbumId: new Types.ObjectId(albumId) }).lean().exec();
    const ids: string[] = [];
    for (const child of children) {
      const childId = (child as any)._id.toString();
      ids.push(childId);
      const grandchildren = await this.getAlbumChildrenRecursive(childId);
      ids.push(...grandchildren);
    }
    return ids;
  }

  async storageMigrationStart(
    targetProviderId: StorageProviderId,
    albumIds?: string[],
    sourceProviderId?: StorageProviderId,
  ): Promise<{ jobId: string }> {
    const jobId = randomUUID();
    setJob({
      jobId,
      type: 'storage-migration',
      status: 'pending',
      progress: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.runStorageMigrationJob(jobId, targetProviderId, albumIds, sourceProviderId).catch((err) => {
      this.logger.error(`Storage migration job ${jobId} failed: ${err instanceof Error ? err.message : String(err)}`);
      updateJob(jobId, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
    });
    return { jobId };
  }

  private async runStorageMigrationJob(
    jobId: string,
    targetProviderId: StorageProviderId,
    albumIds?: string[],
    sourceProviderId?: StorageProviderId,
  ): Promise<void> {
    const query: any = {};
    if (sourceProviderId) {
      query['storage.provider'] = sourceProviderId;
    }
    if (albumIds && albumIds.length > 0) {
      const albumObjectIds = albumIds.map((id) => new Types.ObjectId(id));
      const selectedAlbums = await this.albumModel.find({ _id: { $in: albumObjectIds } }).lean().exec();
      const allAlbumIds = new Set<string>();
      for (const album of selectedAlbums) {
        allAlbumIds.add((album as any)._id.toString());
        const children = await this.getAlbumChildrenRecursive((album as any)._id.toString());
        children.forEach((id) => allAlbumIds.add(id));
      }
      query.albumId = { $in: Array.from(allAlbumIds).map((id) => new Types.ObjectId(id)) };
    }
    const photos = await this.photoModel.find(query).exec();
    const total = photos.length;
    updateJob(jobId, { total, status: 'running' });
    
    // Track which albums have had photos migrated
    const albumsWithMigratedPhotos = new Set<string>();
    
    // Pre-load album information for hierarchy preservation
    const albumIdSet = new Set<string>();
    photos.forEach((p) => {
      const aid = toPlainObjectId(p.albumId);
      if (aid) albumIdSet.add(aid);
    });
    const albumsMap = new Map<string, any>();
    if (albumIdSet.size > 0) {
      const albumObjectIds = Array.from(albumIdSet)
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      const albums = await this.albumModel.find({ _id: { $in: albumObjectIds } }).lean().exec();
      albums.forEach((a) => {
        albumsMap.set((a as any)._id.toString(), a);
      });
    }
    
    let progress = 0;
    for (const photo of photos) {
      if (isJobCancelled(jobId)) {
        updateJob(jobId, { status: 'cancelled' });
        return;
      }
      const sourceProv = (sourceProviderId ?? photo.storage?.provider ?? 'local') as StorageProviderId;
      const filePath = photo.storage?.path;
      const thumbPath = photo.storage?.thumbnailPath;
      if (!filePath) {
        progress++;
        updateJob(jobId, { progress });
        continue;
      }
      try {
        const buf = await storageManager.getPhotoBuffer(sourceProv, filePath);
        if (buf) {
          // Use album's storagePath to preserve hierarchy, fallback to extracting from file path
          const albumId = toPlainObjectId(photo.albumId);
          let albumPath = '';
          if (albumId && albumsMap.has(albumId)) {
            const album = albumsMap.get(albumId);
            albumPath = (album as any).storagePath || '';
          }
          // Fallback: extract from file path if album storagePath not available
          if (!albumPath && filePath.includes('/')) {
            albumPath = filePath.substring(0, filePath.lastIndexOf('/'));
          }
          
          const filename = path.basename(filePath);
          const mimeType = photo.mimeType ?? 'image/jpeg';
          const result = await storageManager.uploadPhoto(buf, filename, mimeType, albumPath, targetProviderId);
          let thumbResult: { path: string; url: string } | undefined;
          if (thumbPath) {
            const thumbBuf = await storageManager.getPhotoBuffer(sourceProv, thumbPath);
            if (thumbBuf) {
              // Preserve original thumbnail folder structure when migrating
              let thumbFolderPath = albumPath;
              if (thumbPath.includes('/')) {
                const thumbDir = thumbPath.substring(0, thumbPath.lastIndexOf('/'));
                // Use original thumbnail directory if it exists; otherwise fall back to albumPath
                thumbFolderPath = thumbDir || albumPath;
              }
              const tr = await storageManager.uploadPhoto(
                thumbBuf,
                path.basename(thumbPath),
                mimeType,
                thumbFolderPath,
                targetProviderId,
              );
              thumbResult = { path: tr.path, url: tr.url };
            }
          }
          
          // Save updated photo with new storage info
          // IMPORTANT: storage.url should always be the internal serve URL so frontend can use a single pattern
          // and not depend on provider-specific public URLs (which may not be accessible).
          photo.storage = {
            provider: targetProviderId,
            fileId: result.fileId,
            url: `/api/storage/serve/${targetProviderId}/${encodeURIComponent(result.path)}`,
            path: result.path,
            thumbnailPath: thumbResult?.path ?? result.path,
            // Keep external URL (if any) in bucket for debugging / reference
            bucket: result.url,
          };
          await photo.save();
          
          // Delete original files from source storage after successful migration
          try {
            await storageManager.deletePhoto(filePath, sourceProv);
            this.logger.debug(`Storage migration: Deleted original photo from source: ${filePath}`);
            
            if (thumbPath && thumbPath !== filePath) {
              await storageManager.deletePhoto(thumbPath, sourceProv);
              this.logger.debug(`Storage migration: Deleted original thumbnail from source: ${thumbPath}`);
            }
          } catch (deleteErr) {
            // Log warning but don't fail migration - files are already on target
            this.logger.warn(
              `Storage migration: Failed to delete original file ${filePath} from source storage: ${deleteErr instanceof Error ? deleteErr.message : String(deleteErr)}`,
            );
          }
          
          // Track that this photo's album has been migrated
          if (albumId) {
            albumsWithMigratedPhotos.add(albumId);
          }
        }
      } catch (e) {
        this.logger.warn(`Storage migration: skip photo ${photo._id}: ${e instanceof Error ? e.message : String(e)}`);
      }
      progress++;
      updateJob(jobId, { progress, current: photo.filename });
    }
    
    // Update albums' storageProvider field for all albums that had photos migrated
    // If specific albums were selected, update those albums (and their children) directly
    // Otherwise, update any album where all photos are now on the target provider
    if (albumsWithMigratedPhotos.size > 0 || (albumIds && albumIds.length > 0)) {
      const albumsToUpdate = new Set<string>();
      
      // If specific albums were selected, update those albums and their children
      if (albumIds && albumIds.length > 0) {
        const selectedAlbumObjectIds = albumIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id));
        
        for (const albumId of selectedAlbumObjectIds) {
          albumsToUpdate.add(albumId.toString());
          // Include children
          const children = await this.getAlbumChildrenRecursive(albumId.toString());
          children.forEach((id) => albumsToUpdate.add(id));
        }
      } else {
        // For non-selected migrations, check each album that had photos migrated
        albumsWithMigratedPhotos.forEach((id) => {
          if (Types.ObjectId.isValid(id)) {
            albumsToUpdate.add(id);
          }
        });
      }
      
      // Update each album's storageProvider
      for (const albumIdStr of albumsToUpdate) {
        const albumId = new Types.ObjectId(albumIdStr);
        await this.albumModel.updateOne(
          { _id: albumId },
          { $set: { storageProvider: targetProviderId } },
        ).exec();
        this.logger.log(`Storage migration: Updated album ${albumIdStr} storageProvider to ${targetProviderId}`);
      }
      
      this.logger.log(`Storage migration: Updated storageProvider for ${albumsToUpdate.size} album(s)`);

      // If we have a source provider, attempt to delete migrated album folders from the source storage
      if (sourceProviderId) {
        for (const albumIdStr of albumsToUpdate) {
          if (!Types.ObjectId.isValid(albumIdStr)) continue;
          const album = await this.albumModel.findById(new Types.ObjectId(albumIdStr)).lean().exec();
          const storagePath = (album as any)?.storagePath as string | undefined;
          if (!storagePath) continue;
          try {
            await storageManager.deleteAlbum(storagePath, sourceProviderId);
            this.logger.log(
              `Storage migration: Deleted album folder from source provider ${sourceProviderId} at path ${storagePath}`,
            );
          } catch (deleteErr) {
            this.logger.warn(
              `Storage migration: Failed to delete album folder ${storagePath} from source provider ${sourceProviderId}: ${
                deleteErr instanceof Error ? deleteErr.message : String(deleteErr)
              }`,
            );
          }
        }
      }
    }
    
    updateJob(jobId, { status: 'completed', progress: total });
  }

  getStorageMigrationStatus(jobId: string): JobState | undefined {
    return getJob(jobId);
  }

  cancelStorageMigration(jobId: string): void {
    setJobCancelled(jobId);
  }
}
