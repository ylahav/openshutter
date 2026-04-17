import { page } from '$app/stores';
import { siteConfigData } from '$stores/siteConfig';
import { fromStore, toStore, type Readable } from 'svelte/store';
import type { TemplatePackId } from '$lib/template-packs/ids';
import {
	getConfiguredPackId,
	resolveVisitorTemplatePackId,
	type PageDataForPack
} from '$lib/template-packs/resolve-visitor-pack';

const pageRef = fromStore(page);
const configRef = fromStore(siteConfigData);

const activeTemplateId = $derived.by(() => {
	const cfg = configRef.current;
	let pathname = '/';
	let pageData: PageDataForPack = undefined;
	try {
		const p = pageRef.current;
		pathname = p.url.pathname;
		pageData = p.data as PageDataForPack;
	} catch {
		/* No request / component context (e.g. Vitest importing pack Login → LoginTemplateSwitcher). */
		return getConfiguredPackId(cfg);
	}
	return resolveVisitorTemplatePackId(pathname, cfg, pageData);
});

/**
 * Resolved visitor pack id (`noir` | `studio` | `atelier`).
 * Implemented with Svelte 5 runes + `toStore` so routes still use `$activeTemplate` while sources stay stores (`page`, `siteConfigData`).
 */
export const activeTemplate: Readable<TemplatePackId> = toStore(() => activeTemplateId);
