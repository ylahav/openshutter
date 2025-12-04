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
      const decodedPath = decodeURIComponent(filePath);
      
      // For local storage, serve files directly
      if (provider === 'local') {
        const localService = await storageManager.getProvider(provider as any);
        const basePath = (localService as any).basePath || process.env.LOCAL_STORAGE_PATH || './uploads';
        
        // Replicate the getFullPath logic from LocalStorageService
        const fullPath = isAbsolute(basePath)
          ? join(basePath, decodedPath)
          : join(process.cwd(), basePath, decodedPath);
        
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
