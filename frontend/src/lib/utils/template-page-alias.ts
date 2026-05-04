import { packClassPrefixFor } from '$lib/template/packs/class-prefix';

/**
 * Build alias candidates for template-specific pages while keeping clean URLs.
 * Example: URL `/about` on studio => `s-about` first, then `about` (prefix from pack definition or site overrides).
 */
export function buildTemplateAwareAliasCandidates(
	baseAlias: string | null | undefined,
	packId: string | null | undefined,
	pageAliasPrefixes?: Record<string, string> | null
): string[] {
	const alias = String(baseAlias ?? '').trim();
	if (!alias) return [];

	const candidates: string[] = [];
	const prefix = packClassPrefixFor(packId, pageAliasPrefixes);

	// Only prepend when alias is not already namespaced (e.g. `s-about`).
	if (prefix && !alias.includes('-')) {
		candidates.push(`${prefix}-${alias}`);
	}
	candidates.push(alias);

	return Array.from(new Set(candidates));
}

export function resolvePageAliasPrefixes(siteConfig: unknown): Record<string, string> | undefined {
	const raw = (siteConfig as { template?: { pageAliasPrefixes?: unknown } } | null | undefined)?.template
		?.pageAliasPrefixes;
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
	return raw as Record<string, string>;
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
