import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
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
      // The frontend sends config fields at the top level (e.g., { clientId, clientSecret, storageType, isEnabled })
      // We need to structure it properly: { isEnabled, config: { clientId, clientSecret, storageType, ... } }
      
      // Exclude isEnabled from config object (it's at top level, not in config)
      // Also exclude any nested "config" property that shouldn't be there
      const { isEnabled: _, config: __, ...configUpdates } = updates;
      
      // Clean configUpdates to remove any undefined or null values (but keep empty strings for now)
      // Also explicitly exclude "config" property to prevent nested config.config structure
      const cleanedConfigUpdates: Record<string, any> = {};
      Object.keys(configUpdates).forEach(key => {
        if (key !== 'config' && configUpdates[key] !== undefined && configUpdates[key] !== null) {
          cleanedConfigUpdates[key] = configUpdates[key];
        }
      });
      
      // Log warning if we detect a nested config property
      if (updates.config !== undefined) {
        console.warn(`[updateConfig] Received nested "config" property for ${providerId}, ignoring it. This should not happen.`);
      }
      
      // Build clean config object - explicitly remove isEnabled if it exists in existing config
      // Also handle case where existing config might have nested "config" property (bad data)
      const existingConfigObj = existingConfig.config || {};
      
      // Recursively flatten any nested config structures (handle config.config.config...)
      const flattenConfig = (obj: any, depth = 0): any => {
        if (depth > 5) {
          console.error(`[updateConfig] Maximum recursion depth reached while flattening config for ${providerId}`);
          return {};
        }
        
        const flattened: any = {};
        
        // Remove isEnabled and config properties
        Object.keys(obj).forEach(key => {
          if (key === 'isEnabled') {
            // Skip isEnabled (should be at root level)
            return;
          } else if (key === 'config' && typeof obj[key] === 'object') {
            // If there's a nested config, recursively flatten it and merge
            console.warn(`[updateConfig] Found nested config.config at depth ${depth} in ${providerId}, flattening...`);
            const nestedFlattened = flattenConfig(obj[key], depth + 1);
            Object.assign(flattened, nestedFlattened);
          } else if (obj[key] !== undefined && obj[key] !== null) {
            flattened[key] = obj[key];
          }
        });
        
        return flattened;
      };
      
      const cleanExistingConfig = flattenConfig(existingConfigObj);
      
      structuredUpdates.config = {
        ...cleanExistingConfig,
        ...cleanedConfigUpdates,
      };
      
      // Final safety check: ensure no nested config in the final structure
      if (structuredUpdates.config.config !== undefined) {
        console.error(`[updateConfig] ERROR: Final config still contains nested "config" property for ${providerId}! Removing it.`);
        const { config: ____, ...finalClean } = structuredUpdates.config;
        structuredUpdates.config = finalClean;
      }
      
      // Debug: log storageType specifically for Google Drive
      if (providerId === 'google-drive') {
        console.log(`[updateConfig] Google Drive storageType update:`, {
          incoming: cleanedConfigUpdates.storageType,
          existing: cleanExistingConfig.storageType,
          final: structuredUpdates.config.storageType
        });
      }
      
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
        configKeys: updatedConfig.config ? Object.keys(updatedConfig.config) : [],
        storageType: updatedConfig.config?.storageType || 'not set'
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
      
      // Use validateConnection for testing (more reliable than listFolders)
      try {
        const isValid = await provider.validateConnection();
        if (isValid) {
          return {
            success: true,
            message: 'Connection test successful',
          };
        } else {
          return {
            success: false,
            error: 'Connection validation returned false',
            details: {
              providerId,
              message: 'The storage provider validation failed without throwing an error'
            },
            suggestions: [
              'Check that all configuration fields are correct',
              'Verify that the credentials have the necessary permissions',
              'Ensure the bucket/service is accessible'
            ]
          };
        }
      } catch (error: any) {
        // Build detailed error information
        let errorMessage = 'Unknown error occurred';
        let errorCode: string | undefined;
        let errorDetails: any = {};
        let suggestions: string[] = [];

        // Check if it's a StorageConnectionError (from Wasabi, AWS S3, Backblaze, etc.)
        if (error?.name === 'StorageConnectionError' || error instanceof Error && error.constructor.name === 'StorageConnectionError') {
          errorMessage = error.message;
          if (error.details) {
            errorDetails = { ...errorDetails, ...error.details };
            // Extract suggestions from details if available
            if (error.details.suggestions && Array.isArray(error.details.suggestions)) {
              suggestions.push(...error.details.suggestions);
            }
          }
          if (error.code) {
            errorCode = error.code.toString();
            errorDetails.code = error.code;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails.message = error.message;
          if (error.stack) {
            errorDetails.stack = error.stack;
          }
        }

        // Extract error code and details if available
        if (error?.code && !errorCode) {
          errorCode = error.code.toString();
          errorDetails.code = error.code;
        }

        // Extract nested details
        if (error?.details && !errorDetails.suggestions) {
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

        // Extract S3-compatible provider errors (Wasabi, AWS S3, Backblaze)
        // Suggestions are already extracted above if it's a StorageConnectionError

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
   * - Flatten nested config.config structures
   * 
   * Useful for fixing data structure issues in existing deployments.
   */
  @Post('cleanup')
  async cleanupConfigs() {
    try {
      await storageConfigService.cleanupExistingConfigs();
      
      // Also fix nested config structures
      const configs = await storageConfigService.getAllConfigs();
      for (const config of configs) {
        if (config.config && config.config.config) {
          console.log(`[cleanup] Fixing nested config for ${config.providerId}`);
          // Flatten the nested config
          const flattenConfig = (obj: any, depth = 0): any => {
            if (depth > 5) return {};
            const flattened: any = {};
            Object.keys(obj).forEach(key => {
              if (key === 'isEnabled') return;
              if (key === 'config' && typeof obj[key] === 'object') {
                const nested = flattenConfig(obj[key], depth + 1);
                Object.assign(flattened, nested);
              } else if (obj[key] !== undefined && obj[key] !== null) {
                flattened[key] = obj[key];
              }
            });
            return flattened;
          };
          
          const flattened = flattenConfig(config.config);
          await storageConfigService.updateConfig(config.providerId, {
            config: flattened
          });
        }
      }
      
      const cleanedConfigs = await storageConfigService.getAllConfigs();
      return {
        success: true,
        message: 'Storage configurations cleaned up successfully (including nested config structures)',
        configs: cleanedConfigs,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to cleanup storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get folder/file tree from storage provider (directly from storage, not from database)
   * Path: GET /api/admin/storage/:providerId/tree?path=...
   */
  @Get(':providerId/tree')
  async getStorageTree(
    @Param('providerId') providerId: string,
    @Query('path') path?: string,
    @Query('maxDepth') maxDepth?: string
  ) {
    try {
      const config = await storageConfigService.getConfig(providerId as StorageProviderId);
      
      if (!config.isEnabled) {
        throw new BadRequestException(`${providerId} storage provider is not enabled`);
      }

      const storageManager = StorageManager.getInstance();
      const provider = await storageManager.getProvider(providerId as StorageProviderId);
      
      // Check if the provider has the getFolderTree method
      if (typeof (provider as any).getFolderTree !== 'function') {
        throw new BadRequestException(`Folder tree listing is not supported for ${providerId} provider`);
      }

      const depth = maxDepth ? parseInt(maxDepth, 10) : 10;
      if (isNaN(depth) || depth < 1 || depth > 20) {
        throw new BadRequestException('maxDepth must be between 1 and 20');
      }

      const tree = await (provider as any).getFolderTree(path, depth);
      
      console.log(`StorageAdminController: Tree result for ${providerId}`, {
        hasTree: !!tree,
        path: tree?.path,
        foldersCount: tree?.folders?.length || 0,
        filesCount: tree?.files?.length || 0,
        totalFolders: tree?.totalFolders || 0,
        totalFiles: tree?.totalFiles || 0
      });
      
      // Ensure we always return a valid structure
      if (!tree) {
        console.warn(`StorageAdminController: getFolderTree returned null/undefined for ${providerId}`);
        return {
          success: true,
          providerId,
          data: {
            path: path || '/',
            folderId: null,
            folders: [],
            files: [],
            totalFiles: 0,
            totalFolders: 0
          },
        };
      }
      
      return {
        success: true,
        providerId,
        data: tree,
      };
    } catch (error: any) {
      console.error(`Error getting ${providerId} tree:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get ${providerId} tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate Google OAuth authorization URL
   * Path: GET /api/admin/storage/google-drive/auth-url
   */
  @Get('google-drive/auth-url')
  async getGoogleAuthUrl(
    @Query('clientId') clientId: string,
    @Query('redirectUri') redirectUri: string,
    @Query('storageType') storageType?: string
  ) {
    try {
      if (!clientId || !redirectUri) {
        throw new BadRequestException('clientId and redirectUri are required');
      }

      // Determine scope based on storage type
      // Default to 'appdata' for backward compatibility
      const storageTypeValue = storageType || 'appdata'
      const scope = storageTypeValue === 'visible'
        ? 'https://www.googleapis.com/auth/drive.file'  // For visible files
        : 'https://www.googleapis.com/auth/drive.appdata'  // For hidden AppData

      // Generate OAuth URL
      const { google } = require('googleapis')
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        '', // Client secret not needed for URL generation
        redirectUri
      )

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // Force consent to get refresh token
        scope: [scope],
        redirect_uri: redirectUri
      })

      return {
        success: true,
        authUrl,
        scope,
        storageType: storageTypeValue
      }
    } catch (error) {
      console.error('Error generating Google OAuth URL:', error)
      throw new BadRequestException(
        `Failed to generate OAuth URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}
