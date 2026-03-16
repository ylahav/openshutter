import { Controller, Get, Put, Body, Post, Req, UseInterceptors, UploadedFile, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '../config/db';
import { mailService } from '../services/mail.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { siteConfigService } from '../services/site-config';
import { SiteConfigUpdate } from '../types/site-config';
import { StorageManager } from '../services/storage/manager';
import { storageConfigService } from '../services/storage/config';
import { StorageError, StorageProviderId } from '../services/storage/types';
import { v4 as uuidv4 } from 'uuid';

@Controller()
export class SiteConfigController {
  private readonly logger = new Logger(SiteConfigController.name);

  /**
   * Public endpoint to get the current site configuration.
   * When request is on an owner domain (siteContext.owner-site), title and description
   * are overridden from owner_site_settings so the mini-site shows the owner's name and description.
   *
   * Path: GET /api/site-config
   */
  @Get('site-config')
  async getConfig(@Req() req: Request) {
    const config = await siteConfigService.getConfig();

    const siteContext = (req as any).siteContext;
    if (siteContext?.type === 'owner-site' && siteContext.ownerId) {
      try {
        await connectDB();
        const db = mongoose.connection.db;
        if (db && Types.ObjectId.isValid(siteContext.ownerId)) {
          const doc = await db.collection('owner_site_settings').findOne({
            ownerId: new Types.ObjectId(siteContext.ownerId),
          });
          if (doc) {
            this.applyOwnerOverrides(config, doc);
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to load owner site settings: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Return the same shape the frontend expects (direct config object)
    const out: any = {
      title: config.title,
      description: config.description,
      logo: config.logo,
      favicon: config.favicon,
      languages: config.languages,
      theme: config.theme,
      seo: config.seo,
      contact: config.contact,
      homePage: config.homePage,
      features: config.features,
      template: config.template,
      exifMetadata: config.exifMetadata,
      iptcXmpMetadata: config.iptcXmpMetadata,
      whiteLabel: config.whiteLabel,
    };
    if ((config as any).footer !== undefined) out.footer = (config as any).footer;
    return out;
  }

  /**
   * Merge owner_site_settings doc into config for owner-domain requests.
   */
  private applyOwnerOverrides(config: any, doc: any) {
    if (doc.siteName && typeof doc.siteName === 'object' && Object.keys(doc.siteName).length > 0) {
      config.title = doc.siteName;
    }
    if (doc.description && typeof doc.description === 'object' && Object.keys(doc.description).length > 0) {
      config.description = doc.description;
    }
    if (typeof doc.logo === 'string' && doc.logo.trim() !== '') {
      config.logo = doc.logo;
    }
    if (typeof doc.favicon === 'string' && doc.favicon.trim() !== '') {
      config.favicon = doc.favicon;
    }
    if (doc.seo && typeof doc.seo === 'object' && Object.keys(doc.seo).length > 0) {
      config.seo = { ...(config.seo || {}), ...doc.seo };
    }
    if (doc.contact && typeof doc.contact === 'object' && Object.keys(doc.contact).length > 0) {
      config.contact = { ...(config.contact || {}), ...doc.contact };
    }
    if (doc.footer && typeof doc.footer === 'object' && Object.keys(doc.footer).length > 0) {
      config.footer = { ...(config.footer || {}), ...doc.footer };
    }
    if (doc.template && typeof doc.template === 'object') {
      if (!config.template) config.template = {};
      if (doc.template.pageLayout && typeof doc.template.pageLayout === 'object') {
        config.template.pageLayout = { ...(config.template.pageLayout || {}), ...doc.template.pageLayout };
      }
      if (doc.template.pageModules && typeof doc.template.pageModules === 'object') {
        config.template.pageModules = { ...(config.template.pageModules || {}), ...doc.template.pageModules };
      }
      if (doc.template.headerConfig && typeof doc.template.headerConfig === 'object') {
        config.template.headerConfig = { ...(config.template.headerConfig || {}), ...doc.template.headerConfig };
      }
    }
    if (doc.hero && typeof doc.hero === 'object') {
      const homeModules = Array.isArray(config.template?.pageModules?.home) ? [...config.template.pageModules.home] : [];
      const heroIndex = homeModules.findIndex((m: any) => m && m.type === 'hero');
      if (heroIndex >= 0) {
        homeModules[heroIndex] = {
          ...homeModules[heroIndex],
          props: { ...(homeModules[heroIndex].props || {}), ...doc.hero },
        };
      } else {
        homeModules.unshift({
          _id: 'mod_owner_hero',
          type: 'hero',
          props: doc.hero,
          rowOrder: 0,
          columnIndex: 0,
          rowSpan: 1,
          colSpan: 1,
        });
      }
      if (!config.template) config.template = {};
      if (!config.template.pageModules) config.template.pageModules = {};
      config.template.pageModules = { ...config.template.pageModules, home: homeModules };
    }
  }

  /**
   * Admin endpoint to get site configuration.
   * 
   * Path: GET /api/admin/site-config
   */
  @Get('admin/site-config')
  async getAdminConfig() {
    try {
      const config = await siteConfigService.getConfig();
      return {
        title: config.title,
        description: config.description,
        logo: config.logo,
        favicon: config.favicon,
        languages: config.languages,
        theme: config.theme,
        seo: config.seo,
        contact: config.contact,
        homePage: config.homePage,
        features: config.features,
        template: config.template,
        exifMetadata: config.exifMetadata ?? { displayFields: [] },
        iptcXmpMetadata: config.iptcXmpMetadata ?? { displayFields: [] },
        mail: config.mail ? { ...config.mail, password: config.mail.password ? '****' : '' } : undefined,
        welcomeEmail: config.welcomeEmail,
        whiteLabel: config.whiteLabel,
      };
    } catch (error) {
      this.logger.error('getAdminConfig failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to load site configuration'
      );
    }
  }

  /**
   * Admin endpoint to update site configuration.
   * 
   * Path: PUT /api/admin/site-config
   */
  @Put('admin/site-config')
  async updateConfig(@Body() updates: SiteConfigUpdate) {
    const config = await siteConfigService.updateConfig(updates);
    return {
      title: config.title,
      description: config.description,
      logo: config.logo,
      favicon: config.favicon,
      languages: config.languages,
      theme: config.theme,
      seo: config.seo,
      contact: config.contact,
      homePage: config.homePage,
      features: config.features,
      template: config.template,
      exifMetadata: config.exifMetadata,
      iptcXmpMetadata: config.iptcXmpMetadata,
      mail: config.mail ? { ...config.mail, password: config.mail.password ? '****' : '' } : undefined,
      welcomeEmail: config.welcomeEmail,
      whiteLabel: config.whiteLabel,
    };
  }

  /**
   * Admin endpoint to upload assets (logo, favicon, etc.).
   * 
   * Path: POST /api/admin/site-config/upload-asset
   */
  @Post('admin/site-config/upload-asset')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit for assets
    },
  }))
  async uploadAsset(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (images only)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed. Allowed types: images only`);
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop() || 'png';
    const filename = `asset-${uuidv4()}.${fileExtension}`;
    const filePath = `site-assets/${filename}`;

    const storageManager = StorageManager.getInstance();
    const defaultProvider = (process.env.STORAGE_PROVIDER || 'local') as StorageProviderId;
    const providersToTry: StorageProviderId[] = Array.from(
      new Set([defaultProvider, 'local'])
    );

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
          file.mimetype
        );

        return {
          url: `/api/storage/serve/${uploadResult.provider}/${encodeURIComponent(uploadResult.path)}`,
          path: uploadResult.path,
          filename
        };
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
    throw new BadRequestException(`Failed to upload asset.${errorSummary}`);
  }

  /**
   * Admin endpoint to send a test email using current SMTP config.
   * Path: POST /api/admin/site-config/test-email
   * Body: { to: string, subject?: string, body?: string }
   */
  @Post('admin/site-config/test-email')
  async sendTestEmail(
    @Body() body: { to: string; subject?: string; body?: string },
  ) {
    const to = body?.to?.trim();
    if (!to) {
      throw new BadRequestException('Recipient (to) is required');
    }
    return mailService.sendTestEmail(to, body.subject ?? 'Test email', body.body ?? 'This is a test email.');
  }

  /**
   * Admin endpoint to get available languages.
   *
   * Path: GET /api/admin/languages
   */
  @Get('admin/languages')
  async getAvailableLanguages() {
    // Return supported languages with metadata
    return [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
      { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
      { code: 'es', name: 'Spanish', flag: '🇪🇸' },
      { code: 'fr', name: 'French', flag: '🇫🇷' },
      { code: 'de', name: 'German', flag: '🇩🇪' },
      { code: 'it', name: 'Italian', flag: '🇮🇹' },
      { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
      { code: 'ru', name: 'Russian', flag: '🇷🇺' },
      { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', flag: '🇰🇷' },
      { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
      { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
      { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
      { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
      { code: 'da', name: 'Danish', flag: '🇩🇰' },
      { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
      { code: 'pl', name: 'Polish', flag: '🇵🇱' },
      { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
      { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    ];
  }
}
