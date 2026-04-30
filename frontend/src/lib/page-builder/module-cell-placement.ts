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

/** Remove grid-only keys before spreading props into module components. */
export function omitPlacement<T extends Record<string, unknown>>(props: T | undefined): Omit<T, 'placement'> {
	if (!props) return {} as Omit<T, 'placement'>;
	const { placement: _p, wrapperClassByPack: _w, classNameByPack: _c, classNameNoPackPrefix: _n, ...rest } =
		props as T & {
			wrapperClassByPack?: unknown;
			classNameByPack?: unknown;
			classNameNoPackPrefix?: unknown;
		};
	return rest as Omit<T, 'placement'>;
}

/**
 * Flex column wrapper: horizontal → align-items, vertical → justify-content.
 * default horizontal → stretch (full cell width); default vertical → start.
 *
 * Returned as inline `style` so the DOM only needs a single marker class (`pbModuleCell`)
 * plus user `className` from module config — no framework-owned modifier classes.
 */
export function placementCellStyle(placement: ModulePlacement | undefined): string {
	const h = placement?.horizontal ?? 'default';
	const v = placement?.vertical ?? 'default';

	const alignItems =
		h === 'default' || h === 'stretch'
			? 'stretch'
			: h === 'start'
				? 'flex-start'
				: h === 'center'
					? 'center'
					: h === 'end'
						? 'flex-end'
						: 'stretch';

	const justifyContent =
		v === 'default' || v === 'start'
			? 'flex-start'
			: v === 'stretch'
				? 'stretch'
				: v === 'center'
					? 'center'
					: v === 'end'
						? 'flex-end'
						: 'flex-start';

	return `display:flex;flex-direction:column;width:100%;min-width:0;min-height:0;align-items:${alignItems};justify-content:${justifyContent};`;
}
