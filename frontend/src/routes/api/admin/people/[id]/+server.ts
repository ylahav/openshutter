import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, backendDelete, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;

		const response = await backendGet(`/admin/people/${id}`, { cookies });
		const person = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: person
		});
	} catch (error) {
		logger.error('Get person error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch person' 
		}, { status: parsed.status || 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;
		const body = await request.json();

		const response = await backendPut(`/admin/people/${id}`, body, { cookies });
		const person = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: person
		});
	} catch (error) {
		logger.error('Update person error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to update person' 
		}, { status: parsed.status || 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;

		const response = await backendDelete(`/admin/people/${id}`, { cookies });
		const result = await parseBackendResponse<{ success: boolean; message: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Person deleted successfully'
		});
	} catch (error) {
		logger.error('Delete person error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to delete person' 
		}, { status: parsed.status || 500 });
	}
};
