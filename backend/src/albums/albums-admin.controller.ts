import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, BadRequestException, NotFoundException, Request, Logger, InternalServerErrorException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { AlbumsService } from './albums.service';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { StorageManager } from '../services/storage/manager';

@Controller('admin/albums')
@UseGuards(AdminGuard)
export class AlbumsAdminController {
	private readonly logger = new Logger(AlbumsAdminController.name);
	
	constructor(private readonly albumsService: AlbumsService) {}

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
	 * Get all albums (admin only - includes private albums)
	 * Path: GET /api/admin/albums
	 */
	@Get()
	async findAll(@Query('parentId') parentId?: string, @Query('level') level?: string) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const query: any = {};

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

			// Calculate childAlbumCount for each album and serialize ObjectIds
			const serialized = await Promise.all(
				albums.map(async (album: any) => {
					const childCount = await db.collection('albums').countDocuments({
						parentAlbumId: album._id,
					});
					return {
						...album,
						_id: album._id.toString(),
						parentAlbumId: album.parentAlbumId?.toString() || null,
						coverPhotoId: album.coverPhotoId?.toString() || null,
						createdBy: album.createdBy?.toString() || null,
						order: album.order ?? 0, // Ensure order field is included
						childAlbumCount: childCount,
					};
				})
			);

		return serialized;
	} catch (error) {
		this.logger.error('Failed to get admin albums:', error);
		throw new InternalServerErrorException(`Failed to get admin albums: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

	/**
	 * Get all photos for an album (admin only - includes unpublished)
	 * Path: GET /api/admin/albums/:id/photos
	 * NOTE: This route must come before @Get(':id') to avoid route conflicts
	 */
	@Get(':id/photos')
	async getAlbumPhotos(@Param('id') id: string) {
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

			// Get ALL photos for this album (including unpublished) - admin only
			const photosCollection = db.collection('photos');
			const query = {
				$or: [{ albumId: objectId }, { albumId: id }],
			};

			const photos = await photosCollection
				.find(query)
				.sort({ uploadedAt: -1 })
				.toArray();

			this.logger.debug(`Found ${photos.length} photos for album ${id}`);
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
					albumId: photo.albumId ? photo.albumId.toString() : null,
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
				success: true,
				data: serializedPhotos,
			};
		} catch (error) {
			this.logger.error('Failed to get admin album photos:', error);
			throw new InternalServerErrorException(
				`Failed to get admin album photos: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Get a single album by ID (admin only - includes private albums)
	 * Path: GET /api/admin/albums/:id
	 * NOTE: This route must come AFTER @Get(':id/photos') to avoid route conflicts
	 */
	@Get(':id')
	async findOne(@Param('id') id: string) {
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

			// Serialize ObjectIds
			const serialized: any = {
				...album,
				_id: album._id.toString(),
				parentAlbumId: album.parentAlbumId?.toString() || null,
				coverPhotoId: album.coverPhotoId?.toString() || null,
				createdBy: album.createdBy?.toString() || null,
				tags: album.tags?.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString())) || [],
			};

			return serialized;
		} catch (error) {
			this.logger.error('Failed to get admin album:', error);
			if (error instanceof BadRequestException || error instanceof NotFoundException) {
				throw error;
			}
			throw new InternalServerErrorException(`Failed to get admin album: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Update an album (admin only)
	 * Path: PUT /api/admin/albums/:id
	 */
	@Put(':id')
	async updateAlbum(@Param('id') id: string, @Body() updateData: any) {
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
			if (updateData.isFeatured !== undefined) {
				update.isFeatured = updateData.isFeatured;
			}
			if (updateData.showExifData !== undefined) {
				update.showExifData = updateData.showExifData;
			}

			// Update order
			if (updateData.order !== undefined) {
				update.order = parseInt(updateData.order, 10) || 0;
			}

			// Update tags if provided (convert string IDs to ObjectIds)
			if (updateData.tags !== undefined && Array.isArray(updateData.tags)) {
				update.tags = updateData.tags
					.filter((tagId: any) => tagId && Types.ObjectId.isValid(tagId))
					.map((tagId: string) => new Types.ObjectId(tagId));
			}

			// Update people if provided (convert string IDs to ObjectIds)
			if (updateData.people !== undefined && Array.isArray(updateData.people)) {
				update.people = updateData.people
					.filter((personId: any) => personId && Types.ObjectId.isValid(personId))
					.map((personId: string) => new Types.ObjectId(personId));
			}

			// Update location if provided
			if (updateData.location !== undefined) {
				if (updateData.location === null || updateData.location === '') {
					update.location = null;
				} else if (Types.ObjectId.isValid(updateData.location)) {
					update.location = new Types.ObjectId(updateData.location);
				} else if (typeof updateData.location === 'object' && updateData.location._id) {
					update.location = new Types.ObjectId(updateData.location._id);
				}
			}

			// Update metadata if provided
			if (updateData.metadata !== undefined) {
				update.metadata = updateData.metadata;
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
	async deleteAlbum(@Param('id') id: string) {
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

	/**
	 * Reorder albums
	 * Path: PUT /api/admin/albums/reorder
	 */
	@Put('reorder')
	async reorderAlbums(@Body() body: { updates: Array<{ id: string; parentAlbumId: string | null; order: number }> }) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const { updates } = body;

			if (!Array.isArray(updates) || updates.length === 0) {
				throw new BadRequestException('Updates array is required and must not be empty');
			}

			// Validate all updates
			for (const update of updates) {
				if (!update.id || typeof update.order !== 'number') {
					throw new BadRequestException('Each update must have id and order');
				}
			}

			// Update each album
			const updatePromises = updates.map(async (update) => {
				try {
					const albumId = new Types.ObjectId(update.id);
					const updateData: any = {
						order: update.order,
						updatedAt: new Date()
					};
					
					this.logger.debug(`Updating album ${update.id}: order=${update.order}, parentAlbumId=${update.parentAlbumId}`);

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
					} else {
						this.logger.debug(`Successfully updated album ${update.id}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
					}

					return result;
				} catch (error) {
					this.logger.error(`Failed to update album ${update.id}:`, error);
					throw error;
				}
			});

			await Promise.all(updatePromises);

			// Return success response
			return {
				success: true,
				message: `Successfully reordered ${updates.length} album(s)`
			};
		} catch (error) {
			this.logger.error('Failed to reorder albums:', error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to reorder albums: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}
