import { Controller, Get, Put, Body, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { siteConfigService } from '../services/site-config';
import { SiteConfigUpdate } from '../types/site-config';
import { StorageManager } from '../services/storage/manager';
import { v4 as uuidv4 } from 'uuid';

@Controller()
export class SiteConfigController {
  /**
   * Public endpoint to get the current site configuration.
   * 
   * Path: GET /api/site-config
   */
  @Get('site-config')
  async getConfig() {
    const config = await siteConfigService.getConfig();

    // Return the same shape the frontend expects (direct config object)
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
    };
  }

  /**
   * Admin endpoint to get site configuration.
   * 
   * Path: GET /api/admin/site-config
   */
  @Get('admin/site-config')
  async getAdminConfig() {
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
    };
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

    try {
      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop() || 'png';
      const filename = `asset-${uuidv4()}.${fileExtension}`;

      // Upload file using storage manager
      const storageManager = StorageManager.getInstance();
      const defaultProvider = (process.env.STORAGE_PROVIDER || 'local') as any;
      const filePath = `site-assets/${filename}`;
      const uploadResult = await storageManager.uploadBuffer(
        file.buffer,
        filePath,
        defaultProvider,
        file.mimetype
      );

      // Return the URL
      return {
        url: `/api/storage/serve/${uploadResult.provider}/${encodeURIComponent(uploadResult.path)}`,
        path: uploadResult.path,
        filename: filename
      };
    } catch (error) {
      console.error('Asset upload failed:', error);
      throw new BadRequestException(`Failed to upload asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
