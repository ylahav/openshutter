import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);
  private readonly translationsPath: string;

  constructor() {
    // Translations are stored in frontend/src/i18n/
    // In production, we need to find the correct path
    const possiblePaths = [
      join(process.cwd(), '..', 'frontend', 'src', 'i18n'),
      join(process.cwd(), 'frontend', 'src', 'i18n'),
      join(process.cwd(), 'src', 'i18n'),
      join(__dirname, '..', '..', '..', 'frontend', 'src', 'i18n'), // From backend/dist/translations/
      join(__dirname, '..', '..', 'frontend', 'src', 'i18n'), // From backend/src/translations/
    ];

    let foundPath: string | null = null;
    for (const path of possiblePaths) {
      const normalizedPath = path.replace(/\\/g, '/'); // Normalize path separators
      if (existsSync(normalizedPath)) {
        foundPath = normalizedPath;
        this.logger.debug(`[TranslationsService] Found i18n directory at: ${foundPath}`);
        break;
      }
    }

    // Use found path or fallback to default
    this.translationsPath = foundPath || join(process.cwd(), '..', 'frontend', 'src', 'i18n');
    
    if (!foundPath) {
      this.logger.warn(`[TranslationsService] i18n directory not found in any of the checked paths. Using fallback: ${this.translationsPath}`);
      this.logger.warn(`[TranslationsService] Current working directory: ${process.cwd()}`);
      this.logger.warn(`[TranslationsService] __dirname: ${__dirname}`);
    }
  }

  /**
   * Get all available languages
   */
  async getLanguages(): Promise<Array<{ code: string; name: string; flag: string }>> {
    try {
      // Ensure directory exists
      if (!existsSync(this.translationsPath)) {
        console.log(`[TranslationsService] Creating i18n directory: ${this.translationsPath}`);
        await mkdir(this.translationsPath, { recursive: true });
      }

      const files = await readdir(this.translationsPath);
      const languageFiles = files.filter((file) => file.endsWith('.json'));

      this.logger.debug(`[TranslationsService] Found ${languageFiles.length} language files in ${this.translationsPath}`);

      const languages: Array<{ code: string; name: string; flag: string }> = [];

      for (const file of languageFiles) {
        const code = file.replace('.json', '');
        try {
          const filePath = join(this.translationsPath, file);
          const content = await readFile(filePath, 'utf-8');
          const translations = JSON.parse(content);
          
          // Try to get metadata from translations or use defaults
          const metadata = this.getLanguageMetadata(code);
          languages.push({
            code,
            name: metadata.name,
            flag: metadata.flag,
          });
        } catch (error) {
          this.logger.error(`[TranslationsService] Error reading language file ${file}:`, error);
        }
      }

      // If no languages found but directory exists, return at least the known default languages
      if (languages.length === 0 && existsSync(this.translationsPath)) {
        this.logger.warn('[TranslationsService] No language files found, returning default languages');
        return [
          { code: 'en', name: 'English', flag: '🇺🇸' },
          { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
        ];
      }

      return languages.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
            this.logger.error(`[TranslationsService] Error getting languages: ${error instanceof Error ? error.message : String(error)}`);
            this.logger.error(`[TranslationsService] Translations path: ${this.translationsPath}`);
            this.logger.error(`[TranslationsService] Error details: ${error instanceof Error ? error.stack : String(error)}`);
      // Return default languages as fallback to allow the UI to load
      return [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
      ];
    }
  }

  /**
   * Get translations for a specific language
   */
  async getTranslations(languageCode: string): Promise<Record<string, any>> {
    const filePath = join(this.translationsPath, `${languageCode}.json`);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Language file for ${languageCode} not found`);
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new BadRequestException(`Failed to read translations for ${languageCode}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new language file
   */
  async createLanguage(languageCode: string, name: string, flag: string): Promise<{ success: boolean; message: string }> {
    const filePath = join(this.translationsPath, `${languageCode}.json`);

    if (existsSync(filePath)) {
      throw new BadRequestException(`Language ${languageCode} already exists`);
    }

    try {
      // Ensure directory exists
      if (!existsSync(this.translationsPath)) {
        await mkdir(this.translationsPath, { recursive: true });
      }

      // Create empty translations object (can be populated from English as template)
      const emptyTranslations: Record<string, any> = {};
      
      // Optionally, copy structure from English if it exists
      const englishPath = join(this.translationsPath, 'en.json');
      if (existsSync(englishPath)) {
        try {
          const englishContent = await readFile(englishPath, 'utf-8');
          const englishTranslations = JSON.parse(englishContent);
          
          // Copy structure but leave values empty or use keys as placeholders
          const copyStructure = (obj: any): any => {
            if (typeof obj === 'string') {
              return ''; // Empty string for new language
            }
            if (Array.isArray(obj)) {
              return obj.map(copyStructure);
            }
            if (obj && typeof obj === 'object') {
              const result: any = {};
              for (const key in obj) {
                result[key] = copyStructure(obj[key]);
              }
              return result;
            }
            return obj;
          };
          
          Object.assign(emptyTranslations, copyStructure(englishTranslations));
        } catch (error) {
          this.logger.error('Error copying English structure:', error);
        }
      }

      await writeFile(filePath, JSON.stringify(emptyTranslations, null, 2), 'utf-8');

      return {
        success: true,
        message: `Language ${languageCode} created successfully`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create language ${languageCode}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update translations for a language
   */
  async updateTranslations(languageCode: string, translations: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const filePath = join(this.translationsPath, `${languageCode}.json`);

    try {
      // Validate JSON structure
      JSON.stringify(translations);

      // Ensure directory exists
      if (!existsSync(this.translationsPath)) {
        await mkdir(this.translationsPath, { recursive: true });
      }

      await writeFile(filePath, JSON.stringify(translations, null, 2), 'utf-8');

      return {
        success: true,
        message: `Translations for ${languageCode} updated successfully`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update translations for ${languageCode}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a language file
   */
  async deleteLanguage(languageCode: string): Promise<{ success: boolean; message: string }> {
    // Prevent deleting English (default fallback)
    if (languageCode === 'en') {
      throw new BadRequestException('Cannot delete English language (default fallback)');
    }

    const filePath = join(this.translationsPath, `${languageCode}.json`);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Language file for ${languageCode} not found`);
    }

    try {
      await unlink(filePath);
      return {
        success: true,
        message: `Language ${languageCode} deleted successfully`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete language ${languageCode}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Auto-translate missing translations using Google Translate
   */
  async autoTranslate(
    targetLanguageCode: string,
    sourceLanguageCode: string = 'en'
  ): Promise<{ success: boolean; translated: number; message: string }> {
    try {
      // Get source translations (English)
      const sourceTranslations = await this.getTranslations(sourceLanguageCode);
      
      // Get target translations
      const targetFilePath = join(this.translationsPath, `${targetLanguageCode}.json`);
      let targetTranslations: Record<string, any> = {};
      
      if (existsSync(targetFilePath)) {
        const content = await readFile(targetFilePath, 'utf-8');
        targetTranslations = JSON.parse(content);
      }

      // Find missing translations
      const missingKeys: Array<{ path: string; value: string }> = [];
      const findMissing = (source: any, target: any, path: string = '') => {
        for (const key in source) {
          const currentPath = path ? `${path}.${key}` : key;
          const sourceValue = source[key];
          
          if (typeof sourceValue === 'string' && sourceValue.trim() !== '') {
            const targetValue = this.getNestedValue(target, currentPath);
            // Consider empty string or missing as "needs translation"
            if (!targetValue || (typeof targetValue === 'string' && targetValue.trim() === '')) {
              missingKeys.push({ path: currentPath, value: sourceValue });
            }
          } else if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
            const targetObj = this.getNestedValue(target, currentPath) || {};
            findMissing(sourceValue, targetObj, currentPath);
          }
        }
      };

      findMissing(sourceTranslations, targetTranslations);

      if (missingKeys.length === 0) {
        return {
          success: true,
          translated: 0,
          message: 'No missing translations found',
        };
      }

      // Ensure target translations has the same structure as source
      // Copy structure from source if target is empty or missing keys
      const ensureStructure = (source: any, target: any): any => {
        if (typeof source !== 'object' || source === null || Array.isArray(source)) {
          return target || source;
        }
        
        const result = target || {};
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!result[key] || typeof result[key] !== 'object') {
              result[key] = {};
            }
            result[key] = ensureStructure(source[key], result[key]);
          } else if (!(key in result)) {
            // Keep existing value or set empty string for strings
            result[key] = typeof source[key] === 'string' ? '' : source[key];
          }
        }
        return result;
      };

      // Ensure structure matches source before translating
      targetTranslations = ensureStructure(sourceTranslations, targetTranslations);

      this.logger.debug(`[TranslationsService] Starting translation of ${missingKeys.length} missing keys`);
      this.logger.debug(`[TranslationsService] Target file path: ${targetFilePath}`);

      // Translate missing keys using Google Translate API
      let translatedCount = 0;
      const batchSize = 10; // Process in batches to avoid rate limits

      for (let i = 0; i < missingKeys.length; i += batchSize) {
        const batch = missingKeys.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            const translated = await this.translateText(item.value, sourceLanguageCode, targetLanguageCode);
            if (translated) {
              this.setNestedValue(targetTranslations, item.path, translated);
              translatedCount++;
              this.logger.debug(`[TranslationsService] Translated "${item.path}": "${translated.substring(0, 50)}..."`);
            } else {
              this.logger.warn(`[TranslationsService] Failed to translate "${item.path}" - got null result`);
            }
          } catch (error) {
            this.logger.error(`[TranslationsService] Error translating "${item.path}":`, error);
          }
        }

        // Small delay between batches to avoid rate limits
        if (i + batchSize < missingKeys.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.debug(`[TranslationsService] Translation complete. Translated ${translatedCount} of ${missingKeys.length} keys`);
      this.logger.debug(`[TranslationsService] Saving translations to ${targetFilePath}`);

      // Save updated translations
      const jsonContent = JSON.stringify(targetTranslations, null, 2);
      await writeFile(targetFilePath, jsonContent, 'utf-8');
      
      this.logger.debug('[TranslationsService] Translations saved successfully');
      
      // Verify the file was written correctly by reading it back
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for file system sync
        const verifyContent = await readFile(targetFilePath, 'utf-8');
        const verifyTranslations = JSON.parse(verifyContent);
        const verifyKeys = this.countKeys(verifyTranslations);
        console.log(`[TranslationsService] Verification: File contains ${verifyKeys} translation keys`);
        
        // Check a few translated keys to verify they exist
        let verifiedCount = 0;
        for (const item of missingKeys.slice(0, 10)) {
          const value = this.getNestedValue(verifyTranslations, item.path);
          if (value && typeof value === 'string' && value.trim() !== '') {
            verifiedCount++;
          }
        }
        this.logger.debug(`[TranslationsService] Verification: ${verifiedCount} of 10 sample keys verified in saved file`);
      } catch (verifyError) {
        this.logger.error(`[TranslationsService] Warning: Could not verify saved file:`, verifyError);
      }

      return {
        success: true,
        translated: translatedCount,
        message: `Translated ${translatedCount} of ${missingKeys.length} missing translations`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to auto-translate: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Translate text using Google Translate API
   */
  private async translateText(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string | null> {
    try {
      // Skip translation if text is empty
      if (!text || text.trim() === '') {
        return '';
      }

      // Use Google Translate API (free tier via HTTP)
      // Note: This uses the free Google Translate API endpoint
      // For production, you may want to use @google-cloud/translate package
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(`[TranslationsService] Translation API error: ${response.status} ${response.statusText}`);
        throw new Error(`Translation API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats from Google Translate API
      let translatedText: string | null = null;
      
      if (Array.isArray(data) && data[0]) {
        // Standard format: [[["translated text", ...], ...], ...]
        if (Array.isArray(data[0]) && data[0][0]) {
          if (Array.isArray(data[0][0]) && data[0][0][0]) {
            translatedText = data[0][0][0];
          } else if (typeof data[0][0] === 'string') {
            translatedText = data[0][0];
          }
        }
      } else if (typeof data === 'string') {
        translatedText = data;
      }

      if (!translatedText || translatedText.trim() === '') {
        this.logger.warn(`[TranslationsService] Empty translation result for text: "${text.substring(0, 50)}..."`);
        return null;
      }

      return translatedText;
    } catch (error) {
            this.logger.error(`[TranslationsService] Translation error for "${text.substring(0, 50)}...":`, error);
      return null;
    }
  }

  /**
   * Helper: Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  /**
   * Helper: Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Helper: Count total keys in nested object
   */
  private countKeys(obj: any): number {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return 0;
    }
    let count = 0;
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        count++;
      } else if (obj[key] && typeof obj[key] === 'object') {
        count += this.countKeys(obj[key]);
      }
    }
    return count;
  }

  /**
   * Get language metadata
   */
  private getLanguageMetadata(code: string): { name: string; flag: string } {
    const metadata: Record<string, { name: string; flag: string }> = {
      en: { name: 'English', flag: '🇺🇸' },
      he: { name: 'Hebrew', flag: '🇮🇱' },
      ar: { name: 'Arabic', flag: '🇸🇦' },
      es: { name: 'Spanish', flag: '🇪🇸' },
      fr: { name: 'French', flag: '🇫🇷' },
      de: { name: 'German', flag: '🇩🇪' },
      it: { name: 'Italian', flag: '🇮🇹' },
      pt: { name: 'Portuguese', flag: '🇵🇹' },
      ru: { name: 'Russian', flag: '🇷🇺' },
      ja: { name: 'Japanese', flag: '🇯🇵' },
      ko: { name: 'Korean', flag: '🇰🇷' },
      zh: { name: 'Chinese', flag: '🇨🇳' },
      nl: { name: 'Dutch', flag: '🇳🇱' },
      sv: { name: 'Swedish', flag: '🇸🇪' },
      no: { name: 'Norwegian', flag: '🇳🇴' },
      da: { name: 'Danish', flag: '🇩🇰' },
      fi: { name: 'Finnish', flag: '🇫🇮' },
      pl: { name: 'Polish', flag: '🇵🇱' },
      tr: { name: 'Turkish', flag: '🇹🇷' },
      hi: { name: 'Hindi', flag: '🇮🇳' },
    };

    return metadata[code] || { name: code.toUpperCase(), flag: '🌐' };
  }
}
