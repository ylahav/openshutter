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
      // Force cache refresh to ensure we have the latest data
      // This is especially important after saves
      const configs = await storageConfigService.getAllConfigs();
      
      // Initialize defaults if no configs exist
      if (!configs || configs.length === 0) {
        await storageConfigService.initializeDefaultConfigs();
        return await storageConfigService.getAllConfigs();
      }
      
      // Ensure all configs have the proper structure and remove any duplicate top-level fields
      const normalizedConfigs = configs.map(config => {
        // Create a clean config object with only the fields we want
        // Remove isEnabled from config object if it exists (it should only be at root level)
        const rawConfigObj = config.config || {};
        const { isEnabled: _, ...cleanConfigObj } = rawConfigObj;
        
        const cleanConfig: any = {
          providerId: config.providerId,
          name: config.name,
          isEnabled: config.isEnabled !== undefined ? config.isEnabled : false,
          config: cleanConfigObj, // Config object without isEnabled
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        };
        
        // Log if we detect duplicate fields (for debugging)
        const duplicateFields = ['clientId', 'clientSecret', 'refreshToken', 'folderId',
                                'accessKeyId', 'secretAccessKey', 'bucketName', 'region', 'endpoint',
                                'applicationKeyId', 'applicationKey', 'basePath', 'maxFileSize']
          .filter(field => (config as any)[field] !== undefined && (config as any)[field] !== '')
        
        if (duplicateFields.length > 0) {
          console.warn(`[getAllConfigs] Found duplicate top-level fields in ${config.providerId}:`, duplicateFields);
        }
        
        // Log if isEnabled was found in config object (shouldn't be there)
        if (rawConfigObj.isEnabled !== undefined) {
          console.warn(`[getAllConfigs] Found isEnabled in config object for ${config.providerId}, removing it (should only be at root level)`);
        }
        
        return cleanConfig;
      });
      
      console.log('[getAllConfigs] Returning configs:', JSON.stringify(normalizedConfigs.map(c => ({ 
        providerId: c.providerId, 
        isEnabled: c.isEnabled,
        hasConfig: !!c.config,
        configKeys: c.config ? Object.keys(c.config) : [],
        sampleConfigValue: c.providerId === 'google-drive' ? {
          clientId: c.config?.clientId ? `${c.config.clientId.substring(0, 20)}...` : 'missing',
          hasRefreshToken: !!c.config?.refreshToken,
          hasFolderId: !!c.config?.folderId
        } : undefined
      })), null, 2));
      
      return normalizedConfigs;
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
      // Exclude isEnabled from config object (it's at top level, not in config)
      const { isEnabled: _, ...configUpdates } = updates;
      
      // Clean configUpdates to remove any undefined or null values (but keep empty strings for now)
      const cleanedConfigUpdates: Record<string, any> = {};
      Object.keys(configUpdates).forEach(key => {
        if (configUpdates[key] !== undefined && configUpdates[key] !== null) {
          cleanedConfigUpdates[key] = configUpdates[key];
        }
      });
      
      // Build clean config object - explicitly remove isEnabled if it exists in existing config
      const existingConfigObj = existingConfig.config || {};
      const { isEnabled: __, ...cleanExistingConfig } = existingConfigObj;
      
      structuredUpdates.config = {
        ...cleanExistingConfig,
        ...cleanedConfigUpdates,
      };
      
      // Ensure isEnabled is NOT in the config object (it should only be at root level)
      if (structuredUpdates.config.isEnabled !== undefined) {
        delete structuredUpdates.config.isEnabled;
      }

      // Update the configuration
      // Note: updateConfig will use $set which should only update specified fields
      // But we need to ensure we don't accidentally set empty top-level fields
      await storageConfigService.updateConfig(providerId as StorageProviderId, structuredUpdates);
      
      // Force cache refresh to ensure we return the latest data
      // The updateConfig already invalidates cache, but we need to ensure it's refreshed
      const updatedConfig = await storageConfigService.getConfig(providerId as StorageProviderId);
      
      console.log(`[updateConfig] Updated config for ${providerId}:`, {
        providerId: updatedConfig.providerId,
        isEnabled: updatedConfig.isEnabled,
        hasConfig: !!updatedConfig.config,
        configKeys: updatedConfig.config ? Object.keys(updatedConfig.config) : []
      });
      
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
          details: {
            providerId,
            isEnabled: config.isEnabled
          }
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
      } catch (error: any) {
        // Build detailed error information
        let errorMessage = 'Unknown error occurred';
        let errorCode: string | undefined;
        let errorDetails: any = {};
        let suggestions: string[] = [];

        if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails.message = error.message;
          if (error.stack) {
            errorDetails.stack = error.stack;
          }
        }

        // Extract error code and details if available
        if (error?.code) {
          errorCode = error.code.toString();
          errorDetails.code = error.code;
        }

        // Extract nested details
        if (error?.details) {
          errorDetails = { ...errorDetails, ...error.details };
        }

        // Extract Google API specific errors
        if (error?.details?.googleApiError) {
          const apiError = error.details.googleApiError;
          errorCode = apiError.code || errorCode;
          errorMessage = apiError.message || errorMessage;
          errorDetails.googleApiError = apiError;
          
          // Add suggestions based on error code
          if (apiError.code === 401 || apiError.status === 401) {
            suggestions.push('The access token may have expired. Try re-authorizing the application.');
            suggestions.push('Check that the Client ID and Client Secret are correct.');
          } else if (apiError.code === 403 || apiError.status === 403) {
            suggestions.push('The application may not have the required permissions.');
            suggestions.push('Verify that the OAuth scopes include the necessary Drive permissions.');
          }
        }

        // Add suggestions for authentication errors
        if (error?.details?.authError || errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('token')) {
          suggestions.push('Re-authorize the application by generating a new refresh token.');
          suggestions.push('Verify that all authentication credentials are correct.');
        }

        // Build the response
        const response: any = {
          success: false,
          error: `Connection test failed: ${errorMessage}`,
          details: errorDetails
        };

        if (errorCode) {
          response.errorCode = errorCode;
        }

        if (suggestions.length > 0) {
          response.suggestions = suggestions;
        }

        return response;
      }
    } catch (error: any) {
      // Build detailed error information for outer catch
      let errorMessage = 'Unknown error occurred';
      let errorDetails: any = {};

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails.message = error.message;
        if (error.stack) {
          errorDetails.stack = error.stack;
        }
      }

      if (error?.code) {
        errorDetails.code = error.code;
      }

      return {
        success: false,
        error: `Failed to test connection: ${errorMessage}`,
        details: errorDetails
      };
    }
  }

  /**
   * Initialize default storage configurations
   * Path: POST /api/admin/storage/initialize
   * 
   * This will:
   * - Create default configs if they don't exist
   * - Clean up existing configs (remove isEnabled from config objects, remove duplicate top-level fields)
   */
  @Post('initialize')
  async initializeDefaults() {
    try {
      await storageConfigService.initializeDefaultConfigs();
      const configs = await storageConfigService.getAllConfigs();
      return {
        success: true,
        message: 'Default storage configurations initialized and cleaned up',
        configs,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to initialize storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Clean up existing storage configurations
   * Path: POST /api/admin/storage/cleanup
   * 
   * This will:
   * - Remove isEnabled from config objects (it should only be at root level)
   * - Remove duplicate top-level fields (clientId, clientSecret, etc.)
   * 
   * Useful for fixing data structure issues in existing deployments.
   */
  @Post('cleanup')
  async cleanupConfigs() {
    try {
      await storageConfigService.cleanupExistingConfigs();
      const configs = await storageConfigService.getAllConfigs();
      return {
        success: true,
        message: 'Storage configurations cleaned up successfully',
        configs,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to cleanup storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
