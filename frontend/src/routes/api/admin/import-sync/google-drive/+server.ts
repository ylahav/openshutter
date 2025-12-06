import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Import & Sync functionality temporarily disabled
// This is a placeholder route that returns a disabled message

export const GET: RequestHandler = async () => {
	return json(
		{
			success: false,
			error: 'Import & Sync functionality is temporarily disabled'
		},
		{ status: 503 }
	);
};

export const POST: RequestHandler = async () => {
	return json(
		{
			success: false,
			error: 'Import & Sync functionality is temporarily disabled'
		},
		{ status: 503 }
	);
};

