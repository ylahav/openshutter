import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const response = await backendPost('/contact-submissions', body, { cookies });
    const result = await parseBackendResponse<any>(response);
    return json({ success: true, data: result });
  } catch (error) {
    logger.error('Contact submissions API error:', error);
    const parsed = parseError(error);
    return json(
      {
        success: false,
        error: parsed.userMessage || 'Failed to submit contact form',
      },
      { status: parsed.status || 500 },
    );
  }
};

export const GET: RequestHandler = async ({ url, cookies }) => {
  try {
    const q = url.searchParams.toString();
    const endpoint = `/contact-submissions/admin${q ? `?${q}` : ''}`;
    const response = await backendGet(endpoint, { cookies });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const backendError =
        typeof result?.error === 'string'
          ? result.error
          : typeof result?.message === 'string'
            ? result.message
            : 'Failed to fetch contact submissions';
      return json(
        {
          success: false,
          error: backendError,
        },
        { status: response.status || 500 },
      );
    }

    // Keep backend envelope shape (`{ success, data, pagination }`) intact for admin table.
    return json(result);
  } catch (error) {
    logger.error('Contact submissions admin API error:', error);
    const parsed = parseError(error);
    return json(
      {
        success: false,
        error: parsed.userMessage || 'Failed to fetch contact submissions',
      },
      { status: parsed.status || 500 },
    );
  }
};
