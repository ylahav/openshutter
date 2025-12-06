import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { connectToDatabase } from '$lib/mongodb';

type TemplateJson = {
	templateName: string;
	displayName: string;
	version: string;
	author?: string;
	description?: string;
	category?: string;
	features?: Record<string, any>;
	colors?: Record<string, string>;
	layout?: Record<string, string>;
	components?: Record<string, string>;
	visibility?: Record<string, boolean>;
	pages?: Record<string, string>;
	assets?: Record<string, string>;
	thumbnail?: string;
};

let cache: { data: TemplateJson[]; ts: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

async function readTemplatesFromDisk(): Promise<TemplateJson[]> {
	// In SvelteKit, we need to use the project root path
	// process.cwd() should work, but we need to adjust for the build structure
	const templatesDir = join(process.cwd(), 'src', 'templates');
	
	// Check if templates directory exists
	if (!existsSync(templatesDir)) {
		console.warn(`Templates directory not found: ${templatesDir}`);
		return [];
	}

	try {
		const entries = await readdir(templatesDir, { withFileTypes: true });
		const results: TemplateJson[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const dir = join(templatesDir, entry.name);
			const cfgPath = join(dir, 'template.config.json');

			try {
				const raw = await readFile(cfgPath, 'utf8');
				const json = JSON.parse(raw);

				// Minimal validation
				if (
					json &&
					typeof json.templateName === 'string' &&
					typeof json.displayName === 'string' &&
					typeof json.version === 'string'
				) {
					results.push(json as TemplateJson);
				}
			} catch (error) {
				// Ignore missing/invalid configs
				console.warn(`Failed to read template config for ${entry.name}:`, error);
			}
		}

		return results;
	} catch (error) {
		console.error('Error reading templates directory:', error);
		return [];
	}
}

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Check cache
		const now = Date.now();
		if (cache && now - cache.ts < CACHE_TTL_MS) {
			return json({ success: true, data: cache.data });
		}

		// Read templates from disk
		const templates = await readTemplatesFromDisk();
		cache = { data: templates, ts: now };

		return json({ success: true, data: templates });
	} catch (error) {
		console.error('API: Error getting templates:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to get templates: ${errorMessage}` }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { templateName } = body;

		if (!templateName || typeof templateName !== 'string') {
			return json({ success: false, error: 'templateName is required' }, { status: 400 });
		}

		console.log('API: Setting active template to:', templateName);

		// Update site config with new active template
		// This is handled by the site-config route, but we'll do it here for backward compatibility
		const { db } = await connectToDatabase();
		const collection = db.collection('site_config');

		await collection.updateOne(
			{},
			{
				$set: {
					'template.activeTemplate': templateName,
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		);

		console.log('API: Template set successfully');
		return json({ success: true, message: 'Template updated successfully' });
	} catch (error) {
		console.error('API: Error setting template:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to set template: ${errorMessage}` }, { status: 500 });
	}
};

