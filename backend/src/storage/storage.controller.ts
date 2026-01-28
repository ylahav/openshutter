import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { StorageManager } from '../services/storage/manager';
import { StorageConfigError } from '../services/storage/types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { isAbsolute } from 'path';

@Controller('storage')
export class StorageController {
  /**
   * Serve files from storage
   * Path: GET /api/storage/serve/:provider/*
   */
  @Get('serve/:provider/*path')
  async serveFile(
    @Param('provider') provider: string,
    @Param('path') filePath: string,
    @Res() res: Response,
  ) {
    try {
      const storageManager = StorageManager.getInstance();
      
      // Decode the path - handle both single and double encoding
      let decodedPath = filePath;
      try {
        decodedPath = decodeURIComponent(filePath);
        // If decoding resulted in still having % encoded chars, decode again
        if (decodedPath.includes('%')) {
          decodedPath = decodeURIComponent(decodedPath);
        }
      } catch (_e) {
        // If decoding fails, use original path
        console.warn('Failed to decode path, using original:', filePath);
      }
      
      console.log(`Serving file - provider: ${provider}, original path: ${filePath}, decoded path: ${decodedPath}`);
      
      // For local storage, serve files directly
      if (provider === 'local') {
        const localService = await storageManager.getProvider(provider as any);
        const basePath = (localService as any).basePath || process.env.LOCAL_STORAGE_PATH || './uploads';
        
        // Replicate the getFullPath logic from LocalStorageService
        const fullPath = isAbsolute(basePath)
          ? join(basePath, decodedPath)
          : join(process.cwd(), basePath, decodedPath);
        
        console.log(`Full file path: ${fullPath}`);
        
        try {
          const fileBuffer = await readFile(fullPath);
          
          // Determine content type from file extension
          const ext = decodedPath.split('.').pop()?.toLowerCase();
          const contentTypeMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'ico': 'image/x-icon',
            'svg': 'image/svg+xml',
          };
          const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
          res.send(fileBuffer);
        } catch (error) {
          console.error(`Failed to serve file ${fullPath}:`, error);
          console.error(`Error details:`, {
            originalPath: filePath,
            decodedPath: decodedPath,
            fullPath: fullPath,
            basePath: basePath,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          throw new NotFoundException(`File not found: ${decodedPath}`);
        }
      } else if (provider === 'google-drive') {
        // For Google Drive, use getFileBuffer
        try {
          const storageService = await storageManager.getProvider('google-drive');
          
          // Check if the service has getFileBuffer method
          if (typeof (storageService as any).getFileBuffer === 'function') {
            console.log(`GoogleDrive: Attempting to get file buffer for path: ${decodedPath}`);
            const fileBuffer = await (storageService as any).getFileBuffer(decodedPath);
            
            if (!fileBuffer) {
              console.error(`GoogleDrive: File buffer is null for path: ${decodedPath}`);
              throw new NotFoundException(`File not found: ${decodedPath}`);
            }
            
            console.log(`GoogleDrive: Successfully retrieved file buffer, size: ${fileBuffer.length} bytes`);
            
            // Get file info to determine content type
            let contentType = 'application/octet-stream';
            try {
              const fileInfo = await storageService.getFileInfo(decodedPath);
              contentType = fileInfo.mimeType || contentType;
              console.log(`GoogleDrive: File info retrieved, content type: ${contentType}`);
            } catch (error) {
              console.warn(`GoogleDrive: Failed to get file info, using extension-based content type:`, error);
              // Fallback to extension-based content type if getFileInfo fails
              const ext = decodedPath.split('.').pop()?.toLowerCase();
              const contentTypeMap: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'ico': 'image/x-icon',
                'svg': 'image/svg+xml',
              };
              contentType = contentTypeMap[ext || ''] || contentType;
            }
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            res.send(fileBuffer);
          } else {
            throw new NotFoundException(`Google Drive storage provider does not support file serving`);
          }
        } catch (error) {
          console.error(`Failed to serve file from Google Drive:`, error);
          console.error(`Error details:`, {
            provider,
            decodedPath,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          
          // Check for invalid_grant error (token expired/revoked)
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = (error as any)?.code;
          const errorDetails = (error as any)?.details || {};
          
          if (
            errorCode === 'invalid_grant' ||
            errorMessage.includes('invalid_grant') ||
            errorMessage.includes('invalid or expired') ||
            errorMessage.includes('refresh token') ||
            errorDetails.authError ||
            errorDetails.googleApiError?.error === 'invalid_grant'
          ) {
            // Return 401 with specific error code to trigger token renewal notification
            res.status(401).json({
              error: 'GOOGLE_DRIVE_TOKEN_INVALID',
              message: 'Google Drive authentication token is invalid or expired',
              requiresRenewal: true,
              provider: 'google-drive'
            });
            return;
          }
          
          if (error instanceof NotFoundException) {
            throw error;
          }
          throw new NotFoundException(`File not found: ${decodedPath}`);
        }
      } else if (['wasabi', 'aws-s3', 'backblaze'].includes(provider)) {
        // For S3-compatible providers (Wasabi, AWS S3, Backblaze), use getFileBuffer
        // Handle case where photos have 'aws-s3' but system uses 'wasabi' (S3-compatible)
        let actualProvider = provider;
        let storageService;
        
        try {
          storageService = await storageManager.getProvider(provider as any);
        } catch (error) {
          // If aws-s3 is not enabled but wasabi is, try wasabi as fallback (they're S3-compatible)
          if (provider === 'aws-s3' && error instanceof StorageConfigError) {
            console.log(`Provider ${provider} not enabled, trying wasabi as fallback...`);
            try {
              actualProvider = 'wasabi';
              storageService = await storageManager.getProvider('wasabi');
              console.log(`Successfully using wasabi as fallback for ${provider}`);
            } catch (fallbackError) {
              console.error(`Both ${provider} and wasabi are not enabled:`, fallbackError);
              throw error; // Throw original error
            }
          } else {
            throw error;
          }
        }
        
        try {
          // Check if the service has getFileBuffer method
          if (typeof (storageService as any).getFileBuffer === 'function') {
            const fileBuffer = await (storageService as any).getFileBuffer(decodedPath);
            
            if (!fileBuffer) {
              throw new NotFoundException(`File not found: ${decodedPath}`);
            }
            
            // Get file info to determine content type
            let contentType = 'application/octet-stream';
            try {
              const fileInfo = await storageService.getFileInfo(decodedPath);
              contentType = fileInfo.mimeType || contentType;
            } catch (error) {
              // Fallback to extension-based content type if getFileInfo fails
              const ext = decodedPath.split('.').pop()?.toLowerCase();
              const contentTypeMap: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'ico': 'image/x-icon',
                'svg': 'image/svg+xml',
              };
              contentType = contentTypeMap[ext || ''] || contentType;
            }
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            res.send(fileBuffer);
          } else {
            throw new NotFoundException(`Storage provider ${actualProvider} does not support file serving`);
          }
        } catch (error) {
          console.error(`Failed to serve file from ${actualProvider}:`, error);
          if (error instanceof NotFoundException) {
            throw error;
          }
          throw new NotFoundException(`File not found: ${decodedPath}`);
        }
      } else {
        // For other providers, redirect to their URL or handle differently
        throw new NotFoundException(`Storage provider ${provider} file serving not implemented yet`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Storage serve error:', error);
      throw new NotFoundException('File not found');
    }
  }
}
