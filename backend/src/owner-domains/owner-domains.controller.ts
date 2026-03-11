import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '../config/db';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateOwnerDomainDto } from './dto/create-owner-domain.dto';
import { UpdateOwnerDomainDto } from './dto/update-owner-domain.dto';

@Controller('admin/owner-domains')
@UseGuards(AdminGuard)
export class OwnerDomainsController {
  private readonly logger = new Logger(OwnerDomainsController.name);

  private normalizeHostname(hostname: string): string {
    const raw = hostname.trim().toLowerCase();
    // Strip protocol and path if accidentally included
    try {
      const url = new URL(raw.includes('://') ? raw : `http://${raw}`);
      return url.host.toLowerCase();
    } catch {
      return raw.replace(/\/.*$/, '');
    }
  }

  @Get()
  async list(@Query('ownerId') ownerId?: string, @Query('hostname') hostname?: string) {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');

    const collection = db.collection('owner_domains');
    const query: any = {};

    if (ownerId) {
      if (!Types.ObjectId.isValid(ownerId)) {
        throw new BadRequestException('Invalid ownerId');
      }
      query.ownerId = new Types.ObjectId(ownerId);
    }

    if (hostname) {
      query.hostname = this.normalizeHostname(hostname);
    }

    const docs = await collection.find(query).sort({ hostname: 1 }).toArray();

    const data = docs.map((doc: any) => ({
      id: doc._id.toString(),
      hostname: doc.hostname,
      ownerId:
        typeof doc.ownerId === 'string' ? doc.ownerId : doc.ownerId?.toString?.() ?? null,
      active: doc.active !== false,
      isPrimary: !!doc.isPrimary,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return { data };
  }

  @Post()
  async create(@Body() body: CreateOwnerDomainDto) {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');

    const hostname = this.normalizeHostname(body.hostname);
    if (!hostname) {
      throw new BadRequestException('Hostname is required');
    }
    if (!Types.ObjectId.isValid(body.ownerId)) {
      throw new BadRequestException('Invalid ownerId');
    }

    const collection = db.collection('owner_domains');

    const existing = await collection.findOne({ hostname });
    if (existing) {
      throw new BadRequestException('Hostname is already assigned to an owner');
    }

    const now = new Date();
    const doc = {
      hostname,
      ownerId: new Types.ObjectId(body.ownerId),
      active: body.active !== false,
      isPrimary: !!body.isPrimary,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    const created = await collection.findOne({ _id: result.insertedId });
    if (!created) {
      throw new InternalServerErrorException('Failed to load created owner domain');
    }

    return {
      data: {
        id: created._id.toString(),
        hostname: created.hostname,
        ownerId: created.ownerId.toString(),
        active: created.active !== false,
        isPrimary: !!created.isPrimary,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateOwnerDomainDto) {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    const collection = db.collection('owner_domains');
    const update: any = { updatedAt: new Date() };

    if (body.hostname !== undefined) {
      const hostname = this.normalizeHostname(body.hostname);
      if (!hostname) {
        throw new BadRequestException('Hostname cannot be empty');
      }
      // Ensure uniqueness
      const existing = await collection.findOne({
        hostname,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existing) {
        throw new BadRequestException('Hostname is already assigned to an owner');
      }
      update.hostname = hostname;
    }

    if (body.ownerId !== undefined) {
      if (!Types.ObjectId.isValid(body.ownerId)) {
        throw new BadRequestException('Invalid ownerId');
      }
      update.ownerId = new Types.ObjectId(body.ownerId);
    }

    if (body.active !== undefined) {
      update.active = !!body.active;
    }
    if (body.isPrimary !== undefined) {
      update.isPrimary = !!body.isPrimary;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' },
    );

    const updated = result?.value ?? null;
    if (!updated) {
      throw new BadRequestException('Owner domain not found');
    }

    return {
      data: {
        id: updated._id.toString(),
        hostname: updated.hostname,
        ownerId: updated.ownerId.toString(),
        active: updated.active !== false,
        isPrimary: !!updated.isPrimary,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    const collection = db.collection('owner_domains');
    const result = await collection.deleteOne({ _id: new Types.ObjectId(id) });
    if (result.deletedCount === 0) {
      throw new BadRequestException('Owner domain not found');
    }

    return { success: true };
  }
}

