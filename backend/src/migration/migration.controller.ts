import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../common/guards/admin.guard';
import { MigrationService } from './migration.service';
import type { StorageProviderId } from '../services/storage/types';
import type { Response } from 'express';
import type { MulterIncomingFile } from '../common/types/multer-incoming-file';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('admin')
@UseGuards(AdminGuard)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  // --- Export ---
  @Post('export/preview')
  async exportPreview(
    @Body()
    body: {
      destinationPath?: string;
      bundle?: boolean;
      includeConfig?: boolean;
      exportScope?: 'full' | 'templates-pages';
    },
  ) {
    const { destinationPath, bundle, includeConfig, exportScope } = body ?? {};
    if (destinationPath !== undefined && typeof destinationPath !== 'string') {
      throw new BadRequestException('destinationPath must be a string');
    }
    return this.migrationService.exportPreview(destinationPath, bundle, includeConfig, exportScope);
  }

  @Post('export/start')
  async exportStart(
    @Body()
    body: {
      destinationPath?: string;
      bundle?: boolean;
      includeConfig?: boolean;
      exportScope?: 'full' | 'templates-pages';
    },
  ) {
    const { destinationPath, bundle, includeConfig, exportScope } = body ?? {};
    if (destinationPath !== undefined && typeof destinationPath !== 'string') {
      throw new BadRequestException('destinationPath must be a string');
    }
    return this.migrationService.exportStart(destinationPath, bundle, includeConfig, exportScope);
  }

  @Get('export/download/:jobId')
  async exportDownload(@Param('jobId') jobId: string, @Res() res: Response) {
    const filePath = this.migrationService.getExportDownloadPath(jobId);
    if (!filePath) throw new NotFoundException('Bundle not available for this export job');
    return res.download(filePath);
  }

  @Get('export/status/:jobId')
  async exportStatus(@Param('jobId') jobId: string) {
    const state = this.migrationService.getExportStatus(jobId);
    if (!state) throw new BadRequestException('Job not found');
    return state;
  }

  @Post('export/cancel/:jobId')
  async exportCancel(@Param('jobId') jobId: string) {
    this.migrationService.cancelExport(jobId);
    return { success: true };
  }

  // --- Import ---
  @Post('import/scan')
  async importScan(@Body() body: { sourcePath: string }) {
    const { sourcePath } = body ?? {};
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new BadRequestException('sourcePath is required');
    }
    return this.migrationService.importScan(sourcePath);
  }

  @Post('import/upload-package')
  @UseInterceptors(FileInterceptor('file'))
  async importUploadPackage(@UploadedFile() file: MulterIncomingFile) {
    if (!file) throw new BadRequestException('ZIP file is required');
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.zip') throw new BadRequestException('Only .zip packages are supported');
    if (!file.buffer || file.buffer.length === 0) throw new BadRequestException('Uploaded file is empty');

    const targetPath = this.migrationService.buildImportUploadPath(file.originalname || 'package.zip');
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.buffer);

    return {
      success: true,
      sourcePath: targetPath,
      fileName: path.basename(targetPath),
      size: file.size ?? file.buffer.length,
    };
  }

  @Post('import/preview')
  async importPreview(
    @Body() body: { sourcePath: string; mode: 'package' | 'raw'; includeConfig?: boolean },
  ) {
    const { sourcePath, mode, includeConfig } = body ?? {};
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new BadRequestException('sourcePath is required');
    }
    if (mode === 'package') {
      return this.migrationService.importPreviewFromPackage(sourcePath, includeConfig);
    }
    return this.migrationService.importPreviewFromRaw(sourcePath);
  }

  @Post('import/start')
  async importStart(
    @Body()
    body: {
      sourcePath: string;
      mode: 'package' | 'raw';
      options?: { mergeTags?: boolean };
      includeConfig?: boolean;
      configMode?: 'merge' | 'replace';
    },
    @Req() req: any,
  ) {
    const { sourcePath, mode, includeConfig, configMode } = body ?? {};
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new BadRequestException('sourcePath is required');
    }
    if (mode !== 'package' && mode !== 'raw') {
      throw new BadRequestException('mode must be "package" or "raw"');
    }
    const userId = req?.user?.id ?? req?.user?._id;
    if (!userId) throw new BadRequestException('User context required');
    return this.migrationService.importStart(sourcePath, mode, userId, {
      includeConfig: includeConfig === true,
      configMode: configMode === 'replace' ? 'replace' : 'merge',
    });
  }

  @Get('import/status/:jobId')
  async importStatus(@Param('jobId') jobId: string) {
    const state = this.migrationService.getImportStatus(jobId);
    if (!state) throw new BadRequestException('Job not found');
    return state;
  }

  @Post('import/cancel/:jobId')
  async importCancel(@Param('jobId') jobId: string) {
    this.migrationService.cancelImport(jobId);
    return { success: true };
  }

  // --- Storage migration ---
  @Get('storage-migration/providers')
  async storageMigrationProviders() {
    return this.migrationService.getStorageProviders();
  }

  @Post('storage-migration/albums-by-provider')
  async getAlbumsByProvider(
    @Body() body: { providerId: StorageProviderId },
  ) {
    const { providerId } = body ?? {};
    if (!providerId || typeof providerId !== 'string') {
      throw new BadRequestException('providerId is required');
    }
    return this.migrationService.getAlbumsByProvider(providerId);
  }

  @Post('storage-migration/preview')
  async storageMigrationPreview(
    @Body() body: { sourceProviderId?: StorageProviderId; targetProviderId: StorageProviderId; albumIds?: string[] },
  ) {
    const { targetProviderId, sourceProviderId, albumIds } = body ?? {};
    if (!targetProviderId || typeof targetProviderId !== 'string') {
      throw new BadRequestException('targetProviderId is required');
    }
    return this.migrationService.storageMigrationPreview(targetProviderId, albumIds, sourceProviderId);
  }

  @Post('storage-migration/start')
  async storageMigrationStart(
    @Body() body: { sourceProviderId?: StorageProviderId; targetProviderId: StorageProviderId; albumIds?: string[] },
  ) {
    const { targetProviderId, sourceProviderId, albumIds } = body ?? {};
    if (!targetProviderId || typeof targetProviderId !== 'string') {
      throw new BadRequestException('targetProviderId is required');
    }
    return this.migrationService.storageMigrationStart(targetProviderId, albumIds, sourceProviderId);
  }

  @Get('storage-migration/status/:jobId')
  async storageMigrationStatus(@Param('jobId') jobId: string) {
    const state = this.migrationService.getStorageMigrationStatus(jobId);
    if (!state) throw new BadRequestException('Job not found');
    return state;
  }

  @Post('storage-migration/cancel/:jobId')
  async storageMigrationCancel(@Param('jobId') jobId: string) {
    this.migrationService.cancelStorageMigration(jobId);
    return { success: true };
  }
}
