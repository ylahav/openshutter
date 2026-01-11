import { Controller, Get, Put, Post, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { storageConfigService } from '../services/storage/config';
import { StorageManager } from '../services/storage/manager';
import type { StorageProviderId } from '../services/storage/types';

@Controller('admin/storage')
@UseGuards(AdminGuard)
export class StorageAdminController {
  /**
   * Get all storage configurations
   * Path: GET /api/admin/storage
   */
  @Get()
  async getAllConfigs() {
    try {
      // Initialize defaults if no configs exist
      const configs = await storageConfigService.getAllConfigs();
      if (!configs || configs.length === 0) {
        await storageConfigService.initializeDefaultConfigs();
        return await storageConfigService.getAllConfigs();
      }
      return configs;
    } catch (error) {
      console.error('Error getting storage configs:', error);
      throw new BadRequestException(
        `Failed to get storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get configuration for a specific provider
   * Path: GET /api/admin/storage/:providerId
   */
  @Get(':providerId')
  async getConfig(@Param('providerId') providerId: string) {
    try {
      const config = await storageConfigService.getConfig(providerId as StorageProviderId);
      return config;
    } catch (_error) {
      throw new BadRequestException(`Storage provider not found: ${providerId}`);
    }
  }

  /**
   * Update storage configuration
   * Path: PUT /api/admin/storage/:providerId
   */
  @Put(':providerId')
  async updateConfig(
    @Param('providerId') providerId: string,
    @Body() updates: any,
  ) {
    try {
      // Get existing config or initialize defaults if it doesn't exist
      let existingConfig;
      try {
        existingConfig = await storageConfigService.getConfig(providerId as StorageProviderId);
      } catch (error) {
        // Config doesn't exist, initialize defaults first
        await storageConfigService.initializeDefaultConfigs();
        try {
          existingConfig = await storageConfigService.getConfig(providerId as StorageProviderId);
        } catch (secondError) {
          // If config still doesn't exist after initialization, create a minimal one
          console.warn(`Config for ${providerId} not found after initialization, creating minimal config`);
          const providerNames: Record<string, string> = {
            'google-drive': 'Google Drive',
            'aws-s3': 'Amazon S3',
            'backblaze': 'Backblaze B2',
            'wasabi': 'Wasabi',
            'local': 'Local Storage'
          };
          existingConfig = {
            providerId: providerId as StorageProviderId,
            name: providerNames[providerId] || providerId,
            isEnabled: false,
            config: {},
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }

      // The frontend sends config fields directly (e.g., { clientId, clientSecret, isEnabled })
      // We need to structure it properly: { isEnabled, config: { clientId, clientSecret, ... } }
      const structuredUpdates: any = {
        providerId: providerId as StorageProviderId,
        name: existingConfig.name, // Preserve existing name
      };

      // Extract isEnabled if provided (can be at top level or in config)
      if (updates.isEnabled !== undefined) {
        structuredUpdates.isEnabled = updates.isEnabled;
      } else if (existingConfig.isEnabled !== undefined) {
        structuredUpdates.isEnabled = existingConfig.isEnabled;
      }

      // Build the config object - merge existing config with updates
      // Exclude isEnabled from config object (it's at top level)
      const { isEnabled: _, ...configUpdates } = updates;
      structuredUpdates.config = {
        ...existingConfig.config,
        ...configUpdates,
      };

      // Update the configuration
      await storageConfigService.updateConfig(providerId as StorageProviderId, structuredUpdates);
      const updatedConfig = await storageConfigService.getConfig(providerId as StorageProviderId);
      return updatedConfig;
    } catch (error) {
      console.error('Error updating storage config:', error);
      throw new BadRequestException(
        `Failed to update storage configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Test storage connection
   * Path: POST /api/admin/storage/:providerId/test
   */
  @Post(':providerId/test')
  async testConnection(@Param('providerId') providerId: string) {
    try {
      const config = await storageConfigService.getConfig(providerId as StorageProviderId);
      
      if (!config.isEnabled) {
        return {
          success: false,
          error: 'Storage provider is not enabled',
        };
      }

      const storageManager = StorageManager.getInstance();
      const provider = await storageManager.getProvider(providerId as StorageProviderId);
      
      // Try to list folders or perform a simple operation
      try {
        await provider.listFolders('');
        return {
          success: true,
          message: 'Connection test successful',
        };
      } catch (error) {
        return {
          success: false,
          error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to test connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Initialize default storage configurations
   * Path: POST /api/admin/storage/initialize
   */
  @Post('initialize')
  async initializeDefaults() {
    try {
      await storageConfigService.initializeDefaultConfigs();
      const configs = await storageConfigService.getAllConfigs();
      return {
        success: true,
        message: 'Default storage configurations initialized',
        configs,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to initialize storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
