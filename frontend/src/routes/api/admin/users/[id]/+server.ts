import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, backendDelete, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const response = await backendGet(`/admin/users/${id}`, { cookies });
		const user = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: user
		});
	} catch (error) {
		console.error('Get user error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to fetch user' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();

		const response = await backendPut(`/admin/users/${id}`, body, { cookies });
		const user = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: user
		});
	} catch (error) {
		console.error('Update user error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to update user' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const response = await backendDelete(`/admin/users/${id}`, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message
		});
	} catch (error) {
		console.error('Delete user error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to delete user' }, { status: 500 });
	}
};
