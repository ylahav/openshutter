import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IPhoto } from '../models/Photo';

@Injectable()
export class PhotosService {
  constructor(
    @InjectModel('Photo') private photoModel: Model<IPhoto>,
  ) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const photos = await this.photoModel
      .find({ isPublished: true })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('albumId', 'name alias')
      .populate('uploadedBy', 'name')
      .exec();

    const total = await this.photoModel.countDocuments({ isPublished: true });

    return {
      photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const photo = await this.photoModel
      .findById(id)
      .populate('albumId')
      .populate('tags')
      .populate('people')
      .populate('location')
      .populate('uploadedBy', 'name username')
      .exec();

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return photo;
  }
}
