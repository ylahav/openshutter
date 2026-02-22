<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Prevents copying/saving photos by:
	 * - Blocking right-click (context menu) on images and photo viewers
	 * - Blocking keyboard copy (Ctrl+C / Cmd+C) when focus is on or inside a photo
	 */

	function isPhotoOrInPhotoArea(el: EventTarget | null): boolean {
		if (!el || !(el instanceof Node)) return false;
		const element = el as Element;
		const tagName = element.nodeType === Node.ELEMENT_NODE ? element.tagName?.toUpperCase() : '';
		if (tagName === 'IMG' || tagName === 'VIDEO' || tagName === 'CANVAS') return true;
		const inPhotoArea = element.closest?.('img, video, canvas, [data-no-context-menu], .photo-lightbox-root, [class*="lightbox"]');
		return !!inPhotoArea;
	}

	function selectionContainsPhoto(): boolean {
		const sel = document.getSelection();
		if (!sel || sel.rangeCount === 0) return false;
		const range = sel.getRangeAt(0);
		if (!range) return false;
		// Check if selection contains or is inside an image
		const container = range.commonAncestorContainer;
		const el = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;
		return el ? !!el.closest?.('img, video, canvas, [data-no-context-menu], .photo-lightbox-root') : false;
	}

	onMount(() => {
		function onContextMenu(e: MouseEvent) {
			if (isPhotoOrInPhotoArea(e.target)) {
				e.preventDefault();
				return false;
			}
		}

		function onKeyDown(e: KeyboardEvent) {
			// Copy: Ctrl+C (Windows/Linux) or Cmd+C (Mac)
			const isCopy = (e.key === 'c' || e.key === 'C') && (e.ctrlKey || e.metaKey);
			if (!isCopy) return;
			// Prevent copy when focus is on/inside a photo or selection contains a photo
			const target = (e.target as Node) ?? document.activeElement;
			if (isPhotoOrInPhotoArea(target) || selectionContainsPhoto()) {
				e.preventDefault();
				return false;
			}
		}

		document.addEventListener('contextmenu', onContextMenu, { capture: true });
		document.addEventListener('keydown', onKeyDown, { capture: true });

		return () => {
			document.removeEventListener('contextmenu', onContextMenu, { capture: true });
			document.removeEventListener('keydown', onKeyDown, { capture: true });
		};
	});
</script>
