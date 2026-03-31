/**
 * When header/footer use PageRenderer (pageModules), the outer shell was generic.
 * These classes mirror each pack's Header.svelte / Footer.svelte root elements so
 * switching `frontendTemplate` still changes chrome even in page-builder mode.
 */
import type { PackHeaderId } from './header-visibility';

function normalizePackId(id: string | null | undefined): PackHeaderId {
	const k = String(id ?? 'default')
		.trim()
		.toLowerCase();
	if (k === 'minimal' || k === 'modern' || k === 'elegant' || k === 'default') return k;
	return 'default';
}

/** Matches `<header class="...">` on each pack's Header.svelte */
const HEADER_SHELL: Record<PackHeaderId, string> = {
	default:
		'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-sm border-b border-slate-200/90 dark:border-slate-700/80',
	minimal:
		'bg-white/95 dark:bg-neutral-950/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50 shadow-sm',
	modern:
		'bg-slate-100 dark:bg-gradient-to-r dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 shadow-lg sticky top-0 z-50 backdrop-blur-sm dark:bg-opacity-95 border-b border-slate-200 dark:border-purple-500/20',
	elegant:
		'bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-purple-500/30 sticky top-0 z-[100] shadow-2xl relative'
};

/** Matches `<footer class="...">` on each pack's Footer.svelte (page-builder outer wrapper uses w-full + these) */
const FOOTER_SHELL: Record<PackHeaderId, string> = {
	default: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
	minimal: 'bg-white dark:bg-gray-900 border-t border-black dark:border-gray-700',
	modern:
		'bg-slate-100 dark:bg-gradient-to-r dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-gray-900 dark:text-white border-t border-slate-200 dark:border-purple-500/20',
	elegant:
		'bg-gray-100 dark:bg-black/95 backdrop-blur-md border-t border-gray-200 dark:border-purple-500/30 text-gray-900 dark:text-white relative overflow-hidden'
};

export function pageBuilderHeaderShellClass(activeTemplate: string | null | undefined): string {
	return HEADER_SHELL[normalizePackId(activeTemplate)];
}

export function pageBuilderFooterShellClass(activeTemplate: string | null | undefined): string {
	return FOOTER_SHELL[normalizePackId(activeTemplate)];
}
