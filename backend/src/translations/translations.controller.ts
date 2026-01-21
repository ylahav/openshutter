import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { TranslationsService } from './translations.service';

@Controller('admin/translations')
@UseGuards(AdminGuard)
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  /**
   * Get all available languages
   * Path: GET /api/admin/translations/languages
   */
  @Get('languages')
  async getLanguages() {
    try {
      const languages = await this.translationsService.getLanguages();
      return languages;
    } catch (error) {
      console.error('[TranslationsController] Error getting languages:', error);
      // Return default languages as fallback
      return [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
      ];
    }
  }

  /**
   * Get translations for a specific language
   * Path: GET /api/admin/translations/:languageCode
   */
  @Get(':languageCode')
  async getTranslations(@Param('languageCode') languageCode: string) {
    return this.translationsService.getTranslations(languageCode);
  }

  /**
   * Create a new language file
   * Path: POST /api/admin/translations
   */
  @Post()
  async createLanguage(@Body() body: { languageCode: string; name: string; flag: string }) {
    if (!body.languageCode || !body.name) {
      throw new BadRequestException('Language code and name are required');
    }
    return this.translationsService.createLanguage(body.languageCode, body.name, body.flag);
  }

  /**
   * Update translations for a language
   * Path: PUT /api/admin/translations/:languageCode
   */
  @Put(':languageCode')
  async updateTranslations(
    @Param('languageCode') languageCode: string,
    @Body() translations: Record<string, any>
  ) {
    return this.translationsService.updateTranslations(languageCode, translations);
  }

  /**
   * Delete a language file
   * Path: DELETE /api/admin/translations/:languageCode
   */
  @Delete(':languageCode')
  async deleteLanguage(@Param('languageCode') languageCode: string) {
    return this.translationsService.deleteLanguage(languageCode);
  }

  /**
   * Auto-translate missing translations
   * Path: POST /api/admin/translations/:languageCode/auto-translate
   */
  @Post(':languageCode/auto-translate')
  async autoTranslate(
    @Param('languageCode') languageCode: string,
    @Body() body?: { sourceLanguageCode?: string }
  ) {
    const sourceLanguageCode = body?.sourceLanguageCode || 'en';
    return this.translationsService.autoTranslate(languageCode, sourceLanguageCode);
  }
}
