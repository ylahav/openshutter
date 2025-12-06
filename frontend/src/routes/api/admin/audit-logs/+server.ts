import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';

type AuditAction = 'album.view.allow' | 'album.view.deny' | 'photo.view.allow' | 'photo.view.deny';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const { db } = await connectToDatabase();
		const searchParams = url.searchParams;

		// Get query parameters
		const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
		const skip = parseInt(searchParams.get('skip') || '0');
		const actionParam = searchParams.get('action') || undefined;
		const userId = searchParams.get('userId') || undefined;
		const resourceType = (searchParams.get('resourceType') as 'album' | 'photo') || undefined;
		const resourceId = searchParams.get('resourceId') || undefined;
		const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;
		const until = searchParams.get('until') ? new Date(searchParams.get('until')!) : undefined;

		// Build query
		const query: any = {};

		// Handle action filter
		if (actionParam) {
			const allowed: AuditAction[] = [
				'album.view.allow',
				'album.view.deny',
				'photo.view.allow',
				'photo.view.deny'
			];
			const parts = actionParam.split(',').map((s) => s.trim()).filter(Boolean);
			const filtered = parts.filter((p): p is AuditAction => allowed.includes(p as AuditAction));
			if (filtered.length === 1) {
				query.action = filtered[0];
			} else if (filtered.length > 1) {
				query.action = { $in: filtered };
			}
		}

		if (userId) {
			query.userId = userId;
		}

		if (resourceType) {
			query.resourceType = resourceType;
		}

		if (resourceId) {
			query.resourceId = resourceId;
		}

		if (since || until) {
			query.timestamp = {};
			if (since) {
				query.timestamp.$gte = since;
			}
			if (until) {
				query.timestamp.$lte = until;
			}
		}

		// Fetch audit logs
		const logs = await db
			.collection('audit_logs')
			.find(query)
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		// Normalize _id to string
		const data = logs.map((log: any) => ({
			...log,
			_id: String(log._id)
		}));

		return json({
			success: true,
			data
		});
	} catch (error) {
		console.error('API: Error fetching audit logs:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to fetch audit logs: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
