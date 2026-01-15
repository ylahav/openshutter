import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, BadRequestException, NotFoundException, Request } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { AlbumsService } from './albums.service';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { StorageManager } from '../services/storage/manager';

@Controller('admin/albums')
@UseGuards(AdminGuard)
export class AlbumsAdminController {
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
			if (!db) throw new Error('Database connection not established');

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
				console.log('Storage folder created:', storageFolderResult);
			} catch (storageError: any) {
				console.error('Failed to create storage folder:', storageError);
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
				throw new Error('Failed to create album');
			}

			// Fetch the created album
			const createdAlbum = await db.collection('albums').findOne({ _id: result.insertedId });

			if (!createdAlbum) {
				throw new Error('Album was created but could not be retrieved');
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
			console.error('Failed to create album:', error);
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
			if (!db) throw new Error('Database connection not established');

			const query: any = {};

			// Handle parentId filter (admin can see all, no isPublic filter)
			if (parentId === 'root' || parentId === 'null') {
				query.parentAlbumId = null;
			} else if (parentId) {
				if (!Types.ObjectId.isValid(parentId)) {
					console.warn(`Invalid parentId format: ${parentId}`);
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

			// Serialize ObjectIds
			const serialized = albums.map((album: any) => ({
				...album,
				_id: album._id.toString(),
				parentAlbumId: album.parentAlbumId?.toString() || null,
				coverPhotoId: album.coverPhotoId?.toString() || null,
				createdBy: album.createdBy?.toString() || null,
			}));

		return serialized;
	} catch (error) {
		console.error('Failed to get admin albums:', error);
		throw new Error(`Failed to get admin albums: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

	/**
	 * Get all photos for an album (admin only - includes unpublished)
	 * Path: GET /api/admin/albums/:id/photos
	 */
	@Get(':id/photos')
	async getAlbumPhotos(@Param('id') id: string) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new Error('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new Error('Invalid album ID format');
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

			console.log(`Found ${photos.length} photos for album ${id}`);
			if (photos.length > 0) {
				console.log('Sample photo storage:', {
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
			console.error('Failed to get admin album photos:', error);
			throw new Error(
				`Failed to get admin album photos: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
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
			if (!db) throw new Error('Database connection not established');

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
			console.error('Failed to update album:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new Error(`Failed to update album: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
