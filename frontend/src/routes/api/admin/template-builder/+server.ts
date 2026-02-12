import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, backendPut, backendDelete, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const templateId = url.searchParams.get('templateId');
		const endpoint = templateId 
			? `/admin/theme-builder/${templateId}`
			: '/admin/theme-builder';

		const response = await backendGet(endpoint, { cookies });
		const data = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: Array.isArray(data) ? data : [data]
		});
	} catch (error) {
		logger.error('API: Failed to get template builder:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to get template builder' 
		}, { status: parsed.status || 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const action = url.searchParams.get('action');
		const templateId = url.searchParams.get('templateId');
		const body = await request.json();

		// Handle different POST actions
		if (action === 'addLocation' && templateId) {
			const response = await backendPost(`/admin/theme-builder/${templateId}/locations`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'addModule' && templateId) {
			const response = await backendPost(`/admin/theme-builder/${templateId}/modules`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'assignModule' && templateId) {
			const response = await backendPost(`/admin/theme-builder/${templateId}/assignments`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'addPage' && templateId) {
			const response = await backendPost(`/admin/theme-builder/${templateId}/pages`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'assignModuleToPage' && templateId) {
			const pageId = url.searchParams.get('pageId');
			if (!pageId) {
				return json({ success: false, error: 'Page ID is required' }, { status: 400 });
			}
			const response = await backendPost(`/admin/theme-builder/${templateId}/pages/${pageId}/assignments`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else {
			// Create new template
			const response = await backendPost('/admin/theme-builder', body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		}
	} catch (error) {
		logger.error('API: Failed to create template builder item:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to create template builder item' 
		}, { status: parsed.status || 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const action = url.searchParams.get('action');
		const templateId = url.searchParams.get('templateId');
		const body = await request.json();

		if (!templateId) {
			return json({ success: false, error: 'Template ID is required' }, { status: 400 });
		}

		// Handle different PUT actions
		if (action === 'updateLocation') {
			const locationId = url.searchParams.get('locationId');
			if (!locationId) {
				return json({ success: false, error: 'Location ID is required' }, { status: 400 });
			}
			const response = await backendPut(`/admin/theme-builder/${templateId}/locations/${locationId}`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'updateModule') {
			const moduleId = url.searchParams.get('moduleId');
			if (!moduleId) {
				return json({ success: false, error: 'Module ID is required' }, { status: 400 });
			}
			const response = await backendPut(`/admin/theme-builder/${templateId}/modules/${moduleId}`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'updateAssignmentOrder') {
			const locationId = url.searchParams.get('locationId');
			const moduleId = url.searchParams.get('moduleId');
			if (!locationId || !moduleId) {
				return json({ success: false, error: 'Location ID and Module ID are required' }, { status: 400 });
			}
			const response = await backendPut(`/admin/theme-builder/${templateId}/assignments/${locationId}/${moduleId}`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'updateGrid') {
			// Update grid configuration (gridRows, gridColumns)
			const response = await backendPut(`/admin/theme-builder/${templateId}`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else {
			// Update template
			const response = await backendPut(`/admin/theme-builder/${templateId}`, body, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		}
	} catch (error) {
		logger.error('API: Failed to update template builder item:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to update template builder item' 
		}, { status: parsed.status || 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const action = url.searchParams.get('action');
		const templateId = url.searchParams.get('templateId');

		if (!templateId) {
			return json({ success: false, error: 'Template ID is required' }, { status: 400 });
		}

		// Handle different DELETE actions
		if (action === 'deleteLocation') {
			const locationId = url.searchParams.get('locationId');
			if (!locationId) {
				return json({ success: false, error: 'Location ID is required' }, { status: 400 });
			}
			const response = await backendDelete(`/admin/theme-builder/${templateId}/locations/${locationId}`, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'deleteModule') {
			const moduleId = url.searchParams.get('moduleId');
			if (!moduleId) {
				return json({ success: false, error: 'Module ID is required' }, { status: 400 });
			}
			const response = await backendDelete(`/admin/theme-builder/${templateId}/modules/${moduleId}`, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'unassignModule') {
			const locationId = url.searchParams.get('locationId');
			const moduleId = url.searchParams.get('moduleId');
			if (!locationId || !moduleId) {
				return json({ success: false, error: 'Location ID and Module ID are required' }, { status: 400 });
			}
			const response = await backendDelete(`/admin/theme-builder/${templateId}/assignments/${locationId}/${moduleId}`, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'deletePage') {
			const pageId = url.searchParams.get('pageId');
			if (!pageId) {
				return json({ success: false, error: 'Page ID is required' }, { status: 400 });
			}
			const response = await backendDelete(`/admin/theme-builder/${templateId}/pages/${pageId}`, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else if (action === 'unassignModuleFromPage') {
			const pageId = url.searchParams.get('pageId');
			const locationId = url.searchParams.get('locationId');
			const moduleId = url.searchParams.get('moduleId');
			if (!pageId || !locationId || !moduleId) {
				return json({ success: false, error: 'Page ID, Location ID and Module ID are required' }, { status: 400 });
			}
			const response = await backendDelete(`/admin/theme-builder/${templateId}/pages/${pageId}/assignments/${locationId}/${moduleId}`, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		} else {
			// Delete template
			const response = await backendDelete(`/admin/theme-builder/${templateId}`, { cookies });
			const data = await parseBackendResponse<any>(response);
			return json({ success: true, data });
		}
	} catch (error) {
		logger.error('API: Failed to delete template builder item:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to delete template builder item' 
		}, { status: parsed.status || 500 });
	}
};
