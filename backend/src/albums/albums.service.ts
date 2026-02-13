import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IAlbum } from '../models/Album';
import { IPhoto } from '../models/Photo';
import { AlbumLeadingPhotoService } from '../services/album-leading-photo';
import { StorageManager } from '../services/storage/manager';

/** When present, used to include private albums the user is allowed to see (creator, allowedUsers, allowedGroups). */
export interface AlbumAccessContext {
  userId: string;
  groupAliases: string[];
}

@Injectable()
export class AlbumsService {
  private readonly logger = new Logger(AlbumsService.name);
  
  constructor(
    @InjectModel('Album') private albumModel: Model<IAlbum>,
    @InjectModel('Photo') private photoModel: Model<IPhoto>,
    @InjectModel('Person') private personModel: Model<any>,
    @InjectConnection() private connection: Connection,
  ) {}

  /** Condition: album has no group/user restrictions (unrestricted). */
  private noRestrictionsCondition(): any {
    return {
      $and: [
        { $or: [{ allowedGroups: { $exists: false } }, { allowedGroups: [] }, { allowedGroups: { $size: 0 } }] },
        { $or: [{ allowedUsers: { $exists: false } }, { allowedUsers: [] }, { allowedUsers: { $size: 0 } }] },
      ],
    };
  }

  /**
   * Public visibility condition for album queries (e.g. used by search to filter by access).
   * Rules:
   * 1. Album must be published
   * 2. When not logged in: only public albums
   * 3. When logged in: public albums OR private albums where user matches groups/users rules
   */
  getVisibilityCondition(accessContext: AlbumAccessContext | null | undefined): any {
    return this.buildVisibilityCondition(accessContext);
  }

  /**
   * Build visibility condition for album queries.
   * Rules:
   * 1. Album must be published
   * 2. If public: visible to everyone
   * 3. If private: only visible if user is logged in AND matches groups/users rules
   */
  private buildVisibilityCondition(accessContext: AlbumAccessContext | null | undefined): any {
    // Published condition: isPublished === true OR isPublished doesn't exist (defaults to true)
    const isPublishedCondition = {
      $or: [
        { isPublished: true },
        { isPublished: { $exists: false } }
      ]
    };
    
    // Public albums: published (or missing, defaults to true) + public
    const publicAlbums = {
      $and: [
        isPublishedCondition,
        { isPublic: true }
      ]
    };
    
    // For non-logged-in users: only public albums
    if (!accessContext) {
      return publicAlbums;
    }
    
    // For logged-in users: public albums OR private albums where user matches rules
    const userId = new Types.ObjectId(accessContext.userId);
    const groupAliases = accessContext.groupAliases || [];
    
    // Build the $or conditions array
    const orConditions: any[] = [
      // Always include public albums
      publicAlbums,
      // Private albums: only visible if user is in allowedUsers
      { 
        $and: [
          isPublishedCondition,
          { isPublic: false },
          { allowedUsers: userId }
        ]
      },
    ];
    
    // Add group-based access if user has groups
    if (groupAliases.length > 0) {
      orConditions.push({
        $and: [
          isPublishedCondition,
          { isPublic: false },
          { allowedGroups: { $in: groupAliases } }
        ]
      });
    }
    
    const condition = {
      $or: orConditions,
    };
    
    this.logger.debug(`buildVisibilityCondition for user ${accessContext.userId}:`, JSON.stringify(condition, null, 2));
    
    return condition;
  }

  /** Return true if the album has no group/user restrictions. */
  private albumHasNoRestrictions(album: any): boolean {
    const groups = album.allowedGroups;
    const users = album.allowedUsers;
    const noGroups = !groups || !Array.isArray(groups) || groups.length === 0;
    const noUsers = !users || !Array.isArray(users) || users.length === 0;
    return noGroups && noUsers;
  }

  /**
   * Return true if the album is visible to the current context.
   * Rules:
   * 1. Album must be published
   * 2. If public: visible to everyone
   * 3. If private: only visible if user is logged in AND matches groups/users rules
   */
  private canAccessAlbum(album: any, accessContext: AlbumAccessContext | null | undefined): boolean {
    // Rule 1: Must be published (or missing, defaults to true)
    // If isPublished doesn't exist, treat as true (default)
    if (album.isPublished !== undefined && !album.isPublished) return false;
    
    // Rule 2: Public albums are visible to everyone
    if (album.isPublic) return true;
    
    // Rule 3: Private albums require logged-in user AND matching rules
    if (!accessContext) return false;
    
    // Check if user is in allowedUsers
    const allowedUsers = album.allowedUsers || [];
    if (allowedUsers.some((u: any) => (u?.toString?.() ?? u) === accessContext.userId)) return true;
    
    // Check if user's groups match allowedGroups
    const allowedGroups = album.allowedGroups || [];
    const userGroups = accessContext.groupAliases || [];
    if (allowedGroups.some((g: string) => userGroups.includes(g))) return true;
    
    return false;
  }

  /**
   * Create a new album (used by both owner and admin create flows).
   * Validates input, creates storage folder, inserts album record.
   */
  async createAlbum(createData: any, userId: string): Promise<{ success: true; data: any }> {
    const db = this.connection.db;
    if (!db) {
      throw new InternalServerErrorException('Database connection not established');
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user context for album creation');
    }

    if (!createData.name || !createData.alias) {
      throw new BadRequestException('Name and alias are required');
    }
    if (!createData.storageProvider) {
      throw new BadRequestException('Storage provider is required');
    }
    const validProviders = ['google-drive', 'aws-s3', 'local', 'backblaze', 'wasabi'];
    if (!validProviders.includes(createData.storageProvider)) {
      throw new BadRequestException(`Invalid storage provider: ${createData.storageProvider}`);
    }

    let parentAlbum: any = null;
    let parentPath = '';
    let level = 0;

    if (createData.parentAlbumId && createData.parentAlbumId !== '' && createData.parentAlbumId !== 'null') {
      try {
        const parentObjectId = new Types.ObjectId(createData.parentAlbumId);
        parentAlbum = await db.collection('albums').findOne({ _id: parentObjectId });
        if (!parentAlbum) {
          throw new NotFoundException(`Parent album not found: ${createData.parentAlbumId}`);
        }
        parentPath = parentAlbum.storagePath || '';
        level = (parentAlbum.level || 0) + 1;
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new BadRequestException(`Invalid parent album ID: ${createData.parentAlbumId}`);
      }
    }

    const storagePath = parentPath ? `${parentPath}/${createData.alias}` : `/${createData.alias}`;

    const existingAlbum = await db.collection('albums').findOne({ alias: createData.alias.toLowerCase() });
    if (existingAlbum) {
      throw new BadRequestException(`Album with alias "${createData.alias}" already exists`);
    }

    const storageManager = StorageManager.getInstance();
    try {
      await storageManager.createAlbum(
        createData.name,
        createData.alias,
        createData.storageProvider as any,
        parentPath || undefined
      );
      this.logger.debug('Storage folder created for album:', createData.alias);

      if (createData.storageProvider === 'google-drive' && storagePath) {
        try {
          const { ThumbnailGenerator } = await import('../services/thumbnail-generator');
          const storageService = await storageManager.getProvider(createData.storageProvider as any);
          const thumbnailSizes = ['hero', 'large', 'medium', 'small', 'micro'];
          for (const sizeName of thumbnailSizes) {
            try {
              const sizeConfig = ThumbnailGenerator.getThumbnailSize(sizeName as any);
              await storageService.createFolder(sizeConfig.folder, storagePath);
            } catch (folderError: any) {
              if (!folderError.message?.includes('already exists')) {
                this.logger.warn(`Failed to create thumbnail folder ${sizeName}:`, folderError.message);
              }
            }
          }
        } catch (thumbnailError: any) {
          this.logger.warn('Failed to create thumbnail folders:', (thumbnailError as Error).message);
        }
      }
    } catch (storageError: any) {
      this.logger.error('Failed to create storage folder:', storageError);
      throw new BadRequestException(
        `Failed to create storage folder: ${storageError.message || 'Unknown error'}`
      );
    }

    const parentIdForQuery = parentAlbum ? parentAlbum._id : null;
    const maxOrderResult = await db
      .collection('albums')
      .find({ parentAlbumId: parentIdForQuery })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderResult.length > 0 ? (maxOrderResult[0].order || 0) + 1 : 0;

    const albumData: any = {
      name: createData.name,
      alias: createData.alias.toLowerCase().trim(),
      description: createData.description || '',
      isPublic: createData.isPublic !== undefined ? createData.isPublic : false,
      isPublished: createData.isPublished !== undefined ? createData.isPublished : true,
      isFeatured: createData.isFeatured !== undefined ? createData.isFeatured : false,
      storageProvider: createData.storageProvider,
      storagePath,
      parentAlbumId: parentAlbum ? parentAlbum._id : null,
      parentPath,
      level,
      order: maxOrder,
      photoCount: 0,
      createdBy: new Types.ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      allowedGroups: [],
      allowedUsers: [],
    };

    const result = await db.collection('albums').insertOne(albumData);
    if (!result.insertedId) {
      throw new InternalServerErrorException('Failed to create album');
    }

    const createdAlbum = await db.collection('albums').findOne({ _id: result.insertedId });
    if (!createdAlbum) {
      throw new InternalServerErrorException('Album was created but could not be retrieved');
    }

    const serialized: any = {
      ...createdAlbum,
      _id: createdAlbum._id.toString(),
      createdBy: createdAlbum.createdBy?.toString() || null,
      parentAlbumId: createdAlbum.parentAlbumId?.toString() || null,
      coverPhotoId: createdAlbum.coverPhotoId?.toString() || null,
      tags: createdAlbum.tags?.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString())) || [],
    };

    return { success: true, data: serialized };
  }

  async findAll(
    parentId?: string,
    level?: string,
    accessContext?: AlbumAccessContext | null,
    mineOnly = false,
  ) {
    // When mine=true: only albums created by the current user; require auth
    if (mineOnly) {
      if (!accessContext?.userId) {
        return [];
      }
      try {
        const createdByMe = new Types.ObjectId(accessContext.userId);
        const query: any = { $and: [{ createdBy: createdByMe }] };
        if (parentId === 'root' || parentId === 'null') {
          query.$and.push({ parentAlbumId: null });
        } else if (parentId && parentId !== 'root' && parentId !== 'null') {
          if (!Types.ObjectId.isValid(parentId)) {
            this.logger.warn(`Invalid parentId format: ${parentId}`);
            return [];
          }
          query.$and.push({ parentAlbumId: parentId });
        }
        if (level !== undefined) {
          const levelNum = parseInt(level, 10);
          if (!isNaN(levelNum)) query.$and.push({ level: levelNum });
        }
        const albums = await this.albumModel
          .find(query)
          .sort({ order: 1, createdAt: -1 })
          .populate('coverPhotoId')
          .exec();
        return albums as any;
      } catch {
        return [];
      }
    }

    const visibility = this.buildVisibilityCondition(accessContext);
    
    // Build base query conditions
    const baseConditions: any[] = [visibility];
    
    if (parentId === 'root' || parentId === 'null') {
      baseConditions.push({ parentAlbumId: null });
    } else if (parentId) {
      if (!Types.ObjectId.isValid(parentId)) {
        this.logger.warn(`Invalid parentId format: ${parentId}`);
        return [];
      }
      baseConditions.push({ parentAlbumId: new Types.ObjectId(parentId) });
    }

    if (level !== undefined) {
      const levelNum = parseInt(level, 10);
      if (!isNaN(levelNum)) {
        baseConditions.push({ level: levelNum });
      }
    }

    const query: any = baseConditions.length === 1 ? baseConditions[0] : { $and: baseConditions };

    // Log query with better ObjectId representation
    const queryLog = JSON.parse(JSON.stringify(query, (key, value) => {
      if (value instanceof Types.ObjectId) {
        return value.toString();
      }
      return value;
    }));
    this.logger.debug(`AlbumsService.findAll query: ${JSON.stringify(queryLog, null, 2)}`);
    this.logger.debug(`AlbumsService.findAll visibility condition: ${JSON.stringify(visibility, null, 2)}`);

    // Try the query - if parentAlbumId is an ObjectId, Mongoose should match it correctly
    let albums = await this.albumModel
      .find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate('coverPhotoId')
      .exec();

    this.logger.debug(`AlbumsService.findAll found ${albums.length} albums for parentId: ${parentId}`);
    this.logger.debug(`AlbumsService.findAll accessContext: ${accessContext ? `userId=${accessContext.userId}, groups=${accessContext.groupAliases?.join(',') || 'none'}` : 'null (not logged in)'}`);
    if (albums.length > 0) {
      this.logger.debug(
        `Sample album from query: ${JSON.stringify(
          {
            _id: albums[0]._id?.toString(),
            alias: albums[0].alias,
            name: albums[0].name,
            isPublished: albums[0].isPublished,
            isPublic: albums[0].isPublic,
            parentAlbumId: albums[0].parentAlbumId?.toString() || null,
          },
          null,
          2,
        )}`,
      );
    } else {
      this.logger.warn(`AlbumsService.findAll: No albums found. Query: ${JSON.stringify(queryLog, null, 2)}`);
      // Debug: Check if there are any albums at all
      const totalAlbums = await this.albumModel.countDocuments({});
      const publishedPublicAlbums = await this.albumModel.countDocuments({ isPublished: true, isPublic: true });
      const rootAlbums = await this.albumModel.countDocuments({ parentAlbumId: null });
      const rootPublishedPublicAlbums = await this.albumModel.countDocuments({ parentAlbumId: null, isPublished: true, isPublic: true });
      
      // Check root albums details
      const rootAlbumsList = await this.albumModel.find({ parentAlbumId: null }).select('_id alias name isPublished isPublic').lean().exec();
      this.logger.debug(`AlbumsService.findAll debug counts: total=${totalAlbums}, published+public=${publishedPublicAlbums}, root=${rootAlbums}, root+published+public=${rootPublishedPublicAlbums}`);
      this.logger.debug(`AlbumsService.findAll root albums details: ${JSON.stringify(rootAlbumsList.map(a => ({
        _id: a._id?.toString(),
        alias: a.alias,
        name: a.name,
        isPublished: a.isPublished,
        isPublic: a.isPublic
      })), null, 2)}`);
      
      // If logged in, check private albums user can access
      if (accessContext) {
        const userIdObj = new Types.ObjectId(accessContext.userId);
        const rootPrivateWithUserAccess = await this.albumModel.countDocuments({
          parentAlbumId: null,
          isPublished: true,
          isPublic: false,
          allowedUsers: userIdObj
        });
        const rootPrivateWithGroupAccess = accessContext.groupAliases?.length > 0
          ? await this.albumModel.countDocuments({
              parentAlbumId: null,
              isPublished: true,
              isPublic: false,
              allowedGroups: { $in: accessContext.groupAliases }
            })
          : 0;
        this.logger.debug(`AlbumsService.findAll private access counts: root+private+user=${rootPrivateWithUserAccess}, root+private+group=${rootPrivateWithGroupAccess}`);
      }
    }
    
    // If no results and we have a parentId, try alternative query approaches
    if (albums.length === 0 && parentId && parentId !== 'root' && parentId !== 'null') {
      this.logger.debug('Trying alternative query approaches...');
      
      // Try 1: Query with string (Mongoose auto-converts)
      const altQuery1 = { ...query };
      altQuery1.parentAlbumId = parentId;
      albums = await this.albumModel
        .find(altQuery1)
        .sort({ order: 1, createdAt: -1 })
        .populate('coverPhotoId')
        .exec();
      this.logger.debug(`Alternative query 1 (string) found ${albums.length} albums`);
      
      // Try 2: Use $in operator
      if (albums.length === 0) {
        const altQuery2 = { ...query };
        altQuery2.parentAlbumId = { $in: [new Types.ObjectId(parentId), parentId] };
        albums = await this.albumModel
          .find(altQuery2)
          .sort({ order: 1, createdAt: -1 })
          .populate('coverPhotoId')
          .exec();
        this.logger.debug(`Alternative query 2 ($in) found ${albums.length} albums`);
      }
      
      // Try 3: Find all matching visibility and filter by parentId manually (fallback)
      if (albums.length === 0) {
        this.logger.debug('Using manual filter as fallback...');
        const allAlbums = await this.albumModel
          .find(visibility)
          .sort({ order: 1, createdAt: -1 })
          .populate('coverPhotoId')
          .exec();
        albums = allAlbums.filter(a => {
          if (!a.parentAlbumId) return false;
          return a.parentAlbumId.toString() === parentId;
        });
        this.logger.debug(`Manual filter found ${albums.length} albums`);
      }
    }
    
    // Debug: Try multiple query formats to diagnose the issue
    if (parentId && parentId !== 'root' && parentId !== 'null') {
      const countWithObjectId = await this.albumModel.countDocuments({ parentAlbumId: new Types.ObjectId(parentId) });
      this.logger.debug(`Direct count with ObjectId for parentId ${parentId}: ${countWithObjectId} albums`);
      
      // Also try as string (Mongoose should auto-convert)
      const countWithString = await this.albumModel.countDocuments({ parentAlbumId: parentId });
      this.logger.debug(`Direct count with string for parentId ${parentId}: ${countWithString} albums`);
      
      // Try with $eq operator
      const countWithEq = await this.albumModel.countDocuments({ parentAlbumId: { $eq: parentId } });
      this.logger.debug(`Direct count with $eq for parentId ${parentId}: ${countWithEq} albums`);
      
      // Try finding all albums and logging their parentAlbumId values
      const allAlbums = await this.albumModel
        .find({})
        .select('_id alias parentAlbumId')
        .limit(10)
        .exec();
      this.logger.debug(
        `Sample albums with parentAlbumId: ${JSON.stringify(
          allAlbums.map((a) => ({
            _id: a._id.toString(),
            alias: a.alias,
            parentAlbumId: a.parentAlbumId ? a.parentAlbumId.toString() : null,
            parentAlbumIdType: typeof a.parentAlbumId,
            parentAlbumIdConstructor: a.parentAlbumId ? a.parentAlbumId.constructor.name : null,
          })),
        )}`,
      );
      
      // Find the specific album we're looking for
      const targetParentId = parentId;
      const albumsWithParent = await this.albumModel.find({}).select('_id alias parentAlbumId').exec();
      const matchingAlbums = albumsWithParent.filter((a) => {
        if (!a.parentAlbumId) return false;
        const parentStr = a.parentAlbumId.toString();
        return parentStr === targetParentId;
      });
      this.logger.debug(
        `Found ${matchingAlbums.length} albums with parentAlbumId matching ${targetParentId}: ${JSON.stringify(
          matchingAlbums.map((a) => ({
            _id: a._id.toString(),
            alias: a.alias,
            parentAlbumId: a.parentAlbumId ? a.parentAlbumId.toString() : null,
            parentAlbumIdType: typeof a.parentAlbumId,
          })),
        )}`,
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
      this.logger.debug(`Count with $or query (ObjectId, string, $eq ObjectId): ${countWithOr} albums`      );
    }
    
    // Calculate childAlbumCount for each album (same visibility as list)
    const albumsWithChildCount = await Promise.all(
      albums.map(async (album) => {
        const childQuery = {
          $and: [
            { parentAlbumId: album._id },
            visibility
          ]
        };
        const childCount = await this.albumModel.countDocuments(childQuery);
        const albumObj = album.toObject ? album.toObject() : (album as any);
        return {
          ...albumObj,
          _id: albumObj._id?.toString(),
          parentAlbumId: albumObj.parentAlbumId?.toString() || null,
          coverPhotoId: albumObj.coverPhotoId?._id?.toString() || albumObj.coverPhotoId?.toString() || null,
          childAlbumCount: childCount,
        };
      })
    );
    
    return albumsWithChildCount;
  }

  async findOneByIdOrAlias(idOrAlias: string, accessContext?: AlbumAccessContext | null) {
    let album: any;

    if (idOrAlias.match(/^[0-9a-fA-F]{24}$/)) {
      album = await this.albumModel
        .findById(idOrAlias)
        .select('+name +description')
        .populate('coverPhotoId')
        .lean()
        .exec();
    }

    if (!album) {
      album = await this.albumModel
        .findOne({ alias: idOrAlias })
        .select('+name +description')
        .populate('coverPhotoId')
        .lean()
        .exec();
    }

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    if (!this.canAccessAlbum(album, accessContext)) {
      throw new ForbiddenException('Access denied');
    }

    this.logger.debug(`findOneByIdOrAlias - album.name: ${JSON.stringify(album.name)}`);
    this.logger.debug(`findOneByIdOrAlias - album keys: ${JSON.stringify(Object.keys(album))}`);

    return album;
  }

  async findByAlias(alias: string, accessContext?: AlbumAccessContext | null) {
    const album = await this.albumModel
      .findOne({ alias })
      .populate('coverPhotoId')
      .lean()
      .exec();

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    if (!this.canAccessAlbum(album, accessContext)) {
      throw new ForbiddenException('Access denied');
    }

    return album;
  }

  async findPhotosByAlbumId(
    albumId: string,
    page = 1,
    limit = 50,
    accessContext?: AlbumAccessContext | null,
  ) {
    const album = await this.albumModel.findById(albumId).lean().exec();
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    if (!this.canAccessAlbum(album, accessContext)) {
      throw new ForbiddenException('Access denied');
    }

    const skip = (page - 1) * limit;
    const albumObjectId = new Types.ObjectId(albumId);

    // Album creator (owner) sees all photos including unpublished; others only published
    const createdByStr = album.createdBy?.toString?.() ?? album.createdBy;
    const isCreator = !!(accessContext?.userId && createdByStr === accessContext.userId);
    const publishedFilter = isCreator ? {} : { isPublished: true };

    this.logger.debug(`findPhotosByAlbumId - Querying photos for albumId: ${albumId}, isCreator: ${isCreator}`);
    this.logger.debug(`findPhotosByAlbumId - albumObjectId: ${albumObjectId.toString()}`);

    let photos: any[] = [];
    let query: any = { albumId: albumObjectId, ...publishedFilter };
    
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

    this.logger.debug(`findPhotosByAlbumId - Query with ObjectId found ${photos.length} photos`);

    // If no results, try with string ID
    if (photos.length === 0) {
      this.logger.debug('findPhotosByAlbumId - Trying query with string ID...');
      query = { albumId: albumId, ...publishedFilter };
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
      
      this.logger.debug(`findPhotosByAlbumId - Query with string ID found ${photos.length} photos`);
    }
    
    // If still no results, try native MongoDB query
    if (photos.length === 0 && this.connection.db) {
      this.logger.debug('findPhotosByAlbumId - Trying native MongoDB query...');
      const db = this.connection.db;
      const photosCollection = db.collection('photos');
      
      // Try with ObjectId
      const nativePhotos = await photosCollection
        .find({ 
          albumId: albumObjectId,
          ...publishedFilter 
        })
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      this.logger.debug(`findPhotosByAlbumId - Native MongoDB query (ObjectId) found ${nativePhotos.length} photos`);
      
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
            ...publishedFilter 
          })
          .sort({ uploadedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
        
        this.logger.debug(`findPhotosByAlbumId - Native MongoDB query (string) found ${nativePhotosString.length} photos`);
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
    this.logger.debug(`findPhotosByAlbumId - Total photos: ${total}`);

    // Manually populate people if they're just ObjectIds
    // Collect all person IDs that need to be populated
    const personIdsToFetch = new Set<string>();
    photos.forEach((photo: any) => {
      if (photo.people && Array.isArray(photo.people)) {
        photo.people.forEach((person: any) => {
          // If it's just an ObjectId (not populated), add it to the set
          if (person && typeof person === 'object' && person._id) {
            // Check if it's populated (has fullName or firstName)
            if (!person.fullName && !person.firstName) {
              personIdsToFetch.add(person._id.toString());
            }
          } else if (Types.ObjectId.isValid(person)) {
            personIdsToFetch.add(person.toString());
          } else if (typeof person === 'string' && Types.ObjectId.isValid(person)) {
            personIdsToFetch.add(person);
          }
        });
      }
    });

    // Fetch all people data at once
    let peopleMap = new Map<string, any>();
    if (personIdsToFetch.size > 0) {
      const personObjectIds = Array.from(personIdsToFetch).map(id => new Types.ObjectId(id));
      const people = await this.personModel
        .find({ _id: { $in: personObjectIds } })
        .lean()
        .exec();
      
      people.forEach((person: any) => {
        peopleMap.set(person._id.toString(), person);
      });
      this.logger.debug(`findPhotosByAlbumId - Manually fetched ${people.length} people for population`);
    }

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
        // Preserve populated people data (fullName, firstName) or manually populate if needed
        people: photo.people
          ? photo.people.map((person: any) => {
              let personData: any = null;
              
              // Check if it's already populated
              if (person && typeof person === 'object' && person._id) {
                if (person.fullName || person.firstName) {
                  // Already populated
                  personData = person;
                } else {
                  // Has _id but not populated, try to fetch from map
                  const personId = person._id.toString();
                  personData = peopleMap.get(personId);
                }
              } else if (Types.ObjectId.isValid(person)) {
                // Just an ObjectId, fetch from map
                const personId = person.toString();
                personData = peopleMap.get(personId);
              } else if (typeof person === 'string' && Types.ObjectId.isValid(person)) {
                // String ObjectId, fetch from map
                personData = peopleMap.get(person);
              }
              
              // Return populated data or fallback to ID
              if (personData) {
                return {
                  _id: personData._id.toString(),
                  fullName: personData.fullName || {},
                  firstName: personData.firstName || {}
                };
              }
              
              // Fallback: return as string ID
              return person && typeof person === 'object' && person._id 
                ? person._id.toString() 
                : person.toString();
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
  async getAlbumData(idOrAlias: string, page = 1, limit = 50, accessContext?: AlbumAccessContext | null) {
    const album = await this.findOneByIdOrAlias(idOrAlias, accessContext);
    if (!album) {
      throw new NotFoundException('Album not found');
    }

    const albumId = album._id.toString();
    const albumObjectId = new Types.ObjectId(albumId);
    const subVisibility = this.buildVisibilityCondition(accessContext);

    // Get sub-albums - try multiple query approaches
    this.logger.debug(`getAlbumData - Querying sub-albums for albumId: ${albumId}`);
    this.logger.debug(`getAlbumData - albumObjectId: ${albumObjectId.toString()}`);
    
    // First, let's check what parentAlbumId values actually exist in the database
    // Find a few albums to see their parentAlbumId structure
    const sampleAlbums = await this.albumModel
      .find({})
      .limit(10)
      .select('_id alias parentAlbumId')
      .lean()
      .exec();
    
    this.logger.debug(
      `getAlbumData - Sample albums with parentAlbumId: ${JSON.stringify(
        sampleAlbums.map((a: any) => ({
          _id: a._id?.toString(),
          alias: a.alias,
          parentAlbumId: a.parentAlbumId,
          parentAlbumIdType: typeof a.parentAlbumId,
          parentAlbumIdString: a.parentAlbumId?.toString(),
          parentAlbumIdMatches: a.parentAlbumId?.toString() === albumId,
        })),
      )}`,
    );
    
    // Try querying with native MongoDB collection to bypass Mongoose type conversion
    this.logger.debug('getAlbumData - Trying native MongoDB query...');
    const db = this.connection.db;
    
    let subAlbums: any[] = [];
    
    if (db) {
      const albumsCollection = db.collection('albums');
      
      // Build query with $and to properly combine parentAlbumId with visibility conditions
      const queryWithString = {
        $and: [
          { parentAlbumId: albumId },
          subVisibility
        ]
      };
      const queryWithObjectId = {
        $and: [
          { parentAlbumId: albumObjectId },
          subVisibility
        ]
      };
      
      // Try query with string ID first
      this.logger.debug('getAlbumData - Native query with string ID:', albumId);
      const nativeQueryString = await albumsCollection
        .find(queryWithString)
        .sort({ order: 1 })
        .toArray();
      
      this.logger.debug(`getAlbumData - Native MongoDB query (string) found ${nativeQueryString.length} sub-albums`);
      
      // Try query with ObjectId
      if (nativeQueryString.length === 0) {
        this.logger.debug('getAlbumData - Native query with ObjectId:', albumObjectId.toString());
        const nativeQueryObjectId = await albumsCollection
          .find(queryWithObjectId)
          .sort({ order: 1 })
          .toArray();
        
        this.logger.debug(`getAlbumData - Native MongoDB query (ObjectId) found ${nativeQueryObjectId.length} sub-albums`);
        
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
      
      this.logger.debug(`getAlbumData - Final sub-albums count: ${subAlbums.length}`);
      if (subAlbums.length > 0) {
        this.logger.debug('getAlbumData - Sub-albums:', subAlbums.map((a: any) => ({
          _id: a._id,
          alias: a.alias,
          name: a.name,
          isPublic: a.isPublic
        })));
      }
    } else {
      this.logger.debug('getAlbumData - Database connection not available, falling back to Mongoose query');
      // Fallback to Mongoose query - use $and to properly combine conditions
      const mongooseQuery = {
        $and: [
          { parentAlbumId: albumObjectId },
          subVisibility
        ]
      };
      const mongooseResults = await this.albumModel
        .find(mongooseQuery)
        .select('+name +description')
        .sort({ order: 1 })
        .lean()
        .exec();
      
      this.logger.debug(`getAlbumData - Mongoose ObjectId query found ${mongooseResults.length} sub-albums`);
      subAlbums = mongooseResults;
    }
    
    this.logger.debug(`getAlbumData - Final result: ${subAlbums.length} sub-albums`);
    if (subAlbums.length > 0) {
      this.logger.debug(
        `getAlbumData - First sub-album: ${JSON.stringify({
          _id: subAlbums[0]._id?.toString(),
          name: subAlbums[0].name,
          alias: subAlbums[0].alias,
          parentAlbumId: subAlbums[0].parentAlbumId?.toString(),
          isPublic: subAlbums[0].isPublic,
        })}`,
      );
    }

    // Get photos
    this.logger.debug(`getAlbumData - Fetching photos for albumId: ${albumId}`);
    const photosData = await this.findPhotosByAlbumId(albumId, page, limit, accessContext);
    this.logger.debug(`getAlbumData - Received ${photosData.photos.length} photos`);

    // Serialize album (album is already a plain object from lean())
    const serializedAlbum: any = {
      ...album,
      _id: album._id.toString(),
      parentAlbumId: album.parentAlbumId ? album.parentAlbumId.toString() : null,
      coverPhotoId: album.coverPhotoId ? (album.coverPhotoId._id ? album.coverPhotoId._id.toString() : album.coverPhotoId.toString()) : null,
    };
    
    // Debug log to see what we're returning
    this.logger.debug(`getAlbumData - serializedAlbum.name: ${JSON.stringify(serializedAlbum.name)}`);
    this.logger.debug(`getAlbumData - serializedAlbum.name type: ${typeof serializedAlbum.name}`);
    this.logger.debug(`getAlbumData - serializedAlbum keys: ${JSON.stringify(Object.keys(serializedAlbum))}`);

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
   * Returns the leading photo URL or site logo. Returns 404 if album not found or no access.
   */
  async getAlbumCoverImage(albumId: string, accessContext?: AlbumAccessContext | null) {
    const album = await this.albumModel.findById(albumId).lean().exec();
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    if (!this.canAccessAlbum(album, accessContext)) {
      throw new ForbiddenException('Access denied');
    }
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
   * Returns a map of albumId -> cover image URL. Only includes albums the user can access.
   */
  async getMultipleAlbumCoverImages(albumIds: string[], accessContext?: AlbumAccessContext | null): Promise<Record<string, string>> {
    if (albumIds.length === 0) return {};
    const albums = await this.albumModel.find({ _id: { $in: albumIds.map(id => new Types.ObjectId(id)) } }).lean().exec();
    const allowedIds = albums.filter(a => this.canAccessAlbum(a, accessContext)).map(a => a._id.toString());
    const coverImageUrls = await AlbumLeadingPhotoService.getMultipleAlbumCoverImageUrls(allowedIds);
    const result: Record<string, string> = {};
    for (const [albumId, url] of coverImageUrls) {
      result[albumId] = url;
    }
    return result;
  }

  /**
   * Update an album. Caller must be admin or owner; owner can only update albums they created.
   * Used by PUT /albums/:id (owner/admin).
   */
  async updateAlbum(
    id: string,
    updateData: {
      name?: string | Record<string, string>;
      description?: string | Record<string, string>;
      isPublic?: boolean;
      isFeatured?: boolean;
      showExifData?: boolean;
      order?: number;
      tags?: string[];
      people?: string[];
      location?: string | null;
      allowedUsers?: string[];
      allowedGroups?: string[];
      metadata?: Record<string, unknown>;
    },
    context: { userId: string; role: string },
  ): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Album not found');
    }
    const objectId = new Types.ObjectId(id);
    const album = await this.albumModel.findById(objectId).lean().exec();
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    if (context.role === 'owner') {
      const createdByStr = album.createdBy?.toString?.() ?? album.createdBy;
      if (createdByStr !== context.userId) {
        throw new ForbiddenException('You can only edit albums you created');
      }
    } else if (context.role !== 'admin') {
      throw new ForbiddenException('Only admin or owner can update albums');
    }

    const update: any = { updatedAt: new Date() };
    if (updateData.name !== undefined) {
      update.name = typeof updateData.name === 'string' ? updateData.name : updateData.name;
    }
    if (updateData.description !== undefined) {
      update.description =
        updateData.description === null || updateData.description === ''
          ? ''
          : typeof updateData.description === 'string'
            ? updateData.description
            : updateData.description;
    }
    if (updateData.isPublic !== undefined) update.isPublic = updateData.isPublic;
    if (updateData.isFeatured !== undefined) update.isFeatured = updateData.isFeatured;
    if (updateData.showExifData !== undefined) update.showExifData = updateData.showExifData;
    if (updateData.order !== undefined) {
      update.order = typeof updateData.order === 'number' ? updateData.order : parseInt(String(updateData.order), 10) || 0;
    }
    if (updateData.tags !== undefined && Array.isArray(updateData.tags)) {
      update.tags = updateData.tags
        .filter((tagId: any) => tagId && Types.ObjectId.isValid(tagId))
        .map((tagId: any) => new Types.ObjectId(tagId));
    }
    if (updateData.people !== undefined && Array.isArray(updateData.people)) {
      update.people = updateData.people
        .filter((personId: any) => personId && Types.ObjectId.isValid(personId))
        .map((personId: any) => new Types.ObjectId(personId));
    }
    if (updateData.location !== undefined) {
      update.location =
        updateData.location === null || updateData.location === ''
          ? null
          : Types.ObjectId.isValid(updateData.location)
            ? new Types.ObjectId(updateData.location)
            : typeof updateData.location === 'object' && updateData.location && (updateData.location as { _id?: string })._id
              ? new Types.ObjectId((updateData.location as { _id: string })._id)
              : null;
    }
    if (updateData.metadata !== undefined) update.metadata = updateData.metadata;
    if (updateData.allowedUsers !== undefined && Array.isArray(updateData.allowedUsers)) {
      update.allowedUsers = updateData.allowedUsers
        .filter((userId: any) => userId && Types.ObjectId.isValid(userId))
        .map((userId: any) => new Types.ObjectId(userId));
    }
    if (updateData.allowedGroups !== undefined && Array.isArray(updateData.allowedGroups)) {
      update.allowedGroups = updateData.allowedGroups
        .filter((alias: any) => typeof alias === 'string' && alias.trim() !== '')
        .map((alias: any) => String(alias).trim());
    }

    await this.albumModel.updateOne({ _id: objectId }, { $set: update }).exec();
    const updated = await this.albumModel.findById(objectId).lean().exec();
    if (!updated) throw new NotFoundException('Album not found after update');

    const doc = updated as any;
    return {
      ...doc,
      _id: doc._id.toString(),
      createdBy: doc.createdBy?.toString() || null,
      parentAlbumId: doc.parentAlbumId?.toString() || null,
      coverPhotoId: doc.coverPhotoId?.toString() || null,
      tags: doc.tags?.map((t: any) => t?.toString?.() ?? t) || [],
      people: doc.people?.map((p: any) => p?.toString?.() ?? p) || [],
      location: doc.location?.toString?.() ?? doc.location ?? null,
      allowedUsers: doc.allowedUsers?.map((u: any) => u?.toString?.() ?? u) || [],
      allowedGroups: doc.allowedGroups || [],
    };
  }

  /**
   * Get albums hierarchy (tree structure)
   * Returns albums organized in a tree with children nested.
   * When includePrivate is false, uses visibility (public or allowed by accessContext).
   */
  async getHierarchy(includePrivate: boolean = false, accessContext?: AlbumAccessContext | null) {
    const query: any = includePrivate ? {} : this.buildVisibilityCondition(accessContext);

    this.logger.debug(`AlbumsService.getHierarchy: includePrivate=${includePrivate}, query: ${JSON.stringify(query)}`);

    // Get all albums
    const allAlbums = await this.albumModel
      .find(query)
      .sort({ level: 1, order: 1, createdAt: -1 })
      .lean()
      .exec();

    this.logger.debug(`AlbumsService.getHierarchy: Found ${allAlbums.length} albums`);

    // Build a map of albums by ID for quick lookup
    const albumMap = new Map<string, any>();
    const rootAlbums: any[] = [];

    // First pass: create album objects and map them
    for (const album of allAlbums) {
      const albumData: any = {
        ...album,
        _id: album._id.toString(),
        parentAlbumId: album.parentAlbumId ? album.parentAlbumId.toString() : null,
        coverPhotoId: album.coverPhotoId ? (album.coverPhotoId._id ? album.coverPhotoId._id.toString() : album.coverPhotoId.toString()) : null,
        createdBy: album.createdBy ? album.createdBy.toString() : null,
        children: []
      };
      
      albumMap.set(albumData._id, albumData);
    }

    // Second pass: build the tree structure
    for (const album of albumMap.values()) {
      if (album.parentAlbumId && albumMap.has(album.parentAlbumId)) {
        // Add to parent's children
        const parent = albumMap.get(album.parentAlbumId);
        if (parent) {
          parent.children.push(album);
        }
      } else {
        // Root level album
        rootAlbums.push(album);
      }
    }

    this.logger.debug(`AlbumsService.getHierarchy: Returning ${rootAlbums.length} root albums with nested children`);

    return {
      data: rootAlbums
    };
  }
}
