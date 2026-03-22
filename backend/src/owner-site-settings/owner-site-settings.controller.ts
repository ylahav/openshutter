import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Logger,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../config/db';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { StorageManager } from '../services/storage/manager';
import { storageConfigService } from '../services/storage/config';
import { StorageError, StorageProviderId } from '../services/storage/types';
import { resolveOwnerStorageContext } from '../services/storage/owner-storage-context';
import { appendStorageOwnerQuery } from '../services/storage/storage-serve-url';

const COLLECTION = 'owner_site_settings';
const ALLOWED_LOGO_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

@Controller('owner/site-settings')
@UseGuards(AdminOrOwnerGuard)
export class OwnerSiteSettingsController {
  private readonly logger = new Logger(OwnerSiteSettingsController.name);

  /**
   * GET /api/owner/site-settings
   * Returns the current user's (owner) site settings. Only owners can access their own.
   */
  @Get()
  async getSettings(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only editors can manage site settings');
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');

    const collection = db.collection(COLLECTION);
    if (!Types.ObjectId.isValid(user.id)) {
      throw new ForbiddenException('Invalid user');
    }

    const doc = await collection.findOne({ ownerId: new Types.ObjectId(user.id) });
    if (!doc) {
      return this.defaultSettingsResponse();
    }

    return this.serializeSettingsDoc(doc);
  }

  private defaultSettingsResponse() {
    return {
      siteName: {},
      description: {},
      logo: undefined,
      favicon: undefined,
      hero: undefined,
      seo: undefined,
      contact: undefined,
      footer: undefined,
      template: undefined,
    };
  }

  private serializeSettingsDoc(doc: any) {
    return {
      siteName: doc.siteName || {},
      description: doc.description || {},
      logo: typeof doc.logo === 'string' ? doc.logo : undefined,
      favicon: typeof doc.favicon === 'string' ? doc.favicon : undefined,
      hero: doc.hero && typeof doc.hero === 'object' ? doc.hero : undefined,
      seo: doc.seo && typeof doc.seo === 'object' ? doc.seo : undefined,
      contact: doc.contact && typeof doc.contact === 'object' ? doc.contact : undefined,
      footer: doc.footer && typeof doc.footer === 'object' ? doc.footer : undefined,
      template: doc.template && typeof doc.template === 'object' ? doc.template : undefined,
    };
  }

  /**
   * PATCH /api/owner/site-settings
   * Update the current owner's site settings. Uses raw body so ValidationPipe does not strip nested hero/seo/contact/footer fields.
   */
  @Patch()
  async updateSettings(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only editors can manage site settings');
    }

    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be a JSON object');
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');

    const collection = db.collection(COLLECTION);
    if (!Types.ObjectId.isValid(user.id)) {
      throw new ForbiddenException('Invalid user');
    }

    const ownerId = new Types.ObjectId(user.id);
    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (body.siteName !== undefined) update.siteName = body.siteName;
    if (body.description !== undefined) update.description = body.description;
    if (body.logo !== undefined) update.logo = body.logo === '' ? null : body.logo;
    if (body.favicon !== undefined) update.favicon = body.favicon === '' ? null : body.favicon;
    // Store hero/seo/contact/footer as-is from raw body so nested fields (e.g. hero.title) are preserved
    if (body.hero !== undefined) update.hero = body.hero && typeof body.hero === 'object' ? body.hero : body.hero;
    if (body.seo !== undefined) update.seo = body.seo && typeof body.seo === 'object' ? body.seo : body.seo;
    if (body.contact !== undefined) update.contact = body.contact && typeof body.contact === 'object' ? body.contact : body.contact;
    if (body.footer !== undefined) update.footer = body.footer && typeof body.footer === 'object' ? body.footer : body.footer;
    if (body.template !== undefined) update.template = body.template;

    const result = await collection.findOneAndUpdate(
      { ownerId },
      { $set: update },
      { upsert: true, returnDocument: 'after' },
    );

    const doc = result?.value ?? (await collection.findOne({ ownerId }));
    if (!doc) {
      throw new InternalServerErrorException('Failed to save site settings');
    }

    return this.serializeSettingsDoc(doc);
  }

  /**
   * POST /api/owner/site-settings/upload-logo
   * Upload a logo image to site assets (site-assets/owner-{ownerId}/). Returns the URL to set as logo.
   */
  @Post('upload-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for logo
    }),
  )
  async uploadLogo(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only editors can upload a site logo');
    }
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!ALLOWED_LOGO_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Use JPEG, PNG, GIF, WebP or SVG.`,
      );
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'png';
    const filename = `logo-${uuidv4()}.${ext}`;
    const filePath = `site-assets/owner-${user.id}/${filename}`;

    const storageManager = StorageManager.getInstance();
    const defaultProvider = (process.env.STORAGE_PROVIDER || 'local') as StorageProviderId;
    const providersToTry: StorageProviderId[] = Array.from(
      new Set([defaultProvider, 'local']),
    );

    const storageCtx = await resolveOwnerStorageContext(user.id);

    const errors: string[] = [];
    for (const provider of providersToTry) {
      const isEnabled = await storageConfigService.isProviderEnabled(provider);
      if (!isEnabled) {
        errors.push(`${provider} (disabled)`);
        continue;
      }
      try {
        const uploadResult = await storageManager.uploadBuffer(
          file.buffer,
          filePath,
          provider,
          file.mimetype,
          storageCtx,
        );
        const baseUrl = `/api/storage/serve/${uploadResult.provider}/${encodeURIComponent(uploadResult.path)}`;
        const url = appendStorageOwnerQuery(baseUrl, storageCtx?.ownerUserId);
        return { url, path: uploadResult.path, filename };
      } catch (error) {
        const message =
          error instanceof StorageError && error.originalError
            ? `${error.message}: ${error.originalError.message}`
            : error instanceof Error
              ? error.message
              : String(error);
        errors.push(`${provider} (${message})`);
      }
    }

    const errorSummary = errors.length > 0 ? ` Providers tried: ${errors.join(', ')}` : '';
    throw new BadRequestException(`Failed to upload logo.${errorSummary}`);
  }
}
