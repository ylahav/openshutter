import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { storageManager } from '$lib/services/storage/manager';

export const GET: RequestHandler = async () => {
	try {
		const ok = await storageManager.validateProvider('wasabi');
		if (!ok) {
			return json({ success: false, error: 'Wasabi validation failed' }, { status: 500 });
		}
		return json({ success: true });
	} catch (error: any) {
		return json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
	}
};
