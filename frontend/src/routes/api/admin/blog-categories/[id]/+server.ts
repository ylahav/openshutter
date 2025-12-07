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

		const response = await backendGet(`/admin/blog-categories/${id}`, { cookies });
		const category = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: category
		});
	} catch (error) {
		console.error('Get blog category error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to fetch blog category' }, { status: 500 });
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

		const response = await backendPut(`/admin/blog-categories/${id}`, body, { cookies });
		const category = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: category,
			message: 'Blog category updated successfully'
		});
	} catch (error) {
		console.error('Update blog category error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to update blog category' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const response = await backendDelete(`/admin/blog-categories/${id}`, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Blog category deleted successfully'
		});
	} catch (error) {
		console.error('Delete blog category error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to delete blog category' }, { status: 500 });
	}
};
