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
}

export interface UpdateListingDto extends Partial<CreateListingDto> {
  isApproved?: boolean;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel('MarketplaceListing')
    private listingModel: Model<IMarketplaceListing>,
  ) {}

  async findApproved(category?: MarketplaceCategory): Promise<IMarketplaceListing[]> {
    const filter: Record<string, unknown> = { isApproved: true };
    if (category) filter.category = category;
    return this.listingModel
      .find(filter)
      .sort({ approvedAt: -1, createdAt: -1 })
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
