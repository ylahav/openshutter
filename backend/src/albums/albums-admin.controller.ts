import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, UseGuards, BadRequestException, NotFoundException, ForbiddenException, Request, Logger, InternalServerErrorException } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { AlbumsService } from './albums.service';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { StorageManager } from '../services/storage/manager';

/** Native MongoDB Db-like (mongoose.connection.db); avoids depending on mongoose.mongodb which may not exist in all mongoose versions. */
type MongoDb = NonNullable<typeof mongoose.connection.db>;
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { ReorderAlbumsDto } from './dto/reorder-albums.dto';

@Controller('admin/albums')
@UseGuards(AdminOrOwnerGuard)
export class AlbumsAdminController {
	private readonly logger = new Logger(AlbumsAdminController.name);

	constructor(private readonly albumsService: AlbumsService) {}

	private async assertOwnerCanAccessAlbum(req: ExpressRequest, album: any, db: MongoDb): Promise<void> {
		const user = (req as any).user;
		if (user?.role === 'admin') return;
		if (user?.role !== 'owner' || !user?.id) {
			throw new ForbiddenException('Access denied');
		}
		const createdBy = album.createdBy?.toString?.() ?? album.createdBy;
		if (createdBy !== user.id) {
			throw new ForbiddenException('You can only manage albums you created');
		}
	}

	/**
	 * Create a new album
	 * Path: POST /api/admin/albums
	 */
	@Post()
	async createAlbum(@Request() req: any, @Body() createData: any) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			// Get user from request (set by AdminGuard)
			const user = req.user;
			if (!user || !user.id) {
				throw new BadRequestException('User not authenticated');
			}

			// Validate required fields
			if (!createData.name || !createData.alias) {
				throw new BadRequestException('Name and alias are required');
			}

			if (!createData.storageProvider) {
				throw new BadRequestException('Storage provider is required');
			}

			// Validate storage provider
			const validProviders = ['google-drive', 'aws-s3', 'local', 'backblaze', 'wasabi'];
			if (!validProviders.includes(createData.storageProvider)) {
				throw new BadRequestException(`Invalid storage provider: ${createData.storageProvider}`);
			}

			// Get parent album info if parentAlbumId is provided
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
					if (user.role === 'owner') {
						await this.assertOwnerCanAccessAlbum(req, parentAlbum, db);
					}

					parentPath = parentAlbum.storagePath || '';
					level = (parentAlbum.level || 0) + 1;
				} catch (error) {
					if (error instanceof NotFoundException) {
						throw error;
					}
					throw new BadRequestException(`Invalid parent album ID: ${createData.parentAlbumId}`);
				}
			}

			// Generate storage path
			const storagePath = parentPath ? `${parentPath}/${createData.alias}` : `/${createData.alias}`;

			// Check if alias already exists
			const existingAlbum = await db.collection('albums').findOne({ alias: createData.alias.toLowerCase() });
			if (existingAlbum) {
				throw new BadRequestException(`Album with alias "${createData.alias}" already exists`);
			}

			// Create folder in storage provider
			const storageManager = StorageManager.getInstance();
			let storageFolderResult;
			try {
				storageFolderResult = await storageManager.createAlbum(
					createData.name,
					createData.alias,
					createData.storageProvider as any,
					parentPath || undefined
				);
				this.logger.debug('Storage folder created:', storageFolderResult);
				
				// Create thumbnail subfolders (hero, large, medium, small, micro) for the album
				// This ensures all photos in the album share the same thumbnail folders
				// Only create these for Google Drive to avoid duplicate folder issues
				if (createData.storageProvider === 'google-drive' && storagePath) {
					try {
						const { ThumbnailGenerator } = await import('../services/thumbnail-generator');
						const storageService = await storageManager.getProvider(createData.storageProvider as any);
						const thumbnailSizes = ['hero', 'large', 'medium', 'small', 'micro'];
						
						for (const sizeName of thumbnailSizes) {
							try {
								const sizeConfig = ThumbnailGenerator.getThumbnailSize(sizeName as any);
								// Create thumbnail folder inside the album folder
								await storageService.createFolder(sizeConfig.folder, storagePath);
								this.logger.debug(`Created thumbnail folder: ${storagePath}/${sizeConfig.folder}`);
							} catch (folderError: any) {
								// If folder already exists, that's fine - log and continue
								if (folderError.message && folderError.message.includes('already exists')) {
									this.logger.debug(`Thumbnail folder ${sizeName} already exists, skipping creation`);
								} else {
									// Log but don't fail album creation if thumbnail folder creation fails
									// The folders will be created automatically during photo upload if needed
									this.logger.warn(`Failed to create thumbnail folder ${sizeName}:`, folderError.message);
								}
							}
						}
					} catch (thumbnailError: any) {
						// Don't fail album creation if thumbnail folder setup fails
						this.logger.warn('Failed to create thumbnail folders (will be created on first photo upload):', thumbnailError.message);
					}
				}
			} catch (storageError: any) {
				this.logger.error('Failed to create storage folder:', storageError);
				throw new BadRequestException(
					`Failed to create storage folder: ${storageError.message || 'Unknown error'}`
				);
			}

			// Get the maximum order value for siblings (albums with same parent)
			const parentIdForQuery = parentAlbum ? parentAlbum._id : null;
			const maxOrderResult = await db
				.collection('albums')
				.find({ parentAlbumId: parentIdForQuery })
				.sort({ order: -1 })
				.limit(1)
				.toArray();
			const maxOrder = maxOrderResult.length > 0 ? (maxOrderResult[0].order || 0) + 1 : 0;

			// Create album record
			const albumData: any = {
				name: createData.name,
				alias: createData.alias.toLowerCase().trim(),
				description: createData.description || '',
				isPublic: createData.isPublic !== undefined ? createData.isPublic : false,
				isPublished: createData.isPublished !== undefined ? createData.isPublished : true,
				isFeatured: createData.isFeatured !== undefined ? createData.isFeatured : false,
				storageProvider: createData.storageProvider,
				storagePath: storagePath,
				parentAlbumId: parentAlbum ? parentAlbum._id : null,
				parentPath: parentPath,
				level: level,
				order: maxOrder,
				photoCount: 0,
				createdBy: new Types.ObjectId(user.id),
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

			// Fetch the created album
			const createdAlbum = await db.collection('albums').findOne({ _id: result.insertedId });

			if (!createdAlbum) {
				throw new InternalServerErrorException('Album was created but could not be retrieved');
			}

			// Serialize ObjectIds
			const serialized: any = {
				...createdAlbum,
				_id: createdAlbum._id.toString(),
				createdBy: createdAlbum.createdBy?.toString() || null,
				parentAlbumId: createdAlbum.parentAlbumId?.toString() || null,
				coverPhotoId: createdAlbum.coverPhotoId?.toString() || null,
				tags: createdAlbum.tags?.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString())) || [],
			};

			return {
				success: true,
				data: serialized,
			};
		} catch (error) {
			this.logger.error('Failed to create album:', error);
			if (error instanceof BadRequestException || error instanceof NotFoundException) {
				throw error;
			}
			throw new BadRequestException(
				`Failed to create album: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get all albums (admin: all; owner: only albums they created)
	 * Path: GET /api/admin/albums
	 */
	@Get()
	async findAll(@Req() req: ExpressRequest, @Query('parentId') parentId?: string, @Query('level') level?: string) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const query: any = {};

			// Owner: only albums they created
			const user = (req as any).user;
			if (user?.role === 'owner' && user?.id) {
				query.createdBy = new Types.ObjectId(user.id);
			}

			// Handle parentId filter (admin can see all, no isPublic filter)
			if (parentId === 'root' || parentId === 'null') {
				query.parentAlbumId = null;
			} else if (parentId) {
				if (!Types.ObjectId.isValid(parentId)) {
					this.logger.warn(`Invalid parentId format: ${parentId}`);
					return [];
				}
				query.parentAlbumId = new Types.ObjectId(parentId);
			}

			// Support level filter
			if (level !== undefined) {
				const levelNum = parseInt(level, 10);
				if (!isNaN(levelNum)) {
					query.level = levelNum;
				}
			}

		// Get ALL albums (no isPublic filter for admin)
		const albums = await db
			.collection('albums')
			.find(query)
			.sort({ order: 1, createdAt: -1 })
			.toArray();

		// Performance optimization: Use aggregation to get child counts in a single query
		// instead of N+1 queries (one per album)
		const albumIds = albums.map((album: any) => album._id);
		const childCounts = await db
			.collection('albums')
			.aggregate([
				{
					$match: {
						parentAlbumId: { $in: albumIds },
					},
				},
				{
					$group: {
						_id: '$parentAlbumId',
						count: { $sum: 1 },
					},
				},
			])
			.toArray();

		// Create a map for O(1) lookup
		const childCountMap = new Map<string, number>();
		childCounts.forEach((item: any) => {
			if (item._id) {
				childCountMap.set(item._id.toString(), item.count);
			}
		});

		// Serialize ObjectIds and add child counts (include allowedGroups/allowedUsers for admin UI)
		const serialized = albums.map((album: any) => ({
			...album,
			_id: album._id.toString(),
			parentAlbumId: album.parentAlbumId?.toString() || null,
			coverPhotoId: album.coverPhotoId?.toString() || null,
			createdBy: album.createdBy?.toString() || null,
			order: album.order ?? 0,
			childAlbumCount: childCountMap.get(album._id.toString()) || 0,
			allowedGroups: Array.isArray(album.allowedGroups) ? album.allowedGroups : [],
			allowedUsers: Array.isArray(album.allowedUsers)
				? album.allowedUsers.map((id: any) => (id && id.toString ? id.toString() : String(id)))
				: [],
		}));

	return serialized;
	} catch (error) {
		this.logger.error('Failed to get admin albums:', error);
		throw new InternalServerErrorException(`Failed to get admin albums: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

	/**
	 * Get all photos for an album (admin or owner of album - includes unpublished)
	 * Path: GET /api/admin/albums/:id/photos
	 * NOTE: This route must come before @Get(':id') to avoid route conflicts
	 */
	@Get(':id/photos')
	async getAlbumPhotos(
		@Param('id') id: string,
		@Query('includeSubAlbums') includeSubAlbums?: string,
		@Req() req?: ExpressRequest,
	) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid album ID format');
			}

			const album = await db.collection('albums').findOne({ _id: objectId });
			if (!album) throw new NotFoundException(`Album not found: ${id}`);
			if (req && (req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessAlbum(req, album, db);
			}

			const photosCollection = db.collection('photos');
			const albumPhotoQuery = {
				$or: [{ albumId: objectId }, { albumId: id }],
			};

			let photos: any[] = await photosCollection
				.find(albumPhotoQuery)
				.sort({ uploadedAt: -1 })
				.toArray();

			let fromSubAlbums = false;
			// When album has no photos and includeSubAlbums is set, return photos from descendant albums (children, sub-sub-albums, etc.)
			if (photos.length === 0 && includeSubAlbums) {
				// Collect all descendant album IDs (BFS: direct children, then their children, etc.)
				const descendantIds: Types.ObjectId[] = [];
				const descendantIdStrings: string[] = [];
				const albumNamesById = new Map<string, string>();
				let frontier: Types.ObjectId[] = [objectId];
				while (frontier.length > 0) {
					const parentIds = frontier;
					frontier = [];
					const children = await db
						.collection('albums')
						.find({ parentAlbumId: { $in: parentIds } })
						.sort({ order: 1, name: 1 })
						.toArray();
					for (const child of children) {
						const id = child._id;
						descendantIds.push(id);
						descendantIdStrings.push(id.toString());
						const name = typeof child.name === 'string' ? child.name : (child.name?.en ?? child.name?.he ?? child.alias ?? '');
						albumNamesById.set(id.toString(), name);
						frontier.push(id);
					}
				}
				if (descendantIds.length > 0) {
					photos = await photosCollection
						.find({
							$or: [
								{ albumId: { $in: descendantIds } },
								{ albumId: { $in: descendantIdStrings } },
							],
						})
						.sort({ uploadedAt: -1 })
						.toArray();
					fromSubAlbums = true;
					photos = photos.map((p: any) => ({
						...p,
						sourceAlbumId: p.albumId ? (p.albumId.toString ? p.albumId.toString() : p.albumId) : null,
						sourceAlbumName: p.albumId
							? (albumNamesById.get(p.albumId.toString ? p.albumId.toString() : p.albumId) ?? '')
							: '',
					}));
				}
			}

			this.logger.debug(`Found ${photos.length} photos for album ${id}${fromSubAlbums ? ' (from sub-albums)' : ''}`);
			if (photos.length > 0) {
				this.logger.debug('Sample photo storage:', {
					hasStorage: !!photos[0].storage,
					storage: photos[0].storage,
					thumbnailPath: photos[0].storage?.thumbnailPath,
					url: photos[0].storage?.url,
				});
			}

			// Convert ObjectIds to strings for JSON serialization
			const serializedPhotos = photos.map((photo: any) => {
				const serialized: any = {
					...photo,
					_id: photo._id.toString(),
					albumId: photo.albumId ? (photo.albumId.toString ? photo.albumId.toString() : photo.albumId) : null,
					tags: photo.tags ? photo.tags.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString())) : [],
					people: photo.people
						? photo.people.map((person: any) => (person._id ? person._id.toString() : person.toString()))
						: [],
					location: photo.location
						? photo.location._id
							? photo.location._id.toString()
							: photo.location.toString()
						: null,
				};
				if (photo.sourceAlbumId != null) serialized.sourceAlbumId = photo.sourceAlbumId;
				if (photo.sourceAlbumName != null) serialized.sourceAlbumName = photo.sourceAlbumName;
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
				success: true,
				data: serializedPhotos,
				fromSubAlbums: fromSubAlbums,
			};
		} catch (error) {
			this.logger.error('Failed to get admin album photos:', error);
			throw new InternalServerErrorException(
				`Failed to get admin album photos: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Get a single album by ID (admin or owner of album - includes private albums)
	 * Path: GET /api/admin/albums/:id
	 * NOTE: This route must come AFTER @Get(':id/photos') to avoid route conflicts
	 */
	@Get(':id')
	async findOne(@Param('id') id: string, @Req() req: ExpressRequest) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid album ID format');
			}

			const album = await db.collection('albums').findOne({ _id: objectId });

			if (!album) {
				throw new NotFoundException(`Album not found: ${id}`);
			}
			if ((req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessAlbum(req, album, db);
			}

			// Serialize ObjectIds (including access control fields for edit form)
			const serialized: any = {
				...album,
				_id: album._id.toString(),
				parentAlbumId: album.parentAlbumId?.toString() || null,
				coverPhotoId: album.coverPhotoId?.toString() || null,
				createdBy: album.createdBy?.toString() || null,
				tags: album.tags?.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString())) || [],
				allowedUsers: album.allowedUsers?.map((userId: any) => userId.toString()) || [],
				allowedGroups: album.allowedGroups || [],
			};

			return serialized;
		} catch (error) {
			this.logger.error('Failed to get admin album:', error);
			if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to get admin album: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Reorder albums
	 * Path: PUT /api/admin/albums/reorder
	 * NOTE: This route must come BEFORE @Put(':id') to avoid route conflicts
	 */
	@Put('reorder')
	async reorderAlbums(@Body() body: ReorderAlbumsDto, @Req() req: ExpressRequest) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const { updates } = body;

			if (!Array.isArray(updates) || updates.length === 0) {
				throw new BadRequestException('Updates array is required and must not be empty');
			}

			// Validate all updates and normalize IDs to strings
			const validatedUpdates: Array<{ id: string; parentAlbumId: string | null; order: number }> = [];
			for (let i = 0; i < updates.length; i++) {
				const update = updates[i];
				
				if (!update.id || typeof update.order !== 'number') {
					throw new BadRequestException(`Update ${i + 1}: Each update must have id and order. Got id: ${update.id}, order: ${update.order}`);
				}
				
				// Ensure id is a string
				const albumId = String(update.id).trim();
				// Validate album ID format - must be exactly 24 hex characters
				if (albumId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(albumId)) {
					this.logger.error(`Update ${i + 1}: Invalid album ID format: "${albumId}" (type: ${typeof update.id}, length: ${albumId.length}, original: ${JSON.stringify(update.id)})`);
					throw new BadRequestException(`Update ${i + 1}: Invalid album ID format: ${albumId} (must be exactly 24 hex characters)`);
				}
				// Also check with MongoDB's validator
				if (!Types.ObjectId.isValid(albumId)) {
					this.logger.error(`Update ${i + 1}: MongoDB validation failed for ID: "${albumId}"`);
					throw new BadRequestException(`Update ${i + 1}: Invalid album ID format: ${albumId}`);
				}
				
				// Normalize parentAlbumId
				let parentAlbumId: string | null = null;
				if (update.parentAlbumId !== null && update.parentAlbumId !== undefined && update.parentAlbumId !== '') {
					const parentId = String(update.parentAlbumId).trim();
					// Validate parent ID format - must be exactly 24 hex characters
					if (parentId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(parentId)) {
						this.logger.error(`Update ${i + 1}: Invalid parent album ID format: "${parentId}" (type: ${typeof update.parentAlbumId}, length: ${parentId.length}, original: ${JSON.stringify(update.parentAlbumId)})`);
						throw new BadRequestException(`Update ${i + 1}: Invalid parent album ID format: ${parentId} (must be exactly 24 hex characters)`);
					}
					// Also check with MongoDB's validator
					if (!Types.ObjectId.isValid(parentId)) {
						this.logger.error(`Update ${i + 1}: MongoDB validation failed for parent ID: "${parentId}"`);
						throw new BadRequestException(`Update ${i + 1}: Invalid parent album ID format: ${parentId}`);
					}
					parentAlbumId = parentId;
				}
				
				validatedUpdates.push({
					id: albumId,
					parentAlbumId,
					order: update.order
				});
			}

			// Owner: only allow reordering albums they created
			const user = (req as any).user;
			if (user?.role === 'owner' && user?.id) {
				for (const update of validatedUpdates) {
					const album = await db.collection('albums').findOne({ _id: new Types.ObjectId(update.id) });
					if (album) {
						const createdBy = album.createdBy?.toString?.() ?? album.createdBy;
						if (createdBy !== user.id) {
							throw new ForbiddenException('You can only reorder albums you created');
						}
					}
				}
			}

			// Update each album
			const updatePromises = validatedUpdates.map(async (update) => {
				try {
					const albumId = new Types.ObjectId(update.id);
					const updateData: any = {
						order: update.order,
						updatedAt: new Date()
					};

					// Update parentAlbumId if provided
					if (update.parentAlbumId !== null && update.parentAlbumId !== undefined) {
						if (update.parentAlbumId === '') {
							updateData.parentAlbumId = null;
							updateData.level = 0;
						} else {
							const parentId = new Types.ObjectId(update.parentAlbumId);
							// Get parent album to calculate level
							const parentAlbum = await db.collection('albums').findOne({ _id: parentId });
							if (parentAlbum) {
								updateData.parentAlbumId = parentId;
								updateData.level = (parentAlbum.level || 0) + 1;
							} else {
								this.logger.warn(`Parent album not found: ${update.parentAlbumId}`);
							}
						}
					}

					const result = await db.collection('albums').updateOne(
						{ _id: albumId },
						{ $set: updateData }
					);

					if (result.matchedCount === 0) {
						this.logger.warn(`Album not found for reorder: ${update.id}`);
					}

					return result;
				} catch (error) {
					this.logger.error(`Failed to update album ${update.id}:`, error);
					// If it's an ObjectId validation error, provide clearer message
					if (error instanceof Error && error.message.includes('ObjectId')) {
						throw new BadRequestException(`Invalid album ID format: ${update.id}`);
					}
					throw error;
				}
			});

			await Promise.all(updatePromises);

			// Return success response
			return {
				success: true,
				message: `Successfully reordered ${validatedUpdates.length} album(s)`
			};
		} catch (error) {
			this.logger.error('Failed to reorder albums:', error);
			if (error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to reorder albums: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Set album cover/leading photo (admin or owner of album).
	 * Accepts a photo from this album or from any direct sub-album (for parent albums with no photos).
	 * Path: PUT /api/admin/albums/:id/cover-photo
	 * NOTE: This route must come BEFORE @Put(':id') to avoid route conflicts
	 */
	@Put(':id/cover-photo')
	async setAlbumCoverPhoto(
		@Param('id') id: string,
		@Body() body: { coverPhotoId?: string },
		@Req() req: ExpressRequest,
	) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const coverPhotoId = body?.coverPhotoId;
			if (!coverPhotoId || typeof coverPhotoId !== 'string' || coverPhotoId.trim() === '') {
				throw new BadRequestException('coverPhotoId is required');
			}

			let albumObjectId: Types.ObjectId;
			let photoObjectId: Types.ObjectId;
			try {
				albumObjectId = new Types.ObjectId(id);
				photoObjectId = new Types.ObjectId(coverPhotoId.trim());
			} catch (_error) {
				throw new BadRequestException('Invalid album or photo ID format');
			}

			const album = await db.collection('albums').findOne({ _id: albumObjectId });
			if (!album) {
				throw new NotFoundException('Album not found');
			}
			if ((req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessAlbum(req, album, db);
			}

			const photo = await db.collection('photos').findOne({ _id: photoObjectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}

			const photoAlbumIdStr =
				typeof photo.albumId === 'string' ? photo.albumId : photo.albumId?.toString?.() ?? '';
			const albumIdStr = albumObjectId.toString();
			// Allow if photo belongs to this album
			if (photoAlbumIdStr === albumIdStr) {
				// OK
			} else {
				// Allow if photo belongs to any descendant album (direct child, sub-sub-album, etc.)
				if (!Types.ObjectId.isValid(photoAlbumIdStr)) {
					throw new BadRequestException('Photo album reference is invalid');
				}
				let currentId: Types.ObjectId | null = new Types.ObjectId(photoAlbumIdStr);
				let isDescendant = false;
				while (currentId) {
					const doc: any = await db.collection('albums').findOne({ _id: currentId });
					if (!doc) break;
					if ((doc._id as Types.ObjectId).equals(albumObjectId)) {
						isDescendant = true;
						break;
					}
					currentId = (doc.parentAlbumId as Types.ObjectId | null | undefined) ?? null;
				}
				if (!isDescendant) {
					throw new BadRequestException(
						'Photo must belong to this album or to a sub-album to be set as leading photo',
					);
				}
			}

			await db.collection('albums').updateOne(
				{ _id: albumObjectId },
				{ $set: { coverPhotoId: photoObjectId, updatedAt: new Date() } },
			);

			const updatedAlbum = await db.collection('albums').findOne({ _id: albumObjectId });
			if (!updatedAlbum) {
				throw new NotFoundException('Album not found after update');
			}

			const serialized: any = {
				...updatedAlbum,
				_id: updatedAlbum._id.toString(),
				createdBy: updatedAlbum.createdBy?.toString() || null,
				parentAlbumId: updatedAlbum.parentAlbumId?.toString() || null,
				coverPhotoId: updatedAlbum.coverPhotoId?.toString() || null,
			};

			return {
				success: true,
				message: 'Cover photo updated successfully',
				data: serialized,
			};
		} catch (error) {
			this.logger.error('Failed to set album cover photo:', error);
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException ||
				error instanceof ForbiddenException
			) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to set cover photo: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Update an album (admin or owner of album)
	 * Path: PUT /api/admin/albums/:id
	 */
	@Put(':id')
	async updateAlbum(@Param('id') id: string, @Body() updateData: UpdateAlbumDto, @Req() req: ExpressRequest) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid album ID format');
			}

			// Check if album exists
			const album = await db.collection('albums').findOne({ _id: objectId });
			if (!album) {
				throw new NotFoundException('Album not found');
			}
			if ((req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessAlbum(req, album, db);
			}

			// Prepare update object
			const update: any = {
				updatedAt: new Date(),
			};

			// Update name if provided (handle both string and multilingual formats)
			if (updateData.name !== undefined) {
				if (typeof updateData.name === 'string') {
					update.name = updateData.name;
				} else if (typeof updateData.name === 'object' && updateData.name !== null) {
					// Multilingual format - store as Mixed type
					update.name = updateData.name;
				}
			}

			// Update description if provided (handle both string and multilingual formats)
			if (updateData.description !== undefined) {
				if (typeof updateData.description === 'string') {
					update.description = updateData.description;
				} else if (typeof updateData.description === 'object' && updateData.description !== null) {
					// Multilingual format - store as Mixed type
					update.description = updateData.description;
				} else if (updateData.description === null || updateData.description === '') {
					update.description = '';
				}
			}

			// Update boolean flags
			if (updateData.isPublic !== undefined) {
				update.isPublic = updateData.isPublic;
			}
			if (updateData.isPublished !== undefined) {
				update.isPublished = updateData.isPublished;
			}
			if (updateData.isFeatured !== undefined) {
				update.isFeatured = updateData.isFeatured;
			}
			if (updateData.showExifData !== undefined) {
				update.showExifData = updateData.showExifData;
			}

			// Update order
			if (updateData.order !== undefined) {
				const orderVal = updateData.order;
				update.order = typeof orderVal === 'number' ? orderVal : (parseInt(String(orderVal), 10) || 0);
			}

			// Update tags if provided (convert string IDs to ObjectIds)
			// Performance: Combine filter+map into single reduce to avoid two passes
			if (updateData.tags !== undefined && Array.isArray(updateData.tags)) {
				update.tags = updateData.tags.reduce((acc: Types.ObjectId[], tagId: any) => {
					if (tagId && Types.ObjectId.isValid(tagId)) {
						acc.push(new Types.ObjectId(tagId));
					}
					return acc;
				}, []);
			}

			// Update people if provided (convert string IDs to ObjectIds)
			// Performance: Combine filter+map into single reduce to avoid two passes
			if (updateData.people !== undefined && Array.isArray(updateData.people)) {
				update.people = updateData.people.reduce((acc: Types.ObjectId[], personId: any) => {
					if (personId && Types.ObjectId.isValid(personId)) {
						acc.push(new Types.ObjectId(personId));
					}
					return acc;
				}, []);
			}

			// Update location if provided
			if (updateData.location !== undefined) {
				if (updateData.location === null || updateData.location === '') {
					update.location = null;
				} else if (Types.ObjectId.isValid(updateData.location)) {
					update.location = new Types.ObjectId(updateData.location);
				} else if (typeof updateData.location === 'object' && updateData.location && (updateData.location as { _id?: string })._id) {
					update.location = new Types.ObjectId((updateData.location as { _id: string })._id);
				}
			}

			// Update metadata if provided
			if (updateData.metadata !== undefined) {
				update.metadata = updateData.metadata;
			}

			// Update access control: allowedUsers (ObjectIds), allowedGroups (strings)
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

			// Perform update
			const result = await db.collection('albums').updateOne({ _id: objectId }, { $set: update });

			if (result.matchedCount === 0) {
				throw new NotFoundException('Album not found');
			}

			// Fetch updated album
			const updatedAlbum = await db.collection('albums').findOne({ _id: objectId });

			if (!updatedAlbum) {
				throw new NotFoundException('Album not found after update');
			}

			// Serialize ObjectIds
			const serialized: any = {
				...updatedAlbum,
				_id: updatedAlbum._id.toString(),
				createdBy: updatedAlbum.createdBy?.toString() || null,
				parentAlbumId: updatedAlbum.parentAlbumId?.toString() || null,
				coverPhotoId: updatedAlbum.coverPhotoId?.toString() || null,
				tags: updatedAlbum.tags?.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString())) || [],
				people: updatedAlbum.people?.map((person: any) => (person._id ? person._id.toString() : person.toString())) || [],
				location: updatedAlbum.location
					? updatedAlbum.location._id
						? updatedAlbum.location._id.toString()
						: updatedAlbum.location.toString()
					: null,
				allowedUsers: updatedAlbum.allowedUsers?.map((userId: any) => userId.toString()) || [],
				allowedGroups: updatedAlbum.allowedGroups || [],
			};

			return serialized;
		} catch (error) {
			this.logger.error('Failed to update album:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to update album: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Delete an album (admin only)
	 * Recursively deletes all sub-albums and their photos
	 * Path: DELETE /api/admin/albums/:id
	 */
	@Delete(':id')
	async deleteAlbum(@Param('id') id: string, @Req() req: ExpressRequest) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid album ID format');
			}

			const album = await db.collection('albums').findOne({ _id: objectId });
			if (!album) {
				throw new NotFoundException('Album not found');
			}
			if ((req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessAlbum(req, album, db);
			}

			this.logger.debug(`Starting deletion of album: ${album.alias} (${id})`);

			// Recursively delete all sub-albums, their photos, folders, and DB records
			// This will also delete the current album's photos, folder, and DB record
			await this.deleteAlbumRecursive(db, objectId, album.storageProvider);

			// Verify the album was deleted (the recursive function should have deleted it)
			const verifyAlbum = await db.collection('albums').findOne({ _id: objectId });
			if (verifyAlbum) {
				this.logger.warn(`Album ${album.alias} still exists after recursive deletion, attempting direct deletion`);
				// Fallback: try to delete the album folder and DB record directly
				if (album.storagePath && album.storageProvider) {
					try {
						const storageManager = StorageManager.getInstance();
						await storageManager.deleteAlbum(album.storagePath, album.storageProvider as any);
					} catch (storageError) {
						this.logger.error('Failed to delete album folder from storage:', storageError);
					}
				}
				await db.collection('albums').deleteOne({ _id: objectId });
			}

			this.logger.debug(`Successfully deleted album: ${album.alias}`);

			return { success: true, message: 'Album deleted successfully' };
		} catch (error) {
			this.logger.error('Failed to delete album:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to delete album: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Recursively delete an album and all its sub-albums and photos
	 */
	private async deleteAlbumRecursive(
		db: any,
		albumId: Types.ObjectId,
		storageProvider: string
	): Promise<void> {
		this.logger.debug(`Deleting album recursively: ${albumId.toString()}`);

		// Get the current album data before deletion
		const album = await db.collection('albums').findOne({ _id: albumId });
		if (!album) {
			this.logger.warn(`Album ${albumId.toString()} not found, skipping`);
			return;
		}

		// Get all sub-albums
		const subAlbums = await db
			.collection('albums')
			.find({ parentAlbumId: albumId })
			.toArray();

		this.logger.debug(`Found ${subAlbums.length} sub-albums`);

		// Recursively delete each sub-album (this will delete their photos, folders, and DB records)
		for (const subAlbum of subAlbums) {
			await this.deleteAlbumRecursive(db, subAlbum._id, subAlbum.storageProvider || storageProvider);
		}

		// Get all photos in this album
		const photos = await db
			.collection('photos')
			.find({
				$or: [{ albumId: albumId }, { albumId: albumId.toString() }],
			})
			.toArray();

		this.logger.debug(`Found ${photos.length} photos in album ${albumId.toString()}`);

		// Delete each photo from storage and database
		const storageManager = StorageManager.getInstance();

		// Helper function to extract path from URL
		const extractPathFromUrl = (url: string): string | null => {
			if (!url || typeof url !== 'string') return null;
			const urlMatch = url.match(/\/api\/storage\/serve\/[^/]+\/(.+)$/);
			if (urlMatch && urlMatch[1]) {
				try {
					return decodeURIComponent(urlMatch[1]);
				} catch {
					return urlMatch[1];
				}
			}
			if (!url.startsWith('/api/storage/serve/')) {
				return url;
			}
			return null;
		};

		for (const photo of photos) {
			try {
				// Delete photo files from storage
				if (photo.storage && photo.storage.provider && photo.storage.path) {
					const provider = photo.storage.provider as any;
					this.logger.debug(`Deleting photo file: provider=${provider}, path=${photo.storage.path}`);

					try {
						// Delete main photo file
						await storageManager.deletePhoto(photo.storage.path, provider);

						// Delete thumbnails
						if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
							for (const [size, thumbnailUrl] of Object.entries(photo.storage.thumbnails)) {
								try {
									const thumbnailPath = extractPathFromUrl(thumbnailUrl as string);
									if (thumbnailPath && thumbnailPath !== photo.storage.path) {
										await storageManager.deletePhoto(thumbnailPath, provider);
									}
								} catch (thumbError) {
									this.logger.warn(`Failed to delete ${size} thumbnail:`, thumbError);
								}
							}
						}

						// Delete thumbnailPath if different
						if (photo.storage.thumbnailPath) {
							const thumbPath = extractPathFromUrl(photo.storage.thumbnailPath);
							if (thumbPath && thumbPath !== photo.storage.path) {
								const alreadyDeleted =
									photo.storage.thumbnails &&
									Object.values(photo.storage.thumbnails).some((url) => {
										const path = extractPathFromUrl(url as string);
										return path === thumbPath;
									});

								if (!alreadyDeleted) {
									await storageManager.deletePhoto(thumbPath, provider);
								}
							}
						}
					} catch (storageError) {
						this.logger.error(`Failed to delete photo files from storage:`, storageError);
						// Continue with database deletion
					}
				}

				// Delete photo from database
				await db.collection('photos').deleteOne({ _id: photo._id });
				this.logger.debug(`Deleted photo: ${photo._id.toString()}`);
			} catch (photoError) {
				this.logger.error(`Failed to delete photo ${photo._id.toString()}:`, photoError);
				// Continue with other photos
			}
		}

		// Delete the current album's folder from storage
		if (album.storagePath && album.storageProvider) {
			try {
				const storageManager = StorageManager.getInstance();
				this.logger.debug(
					`Deleting album folder from storage: provider=${album.storageProvider}, path=${album.storagePath}`
				);
				await storageManager.deleteAlbum(album.storagePath, album.storageProvider as any);
				this.logger.debug(`Successfully deleted album folder: ${album.storagePath}`);
			} catch (storageError) {
				this.logger.error(`Failed to delete album folder from storage:`, storageError);
				// Continue with database deletion even if storage deletion fails
			}
		}

		// Delete the current album from database
		await db.collection('albums').deleteOne({ _id: albumId });
		this.logger.debug(`Deleted album: ${album.alias} (${albumId.toString()})`);
	}
}
