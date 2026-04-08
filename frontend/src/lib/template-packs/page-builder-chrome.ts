/**
 * When header/footer use PageRenderer (pageModules), the outer shell was generic.
 * These classes mirror each pack's Header.svelte / Footer.svelte root elements so
 * switching `frontendTemplate` still changes chrome even in page-builder mode.
 */
import type { PackHeaderId } from './header-visibility';
import { normalizeTemplatePackId } from './registry';

function normalizePackId(id: string | null | undefined): PackHeaderId {
	return normalizeTemplatePackId(id);
}

/** Matches `<header class="...">` on each pack's Header.svelte */
const HEADER_SHELL: Record<PackHeaderId, string> = {
	noir: 'bg-transparent border-b border-white/[0.06] sticky top-0 z-[100] backdrop-blur-[2px]',
	studio:
		'bg-[color:var(--tp-surface-1)] border-b border-[color:var(--tp-border)] sticky top-0 z-[100] shadow-sm',
	atelier:
		'bg-[color:var(--tp-surface-1)] border-b border-[color:var(--tp-border)] sticky top-0 z-[100]'
};

/** Matches `<footer class="...">` on each pack's Footer.svelte (page-builder outer wrapper uses w-full + these) */
const FOOTER_SHELL: Record<PackHeaderId, string> = {
	noir: 'bg-[#080808] border-t border-white/[0.06] text-[rgba(245,245,243,0.15)]',
	studio: 'bg-[color:var(--tp-footer-strip-bg)] border-t border-white/[0.06] text-slate-500',
	atelier: 'bg-[color:var(--tp-footer-strip-bg)] border-t border-white/[0.08] text-[color:color-mix(in_srgb,var(--tp-canvas)_35%,transparent)]'
};

export function pageBuilderHeaderShellClass(activeTemplate: string | null | undefined): string {
	return HEADER_SHELL[normalizePackId(activeTemplate)];
}

export function pageBuilderFooterShellClass(activeTemplate: string | null | undefined): string {
	return FOOTER_SHELL[normalizePackId(activeTemplate)];
}
