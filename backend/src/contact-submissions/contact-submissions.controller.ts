import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';
import { IContactSubmission } from './contact-submission.schema';

@Controller('contact-submissions')
export class ContactSubmissionsController {
  constructor(@InjectModel('ContactSubmission') private contactSubmissionModel: Model<IContactSubmission>) {}

  @Post()
  async create(@Req() req: Request, @Body() body: CreateContactSubmissionDto) {
    const siteContext = (req as any).siteContext;
    const ownerSiteId =
      siteContext?.type === 'owner-site' && siteContext?.ownerId
        ? String(siteContext.ownerId)
        : undefined;

    const created = await this.contactSubmissionModel.create({
      name: body.name?.trim(),
      email: body.email?.trim().toLowerCase(),
      phone: body.phone?.trim() || undefined,
      message: body.message?.trim(),
      pageAlias: body.pageAlias?.trim().toLowerCase() || undefined,
      sourceUrl: body.sourceUrl?.trim() || undefined,
      ownerSiteId,
    });

    return {
      success: true,
      data: {
        _id: created._id,
        createdAt: created.createdAt,
      },
    };
  }

  private async listForAdminCore(
    @Req() req: Request,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') searchRaw?: string,
  ) {
    const page = Math.max(1, Number(pageRaw || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitRaw || 20) || 20));
    const skip = (page - 1) * limit;
    const search = String(searchRaw || '').trim();

    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.contactSubmissionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.contactSubmissionModel.countDocuments(filter).exec(),
    ]);

    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async listForAdmin(
    @Req() req: Request,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') searchRaw?: string,
  ) {
    return this.listForAdminCore(req, pageRaw, limitRaw, searchRaw);
  }

  @Get()
  @UseGuards(AdminGuard)
  async listForAdminAlias(
    @Req() req: Request,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') searchRaw?: string,
  ) {
    return this.listForAdminCore(req, pageRaw, limitRaw, searchRaw);
  }
}
