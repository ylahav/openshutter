import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IAlbum } from '../models/Album';
import { IPhoto } from '../models/Photo';
import { AlbumLeadingPhotoService } from '../services/album-leading-photo';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectModel('Album') private albumModel: Model<IAlbum>,
    @InjectModel('Photo') private photoModel: Model<IPhoto>,
    @InjectConnection() private connection: Connection,
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
        .select('+name +description') // Explicitly include name and description fields
        .populate('coverPhotoId')
        .lean() // Use lean() to get plain object and avoid schema type issues
        .exec();
    }

    // If not found by ID, try alias
    if (!album) {
      album = await this.albumModel
        .findOne({ alias: idOrAlias })
        .select('+name +description') // Explicitly include name and description fields
        .populate('coverPhotoId')
        .lean() // Use lean() to get plain object and avoid schema type issues
        .exec();
    }

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    // Debug log to see what we got
    console.log('findOneByIdOrAlias - album.name:', JSON.stringify(album.name));
    console.log('findOneByIdOrAlias - album keys:', Object.keys(album));

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

    // Convert albumId to ObjectId for proper query matching
    const albumObjectId = new Types.ObjectId(albumId);
    
    console.log('findPhotosByAlbumId - Querying photos for albumId:', albumId);
    console.log('findPhotosByAlbumId - albumObjectId:', albumObjectId.toString());

    let photos: any[] = [];
    let query: any = { albumId: albumObjectId, isPublished: true };
    
    // Try query with ObjectId first
    photos = await this.photoModel
      .find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('tags')
      .populate('people')
      .populate('location')
      .lean()
      .exec();

    console.log(`findPhotosByAlbumId - Query with ObjectId found ${photos.length} photos`);

    // If no results, try with string ID
    if (photos.length === 0) {
      console.log('findPhotosByAlbumId - Trying query with string ID...');
      query = { albumId: albumId, isPublished: true };
      photos = await this.photoModel
        .find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('tags')
        .populate('people')
        .populate('location')
        .lean()
        .exec();
      
      console.log(`findPhotosByAlbumId - Query with string ID found ${photos.length} photos`);
    }
    
    // If still no results, try native MongoDB query
    if (photos.length === 0 && this.connection.db) {
      console.log('findPhotosByAlbumId - Trying native MongoDB query...');
      const db = this.connection.db;
      const photosCollection = db.collection('photos');
      
      // Try with ObjectId
      const nativePhotos = await photosCollection
        .find({ 
          albumId: albumObjectId,
          isPublished: true 
        })
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      console.log(`findPhotosByAlbumId - Native MongoDB query (ObjectId) found ${nativePhotos.length} photos`);
      
      if (nativePhotos.length > 0) {
        // Convert native results and populate references manually if needed
        photos = nativePhotos.map((doc: any) => ({
          ...doc,
          _id: doc._id.toString(),
          albumId: doc.albumId?.toString(),
        }));
      } else {
        // Try with string
        const nativePhotosString = await photosCollection
          .find({ 
            albumId: albumId,
            isPublished: true 
          })
          .sort({ uploadedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
        
        console.log(`findPhotosByAlbumId - Native MongoDB query (string) found ${nativePhotosString.length} photos`);
        if (nativePhotosString.length > 0) {
          photos = nativePhotosString.map((doc: any) => ({
            ...doc,
            _id: doc._id.toString(),
            albumId: doc.albumId?.toString(),
          }));
        }
      }
    }

    // Get total count with the same query
    const total = await this.photoModel.countDocuments(query);
    console.log(`findPhotosByAlbumId - Total photos: ${total}`);

    // Ensure storage objects are properly serialized
    const serializedPhotos = photos.map((photo: any) => {
      const serialized: any = {
        ...photo,
        _id: photo._id.toString(),
        albumId: photo.albumId ? photo.albumId.toString() : null,
        // Preserve populated tag data (name) or return ID if not populated
        tags: photo.tags
          ? photo.tags.map((tag: any) => {
              if (tag && typeof tag === 'object' && tag._id) {
                // Populated tag object
                return {
                  _id: tag._id.toString(),
                  name: tag.name || {}
                };
              }
              // Just an ID
              return tag.toString();
            })
          : [],
        // Preserve populated people data (fullName, firstName) or return ID if not populated
        people: photo.people
          ? photo.people.map((person: any) => {
              if (person && typeof person === 'object' && person._id) {
                // Populated person object
                return {
                  _id: person._id.toString(),
                  fullName: person.fullName || {},
                  firstName: person.firstName || {}
                };
              }
              // Just an ID
              return person.toString();
            })
          : [],
        // Preserve populated location data (name) or return ID if not populated
        location: photo.location
          ? photo.location._id || (typeof photo.location === 'object' && photo.location._id)
            ? {
                _id: (photo.location._id || photo.location).toString(),
                name: photo.location.name || {}
              }
            : photo.location.toString()
          : null,
      };

      // Ensure storage object is properly preserved
      if (photo.storage) {
        serialized.storage = {
          provider: photo.storage.provider || 'local',
          fileId: photo.storage.fileId || '',
          url: photo.storage.url || '',
          path: photo.storage.path || '',
          thumbnailPath: photo.storage.thumbnailPath || photo.storage.url || '',
          thumbnails: photo.storage.thumbnails || {},
          blurDataURL: photo.storage.blurDataURL,
          bucket: photo.storage.bucket,
          folderId: photo.storage.folderId,
        };
      }

      return serialized;
    });

    return {
      photos: serializedPhotos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get complete album data including sub-albums and photos
   */
  async getAlbumData(idOrAlias: string, page = 1, limit = 50) {
    // Get the album
    const album = await this.findOneByIdOrAlias(idOrAlias);
    if (!album) {
      throw new NotFoundException('Album not found');
    }

    const albumId = album._id.toString();
    const albumObjectId = new Types.ObjectId(albumId);

    // Get sub-albums - try multiple query approaches
    console.log('getAlbumData - Querying sub-albums for albumId:', albumId);
    console.log('getAlbumData - albumObjectId:', albumObjectId.toString());
    
    // First, let's check what parentAlbumId values actually exist in the database
    // Find a few albums to see their parentAlbumId structure
    const sampleAlbums = await this.albumModel
      .find({})
      .limit(10)
      .select('_id alias parentAlbumId')
      .lean()
      .exec();
    
    console.log('getAlbumData - Sample albums with parentAlbumId:', 
      sampleAlbums.map((a: any) => ({
        _id: a._id?.toString(),
        alias: a.alias,
        parentAlbumId: a.parentAlbumId,
        parentAlbumIdType: typeof a.parentAlbumId,
        parentAlbumIdString: a.parentAlbumId?.toString(),
        parentAlbumIdMatches: a.parentAlbumId?.toString() === albumId
      }))
    );
    
    // Try querying with native MongoDB collection to bypass Mongoose type conversion
    console.log('getAlbumData - Trying native MongoDB query...');
    const db = this.connection.db;
    
    let subAlbums: any[] = [];
    
    if (db) {
      const albumsCollection = db.collection('albums');
      
      // Try query with string ID first
      console.log('getAlbumData - Native query with string ID:', albumId);
      const nativeQueryString = await albumsCollection
        .find({ 
          parentAlbumId: albumId,
          isPublic: true 
        })
        .sort({ order: 1 })
        .toArray();
      
      console.log(`getAlbumData - Native MongoDB query (string) found ${nativeQueryString.length} sub-albums`);
      
      // Try query with ObjectId
      if (nativeQueryString.length === 0) {
        console.log('getAlbumData - Native query with ObjectId:', albumObjectId.toString());
        const nativeQueryObjectId = await albumsCollection
          .find({ 
            parentAlbumId: albumObjectId,
            isPublic: true 
          })
          .sort({ order: 1 })
          .toArray();
        
        console.log(`getAlbumData - Native MongoDB query (ObjectId) found ${nativeQueryObjectId.length} sub-albums`);
        
        if (nativeQueryObjectId.length > 0) {
          subAlbums = nativeQueryObjectId.map((doc: any) => {
            const result: any = {
              ...doc,
              _id: doc._id.toString(),
            };
            if (doc.parentAlbumId) {
              result.parentAlbumId = doc.parentAlbumId.toString();
            }
            if (doc.coverPhotoId) {
              result.coverPhotoId = doc.coverPhotoId.toString();
            }
            return result;
          });
        }
      } else {
        subAlbums = nativeQueryString.map((doc: any) => {
          const result: any = {
            ...doc,
            _id: doc._id.toString(),
          };
          if (doc.parentAlbumId) {
            result.parentAlbumId = doc.parentAlbumId.toString();
          }
          if (doc.coverPhotoId) {
            result.coverPhotoId = doc.coverPhotoId.toString();
          }
          return result;
        });
      }
      
      console.log(`getAlbumData - Final sub-albums count: ${subAlbums.length}`);
      if (subAlbums.length > 0) {
        console.log('getAlbumData - Sub-albums:', subAlbums.map((a: any) => ({
          _id: a._id,
          alias: a.alias,
          name: a.name,
          isPublic: a.isPublic
        })));
      }
    } else {
      console.log('getAlbumData - Database connection not available, falling back to Mongoose query');
      // Fallback to Mongoose query
      const mongooseResults = await this.albumModel
        .find({ parentAlbumId: albumObjectId, isPublic: true })
        .select('+name +description')
        .sort({ order: 1 })
        .lean()
        .exec();
      
      console.log(`getAlbumData - Mongoose ObjectId query found ${mongooseResults.length} sub-albums`);
      subAlbums = mongooseResults;
    }
    
    console.log(`getAlbumData - Final result: ${subAlbums.length} sub-albums`);
    if (subAlbums.length > 0) {
      console.log('getAlbumData - First sub-album:', {
        _id: subAlbums[0]._id?.toString(),
        name: subAlbums[0].name,
        alias: subAlbums[0].alias,
        parentAlbumId: subAlbums[0].parentAlbumId?.toString(),
        isPublic: subAlbums[0].isPublic
      });
    }

    // Get photos
    console.log('getAlbumData - Fetching photos for albumId:', albumId);
    const photosData = await this.findPhotosByAlbumId(albumId, page, limit);
    console.log(`getAlbumData - Received ${photosData.photos.length} photos`);

    // Serialize album (album is already a plain object from lean())
    const serializedAlbum: any = {
      ...album,
      _id: album._id.toString(),
      parentAlbumId: album.parentAlbumId ? album.parentAlbumId.toString() : null,
      coverPhotoId: album.coverPhotoId ? (album.coverPhotoId._id ? album.coverPhotoId._id.toString() : album.coverPhotoId.toString()) : null,
    };
    
    // Debug log to see what we're returning
    console.log('getAlbumData - serializedAlbum.name:', JSON.stringify(serializedAlbum.name));
    console.log('getAlbumData - serializedAlbum.name type:', typeof serializedAlbum.name);
    console.log('getAlbumData - serializedAlbum keys:', Object.keys(serializedAlbum));

    // Serialize sub-albums
    const serializedSubAlbums = subAlbums.map((subAlbum: any) => ({
      ...subAlbum,
      _id: subAlbum._id.toString(),
      parentAlbumId: subAlbum.parentAlbumId ? subAlbum.parentAlbumId.toString() : null,
      coverPhotoId: subAlbum.coverPhotoId ? (subAlbum.coverPhotoId._id ? subAlbum.coverPhotoId._id.toString() : subAlbum.coverPhotoId.toString()) : null,
    }));

    return {
      album: serializedAlbum,
      subAlbums: serializedSubAlbums,
      photos: photosData.photos,
      pagination: photosData.pagination,
    };
  }

  /**
   * Get album cover image
   * Returns the leading photo URL or site logo
   */
  async getAlbumCoverImage(albumId: string) {
    const result = await AlbumLeadingPhotoService.getAlbumLeadingPhoto(albumId);
    const coverImageUrl = await AlbumLeadingPhotoService.getAlbumCoverImageUrl(albumId);
    
    return {
      url: coverImageUrl,
      source: result.source,
      albumId: result.albumId,
      photoId: result.photo?._id?.toString() || null
    };
  }

  /**
   * Get cover images for multiple albums
   * Returns a map of albumId -> cover image URL
   */
  async getMultipleAlbumCoverImages(albumIds: string[]): Promise<Record<string, string>> {
    const coverImageUrls = await AlbumLeadingPhotoService.getMultipleAlbumCoverImageUrls(albumIds);
    const result: Record<string, string> = {};
    
    for (const [albumId, url] of coverImageUrls) {
      result[albumId] = url;
    }
    
    return result;
  }
}
