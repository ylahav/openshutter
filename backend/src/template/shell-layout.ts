/**
 * Shell layout helpers (kept in sync with frontend `lib/template/breakpoints.ts` for legacy flat vs breakpoint map).
 */

export const TEMPLATE_BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type TemplateBreakpointId = (typeof TEMPLATE_BREAKPOINTS)[number];

export const BREAKPOINT_MIN_WIDTH_PX: Record<TemplateBreakpointId, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export interface ShellLayout {
  maxWidth?: string;
  containerPadding?: string;
  gridGap?: string;
}

const DEFAULT_SHELL: Required<ShellLayout> = {
  maxWidth: '1200px',
  containerPadding: '1rem',
  gridGap: '1.5rem',
};

function fillShellDefaults(partial?: ShellLayout): ShellLayout {
  return {
    maxWidth: partial?.maxWidth ?? DEFAULT_SHELL.maxWidth,
    containerPadding: partial?.containerPadding ?? DEFAULT_SHELL.containerPadding,
    gridGap: partial?.gridGap ?? DEFAULT_SHELL.gridGap,
  };
}

export function resolveBreakpointForWidth(widthPx: number): TemplateBreakpointId {
  let hit: TemplateBreakpointId = 'xs';
  for (const bp of TEMPLATE_BREAKPOINTS) {
    if (widthPx >= BREAKPOINT_MIN_WIDTH_PX[bp]) hit = bp;
  }
  return hit;
}

export function isLegacyCustomLayout(obj: unknown): obj is ShellLayout {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  const hasShellField =
    typeof o.maxWidth === 'string' ||
    typeof o.containerPadding === 'string' ||
    typeof o.gridGap === 'string';
  const looksLikeBreakpointMap = TEMPLATE_BREAKPOINTS.some(
    (bp) => o[bp] != null && typeof o[bp] === 'object' && !Array.isArray(o[bp]),
  );
  return hasShellField && !looksLikeBreakpointMap;
}

export function isBreakpointMapCustomLayout(obj: unknown): obj is Record<string, ShellLayout> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (isLegacyCustomLayout(obj)) return false;
  const o = obj as Record<string, unknown>;
  return TEMPLATE_BREAKPOINTS.some((bp) => {
    const v = o[bp];
    return v != null && typeof v === 'object' && !Array.isArray(v);
  });
}

export function resolveShellLayout(
  template:
    | {
        customLayout?: ShellLayout | Record<string, ShellLayout>;
        customLayoutByBreakpoint?: Partial<Record<string, ShellLayout>>;
      }
    | undefined,
  widthPx: number,
): ShellLayout {
  const bp = resolveBreakpointForWidth(widthPx);
  const cl = template?.customLayout as unknown;
  let legacy: ShellLayout | undefined;
  let fromMap: ShellLayout | undefined;
  if (cl && isLegacyCustomLayout(cl)) {
    legacy = cl;
  } else if (cl && isBreakpointMapCustomLayout(cl)) {
    const cell = cl[bp];
    if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
      fromMap = cell as ShellLayout;
    }
  }
  const fromSeparate = template?.customLayoutByBreakpoint?.[bp];
  return fillShellDefaults({
    ...fillShellDefaults(legacy),
    ...fillShellDefaults(fromMap),
    ...fillShellDefaults(fromSeparate),
  });
}

/** When creating a theme: merge pack `base.layout` with legacy flat overrides, or persist a breakpoint map as-is. */
export function mergeThemeCustomLayoutForCreate(
  baseLayout: ShellLayout,
  incoming: unknown,
): Record<string, unknown> {
  if (incoming == null || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return { ...fillShellDefaults(baseLayout) };
  }
  if (isLegacyCustomLayout(incoming)) {
    return { ...fillShellDefaults(baseLayout), ...incoming };
  }
  if (isBreakpointMapCustomLayout(incoming)) {
    return JSON.parse(JSON.stringify(incoming)) as Record<string, unknown>;
  }
  return { ...fillShellDefaults(baseLayout), ...(incoming as Record<string, unknown>) };
}
