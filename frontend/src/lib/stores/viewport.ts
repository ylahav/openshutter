import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { resolveBreakpointForWidth, type TemplateBreakpointId } from '$lib/template/breakpoints';

const initialW = browser && typeof window !== 'undefined' ? window.innerWidth : 1280;

export const viewportWidth = writable(initialW);

if (browser) {
	const onResize = () => viewportWidth.set(window.innerWidth);
	window.addEventListener('resize', onResize);
}

export const viewportBreakpoint = derived(viewportWidth, (w): TemplateBreakpointId =>
	resolveBreakpointForWidth(w)
);
