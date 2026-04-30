/** Visitor template packs (must match frontend `$lib/template/packs/ids`). */
export const VISITOR_TEMPLATE_PACKS = ['noir', 'studio', 'atelier'] as const;
export type VisitorTemplatePackId = (typeof VISITOR_TEMPLATE_PACKS)[number];

export function normalizeVisitorPack(value: unknown): VisitorTemplatePackId | null {
  const s = String(value ?? '').trim().toLowerCase();
  return (VISITOR_TEMPLATE_PACKS as readonly string[]).includes(s) ? (s as VisitorTemplatePackId) : null;
}

/** Mongo filter: reserved role + optional pack (null = default variant). */
export function roleAndPackFilter(
  role: string,
  pack: VisitorTemplatePackId | null,
): Record<string, unknown> {
  const base: Record<string, unknown> = { pageRole: role };
  if (pack) {
    base.frontendTemplate = pack;
  } else {
    base.$or = [{ frontendTemplate: null }, { frontendTemplate: '' }, { frontendTemplate: { $exists: false } }];
  }
  return base;
}
