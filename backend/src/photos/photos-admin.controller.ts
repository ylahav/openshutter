import {
	Controller,
	Get,
	Put,
	Delete,
	Param,
	Body,
	UseGuards,
	BadRequestException,
	NotFoundException,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';

@Controller('admin/photos')
@UseGuards(AdminGuard)
export class PhotosAdminController {
	/**
	 * Get a photo by ID (admin only - includes unpublished)
	 * Path: GET /api/admin/photos/:id
	 */
	@Get(':id')
	async getPhoto(@Param('id') id: string) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new Error('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (error) {
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
			console.error('Failed to get photo:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new Error(
				`Failed to get photo: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Update a photo (admin only)
	 * Path: PUT /api/admin/photos/:id
	 */
	@Put(':id')
	async updatePhoto(@Param('id') id: string, @Body() updateData: any) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new Error('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (error) {
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
			console.error('Failed to update photo:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new Error(
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
			if (!db) throw new Error('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(id);
			} catch (error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}

			// Delete the photo
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
			console.error('Failed to delete photo:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new Error(
				`Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}

