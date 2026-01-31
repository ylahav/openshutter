import {
	Controller,
	Get,
	Put,
	Post,
	Delete,
	Param,
	Body,
	Req,
	UseGuards,
	BadRequestException,
	NotFoundException,
	ForbiddenException,
	Logger,
	InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { StorageManager } from '../services/storage/manager';

/** Native MongoDB Db-like (mongoose.connection.db); avoids depending on mongoose.mongodb which may not exist in all mongoose versions. */
type MongoDb = NonNullable<typeof mongoose.connection.db>;
import { ThumbnailGenerator } from '../services/thumbnail-generator';
import { ExifExtractor } from '../services/exif-extractor';
import { UpdatePhotoDto } from './dto/update-photo.dto';

@Controller('admin/photos')
@UseGuards(AdminOrOwnerGuard)
export class PhotosAdminController {
	private readonly logger = new Logger(PhotosAdminController.name);

	private async assertOwnerCanAccessPhoto(req: Request, photo: any, db: MongoDb): Promise<void> {
		const user = (req as any).user;
		if (user?.role === 'admin') return;
		if (user?.role !== 'owner' || !user?.id) {
			throw new ForbiddenException('Access denied');
		}
		const albumId = photo.albumId;
		if (!albumId) throw new ForbiddenException('Photo has no album');
		const album = await db.collection('albums').findOne({ _id: albumId });
		if (!album) throw new NotFoundException('Album not found');
		const createdBy = album.createdBy?.toString?.() ?? album.createdBy;
		if (createdBy !== user.id) {
			throw new ForbiddenException('You can only manage photos in albums you created');
		}
	}

	/**
	 * Get a photo by ID (admin or owner of the photo's album - includes unpublished)
	 * Path: GET /api/admin/photos/:id
	 */
	@Get(':id')
	async getPhoto(@Param('id') id: string, @Req() req: Request) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });

			if (!photo) {
				throw new NotFoundException('Photo not found');
			}

			if ((req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessPhoto(req, photo, db);
			}

			// Serialize ObjectIds
			const serialized: any = {
				...photo,
				_id: photo._id.toString(),
				albumId: photo.albumId ? photo.albumId.toString() : null,
				tags: photo.tags
					? photo.tags.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString()))
					: [],
				people: photo.people
					? photo.people.map((person: any) =>
							person._id ? person._id.toString() : person.toString()
						)
					: [],
				location: photo.location
					? photo.location._id
						? photo.location._id.toString()
						: photo.location.toString()
					: null,
				uploadedBy: photo.uploadedBy ? photo.uploadedBy.toString() : null,
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

			// Explicitly serialize faceRecognition so clients always get faces array and string IDs (omit descriptor)
			if (photo.faceRecognition && Array.isArray(photo.faceRecognition.faces)) {
				serialized.faceRecognition = {
					faces: photo.faceRecognition.faces.map((face: any) => ({
						box: face.box,
						matchedPersonId: face.matchedPersonId
							? (face.matchedPersonId._id ? face.matchedPersonId._id : face.matchedPersonId).toString()
							: undefined,
						confidence: face.confidence,
					})),
					processedAt: photo.faceRecognition.processedAt,
					modelVersion: photo.faceRecognition.modelVersion,
				};
			}

			return serialized;
		} catch (error) {
			this.logger.error(`Failed to get photo: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to get photo: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Update a photo (admin or owner of the photo's album)
	 * Path: PUT /api/admin/photos/:id
	 */
	@Put(':id')
	async updatePhoto(@Param('id') id: string, @Body() updateData: UpdatePhotoDto, @Req() req: Request) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			// Check if photo exists
			const photo = await db.collection('photos').findOne({ _id: objectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}
			if ((req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessPhoto(req, photo, db);
			}

			// Prepare update object
			const update: any = {
				updatedAt: new Date(),
			};

			// Update title if provided (handle both string and multilingual formats)
			if (updateData.title !== undefined) {
				if (typeof updateData.title === 'string') {
					update.title = updateData.title;
				} else if (typeof updateData.title === 'object' && updateData.title !== null) {
					update.title = updateData.title;
				}
			}

			// Update description if provided
			if (updateData.description !== undefined) {
				if (typeof updateData.description === 'string') {
					update.description = updateData.description;
				} else if (
					typeof updateData.description === 'object' &&
					updateData.description !== null
				) {
					update.description = updateData.description;
				} else if (updateData.description === null || updateData.description === '') {
					update.description = '';
				}
			}

			// Update boolean flags
			if (updateData.isPublished !== undefined) {
				update.isPublished = updateData.isPublished;
			}
			if (updateData.isLeading !== undefined) {
				update.isLeading = updateData.isLeading;
			}
			if (updateData.isGalleryLeading !== undefined) {
				update.isGalleryLeading = updateData.isGalleryLeading;
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

			// Update people if provided
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
				} else if (
					typeof updateData.location === 'object' &&
					updateData.location &&
					(updateData.location as { _id?: string })._id
				) {
					update.location = new Types.ObjectId((updateData.location as { _id: string })._id);
				}
			}

			// Update EXIF data if provided (merge into existing so overrides don't wipe other fields)
			if (updateData.exif !== undefined && typeof updateData.exif === 'object' && updateData.exif !== null) {
				for (const [key, value] of Object.entries(updateData.exif)) {
					if (key && value !== undefined && value !== null && value !== '') {
						// Store date fields as Date for MongoDB
						if ((key === 'dateTime' || key === 'dateTimeOriginal' || key === 'dateTimeDigitized') && typeof value === 'string') {
							update[`exif.${key}`] = new Date(value);
						} else {
							update[`exif.${key}`] = value;
						}
					}
				}
			}

			// Update metadata if provided
			if (updateData.metadata !== undefined) {
				update.metadata = updateData.metadata;
			}

			// Perform update
			const result = await db
				.collection('photos')
				.updateOne({ _id: objectId }, { $set: update });

			if (result.matchedCount === 0) {
				throw new NotFoundException('Photo not found');
			}

			// Fetch updated photo
			const updatedPhoto = await db.collection('photos').findOne({ _id: objectId });

			if (!updatedPhoto) {
				throw new NotFoundException('Photo not found after update');
			}

			// Serialize ObjectIds
			const serialized: any = {
				...updatedPhoto,
				_id: updatedPhoto._id.toString(),
				albumId: updatedPhoto.albumId ? updatedPhoto.albumId.toString() : null,
				tags: updatedPhoto.tags
					? updatedPhoto.tags.map((tag: any) =>
							tag._id ? tag._id.toString() : tag.toString()
						)
					: [],
				people: updatedPhoto.people
					? updatedPhoto.people.map((person: any) =>
							person._id ? person._id.toString() : person.toString()
						)
					: [],
				location: updatedPhoto.location
					? updatedPhoto.location._id
						? updatedPhoto.location._id.toString()
						: updatedPhoto.location.toString()
					: null,
				uploadedBy: updatedPhoto.uploadedBy ? updatedPhoto.uploadedBy.toString() : null,
			};

			// Ensure storage object is properly preserved
			if (updatedPhoto.storage) {
				serialized.storage = {
					provider: updatedPhoto.storage.provider || 'local',
					fileId: updatedPhoto.storage.fileId || '',
					url: updatedPhoto.storage.url || '',
					path: updatedPhoto.storage.path || '',
					thumbnailPath:
						updatedPhoto.storage.thumbnailPath || updatedPhoto.storage.url || '',
					thumbnails: updatedPhoto.storage.thumbnails || {},
					blurDataURL: updatedPhoto.storage.blurDataURL,
					bucket: updatedPhoto.storage.bucket,
					folderId: updatedPhoto.storage.folderId,
				};
			}

			return serialized;
		} catch (error) {
			this.logger.error('Failed to update photo:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update photo: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Delete a photo (admin or owner of the photo's album)
	 * Path: DELETE /api/admin/photos/:id
	 */
	@Delete(':id')
	async deletePhoto(@Param('id') id: string, @Req() req: Request) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}
			if ((req as any).user?.role === 'owner') {
				await this.assertOwnerCanAccessPhoto(req, photo, db);
			}

			// Delete the photo file from storage if storage info exists
			if (photo.storage && photo.storage.provider && photo.storage.path) {
				try {
					const storageManager = StorageManager.getInstance();
					const provider = photo.storage.provider as any;
					this.logger.debug(`Deleting photo file from storage: provider=${provider}, path=${photo.storage.path}`);
					
					// Helper function to extract path from URL
					const extractPathFromUrl = (url: string): string | null => {
						if (!url || typeof url !== 'string') return null;
						// URL format: /api/storage/serve/{provider}/{path}
						const urlMatch = url.match(/\/api\/storage\/serve\/[^/]+\/(.+)$/);
						if (urlMatch && urlMatch[1]) {
							try {
								return decodeURIComponent(urlMatch[1]);
							} catch {
								return urlMatch[1]; // Return as-is if decoding fails
							}
						}
						// If it's already a path (not a URL), return as-is
						if (!url.startsWith('/api/storage/serve/')) {
							return url;
						}
						return null;
					};
					
					// Delete main photo file
					await storageManager.deletePhoto(photo.storage.path, provider);
					this.logger.debug(`Successfully deleted main photo file: ${photo.storage.path}`);
					
					// Delete thumbnails if they exist
					if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
						for (const [size, thumbnailUrl] of Object.entries(photo.storage.thumbnails)) {
							try {
								const thumbnailPath = extractPathFromUrl(thumbnailUrl as string);
								if (thumbnailPath && thumbnailPath !== photo.storage.path) {
									this.logger.debug(`Deleting ${size} thumbnail: ${thumbnailPath}`);
									await storageManager.deletePhoto(thumbnailPath, provider);
									this.logger.debug(`Successfully deleted ${size} thumbnail`);
								}
							} catch (thumbError) {
								this.logger.warn(`Failed to delete ${size} thumbnail:`, thumbError);
								// Continue with other thumbnails even if one fails
							}
						}
					}
					
					// Also try to delete thumbnailPath if it's different from main path
					if (photo.storage.thumbnailPath) {
						try {
							const thumbPath = extractPathFromUrl(photo.storage.thumbnailPath);
							if (thumbPath && thumbPath !== photo.storage.path) {
								// Check if we already deleted this path (might be in thumbnails object)
								const alreadyDeleted = photo.storage.thumbnails && 
									Object.values(photo.storage.thumbnails).some(url => {
										const path = extractPathFromUrl(url as string);
										return path === thumbPath;
									});
								
								if (!alreadyDeleted) {
									this.logger.debug(`Deleting thumbnail path: ${thumbPath}`);
									await storageManager.deletePhoto(thumbPath, provider);
									this.logger.debug(`Successfully deleted thumbnail path`);
								}
							}
						} catch (thumbError) {
							this.logger.warn(`Failed to delete thumbnail path:`, thumbError);
							// Continue even if thumbnail deletion fails
						}
					}
					
					this.logger.debug(`Successfully deleted all photo files from ${provider}`);
				} catch (storageError) {
					this.logger.error('Failed to delete photo from storage:', storageError);
					this.logger.error('Storage error details:', {
						provider: photo.storage?.provider,
						path: photo.storage?.path,
						error: storageError instanceof Error ? storageError.message : String(storageError)
					});
					// Log error but continue with database deletion
					// This ensures the database stays consistent even if storage deletion fails
				}
			} else {
				this.logger.warn('Photo has no storage information, skipping storage deletion');
			}

			// Delete the photo from database
			const result = await db.collection('photos').deleteOne({ _id: objectId });

			if (result.deletedCount === 0) {
				throw new NotFoundException('Photo not found');
			}

			// Update album photo count if album exists
			if (photo.albumId) {
				await db.collection('albums').updateOne(
					{ _id: photo.albumId },
					{ $inc: { photoCount: -1 } }
				);
			}

			return { success: true, message: 'Photo deleted successfully' };
		} catch (error) {
			this.logger.error('Failed to delete photo:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Bulk update photos (admin only)
	 * Path: POST /api/admin/photos/bulk-update
	 */
	@Post('bulk-update')
	async bulkUpdatePhotos(@Body() body: { photoIds: string[]; updates: any }) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const { photoIds, updates } = body;

			if (!Array.isArray(photoIds) || photoIds.length === 0) {
				throw new BadRequestException('photoIds must be a non-empty array');
			}

			// Validate all photo IDs
			const objectIds = photoIds.map((id) => {
				if (!Types.ObjectId.isValid(id)) {
					throw new BadRequestException(`Invalid photo ID format: ${id}`);
				}
				return new Types.ObjectId(id);
			});

			// Prepare update object
			const update: any = {
				updatedAt: new Date(),
			};

			// Update isPublished if provided
			if (updates.isPublished !== undefined) {
				update.isPublished = updates.isPublished;
			}

			// Update location if provided
			if (updates.location !== undefined) {
				if (updates.location === null || updates.location === '') {
					update.location = null;
				} else if (Types.ObjectId.isValid(updates.location)) {
					update.location = new Types.ObjectId(updates.location);
				} else if (
					typeof updates.location === 'object' &&
					updates.location._id
				) {
					update.location = new Types.ObjectId(updates.location._id);
				}
			}

			// Update tags if provided (replace with provided tag IDs)
			if (updates.tags !== undefined && Array.isArray(updates.tags)) {
				update.tags = updates.tags
					.filter((id: any) => id != null && Types.ObjectId.isValid(String(id)))
					.map((id: any) => new Types.ObjectId(String(id)));
			}

			// Update metadata if provided (merge into existing: rating, category, or custom keys)
			if (updates.metadata !== undefined && typeof updates.metadata === 'object') {
				for (const [key, value] of Object.entries(updates.metadata)) {
					if (key && value !== undefined) {
						update[`metadata.${key}`] = value;
					}
				}
			}

			// Update EXIF overrides if provided (merge into existing: dateTime, make, model, etc.)
			if (updates.exif !== undefined && typeof updates.exif === 'object' && updates.exif !== null) {
				for (const [key, value] of Object.entries(updates.exif)) {
					if (key && value !== undefined && value !== null && value !== '') {
						if ((key === 'dateTime' || key === 'dateTimeOriginal' || key === 'dateTimeDigitized') && typeof value === 'string') {
							update[`exif.${key}`] = new Date(value);
						} else {
							update[`exif.${key}`] = value;
						}
					}
				}
			}

			// Perform bulk update
			const result = await db
				.collection('photos')
				.updateMany({ _id: { $in: objectIds } }, { $set: update });

			return {
				success: true,
				matchedCount: result.matchedCount,
				modifiedCount: result.modifiedCount,
				message: `Updated ${result.modifiedCount} photo(s)`,
			};
		} catch (error) {
			this.logger.error('Failed to bulk update photos:', error);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to bulk update photos: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Bulk re-extract EXIF from photo files (admin only)
	 * Path: POST /api/admin/photos/bulk/re-extract-exif
	 */
	@Post('bulk/re-extract-exif')
	async bulkReExtractExif(@Body() body: { photoIds: string[] }) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const { photoIds } = body;
			if (!Array.isArray(photoIds) || photoIds.length === 0) {
				throw new BadRequestException('photoIds must be a non-empty array');
			}

			const objectIds = photoIds.map((id) => {
				if (!Types.ObjectId.isValid(id)) {
					throw new BadRequestException(`Invalid photo ID: ${id}`);
				}
				return new Types.ObjectId(id);
			});

			const photos = await db.collection('photos').find({ _id: { $in: objectIds } }).toArray();
			let processedCount = 0;
			let failedCount = 0;
			const errors: { photoId: string; error: string }[] = [];

			for (const photo of photos) {
				try {
					await ExifExtractor.extractAndUpdateExif(photo, { force: true });
					processedCount++;
				} catch (err) {
					failedCount++;
					errors.push({
						photoId: photo._id.toString(),
						error: err instanceof Error ? err.message : String(err),
					});
				}
			}

			return {
				success: true,
				processedCount,
				failedCount,
				totalRequested: photoIds.length,
				...(errors.length > 0 && { errors }),
				message: `Re-extracted EXIF for ${processedCount} photo(s)` + (failedCount > 0 ? `; ${failedCount} failed.` : ''),
			};
		} catch (error) {
			this.logger.error(`Bulk re-extract EXIF failed: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Bulk re-extract EXIF failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Regenerate thumbnails for a photo
	 * Path: POST /api/admin/photos/:id/regenerate-thumbnails
	 */
	@Post(':id/regenerate-thumbnails')
	async regenerateThumbnails(@Param('id') id: string) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });

			if (!photo) {
				throw new NotFoundException('Photo not found');
			}

			if (!photo.storage || !photo.storage.path || !photo.storage.provider) {
				throw new BadRequestException('Photo does not have valid storage information');
			}

			const storageManager = StorageManager.getInstance();
			const provider = photo.storage.provider as any;
			const filePath = photo.storage.path;

			// Get the original image file buffer
			const storageService = await storageManager.getProvider(provider);
			const fileBuffer = await storageService.getFileBuffer(filePath);

			if (!fileBuffer) {
				throw new InternalServerErrorException('Failed to download original image from storage');
			}

			// Get album path for thumbnail folder structure
			let albumPath = '';
			if (photo.albumId) {
				const album = await db.collection('albums').findOne({ _id: photo.albumId });
				if (album && album.storagePath) {
					albumPath = album.storagePath;
				}
			}

			// Generate new thumbnails with correct orientation
			const thumbnailBuffers = await ThumbnailGenerator.generateAllThumbnails(fileBuffer, photo.filename);
			const thumbnails: Record<string, string> = {};

			// Delete old thumbnails first
			const extractPathFromUrl = (url: string): string | null => {
				if (!url) return null;
				if (url.startsWith('/api/storage/serve/')) {
					const match = url.match(/\/serve\/[^/]+\/(.+)$/);
					return match ? decodeURIComponent(match[1]) : null;
				}
				return url;
			};

			if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
				for (const [size, thumbnailUrl] of Object.entries(photo.storage.thumbnails)) {
					try {
						const thumbnailPath = extractPathFromUrl(thumbnailUrl as string);
						if (thumbnailPath && thumbnailPath !== photo.storage.path) {
							this.logger.debug(`Deleting old ${size} thumbnail: ${thumbnailPath}`);
							await storageManager.deletePhoto(thumbnailPath, provider);
						}
					} catch (thumbError) {
						this.logger.warn(`Failed to delete ${size} thumbnail:`, thumbError);
					}
				}
			}

			// Upload new thumbnails
			for (const [sizeName, buffer] of Object.entries(thumbnailBuffers)) {
				try {
					const sizeConfig = ThumbnailGenerator.getThumbnailSize(sizeName as any);
					const thumbnailFilename = `${sizeName}-${photo.filename}`;
					const sizeFolderPath = albumPath ? `${albumPath}/${sizeConfig.folder}` : sizeConfig.folder;

					const thumbnailResult = await storageService.uploadFile(
						buffer,
						thumbnailFilename,
						'image/jpeg',
						sizeFolderPath,
						{
							originalFile: photo.filename,
							thumbnailSize: sizeName
						}
					);

					thumbnails[sizeName] = `/api/storage/serve/${provider}/${encodeURIComponent(thumbnailResult.path)}`;
					this.logger.debug(`Successfully regenerated ${sizeName} thumbnail`);
				} catch (error) {
					this.logger.error(`Failed to upload ${sizeName} thumbnail:`, error);
				}
			}

			// Generate new blur placeholder
			const blurDataURL = await ThumbnailGenerator.generateBlurPlaceholder(fileBuffer);
			const mediumThumbnail = thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0];

			// Update photo document with new thumbnails
			const updateResult = await db.collection('photos').updateOne(
				{ _id: objectId },
				{
					$set: {
						'storage.thumbnails': thumbnails,
						'storage.thumbnailPath': mediumThumbnail,
						'storage.blurDataURL': blurDataURL,
						updatedAt: new Date()
					}
				}
			);

			if (updateResult.modifiedCount === 0) {
				throw new InternalServerErrorException('Failed to update photo with new thumbnails');
			}

			// Fetch updated photo
			const updatedPhoto = await db.collection('photos').findOne({ _id: objectId });

			if (!updatedPhoto) {
				throw new NotFoundException('Photo not found after thumbnail regeneration');
			}

			// Serialize ObjectIds
			const serialized: any = {
				...updatedPhoto,
				_id: updatedPhoto._id.toString(),
				albumId: updatedPhoto.albumId ? updatedPhoto.albumId.toString() : null,
				tags: updatedPhoto.tags
					? updatedPhoto.tags.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString()))
					: [],
				people: updatedPhoto.people
					? updatedPhoto.people.map((person: any) =>
							person._id ? person._id.toString() : person.toString()
						)
					: [],
				location: updatedPhoto.location
					? updatedPhoto.location._id
						? updatedPhoto.location._id.toString()
						: updatedPhoto.location.toString()
					: null,
				uploadedBy: updatedPhoto.uploadedBy ? updatedPhoto.uploadedBy.toString() : null,
			};

			// Ensure storage object is properly preserved
			if (updatedPhoto.storage) {
				serialized.storage = {
					provider: updatedPhoto.storage.provider || 'local',
					fileId: updatedPhoto.storage.fileId || '',
					url: updatedPhoto.storage.url || '',
					path: updatedPhoto.storage.path || '',
					thumbnailPath: updatedPhoto.storage.thumbnailPath || updatedPhoto.storage.url || '',
					thumbnails: updatedPhoto.storage.thumbnails || {},
					blurDataURL: updatedPhoto.storage.blurDataURL,
					bucket: updatedPhoto.storage.bucket,
					folderId: updatedPhoto.storage.folderId,
				};
			}

			return {
				success: true,
				message: 'Thumbnails regenerated successfully',
				data: serialized
			};
		} catch (error) {
			this.logger.error('Failed to regenerate thumbnails:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to regenerate thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Re-extract EXIF from the photo file and update the database
	 * Path: POST /api/admin/photos/:id/re-extract-exif
	 */
	@Post(':id/re-extract-exif')
	async reExtractExif(@Param('id') id: string) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (_error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}
			if (!photo.storage?.path) {
				throw new BadRequestException('Photo does not have storage path');
			}

			const updatedPhoto = await ExifExtractor.extractAndUpdateExif(photo, { force: true });
			const serialized: any = {
				...updatedPhoto,
				_id: updatedPhoto._id.toString(),
				albumId: updatedPhoto.albumId ? updatedPhoto.albumId.toString() : null,
				tags: updatedPhoto.tags
					? updatedPhoto.tags.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString()))
					: [],
				people: updatedPhoto.people
					? updatedPhoto.people.map((person: any) =>
							person._id ? person._id.toString() : person.toString()
						)
					: [],
				location: updatedPhoto.location
					? (updatedPhoto.location._id
						? updatedPhoto.location._id.toString()
						: updatedPhoto.location.toString())
					: null,
				uploadedBy: updatedPhoto.uploadedBy ? updatedPhoto.uploadedBy.toString() : null,
			};
			if (updatedPhoto.storage) {
				serialized.storage = {
					provider: updatedPhoto.storage.provider || 'local',
					fileId: updatedPhoto.storage.fileId || '',
					url: updatedPhoto.storage.url || '',
					path: updatedPhoto.storage.path || '',
					thumbnailPath: updatedPhoto.storage.thumbnailPath || updatedPhoto.storage.url || '',
					thumbnails: updatedPhoto.storage.thumbnails || {},
					blurDataURL: updatedPhoto.storage.blurDataURL,
					bucket: updatedPhoto.storage.bucket,
					folderId: updatedPhoto.storage.folderId,
				};
			}
			return {
				success: true,
				message: 'EXIF data re-extracted successfully',
				data: serialized,
			};
		} catch (error) {
			this.logger.error(`Failed to re-extract EXIF: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to re-extract EXIF: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}
