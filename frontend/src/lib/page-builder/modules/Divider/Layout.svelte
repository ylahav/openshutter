<script lang="ts">
	type Thickness = 'thin' | 'medium';
	type Margin = 'none' | 'sm' | 'md' | 'lg';
	type LineStyle = 'solid' | 'dashed' | 'dotted';

	export let config: {
		thickness?: Thickness;
		margin?: Margin;
		/** Stored as `lineStyle` in JSON (avoids clashing with HTML `style`). */
		lineStyle?: LineStyle;
		className?: string;
	} = {};

	$: thickness = (config.thickness ?? 'thin') as Thickness;
	$: margin = (config.margin ?? 'sm') as Margin;
	$: lineStyle = (config.lineStyle ?? 'solid') as LineStyle;
	$: extra = (config.className ?? '').trim();

	$: thicknessClass = thickness === 'medium' ? 'border-t-2' : 'border-t';
	$: marginClass =
		margin === 'none'
			? 'my-0'
			: margin === 'md'
				? 'my-4'
				: margin === 'lg'
					? 'my-6'
					: 'my-2';
	$: lineClass =
		lineStyle === 'dashed' ? 'border-dashed' : lineStyle === 'dotted' ? 'border-dotted' : 'border-solid';
</script>

<hr
	class="os-divider w-full max-w-full shrink-0 border-0 {thicknessClass} {lineClass} border-[color:var(--tp-border)] {marginClass} {extra}"
	aria-orientation="horizontal"
/>
