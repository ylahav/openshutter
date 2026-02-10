import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { MigrationService } from './migration.service';
import type { StorageProviderId } from '../services/storage/types';

@Controller('admin')
@UseGuards(AdminGuard)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  // --- Export ---
  @Post('export/preview')
  async exportPreview(@Body() body: { destinationPath: string; bundle?: boolean }) {
    const { destinationPath, bundle } = body ?? {};
    if (!destinationPath || typeof destinationPath !== 'string') {
      throw new BadRequestException('destinationPath is required');
    }
    return this.migrationService.exportPreview(destinationPath, bundle);
  }

  @Post('export/start')
  async exportStart(@Body() body: { destinationPath: string; bundle?: boolean }) {
    const { destinationPath, bundle } = body ?? {};
    if (!destinationPath || typeof destinationPath !== 'string') {
      throw new BadRequestException('destinationPath is required');
    }
    return this.migrationService.exportStart(destinationPath, bundle);
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

  @Post('import/preview')
  async importPreview(
    @Body() body: { sourcePath: string; mode: 'package' | 'raw' },
  ) {
    const { sourcePath, mode } = body ?? {};
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new BadRequestException('sourcePath is required');
    }
    if (mode === 'package') {
      return this.migrationService.importPreviewFromPackage(sourcePath);
    }
    return this.migrationService.importPreviewFromRaw(sourcePath);
  }

  @Post('import/start')
  async importStart(
    @Body() body: { sourcePath: string; mode: 'package' | 'raw'; options?: { mergeTags?: boolean } },
    @Req() req: any,
  ) {
    const { sourcePath, mode } = body ?? {};
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new BadRequestException('sourcePath is required');
    }
    if (mode !== 'package' && mode !== 'raw') {
      throw new BadRequestException('mode must be "package" or "raw"');
    }
    const userId = req?.user?.id ?? req?.user?._id;
    if (!userId) throw new BadRequestException('User context required');
    return this.migrationService.importStart(sourcePath, mode, userId);
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
