import {
	Controller,
	Get,
	Put,
	Post,
	Delete,
	Param,
	Body,
	UseGuards,
	BadRequestException,
	NotFoundException,
	Logger,
	InternalServerErrorException,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { StorageManager } from '../services/storage/manager';
import { ThumbnailGenerator } from '../services/thumbnail-generator';
import { UpdatePhotoDto } from './dto/update-photo.dto';

@Controller('admin/photos')
@UseGuards(AdminGuard)
export class PhotosAdminController {
	private readonly logger = new Logger(PhotosAdminController.name);
	/**
	 * Get a photo by ID (admin only - includes unpublished)
	 * Path: GET /api/admin/photos/:id
	 */
	@Get(':id')
	async getPhoto(@Param('id') id: string) {
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

			return serialized;
		} catch (error) {
			this.logger.error(`Failed to get photo: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to get photo: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Update a photo (admin only)
	 * Path: PUT /api/admin/photos/:id
	 */
	@Put(':id')
	async updatePhoto(@Param('id') id: string, @Body() updateData: UpdatePhotoDto) {
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
			if (updateData.tags !== undefined && Array.isArray(updateData.tags)) {
				update.tags = updateData.tags
					.filter((tagId: any) => tagId && Types.ObjectId.isValid(tagId))
					.map((tagId: string) => new Types.ObjectId(tagId));
			}

			// Update people if provided
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
				} else if (
					typeof updateData.location === 'object' &&
					updateData.location._id
				) {
					update.location = new Types.ObjectId(updateData.location._id);
				}
			}

			// Update EXIF data if provided
			if (updateData.exif !== undefined) {
				update.exif = updateData.exif;
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
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new InternalServerErrorException(
				`Failed to update photo: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Delete a photo (admin only)
	 * Path: DELETE /api/admin/photos/:id
	 */
	@Delete(':id')
	async deletePhoto(@Param('id') id: string) {
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
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
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
}
