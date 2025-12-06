import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AlbumLeadingPhotoService } from '$lib/services/album-leading-photo';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = await params;

		const result = await AlbumLeadingPhotoService.getAlbumLeadingPhoto(id);

		if (result.photo && result.photo.storage?.url) {
			return json({
				success: true,
				data: {
					url: result.photo.storage.url,
					source: result.source,
					albumId: result.albumId,
					photoId: result.photo._id instanceof ObjectId ? result.photo._id.toString() : String(result.photo._id)
				}
			});
		}

		// Try to get site logo as fallback
		try {
			const { db } = await connectToDatabase();
			const siteConfig = await db.collection('site-configs').findOne({});

			if (siteConfig && siteConfig.logo) {
				return json({
					success: true,
					data: {
						url: siteConfig.logo,
						source: 'site-logo',
						albumId: id,
						photoId: null
					}
				});
			}
		} catch (error) {
			console.error('Error fetching site logo:', error);
		}

		return json({
			success: false,
			error: 'No cover image found',
			data: {
				url: '/api/placeholder/400/300',
				source: 'placeholder',
				albumId: id,
				photoId: null
			}
		});
	} catch (error) {
		console.error('Error getting album cover image:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album cover image: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

