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

	$: thicknessClass = thickness === 'medium' ? 'pb-divider--medium' : 'pb-divider--thin';
	$: marginClass =
		margin === 'none'
			? 'pb-divider--mNone'
			: margin === 'md'
				? 'pb-divider--mMd'
				: margin === 'lg'
					? 'pb-divider--mLg'
					: 'pb-divider--mSm';
	$: lineClass =
		lineStyle === 'dashed'
			? 'pb-divider--dashed'
			: lineStyle === 'dotted'
				? 'pb-divider--dotted'
				: 'pb-divider--solid';
</script>

<hr
	class="pb-divider os-divider {thicknessClass} {lineClass} {marginClass} {extra}"
	aria-orientation="horizontal"
/>

<style lang="scss">
	.pb-divider {
		width: 100%;
		max-width: 100%;
		flex-shrink: 0;
		border: 0;
		border-top-color: var(--tp-border);
	}

	.pb-divider--thin {
		border-top-width: 1px;
	}

	.pb-divider--medium {
		border-top-width: 2px;
	}

	.pb-divider--solid {
		border-top-style: solid;
	}

	.pb-divider--dashed {
		border-top-style: dashed;
	}

	.pb-divider--dotted {
		border-top-style: dotted;
	}

	.pb-divider--mNone {
		margin-block: 0;
	}

	.pb-divider--mSm {
		margin-block: 0.5rem;
	}

	.pb-divider--mMd {
		margin-block: 1rem;
	}

	.pb-divider--mLg {
		margin-block: 1.5rem;
	}
</style>
