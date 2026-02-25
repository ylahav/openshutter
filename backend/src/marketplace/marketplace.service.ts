import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IMarketplaceListing, MarketplaceCategory } from './marketplace.schema';

export interface CreateListingDto {
  name: string;
  description: string;
  category: MarketplaceCategory;
  developerName: string;
  developerEmail: string;
  version?: string;
  apiVersionCompatible?: string[];
  screenshots?: string[];
  documentationUrl?: string;
  downloadUrl?: string;
  repositoryUrl?: string;
  tags?: string[];
}

export interface UpdateListingDto extends Partial<CreateListingDto> {
  isApproved?: boolean;
  featured?: boolean;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel('MarketplaceListing')
    private listingModel: Model<IMarketplaceListing>,
  ) {}

  async findApproved(opts?: {
    category?: MarketplaceCategory;
    featured?: boolean;
    q?: string;
  }): Promise<IMarketplaceListing[]> {
    const filter: Record<string, unknown> = { isApproved: true };
    if (opts?.category) filter.category = opts.category;
    if (opts?.featured === true) filter.featured = true;
    if (opts?.q && opts.q.trim()) {
      const re = new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: re },
        { description: re },
        { tags: re },
      ];
    }
    return this.listingModel
      .find(filter)
      .sort({ featured: -1, approvedAt: -1, createdAt: -1 })
      .lean()
      .exec() as Promise<IMarketplaceListing[]>;
  }

  async findApprovedById(id: string): Promise<IMarketplaceListing | null> {
    const listing = await this.listingModel
      .findOne({ _id: id, isApproved: true })
      .lean()
      .exec();
    return listing as IMarketplaceListing | null;
  }

  async findAll(approvedOnly?: boolean): Promise<IMarketplaceListing[]> {
    const filter = approvedOnly != null ? { isApproved: approvedOnly } : {};
    return this.listingModel.find(filter).sort({ createdAt: -1 }).lean().exec() as Promise<IMarketplaceListing[]>;
  }

  async findById(id: string): Promise<IMarketplaceListing | null> {
    const listing = await this.listingModel.findById(id).lean().exec();
    return listing as IMarketplaceListing | null;
  }

  async create(dto: CreateListingDto, userId: string): Promise<IMarketplaceListing> {
    const payload = {
      ...dto,
      apiVersionCompatible: dto.apiVersionCompatible ?? ['v1'],
      screenshots: dto.screenshots ?? [],
      tags: dto.tags ?? [],
      version: dto.version ?? '1.0.0',
      isApproved: false,
      submittedBy: new Types.ObjectId(userId),
    };
    const doc = await this.listingModel.create(payload as any);
    return (doc as any).toObject() as IMarketplaceListing;
  }

  async update(id: string, updates: UpdateListingDto, adminUserId?: string): Promise<IMarketplaceListing> {
    const listing = await this.listingModel.findById(id).exec();
    if (!listing) throw new NotFoundException('Listing not found');
    if (updates.isApproved === true && !listing.isApproved) {
      (updates as Record<string, unknown>).approvedBy = adminUserId ? new Types.ObjectId(adminUserId) : undefined;
      (updates as Record<string, unknown>).approvedAt = new Date();
    }
    Object.assign(listing, updates);
    await listing.save();
    return listing.toObject() as IMarketplaceListing;
  }

  async delete(id: string): Promise<void> {
    const result = await this.listingModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Listing not found');
  }
}
