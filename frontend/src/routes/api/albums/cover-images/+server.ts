import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const response = await backendPost('/albums/cover-images', body, { cookies });
		const result = await parseBackendResponse<Record<string, string>>(response);

		// Backend returns Record<string, string> directly (albumId -> coverImageUrl)
		// parseBackendResponse extracts the data if it's wrapped, or returns it directly
		const coverImagesData = result && typeof result === 'object' ? result : {};
		
		const wrappedResponse = {
			success: true,
			data: coverImagesData
		};
		
		console.log('Cover images API route - returning:', {
			hasData: Object.keys(coverImagesData).length > 0,
			albumCount: Object.keys(coverImagesData).length,
			responseStructure: 'wrapped'
		});
		
		return json(wrappedResponse);
	} catch (error) {
		console.error('Error getting album cover images:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album cover images: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
