import { packClassPrefixFor } from '$lib/template/packs/class-prefix';

/**
 * Build alias candidates for template-specific pages while keeping clean URLs.
 * Example: URL `/about` on studio => `s-about` first, then `about`.
 */
export function buildTemplateAwareAliasCandidates(
	baseAlias: string | null | undefined,
	packId: string | null | undefined,
): string[] {
	const alias = String(baseAlias ?? '').trim();
	if (!alias) return [];

	const candidates: string[] = [];
	const prefix = packClassPrefixFor(packId);

	// Only prepend when alias is not already namespaced (e.g. `s-about`).
	if (prefix && !alias.includes('-')) {
		candidates.push(`${prefix}-${alias}`);
	}
	candidates.push(alias);

	return Array.from(new Set(candidates));
}

export function resolveSiteTemplatePack(siteConfig: unknown): string | undefined {
	const cfg = siteConfig as
		| {
				template?: {
					frontendTemplate?: string | null;
					activeTemplate?: string | null;
				} | null;
		  }
		| null
		| undefined;

	const frontendTemplate = cfg?.template?.frontendTemplate;
	if (typeof frontendTemplate === 'string' && frontendTemplate.trim()) {
		return frontendTemplate.trim();
	}

	const activeTemplate = cfg?.template?.activeTemplate;
	if (typeof activeTemplate === 'string' && activeTemplate.trim()) {
		return activeTemplate.trim();
	}

	return undefined;
}
