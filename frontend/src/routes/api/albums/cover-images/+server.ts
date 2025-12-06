import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AlbumLeadingPhotoService } from '$lib/services/album-leading-photo';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { albumIds } = body;

		if (!Array.isArray(albumIds)) {
			return json({ success: false, error: 'albumIds must be an array' }, { status: 400 });
		}

		const coverImages = await AlbumLeadingPhotoService.getMultipleAlbumCoverImageUrls(albumIds);

		// Convert Map to object for JSON response
		const result: Record<string, string> = {};
		for (const [albumId, url] of coverImages) {
			result[albumId] = url;
		}

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Error getting album cover images:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album cover images: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
