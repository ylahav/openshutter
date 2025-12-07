import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StorageManager } from '$lib/services/storage/manager';

export const GET: RequestHandler = async () => {
	try {
		// Use the storage manager to get the Google Drive service
		const storageManager = StorageManager.getInstance();
		const googleDrive = await storageManager.getProvider('google-drive');

		// Test connection
		const isValid = await googleDrive.validateConnection();

		if (!isValid) {
			return json(
				{
					success: false,
					error: 'Failed to validate Google Drive connection'
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			message: 'Google Drive connection successful',
			config: {
				provider: 'google-drive',
				status: 'active'
			}
		});
	} catch (error) {
		console.error('Google Drive test failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
