import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Types } from 'mongoose';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { UserModel } from '../models/User';
import { ownerStorageConfigService } from '../services/storage/owner-storage-config.service';
import type { StorageProviderId } from '../services/storage/types';

const VALID_PROVIDERS = ['google-drive', 'aws-s3', 'local', 'backblaze', 'wasabi'];

@Controller('admin/owner-dedicated-storage')
@UseGuards(AdminGuard)
export class AdminOwnerDedicatedStorageController {
  private readonly logger = new Logger(AdminOwnerDedicatedStorageController.name);

  @Get()
  async list(@Query('ownerId') ownerId: string) {
    if (!ownerId || !Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('ownerId query parameter is required');
    }
    const user = await UserModel.findById(ownerId).select('role useDedicatedStorage').lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if ((user as any).role !== 'owner') {
      throw new BadRequestException('Dedicated storage applies to owner accounts only');
    }
    const data = await ownerStorageConfigService.listByOwner(ownerId);
    return {
      success: true,
      useDedicatedStorage: Boolean((user as any).useDedicatedStorage),
      data,
    };
  }

  @Put(':providerId')
  async upsert(
    @Query('ownerId') ownerId: string,
    @Param('providerId') providerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!ownerId || !Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('ownerId query parameter is required');
    }
    if (!VALID_PROVIDERS.includes(providerId)) {
      throw new BadRequestException(`Invalid providerId: ${providerId}`);
    }
    const user = await UserModel.findById(ownerId).select('role useDedicatedStorage').lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if ((user as any).role !== 'owner') {
      throw new BadRequestException('Dedicated storage applies to owner accounts only');
    }
    if (!(user as any).useDedicatedStorage) {
      throw new BadRequestException('Enable dedicated storage on the user before configuring providers');
    }
    const updated = await ownerStorageConfigService.upsert(ownerId, providerId as StorageProviderId, {
      name: body.name as string | undefined,
      isEnabled: body.isEnabled as boolean | undefined,
      config: (body.config as Record<string, unknown>) || {},
    });
    return { success: true, data: updated };
  }
}

@Controller('owner/dedicated-storage')
@UseGuards(AdminOrOwnerGuard)
export class OwnerDedicatedStorageController {
  private readonly logger = new Logger(OwnerDedicatedStorageController.name);

  @Get()
  async listMine(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.id || user.role !== 'owner') {
      throw new ForbiddenException('Only owners can manage dedicated storage here');
    }
    const doc = await UserModel.findById(user.id).select('useDedicatedStorage').lean();
    const data = await ownerStorageConfigService.listByOwner(user.id);
    return {
      success: true,
      useDedicatedStorage: Boolean((doc as any)?.useDedicatedStorage),
      data,
    };
  }

  @Put(':providerId')
  async upsertMine(
    @Req() req: Request,
    @Param('providerId') providerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const user = (req as any).user;
    if (!user?.id || user.role !== 'owner') {
      throw new ForbiddenException('Only owners can manage dedicated storage here');
    }
    if (!VALID_PROVIDERS.includes(providerId)) {
      throw new BadRequestException(`Invalid providerId: ${providerId}`);
    }
    const doc = await UserModel.findById(user.id).select('useDedicatedStorage').lean();
    if (!(doc as any)?.useDedicatedStorage) {
      throw new BadRequestException(
        'Dedicated storage is not enabled for your account. Ask an administrator to enable it on your user profile.',
      );
    }
    const updated = await ownerStorageConfigService.upsert(user.id, providerId as StorageProviderId, {
      name: body.name as string | undefined,
      isEnabled: body.isEnabled as boolean | undefined,
      config: (body.config as Record<string, unknown>) || {},
    });
    return { success: true, data: updated };
  }
}
