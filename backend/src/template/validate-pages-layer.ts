import { BadRequestException } from '@nestjs/common';
import { TEMPLATE_BREAKPOINTS, type TemplateBreakpointId } from './shell-layout';

/**
 * Validates the "pages layer" payload stored in `site_config.template` and `themes`:
 * - grid bounds: positive integer rows/cols within a product-safe range
 * - module placements: anchor + spans fit inside the grid
 * - non-overlap: module rectangles must not overlap within the same page/breakpoint
 *
 * This keeps invalid payloads from being persisted by Admin endpoints.
 */

const GRID_MIN = 1;
const GRID_MAX = 20;
const SPAN_MIN = 1;
const SPAN_MAX = 20;

const DEFAULT_PAGE_LAYOUTS: Record<string, { gridRows: number; gridColumns: number }> = {
  home: { gridRows: 2, gridColumns: 1 },
  gallery: { gridRows: 1, gridColumns: 1 },
  album: { gridRows: 1, gridColumns: 1 },
  search: { gridRows: 1, gridColumns: 1 },
  header: { gridRows: 1, gridColumns: 5 },
  footer: { gridRows: 2, gridColumns: 1 },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function toIntStrict(x: unknown): number | null {
  if (typeof x === 'number') {
    return Number.isInteger(x) ? x : null;
  }
  if (typeof x === 'string') {
    // Accept numeric strings, since JSON imports may serialize numbers as strings.
    if (!x.trim()) return null;
    const n = Number.parseInt(x, 10);
    if (Number.isNaN(n)) return null;
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function validateGridSize(
  pageKey: string,
  bp: string,
  gridRows: unknown,
  gridColumns: unknown
): { gridRows: number; gridColumns: number } {
  const rows = toIntStrict(gridRows);
  const cols = toIntStrict(gridColumns);
  if (rows == null || cols == null) {
    throw new BadRequestException(
      `Invalid page grid for page "${pageKey}" at breakpoint "${bp}": gridRows/gridColumns must be integers`
    );
  }
  if (rows < GRID_MIN || rows > GRID_MAX || cols < GRID_MIN || cols > GRID_MAX) {
    throw new BadRequestException(
      `Invalid page grid for page "${pageKey}" at breakpoint "${bp}": gridRows/gridColumns must be within ${GRID_MIN}..${GRID_MAX}`
    );
  }
  return { gridRows: rows, gridColumns: cols };
}

function rectsOverlap(
  a: { r: number; c: number; rs: number; cs: number },
  b: { r: number; c: number; rs: number; cs: number }
): boolean {
  // Half-open intervals: [r, r+rs) × [c, c+cs)
  return a.r < b.r + b.rs && a.r + a.rs > b.r && a.c < b.c + b.cs && a.c + a.cs > b.c;
}

function pickSmallerBreakpoints(bp: TemplateBreakpointId): TemplateBreakpointId[] {
  const order = TEMPLATE_BREAKPOINTS as readonly TemplateBreakpointId[];
  const idx = order.indexOf(bp);
  if (idx <= 0) return [];
  const out: TemplateBreakpointId[] = [];
  for (let i = idx - 1; i >= 0; i--) out.push(order[i]!);
  return out;
}

function isPageGridCell(v: unknown): v is { gridRows: unknown; gridColumns: unknown } {
  return isPlainObject(v) && (v as any).gridRows != null && (v as any).gridColumns != null;
}

function pickGridCellFromBreakpointMap(
  pageKey: string,
  bp: TemplateBreakpointId,
  raw: unknown
): { gridRows: number; gridColumns: number } | null {
  if (!isPlainObject(raw)) return null;

  const exact = (raw as any)[bp];
  if (isPageGridCell(exact)) {
    return validateGridSize(pageKey, bp, (exact as any).gridRows, (exact as any).gridColumns);
  }

  for (const b of pickSmallerBreakpoints(bp)) {
    const v = (raw as any)[b];
    if (isPageGridCell(v)) {
      return validateGridSize(pageKey, bp, (v as any).gridRows, (v as any).gridColumns);
    }
  }

  const def = (raw as any).default;
  if (isPageGridCell(def)) {
    return validateGridSize(pageKey, bp, (def as any).gridRows, (def as any).gridColumns);
  }

  return null;
}

function pickModulesCellFromBreakpointMap(raw: unknown, bp: TemplateBreakpointId): any[] | null {
  if (!isPlainObject(raw)) return null;

  // Explicit key wins; explicit [] means "none", and should not fall back.
  if ((raw as any)[bp] !== undefined) {
    const v = (raw as any)[bp];
    return Array.isArray(v) ? v : [];
  }

  for (const b of pickSmallerBreakpoints(bp)) {
    if ((raw as any)[b] !== undefined) {
      const v = (raw as any)[b];
      return Array.isArray(v) ? v : [];
    }
  }

  if ((raw as any).default !== undefined) {
    const v = (raw as any).default;
    return Array.isArray(v) ? v : [];
  }

  return null;
}

export function validateTemplatePagesLayer(
  template: unknown,
  opts?: { source?: string }
): void {
  if (!template || !isPlainObject(template)) return;

  const source = opts?.source ? ` (${opts.source})` : '';
  const pageLayout = (template as any).pageLayout;
  const pageModules = (template as any).pageModules;
  const pageLayoutByBreakpoint = (template as any).pageLayoutByBreakpoint;
  const pageModulesByBreakpoint = (template as any).pageModulesByBreakpoint;

  const pageKeys = new Set<string>();
  for (const [k, v] of Object.entries({
    pageLayout: isPlainObject(pageLayout) ? pageLayout : undefined,
    pageModules: isPlainObject(pageModules) ? pageModules : undefined,
    pageLayoutByBreakpoint: isPlainObject(pageLayoutByBreakpoint) ? pageLayoutByBreakpoint : undefined,
    pageModulesByBreakpoint: isPlainObject(pageModulesByBreakpoint) ? pageModulesByBreakpoint : undefined,
  })) {
    if (!v) continue;
    for (const pageKey of Object.keys(v)) pageKeys.add(pageKey);
  }

  // If nothing is present, there's nothing to validate.
  if (pageKeys.size === 0) return;

  const getGridForPageAtBp = (pageKey: string, bp: TemplateBreakpointId) => {
    const fromCanonical = isPlainObject(pageLayout) ? (pageLayout as any)[pageKey] : undefined;
    // `pageLayout[pageKey]` may be a legacy flat cell or a breakpoint map.
    if (isPageGridCell(fromCanonical)) {
      return validateGridSize(pageKey, bp, (fromCanonical as any).gridRows, (fromCanonical as any).gridColumns);
    }
    const pickedCanonical = pickGridCellFromBreakpointMap(pageKey, bp, fromCanonical);
    if (pickedCanonical) return pickedCanonical;

    // Overlay shape: `pageLayoutByBreakpoint[pageKey][bp]`
    const overlayRow = isPlainObject(pageLayoutByBreakpoint)
      ? (pageLayoutByBreakpoint as Record<string, unknown>)[pageKey]
      : undefined;
    const pickedOverlay = pickGridCellFromBreakpointMap(pageKey, bp, overlayRow);
    if (pickedOverlay) return pickedOverlay;

    const fallback = DEFAULT_PAGE_LAYOUTS[pageKey];
    if (fallback) return { ...fallback };
    return null;
  };

  const getModulesForPageAtBp = (pageKey: string, bp: TemplateBreakpointId): any[] => {
    const fromCanonical = isPlainObject(pageModules) ? (pageModules as any)[pageKey] : undefined;
    // `pageModules[pageKey]` may be a legacy flat array or a breakpoint map.
    if (Array.isArray(fromCanonical)) return fromCanonical;
    const pickedCanonical = pickModulesCellFromBreakpointMap(fromCanonical, bp);
    if (pickedCanonical) return pickedCanonical;

    // Overlay shape: `pageModulesByBreakpoint[pageKey][bp]`
    const overlayRow = isPlainObject(pageModulesByBreakpoint)
      ? (pageModulesByBreakpoint as Record<string, unknown>)[pageKey]
      : undefined;
    const pickedOverlay = pickModulesCellFromBreakpointMap(overlayRow, bp);
    if (pickedOverlay) return pickedOverlay;

    return [];
  };

  for (const pageKey of pageKeys) {
    const bpKeys = new Set<TemplateBreakpointId>();

    const layoutBpMap = isPlainObject(pageLayoutByBreakpoint) ? (pageLayoutByBreakpoint as any)[pageKey] : undefined;
    if (isPlainObject(layoutBpMap)) {
      for (const k of Object.keys(layoutBpMap)) {
        if ((TEMPLATE_BREAKPOINTS as readonly string[]).includes(k)) {
          bpKeys.add(k as TemplateBreakpointId);
        }
      }
    }

    const modulesBpMap = isPlainObject(pageModulesByBreakpoint) ? (pageModulesByBreakpoint as any)[pageKey] : undefined;
    if (isPlainObject(modulesBpMap)) {
      for (const k of Object.keys(modulesBpMap)) {
        if ((TEMPLATE_BREAKPOINTS as readonly string[]).includes(k)) {
          bpKeys.add(k as TemplateBreakpointId);
        }
      }
    }

    // If the payload is legacy-only, validate once.
    if (bpKeys.size === 0) {
      const grid = getGridForPageAtBp(pageKey, 'lg');
      if (!grid) continue;
      const modules = getModulesForPageAtBp(pageKey, 'lg');
      validateModulesAgainstGrid(pageKey, 'lg', grid, modules, source);
      continue;
    }

    for (const bp of bpKeys) {
      const grid = getGridForPageAtBp(pageKey, bp);
      const modules = getModulesForPageAtBp(pageKey, bp);

      // If modules exist but we still can't resolve a grid size, fail closed.
      if (modules.length > 0 && !grid) {
        throw new BadRequestException(
          `Invalid page configuration${source}: cannot resolve grid for page "${pageKey}" at breakpoint "${bp}"`
        );
      }
      if (!grid) continue;
      validateModulesAgainstGrid(pageKey, bp, grid, modules, source);
    }
  }
}

function validateModulesAgainstGrid(
  pageKey: string,
  bp: string,
  grid: { gridRows: number; gridColumns: number },
  modules: any[],
  source: string
): void {
  const rects: Array<{ idx: number; r: number; c: number; rs: number; cs: number }> = [];

  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    if (!isPlainObject(m)) {
      throw new BadRequestException(
        `Invalid module at index ${i} for page "${pageKey}" breakpoint "${bp}"${source}: module must be an object`
      );
    }

    const r = toIntStrict((m as any).rowOrder);
    const c = toIntStrict((m as any).columnIndex);
    const rs = toIntStrict((m as any).rowSpan) ?? 1;
    const cs = toIntStrict((m as any).colSpan) ?? 1;

    if (r == null || c == null) {
      throw new BadRequestException(
        `Invalid module placement for page "${pageKey}" breakpoint "${bp}"${source}: module at index ${i} must include integer rowOrder + columnIndex`
      );
    }
    if (rs == null || cs == null || rs < SPAN_MIN || cs < SPAN_MIN || rs > SPAN_MAX || cs > SPAN_MAX) {
      throw new BadRequestException(
        `Invalid module spans for page "${pageKey}" breakpoint "${bp}"${source}: module at index ${i} has invalid rowSpan/colSpan`
      );
    }
    if (r < 0 || c < 0) {
      throw new BadRequestException(
        `Invalid module placement for page "${pageKey}" breakpoint "${bp}"${source}: module at index ${i} has negative rowOrder/columnIndex`
      );
    }
    if (r + rs > grid.gridRows || c + cs > grid.gridColumns) {
      throw new BadRequestException(
        `Invalid module placement for page "${pageKey}" breakpoint "${bp}"${source}: module at index ${i} does not fit in grid (${grid.gridRows}x${grid.gridColumns})`
      );
    }

    rects.push({ idx: i, r, c, rs, cs });
  }

  // Non-overlap: O(n^2) is fine for small per-page grids.
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      if (rectsOverlap(a, b)) {
        throw new BadRequestException(
          `Overlapping modules for page "${pageKey}" breakpoint "${bp}"${source}: module indices ${a.idx} and ${b.idx} overlap`
        );
      }
    }
  }
}

