import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { getOwnerIdFromOwnerGroupAlias, isOwnerGroupAlias } from '../utils/owner-groups';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Req() req: Request, @Body() loginDto: { email: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Restrict guest accounts that belong to an owner group to the corresponding owner domain.
    const siteContext: any = (req as any).siteContext;
    const groupAliases: string[] = Array.isArray((user as any).groupAliases)
      ? (user as any).groupAliases
      : [];
    if (user.role === 'guest') {
      const ownerAlias = groupAliases.find((alias) => isOwnerGroupAlias(alias));
      if (ownerAlias) {
        const ownerIdFromAlias = getOwnerIdFromOwnerGroupAlias(ownerAlias);
        const ownerSiteId: string | undefined =
          siteContext && siteContext.type === 'owner-site' ? siteContext.ownerId : undefined;
        if (!ownerSiteId || !ownerIdFromAlias || ownerSiteId !== ownerIdFromAlias) {
          throw new UnauthorizedException(
            'This account can only be used on its owner site.',
          );
        }
      }
    }

    return {
      user,
      role: user.role,
    };
  }

  @Get('profile')
  @UseGuards(OptionalAdminGuard)
  async getProfile(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.authService.getProfile(user.id);
  }

  @Put('profile')
  @UseGuards(OptionalAdminGuard)
  async updateProfile(@Req() req: Request, @Body() body: any) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.authService.updateProfile(user.id, body);
  }

  /**
   * Get storage options for the current user (owner: only allowed providers; admin: all enabled).
   * Path: GET /api/auth/storage-options
   */
  @Get('storage-options')
  @UseGuards(OptionalAdminGuard)
  async getStorageOptions(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.authService.getStorageOptions(user.id);
  }
}
