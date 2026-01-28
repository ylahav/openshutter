import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

// Language metadata mapping
const languageMetadata: Record<string, { name: string; flag: string }> = {
	en: { name: 'English', flag: '🇺🇸' },
	he: { name: 'Hebrew', flag: '🇮🇱' },
	ar: { name: 'Arabic', flag: '🇸🇦' },
	es: { name: 'Spanish', flag: '🇪🇸' },
	fr: { name: 'French', flag: '🇫🇷' },
	de: { name: 'German', flag: '🇩🇪' },
	it: { name: 'Italian', flag: '🇮🇹' },
	pt: { name: 'Portuguese', flag: '🇵🇹' },
	ru: { name: 'Russian', flag: '🇷🇺' },
	ja: { name: 'Japanese', flag: '🇯🇵' },
	ko: { name: 'Korean', flag: '🇰🇷' },
	zh: { name: 'Chinese', flag: '🇨🇳' },
	nl: { name: 'Dutch', flag: '🇳🇱' },
	sv: { name: 'Swedish', flag: '🇸🇪' },
	no: { name: 'Norwegian', flag: '🇳🇴' },
	da: { name: 'Danish', flag: '🇩🇰' },
	fi: { name: 'Finnish', flag: '🇫🇮' },
	pl: { name: 'Polish', flag: '🇵🇱' },
	tr: { name: 'Turkish', flag: '🇹🇷' },
	hi: { name: 'Hindi', flag: '🇮🇳' }
};

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// In production, i18n files are bundled, so we can't read them from disk
		// Instead, we'll check multiple possible locations and fall back to metadata
		let languageFiles: string[] = [];
		
		// Try to find i18n directory in different locations
		const possiblePaths = [
			join(process.cwd(), 'src', 'i18n'),  // Development
			join(process.cwd(), 'build', 'server', 'chunks', 'i18n'),  // Production (if copied)
			join(process.cwd(), '..', 'src', 'i18n'),  // Alternative location
		];
		
		for (const i18nPath of possiblePaths) {
			if (existsSync(i18nPath)) {
				try {
					const files = await readdir(i18nPath);
					languageFiles = files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));
					break; // Found it, stop looking
				} catch (error) {
					// Continue to next path
					continue;
				}
			}
		}
		
		// If no files found, use known languages from metadata (en, he are always available)
		if (languageFiles.length === 0) {
			// Return languages that we know exist (from imports in i18n.ts)
			languageFiles = ['en', 'he']; // These are imported in frontend/src/lib/stores/i18n.ts
		}

		// Map language codes to their metadata
		const availableLanguages = languageFiles.map((code) => {
			const metadata = languageMetadata[code] || {
				name: code.toUpperCase(),
				flag: '🌐'
			};
			return {
				code,
				name: metadata.name,
				flag: metadata.flag
			};
		});

		// Sort languages alphabetically by name
		availableLanguages.sort((a, b) => a.name.localeCompare(b.name));

		return json({
			success: true,
			data: availableLanguages
		});
	} catch (error) {
		logger.error('Error reading language files:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to load available languages: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
