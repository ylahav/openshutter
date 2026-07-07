<script lang="ts">
	/**
	 * Grid-cell `<img>` wrapper tuned for mobile bandwidth + perceived speed.
	 *
	 * Tiles at low `index` (above-fold) load eagerly at high fetch priority so
	 * the visible viewport paints fast. Tiles further down load lazily at low
	 * priority so the browser can defer them until scroll reveals them.
	 *
	 * `EAGER_COUNT` (8) roughly matches the number of tiles visible in a 2-col
	 * mobile grid on typical phones; adjust if the default column count changes.
	 */

	interface Props {
		/** Grid position (0 = first visible tile). Tune loading + priority off this. */
		index?: number;
		src?: string;
		alt?: string;
		className?: string;
		style?: string;
		draggable?: boolean;
		onload?: (e: Event) => void;
		onerror?: (e: Event) => void;
	}

	let {
		index = 0,
		src = '',
		alt = '',
		className = '',
		style = '',
		draggable,
		onload,
		onerror
	}: Props = $props();

	const EAGER_COUNT = 8;

	const loading = $derived<'eager' | 'lazy'>(index < EAGER_COUNT ? 'eager' : 'lazy');
	const fetchPriority = $derived<'high' | 'auto' | 'low'>(
		index < 4 ? 'high' : index < EAGER_COUNT ? 'auto' : 'low'
	);
</script>

{#if src}
	<img
		{src}
		{alt}
		class={className}
		{style}
		{draggable}
		{loading}
		decoding="async"
		fetchpriority={fetchPriority}
		onload={(e) => onload?.(e)}
		onerror={(e) => onerror?.(e)}
	/>
{/if}
