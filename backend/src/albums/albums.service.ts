import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IAlbum } from '../models/Album';
import { IPhoto } from '../models/Photo';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectModel('Album') private albumModel: Model<IAlbum>,
    @InjectModel('Photo') private photoModel: Model<IPhoto>,
  ) {}

  async findAll(parentId?: string, level?: string) {
    const query: any = {};

    // Only filter by isPublic for root-level queries
    // For sub-albums, return all albums (access control can be handled at app level)
    if (parentId === 'root' || parentId === 'null' || !parentId) {
      query.isPublic = true;
    }

    if (parentId === 'root' || parentId === 'null') {
      query.parentAlbumId = null;
    } else if (parentId) {
      // Validate it's a valid ObjectId format first
      if (!Types.ObjectId.isValid(parentId)) {
        console.warn(`Invalid parentId format: ${parentId}`);
        return [];
      }
      // Use string directly - Mongoose automatically converts string IDs to ObjectId when querying ObjectId fields
      // Explicit ObjectId conversion was causing issues, so let Mongoose handle it
      query.parentAlbumId = parentId;
    }

    // Support level filter (for root albums, level 0)
    if (level !== undefined) {
      const levelNum = parseInt(level, 10);
      if (!isNaN(levelNum)) {
        query.level = levelNum;
      }
    }

    // Log query with better ObjectId representation
    const queryLog = { ...query };
    if (queryLog.parentAlbumId) {
      queryLog.parentAlbumId = queryLog.parentAlbumId.toString();
    }
    console.log('AlbumsService.findAll query:', JSON.stringify(queryLog, null, 2));
    console.log('AlbumsService.findAll query (raw):', query);

    // Try the query - if parentAlbumId is an ObjectId, Mongoose should match it correctly
    let albums = await this.albumModel
      .find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate('coverPhotoId')
      .exec();

    console.log(`AlbumsService.findAll found ${albums.length} albums for parentId: ${parentId} with ObjectId query`);
    if (albums.length > 0) {
      console.log('Sample album from query:', {
        _id: albums[0]._id?.toString(),
        alias: albums[0].alias,
        name: albums[0].name,
        nameType: typeof albums[0].name,
        hasName: !!albums[0].name
      });
    }
    
    // If no results and we have a parentId, try alternative query approaches
    if (albums.length === 0 && parentId && parentId !== 'root' && parentId !== 'null') {
      console.log('Trying alternative query approaches...');
      
      // Try 1: Query with string (Mongoose auto-converts)
      const altQuery1 = { ...query };
      altQuery1.parentAlbumId = parentId;
      albums = await this.albumModel
        .find(altQuery1)
        .sort({ order: 1, createdAt: -1 })
        .populate('coverPhotoId')
        .exec();
      console.log(`Alternative query 1 (string) found ${albums.length} albums`);
      
      // Try 2: Use $in operator
      if (albums.length === 0) {
        const altQuery2 = { ...query };
        altQuery2.parentAlbumId = { $in: [new Types.ObjectId(parentId), parentId] };
        albums = await this.albumModel
          .find(altQuery2)
          .sort({ order: 1, createdAt: -1 })
          .populate('coverPhotoId')
          .exec();
        console.log(`Alternative query 2 ($in) found ${albums.length} albums`);
      }
      
      // Try 3: Find all and filter manually (fallback)
      if (albums.length === 0) {
        console.log('Using manual filter as fallback...');
        const allAlbums = await this.albumModel
          .find({})
          .sort({ order: 1, createdAt: -1 })
          .populate('coverPhotoId')
          .exec();
        albums = allAlbums.filter(a => {
          if (!a.parentAlbumId) return false;
          return a.parentAlbumId.toString() === parentId;
        });
        console.log(`Manual filter found ${albums.length} albums`);
      }
    }
    
    // Debug: Try multiple query formats to diagnose the issue
    if (parentId && parentId !== 'root' && parentId !== 'null') {
      const countWithObjectId = await this.albumModel.countDocuments({ parentAlbumId: new Types.ObjectId(parentId) });
      console.log(`Direct count with ObjectId for parentId ${parentId}: ${countWithObjectId} albums`);
      
      // Also try as string (Mongoose should auto-convert)
      const countWithString = await this.albumModel.countDocuments({ parentAlbumId: parentId });
      console.log(`Direct count with string for parentId ${parentId}: ${countWithString} albums`);
      
      // Try with $eq operator
      const countWithEq = await this.albumModel.countDocuments({ parentAlbumId: { $eq: parentId } });
      console.log(`Direct count with $eq for parentId ${parentId}: ${countWithEq} albums`);
      
      // Try finding all albums and logging their parentAlbumId values
      const allAlbums = await this.albumModel.find({}).select('_id alias parentAlbumId').limit(10).exec();
      console.log('Sample albums with parentAlbumId:', allAlbums.map(a => ({
        _id: a._id.toString(),
        alias: a.alias,
        parentAlbumId: a.parentAlbumId ? a.parentAlbumId.toString() : null,
        parentAlbumIdType: typeof a.parentAlbumId,
        parentAlbumIdConstructor: a.parentAlbumId ? a.parentAlbumId.constructor.name : null
      })));
      
      // Find the specific album we're looking for
      const targetParentId = parentId;
      const albumsWithParent = await this.albumModel.find({}).select('_id alias parentAlbumId').exec();
      const matchingAlbums = albumsWithParent.filter(a => {
        if (!a.parentAlbumId) return false;
        const parentStr = a.parentAlbumId.toString();
        return parentStr === targetParentId;
      });
      console.log(`Found ${matchingAlbums.length} albums with parentAlbumId matching ${targetParentId}:`, 
        matchingAlbums.map(a => ({
          _id: a._id.toString(),
          alias: a.alias,
          parentAlbumId: a.parentAlbumId ? a.parentAlbumId.toString() : null,
          parentAlbumIdType: typeof a.parentAlbumId
        }))
      );
      
      // Try querying with $or to match both string and ObjectId
      const orQuery = {
        $or: [
          { parentAlbumId: new Types.ObjectId(parentId) },
          { parentAlbumId: parentId },
          { parentAlbumId: { $eq: new Types.ObjectId(parentId) } }
        ]
      };
      const countWithOr = await this.albumModel.countDocuments(orQuery);
      console.log(`Count with $or query (ObjectId, string, $eq ObjectId): ${countWithOr} albums`);
    }

    return albums;
  }

  async findOneByIdOrAlias(idOrAlias: string) {
    let album;

    // Check if valid ObjectId
    if (idOrAlias.match(/^[0-9a-fA-F]{24}$/)) {
      album = await this.albumModel
        .findById(idOrAlias)
        .populate('coverPhotoId')
        .exec();
    }

    // If not found by ID, try alias
    if (!album) {
      album = await this.albumModel
        .findOne({ alias: idOrAlias })
        .populate('coverPhotoId')
        .exec();
    }

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    return album;
  }

  async findByAlias(alias: string) {
    const album = await this.albumModel
      .findOne({ alias })
      .populate('coverPhotoId')
      .exec();

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    return album;
  }

  async findPhotosByAlbumId(
    albumId: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    const query = { albumId, isPublished: true };

    const photos = await this.photoModel
      .find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('tags')
      .populate('people')
      .populate('location')
      .exec();

    const total = await this.photoModel.countDocuments(query);

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
}
