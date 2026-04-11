/**
 * Optional `props.placement` for page-builder modules in grid / layout shells.
 * Applied by PageBuilderGrid on the cell wrapper (not passed to module components).
 */

export type ModulePlacementAxis = 'default' | 'start' | 'center' | 'end' | 'stretch';

export interface ModulePlacement {
	horizontal?: ModulePlacementAxis;
	vertical?: ModulePlacementAxis;
}

export function normalizePlacement(p: ModulePlacement | undefined): ModulePlacement | undefined {
	if (!p) return undefined;
	const out: ModulePlacement = {};
	if (p.horizontal && p.horizontal !== 'default') out.horizontal = p.horizontal;
	if (p.vertical && p.vertical !== 'default') out.vertical = p.vertical;
	return Object.keys(out).length ? out : undefined;
}

/** Remove `placement` before spreading props into module components. */
export function omitPlacement<T extends Record<string, unknown>>(props: T | undefined): Omit<T, 'placement'> {
	if (!props) return {} as Omit<T, 'placement'>;
	const { placement: _removed, ...rest } = props;
	return rest as Omit<T, 'placement'>;
}

/**
 * Flex column wrapper: horizontal → align-items, vertical → justify-content.
 * default horizontal → stretch (full cell width); default vertical → start.
 */
export function placementFlexClasses(placement: ModulePlacement | undefined): string {
	const h = placement?.horizontal ?? 'default';
	const v = placement?.vertical ?? 'default';

	const hClass =
		h === 'default' || h === 'stretch'
			? 'items-stretch'
			: h === 'start'
				? 'items-start'
				: h === 'center'
					? 'items-center'
					: h === 'end'
						? 'items-end'
						: 'items-stretch';

	const vClass =
		v === 'default'
			? 'justify-start'
			: v === 'stretch'
				? 'justify-stretch'
				: v === 'start'
					? 'justify-start'
					: v === 'center'
						? 'justify-center'
						: v === 'end'
							? 'justify-end'
							: 'justify-start';

	return `flex flex-col w-full min-h-0 min-w-0 ${hClass} ${vClass}`;
}
