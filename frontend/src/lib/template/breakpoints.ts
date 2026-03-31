/**
 * Template shell + page builder: responsive breakpoints (mobile-first min-widths, Tailwind-aligned).
 */

import { DEFAULT_PAGE_LAYOUTS, DEFAULT_PAGE_MODULES } from '$lib/constants/default-page-layouts';

export const TEMPLATE_BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type TemplateBreakpointId = (typeof TEMPLATE_BREAKPOINTS)[number];

/** Minimum viewport width (px) for each breakpoint to apply. */
export const BREAKPOINT_MIN_WIDTH_PX: Record<TemplateBreakpointId, number> = {
	xs: 0,
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280
};

export interface ShellLayout {
	maxWidth?: string;
	containerPadding?: string;
	gridGap?: string;
}

export const DEFAULT_SHELL: Required<ShellLayout> = {
	maxWidth: '1200px',
	containerPadding: '1rem',
	gridGap: '1.5rem'
};

/** Suggested shell values per breakpoint (Admin + fresh seed). Merged when there is no legacy flat layout and no saved per-breakpoint map. */
export const SHELL_HINT_BY_BREAKPOINT: Record<TemplateBreakpointId, ShellLayout> = {
	xs: { maxWidth: '100%', containerPadding: '0.75rem', gridGap: '0.75rem' },
	sm: { maxWidth: '100%', containerPadding: '1rem', gridGap: '1rem' },
	md: { maxWidth: '100%', containerPadding: '1rem', gridGap: '1.25rem' },
	lg: { maxWidth: '1200px', containerPadding: '1.5rem', gridGap: '1.5rem' },
	xl: { maxWidth: '1280px', containerPadding: '1.5rem', gridGap: '1.5rem' }
};

export function resolveBreakpointForWidth(widthPx: number): TemplateBreakpointId {
	let hit: TemplateBreakpointId = 'xs';
	for (const bp of TEMPLATE_BREAKPOINTS) {
		if (widthPx >= BREAKPOINT_MIN_WIDTH_PX[bp]) hit = bp;
	}
	return hit;
}

/** True if `customLayout` is the legacy flat { maxWidth, containerPadding, gridGap } object. */
export function isLegacyCustomLayout(obj: unknown): obj is ShellLayout {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
	const o = obj as Record<string, unknown>;
	const hasShellField =
		typeof o.maxWidth === 'string' ||
		typeof o.containerPadding === 'string' ||
		typeof o.gridGap === 'string';
	const looksLikeBreakpointMap = TEMPLATE_BREAKPOINTS.some(
		(bp) => o[bp] != null && typeof o[bp] === 'object' && !Array.isArray(o[bp])
	);
	return hasShellField && !looksLikeBreakpointMap;
}

/** True if `customLayout` stores one shell object per breakpoint key (xs … xl). */
export function isBreakpointMapCustomLayout(obj: unknown): obj is Record<string, ShellLayout> {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
	if (isLegacyCustomLayout(obj)) return false;
	const o = obj as Record<string, unknown>;
	return TEMPLATE_BREAKPOINTS.some((bp) => {
		const v = o[bp];
		return v != null && typeof v === 'object' && !Array.isArray(v);
	});
}

/** When a breakpoint map omits the current band, cascade like page modules (narrower first, then wider). */
function pickShellCellFromBreakpointMap(
	raw: Partial<Record<TemplateBreakpointId, ShellLayout>>,
	bp: TemplateBreakpointId
): ShellLayout | undefined {
	const c = raw[bp];
	if (c && typeof c === 'object' && !Array.isArray(c)) return c as ShellLayout;
	const order = TEMPLATE_BREAKPOINTS as readonly TemplateBreakpointId[];
	const idx = order.indexOf(bp);
	for (let i = idx - 1; i >= 0; i--) {
		const b = order[i]!;
		const v = raw[b];
		if (v && typeof v === 'object' && !Array.isArray(v)) return v as ShellLayout;
	}
	for (let i = idx + 1; i < order.length; i++) {
		const b = order[i]!;
		const v = raw[b];
		if (v && typeof v === 'object' && !Array.isArray(v)) return v as ShellLayout;
	}
	return undefined;
}

/** Clone shell-by-breakpoint map for persistence on `template.customLayout`. */
export function shellByBreakpointToCustomLayoutField(
	map: Record<TemplateBreakpointId, ShellLayout>
): Record<string, ShellLayout> {
	return JSON.parse(JSON.stringify(map)) as Record<string, ShellLayout>;
}

/**
 * Load shell editor state from DB: `customLayout` may be legacy flat, breakpoint map, or empty;
 * `customLayoutByBreakpoint` optional overlay (wins over map per key when merging seeds).
 */
export function seedShellFromDb(
	customLayout: unknown,
	customLayoutByBreakpoint?: Partial<Record<string, ShellLayout>>
): Record<TemplateBreakpointId, ShellLayout> {
	if (customLayout && isBreakpointMapCustomLayout(customLayout)) {
		const fromMap: Partial<Record<TemplateBreakpointId, ShellLayout>> = {};
		for (const bp of TEMPLATE_BREAKPOINTS) {
			const cell = customLayout[bp];
			if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
				fromMap[bp] = cell as ShellLayout;
			}
		}
		return seedShellByBreakpoint(undefined, { ...fromMap, ...customLayoutByBreakpoint });
	}
	const legacy = customLayout && isLegacyCustomLayout(customLayout) ? customLayout : undefined;
	return seedShellByBreakpoint(legacy, customLayoutByBreakpoint);
}

function fillShellDefaults(partial?: ShellLayout): ShellLayout {
	return {
		maxWidth: partial?.maxWidth ?? DEFAULT_SHELL.maxWidth,
		containerPadding: partial?.containerPadding ?? DEFAULT_SHELL.containerPadding,
		gridGap: partial?.gridGap ?? DEFAULT_SHELL.gridGap
	};
}

/**
 * Build a full per-breakpoint shell map for Admin editing.
 * Seeds every breakpoint from legacy `customLayout`, then overlays `customLayoutByBreakpoint`.
 */
export function seedShellByBreakpoint(
	legacy: ShellLayout | undefined,
	byBp: Partial<Record<string, ShellLayout>> | undefined
): Record<TemplateBreakpointId, ShellLayout> {
	const base = fillShellDefaults(legacy);
	const hasSavedByBp = byBp != null && Object.keys(byBp).length > 0;
	/** Distinct per-tab defaults only when not migrating from legacy flat layout and no stored per-breakpoint rows yet. */
	const useHints = !legacy && !hasSavedByBp;
	const out = {} as Record<TemplateBreakpointId, ShellLayout>;
	for (const bp of TEMPLATE_BREAKPOINTS) {
		const hint = useHints ? SHELL_HINT_BY_BREAKPOINT[bp] : {};
		out[bp] = fillShellDefaults({ ...base, ...hint, ...(byBp?.[bp] ?? {}) });
	}
	return out;
}

/** Effective shell at viewport width (public site + preview). */
export function resolveShellLayout(
	template:
		| {
				customLayout?: ShellLayout | Record<string, ShellLayout>;
				customLayoutByBreakpoint?: Partial<Record<string, ShellLayout>>;
		  }
		| undefined,
	widthPx: number
): ShellLayout {
	const bp = resolveBreakpointForWidth(widthPx);
	const cl = template?.customLayout as unknown;
	let legacy: ShellLayout | undefined;
	let fromMap: ShellLayout | undefined;
	if (cl && isLegacyCustomLayout(cl)) {
		legacy = cl;
	} else if (cl && isBreakpointMapCustomLayout(cl)) {
		fromMap = pickShellCellFromBreakpointMap(
			cl as Partial<Record<TemplateBreakpointId, ShellLayout>>,
			bp
		);
	}
	const fromSeparate = pickShellCellFromBreakpointMap(
		(template?.customLayoutByBreakpoint ?? {}) as Partial<Record<TemplateBreakpointId, ShellLayout>>,
		bp
	);
	const merged: ShellLayout = {};
	if (legacy) Object.assign(merged, fillShellDefaults(legacy));
	if (fromMap) Object.assign(merged, fillShellDefaults(fromMap));
	if (fromSeparate) Object.assign(merged, fillShellDefaults(fromSeparate));
	return fillShellDefaults(merged);
}

export interface PageGrid {
	gridRows: number;
	gridColumns: number;
}

function cloneModules(mods: unknown[] | undefined): unknown[] {
	if (!mods || !Array.isArray(mods)) return [];
	return JSON.parse(JSON.stringify(mods));
}

export function isPageGrid(obj: unknown): obj is PageGrid {
	return (
		!!obj &&
		typeof obj === 'object' &&
		!Array.isArray(obj) &&
		typeof (obj as PageGrid).gridRows === 'number' &&
		typeof (obj as PageGrid).gridColumns === 'number'
	);
}

/** `template.pageLayout[pageKey]` is a single grid (legacy). */
export function isLegacyPageLayoutEntry(obj: unknown): obj is PageGrid {
	return isPageGrid(obj);
}

/** `template.pageLayout[pageKey]` is `{ xs: PageGrid, … }` (preferred persisted shape). */
export function isPageLayoutBreakpointMapForPage(obj: unknown): obj is Partial<Record<TemplateBreakpointId, PageGrid>> {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
	if (isPageGrid(obj)) return false;
	return TEMPLATE_BREAKPOINTS.some((bp) => {
		const v = (obj as Record<string, unknown>)[bp];
		return v != null && isPageGrid(v);
	});
}

export function isLegacyPageModulesEntry(obj: unknown): obj is unknown[] {
	return Array.isArray(obj);
}

/** `template.pageModules[pageKey]` is `{ xs: modules[], … }`. */
export function isPageModulesBreakpointMapForPage(obj: unknown): obj is Partial<Record<TemplateBreakpointId, unknown[]>> {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
	return TEMPLATE_BREAKPOINTS.some((bp) => {
		const v = (obj as Record<string, unknown>)[bp];
		return Array.isArray(v);
	});
}

function defaultGridForPage(pk: string): PageGrid {
	const d = DEFAULT_PAGE_LAYOUTS[pk];
	return d ? { ...d } : { gridRows: 3, gridColumns: 1 };
}

/**
 * Coerce one page’s layout row to a full `xs`…`xl` map for Mongo (`pageLayout` / `pageLayoutByBreakpoint`).
 * Legacy flat `{ gridRows, gridColumns }` (often stored under the page key by mistake) is expanded to all breakpoints.
 */
export function normalizePageLayoutRowForPersistence(
	pageKey: string,
	row: unknown
): Record<TemplateBreakpointId, PageGrid> {
	const baseDefault = defaultGridForPage(pageKey);
	if (!row || typeof row !== 'object' || Array.isArray(row)) {
		const o = {} as Record<TemplateBreakpointId, PageGrid>;
		for (const bp of TEMPLATE_BREAKPOINTS) o[bp] = { ...baseDefault };
		return o;
	}
	if (isLegacyPageLayoutEntry(row)) {
		const g = { gridRows: row.gridRows, gridColumns: row.gridColumns };
		const o = {} as Record<TemplateBreakpointId, PageGrid>;
		for (const bp of TEMPLATE_BREAKPOINTS) o[bp] = { ...g };
		return o;
	}
	/** Breakpoint map: each key is independent — do not merge “pick” from lg into every cell (that duplicated one band to all). */
	const partial = row as Partial<Record<TemplateBreakpointId, PageGrid>>;
	const o = {} as Record<TemplateBreakpointId, PageGrid>;
	for (const bp of TEMPLATE_BREAKPOINTS) {
		const cell = partial[bp];
		if (cell && typeof cell === 'object' && !Array.isArray(cell) && isPageGrid(cell)) {
			o[bp] = { ...baseDefault, ...cell };
		} else {
			o[bp] = { ...baseDefault };
		}
	}
	return o;
}

function pickPageGridFromLayoutEntry(val: unknown, pk: string): PageGrid {
	if (isLegacyPageLayoutEntry(val)) return { ...val };
	if (isPageLayoutBreakpointMapForPage(val)) {
		const pick = val.lg ?? val.md ?? val.sm ?? val.xs ?? val.xl;
		if (pick && isPageGrid(pick)) return { ...pick };
	}
	return defaultGridForPage(pk);
}

function pickModulesFlatFromEntry(val: unknown, pk: string): unknown[] {
	if (isLegacyPageModulesEntry(val)) return val;
	if (isPageModulesBreakpointMapForPage(val)) {
		const pick = val.lg ?? val.md ?? val.sm ?? val.xs ?? val.xl;
		if (Array.isArray(pick)) return pick;
	}
	const d = DEFAULT_PAGE_MODULES[pk];
	return d ? (JSON.parse(JSON.stringify(d)) as unknown[]) : [];
}

/**
 * Seed per-page × breakpoint layout + modules from DB:
 * legacy flat `pageLayout` / `pageModules`, optional breakpoint maps on those fields,
 * and optional overlays in `pageLayoutByBreakpoint` / `pageModulesByBreakpoint`.
 */
export function seedPageLayoutByBreakpoint(
	pageKeys: string[],
	legacyLayout: Record<string, unknown> | undefined,
	legacyModules: Record<string, unknown> | undefined,
	existingByBp:
		| {
				/** Overlay from DB — grid cells may be partial. */
				pageLayoutByBreakpoint?: Record<
					string,
					Partial<Record<string, { gridRows?: number; gridColumns?: number }>>
				>;
				pageModulesByBreakpoint?: Record<string, Partial<Record<string, unknown[]>>>;
		  }
		| undefined
): {
	pageLayoutByBreakpoint: Record<string, Partial<Record<TemplateBreakpointId, PageGrid>>>;
	pageModulesByBreakpoint: Record<string, Partial<Record<TemplateBreakpointId, unknown[]>>>;
} {
	const pageLayoutByBreakpoint: Record<string, Partial<Record<TemplateBreakpointId, PageGrid>>> = {};
	const pageModulesByBreakpoint: Record<string, Partial<Record<TemplateBreakpointId, unknown[]>>> = {};

	for (const pk of pageKeys) {
		const rawL = legacyLayout?.[pk];
		const rawM = legacyModules?.[pk];
		const lg = pickPageGridFromLayoutEntry(rawL, pk);
		const flatMods = pickModulesFlatFromEntry(rawM, pk);
		const exLRaw = existingByBp?.pageLayoutByBreakpoint?.[pk];
		/** Only normalize legacy flat rows; breakpoint maps (even partial) are merged per key below so we do not smear one band across all. */
		const exLFull = exLRaw
			? isLegacyPageLayoutEntry(exLRaw)
				? normalizePageLayoutRowForPersistence(pk, exLRaw)
				: (exLRaw as Partial<Record<TemplateBreakpointId, PageGrid>>)
			: undefined;
		const exM = existingByBp?.pageModulesByBreakpoint?.[pk];

		pageLayoutByBreakpoint[pk] = {};
		pageModulesByBreakpoint[pk] = {};

		for (const bp of TEMPLATE_BREAKPOINTS) {
			/** Prefer `pageLayout` / `pageModules` (canonical in Mongo) over *ByBreakpoint overlays so DB edits to the main fields are visible. */
			const fromMapL =
				isPageLayoutBreakpointMapForPage(rawL) && rawL[bp] && typeof rawL[bp] === 'object'
					? { ...lg, ...(rawL[bp] as PageGrid) }
					: undefined;
			pageLayoutByBreakpoint[pk]![bp] =
				fromMapL !== undefined
					? fromMapL
					: exLFull?.[bp]
						? { ...lg, ...exLFull[bp]! }
						: { ...lg };

			const fromMapM =
				isPageModulesBreakpointMapForPage(rawM) && rawM[bp] !== undefined
					? (rawM[bp] as unknown[])
					: undefined;
			const modForBp =
				fromMapM !== undefined
					? fromMapM
					: exM?.[bp] !== undefined
						? (exM[bp] as unknown[])
						: flatMods;
			pageModulesByBreakpoint[pk]![bp] = cloneModules(modForBp);
		}
	}

	return { pageLayoutByBreakpoint, pageModulesByBreakpoint };
}

/** Persist full per-page breakpoint grids on `template.pageLayout` (same data as `pageLayoutByBreakpoint` when saved from Admin). */
export function pageLayoutByBreakpointToPageLayoutField(
	plBy: Record<string, Partial<Record<TemplateBreakpointId, PageGrid>> | undefined>
): Record<string, Record<string, PageGrid>> {
	const out: Record<string, Record<string, PageGrid>> = {};
	for (const [pk, row] of Object.entries(plBy)) {
		if (!row || Object.keys(row).length === 0) continue;
		const normalized = normalizePageLayoutRowForPersistence(pk, row);
		out[pk] = JSON.parse(JSON.stringify(normalized)) as Record<string, PageGrid>;
	}
	return out;
}

/** Persist full per-page breakpoint module lists on `template.pageModules`. */
export function pageModulesByBreakpointToPageModulesField(
	pmBy: Record<string, Partial<Record<TemplateBreakpointId, unknown[]>> | undefined>
): Record<string, Record<string, unknown[]>> {
	const out: Record<string, Record<string, unknown[]>> = {};
	for (const [pk, row] of Object.entries(pmBy)) {
		if (!row || Object.keys(row).length === 0) continue;
		out[pk] = JSON.parse(JSON.stringify(row)) as Record<string, unknown[]>;
	}
	return out;
}

/** When a stored per-breakpoint map omits the current band, use the normative cascade (see docs §2.2.3). */
function pickGridCellFromBreakpointMap(
	raw: Partial<Record<TemplateBreakpointId, PageGrid>>,
	bp: TemplateBreakpointId
): PageGrid | undefined {
	const c = raw[bp];
	if (c && typeof c === 'object' && c.gridRows != null && c.gridColumns != null) {
		return { gridRows: c.gridRows, gridColumns: c.gridColumns };
	}
	const order = TEMPLATE_BREAKPOINTS as readonly TemplateBreakpointId[];
	const idx = order.indexOf(bp);
	for (let i = idx - 1; i >= 0; i--) {
		const b = order[i]!;
		const v = raw[b];
		if (v && typeof v === 'object' && v.gridRows != null && v.gridColumns != null) {
			return { gridRows: v.gridRows, gridColumns: v.gridColumns };
		}
	}
	const def = (raw as any).default;
	if (def && typeof def === 'object' && def.gridRows != null && def.gridColumns != null) {
		return { gridRows: def.gridRows, gridColumns: def.gridColumns };
	}
	return undefined;
}

/** Same idea for module lists; explicit `[]` at `bp` wins (no fallback). */
function pickModulesCellFromBreakpointMap(
	raw: Partial<Record<TemplateBreakpointId, unknown[]>>,
	bp: TemplateBreakpointId
): unknown[] | undefined {
	if (raw[bp] !== undefined) return raw[bp] as unknown[];
	const order = TEMPLATE_BREAKPOINTS as readonly TemplateBreakpointId[];
	const idx = order.indexOf(bp);
	// Narrower breakpoints first (mobile-first fill-in)
	for (let i = idx - 1; i >= 0; i--) {
		const b = order[i]!;
		if ((raw as any)[b] !== undefined) return (raw as any)[b] as unknown[];
	}
	// Wider breakpoints: Admin often saves only `lg`; xs/md must still resolve or home drops modules.
	for (let i = idx + 1; i < order.length; i++) {
		const b = order[i]!;
		if ((raw as any)[b] !== undefined) return (raw as any)[b] as unknown[];
	}
	if ((raw as any).default !== undefined) return (raw as any).default as unknown[];
	return undefined;
}

/**
 * Resolve grid for one page at a fixed breakpoint.
 * **`pageLayout` wins over `pageLayoutByBreakpoint`** when both exist (canonical save shape vs editor overlay;
 * stale overlays must not hide updated `pageLayout` from DB).
 */
export function getPageGridForBreakpoint(
	template:
		| {
				pageLayout?: Record<string, unknown>;
				pageLayoutByBreakpoint?: Record<
					string,
					Partial<Record<string, { gridRows?: number; gridColumns?: number }>>
				>;
		  }
		| undefined,
	pageKey: string,
	bp: TemplateBreakpointId
): PageGrid {
	const raw = template?.pageLayout?.[pageKey];
	if (isPageLayoutBreakpointMapForPage(raw)) {
		const picked = pickGridCellFromBreakpointMap(
			raw as Partial<Record<TemplateBreakpointId, PageGrid>>,
			bp
		);
		if (picked) return picked;
	}
	if (isLegacyPageLayoutEntry(raw)) {
		return { gridRows: raw.gridRows, gridColumns: raw.gridColumns };
	}
	const rowOverlay = template?.pageLayoutByBreakpoint?.[pageKey];
	if (rowOverlay && typeof rowOverlay === 'object' && !Array.isArray(rowOverlay)) {
		const picked = pickGridCellFromBreakpointMap(
			rowOverlay as Partial<Record<TemplateBreakpointId, PageGrid>>,
			bp
		);
		if (picked) return picked;
	}
	const d = DEFAULT_PAGE_LAYOUTS[pageKey];
	return d ? { ...d } : { gridRows: 3, gridColumns: 1 };
}

/**
 * After editing a single breakpoint’s grid, produce a full `xs`…`xl` row so saves never store only one key
 * (which previously caused normalization to copy that band everywhere).
 */
export function mergePageLayoutRowForBreakpointEdit(
	template: {
		pageLayout?: Record<string, unknown>;
		pageLayoutByBreakpoint?: Record<
			string,
			Partial<Record<string, { gridRows?: number; gridColumns?: number }>>
		>;
	},
	pageKey: string,
	bp: TemplateBreakpointId,
	next: PageGrid,
	existingRow: Partial<Record<TemplateBreakpointId, PageGrid>> | undefined
): Record<TemplateBreakpointId, PageGrid> {
	const out = {} as Record<TemplateBreakpointId, PageGrid>;
	for (const b of TEMPLATE_BREAKPOINTS) {
		if (b === bp) {
			out[b] = { gridRows: next.gridRows, gridColumns: next.gridColumns };
			continue;
		}
		const prev = existingRow?.[b];
		if (prev != null && typeof prev === 'object' && isPageGrid(prev)) {
			out[b] = { gridRows: prev.gridRows, gridColumns: prev.gridColumns };
			continue;
		}
		out[b] = getPageGridForBreakpoint(template, pageKey, b);
	}
	return out;
}

export function getEffectivePageGrid(
	template:
		| {
				pageLayout?: Record<string, unknown>;
				/** DB / site config may store partial grid cells */
				pageLayoutByBreakpoint?: Record<
					string,
					Partial<Record<string, { gridRows?: number; gridColumns?: number }>>
				>;
		  }
		| undefined,
	pageKey: string,
	widthPx: number
): PageGrid {
	const bp = resolveBreakpointForWidth(widthPx);
	return getPageGridForBreakpoint(template, pageKey, bp);
}

/**
 * Resolve modules for one page at a fixed breakpoint.
 * **`pageModules` wins over `pageModulesByBreakpoint`** when both exist (same rationale as grid).
 */
export function getPageModulesForBreakpoint(
	template:
		| {
				pageModules?: Record<string, unknown>;
				pageModulesByBreakpoint?: Record<string, Partial<Record<string, unknown[]>>>;
		  }
		| undefined,
	pageKey: string,
	bp: TemplateBreakpointId
): unknown[] {
	const raw = template?.pageModules?.[pageKey];
	if (isPageModulesBreakpointMapForPage(raw)) {
		const picked = pickModulesCellFromBreakpointMap(
			raw as Partial<Record<TemplateBreakpointId, unknown[]>>,
			bp
		);
		if (picked !== undefined) return picked;
	}
	if (Array.isArray(raw)) {
		const rowOverlay = template?.pageModulesByBreakpoint?.[pageKey];
		if (rowOverlay && typeof rowOverlay === 'object' && !Array.isArray(rowOverlay)) {
			const overlayPick = pickModulesCellFromBreakpointMap(
				rowOverlay as Partial<Record<TemplateBreakpointId, unknown[]>>,
				bp
			);
			if (overlayPick !== undefined) return overlayPick;
		}
		return raw;
	}
	const rowOverlay = template?.pageModulesByBreakpoint?.[pageKey];
	if (rowOverlay && typeof rowOverlay === 'object' && !Array.isArray(rowOverlay)) {
		const picked = pickModulesCellFromBreakpointMap(
			rowOverlay as Partial<Record<TemplateBreakpointId, unknown[]>>,
			bp
		);
		if (picked !== undefined) return picked;
	}
	return [];
}

export function getEffectivePageModules(
	template:
		| {
				pageModules?: Record<string, unknown>;
				pageModulesByBreakpoint?: Record<string, Partial<Record<string, unknown[]>>>;
		  }
		| undefined,
	pageKey: string,
	widthPx: number
): unknown[] {
	const bp = resolveBreakpointForWidth(widthPx);
	return getPageModulesForBreakpoint(template, pageKey, bp);
}

/** Flat shell from `lg` (for code paths that still expect a single shell blob). */
export function legacyCustomLayoutFromByBreakpoint(
	byBp: Record<string, ShellLayout>
): ShellLayout {
	return fillShellDefaults(byBp['lg'] ?? byBp['md'] ?? byBp['sm'] ?? byBp['xs']);
}
