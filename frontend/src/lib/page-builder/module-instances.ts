/**
 * Generic module-instance resolution.
 *
 * A placement may set `props.instanceRef = "<name>"` to inherit props from a named,
 * reusable instance stored at `site_config.template.moduleInstances[type][name].props`.
 * Resolution merges instance props beneath placement props so the placement wins on
 * any key it explicitly sets — same precedence as `MenuModule`'s legacy resolution
 * for `menuInstances`.
 *
 * Sibling registries (`menuInstances`, `layoutShellInstances`) are unaffected; their
 * modules continue to resolve from their own pools. `menu` and `layoutShell` types
 * are skipped here so we don't double-resolve.
 */

import type { SiteConfig } from '$lib/types/site-config';

const SKIP_TYPES = new Set(['menu', 'layoutShell']);

export function getModuleInstanceProps(
	siteConfig: SiteConfig | null | undefined,
	type: string | undefined,
	instanceRef: string | null | undefined
): Record<string, unknown> | undefined {
	if (!type || !instanceRef) return undefined;
	const ref = String(instanceRef).trim();
	if (!ref) return undefined;
	const byType = siteConfig?.template?.moduleInstances?.[type];
	const entry = byType?.[ref];
	if (!entry || !entry.props || typeof entry.props !== 'object') return undefined;
	return entry.props as Record<string, unknown>;
}

/**
 * Return placement props with the named instance's props merged underneath.
 * If there's no `instanceRef`, no matching instance, or the type opts out, returns
 * the original placement props unchanged.
 */
export function resolveModuleProps(
	siteConfig: SiteConfig | null | undefined,
	type: string | undefined,
	placementProps: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
	if (!placementProps || typeof placementProps !== 'object') return placementProps;
	if (!type || SKIP_TYPES.has(type)) return placementProps;
	const ref = (placementProps as { instanceRef?: unknown }).instanceRef;
	const instanceProps = getModuleInstanceProps(siteConfig, type, typeof ref === 'string' ? ref : undefined);
	if (!instanceProps) return placementProps;
	return { ...instanceProps, ...placementProps };
}
