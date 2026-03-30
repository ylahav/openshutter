# Templating Task List

**Canonical requirements:** [`TEMPLATING_REQUIREMENTS.md`](./TEMPLATING_REQUIREMENTS.md)

This checklist is focused on adoption-first delivery: fast visual impact, easy customization, and contributor-friendly extension points.

### Cell-based module assignment — phased implementation

Cross-reference: **§2.2.1** (spans + anchor), **§2.2.3** (breakpoints/cascade rules), and **§2.2.4** (cell-based module assignment workflow) in `TEMPLATING_REQUIREMENTS.md`. This phased plan assumes **modules are assigned to grid cell(s)** (anchor + `rowSpan`/`colSpan`), not named positions-first.

| Phase | Scope | Outcome |
|-------|--------|---------|
| **P0 — Canonical placement types** | Consolidate placement as **anchor + spans** (`rowOrder`, `columnIndex`, `rowSpan`, `colSpan`) across frontend and persistence; add/extend validators for positive integers + in-bounds rules. | One canonical placement format and consistent runtime behavior. |
| **P1 — Admin: grid + spans authoring (per breakpoint)** | Ensure overrides editing fully supports editing **grid dimensions** and module placements (including spans) for the selected breakpoint, without corrupting other breakpoints. | Editors can build per-breakpoint layouts confidently. |
| **P2 — Breakpoint utilities + persistence sync** | Provide tools like **“Same for all breakpoints”** (copy current breakpoint’s grid + module placements across `xs..xl` for the same page), and ensure persistence stays aligned (legacy sync + normalize rules). | Breakpoint changes are repeatable and saved consistently. |
| **P3 — Template pack defaults for cell grids** | Packs ship initial per-page grids + module placements per breakpoint band, so fresh installs render without manual grid math. | New sites have sensible defaults immediately. |
| **P4 — Migration / compatibility & safety** | Migrate legacy flat `pageLayout` / `pageModules` to the breakpoint-aware editor model (or overlays), and enforce validation/safety to prevent broken pages. | Old themes still work; invalid configs fail safely. |

**Continue from here:** Milestone 2 is largely done. Next focus is **Milestone 3** (polish the four built-in styles: default, minimal, modern, elegant) and tightening **Milestone 1** gaps called out below (About / CMS routes use `PageRenderer`, not pack entries).

## Milestone 1: Foundation (High Priority)

- [x] Define template pack contract — `frontend/src/lib/template-packs/types.ts` (`TemplatePack`, required `pages`: Home, Gallery, Album, Login; optional `components`: Header, Footer, …). **Note:** Albums list is the **Gallery** page; **About** and **Page Builder** routes use shared `PageRenderer` + modules, not pack-registered Svelte shells.
- [x] Optional components and fallback — `getTemplatePack()` falls back to `default` with a console warning (`registry.ts`).
- [ ] `config.ts`-style schema for *all* template options — partial: visibility + site config; full `TemplateConfig` surface not all exposed in admin forms.
- [x] Build template registry and dynamic resolver — `registry.ts` + `getTemplatePack()` consumed by `*TemplateSwitcher` components.
- [x] Runtime safety and fallback — unknown pack name → `default`; `TemplateService.loadTemplate` / `getActiveTemplate` also fall back.
- [x] Feature flag for pack loader — `PUBLIC_ENABLE_TEMPLATE_PACK_LOADER` in `frontend/src/services/template.ts` (opt-in validation path when enabled).
- [x] Developer-facing error messages for invalid packs — **public** unknown `frontendTemplate`: dismissible banner (`PackFallbackBanner`) + `site_config` PUT validation for built-in ids; logs remain in `getTemplatePack`.

## Milestone 2: Admin Experience (High Priority)

- [x] Add Site Config section for active template selection — **Theme & layout** tab on `/admin/site-config` (and `?tab=template` deep link); admin home quick link under Site configuration
- [x] Add per-template option editor from `config.ts` — **Component visibility** on `/admin/template-config` loads defaults from `GET /api/admin/templates` (template `visibility`) merged with site overrides; full JSON editing remains on `/admin/templates/customize`
- [x] Add preview mode (quick switch + safe save) — admin templates list + preview store + apply/revert
- [x] Add reset-to-default per-template option controls — visibility reset writes built-in defaults for the active template (same source as backend merge)
- [ ] Add permissions and audit events for template changes — *deferred* (admin-guarded APIs only today)

## Milestone 3: Initial Pack Set (High Priority)

- [x] Ship at least 3 polished built-in packs — four keys; **recent pass:** distinct home shells + minimal/default header treatment (ongoing refinement OK).
- [ ] Ensure each pack supports:
  - Home
  - Albums list
  - Album view
  - About
  - Page Builder pages
- [ ] Validate light/dark theme behavior per pack
- [ ] Validate RTL and i18n behavior per pack

## Milestone 4: Developer Experience (Medium Priority)

- [x] Write "Create a template pack" guide with scaffold steps — see **`docs/CREATE_TEMPLATE_PACK.md`**
- [ ] Add pack example project with comments and best practices
- [ ] Add lint/type checks for pack contract compliance
- [ ] Add snapshot test coverage for core layouts
- [ ] Add migration notes for legacy templates

## Milestone 5: Community Activation (Medium Priority)

- [ ] Create showcase page/screenshots for built-in packs
- [ ] Add "submit your template pack" contribution guide
- [ ] Add template changelog section in release notes
- [ ] Publish pack compatibility policy (versioning expectations)

## Technical Backlog (Detailed)

### Backend

- [x] Persist selected pack and options in site config — themes collection + `site_config.template` (applied theme drives public/admin template keys).
- [ ] Validate incoming template config payloads — tighten on PUT where needed.
- [x] Template metadata — `GET /api/admin/templates` returns static `TemplateConfig[]`; theme CRUD under `/api/admin/themes`.

### Frontend

- [x] Resolve active template — `activeTemplate` store + site config (`frontend/src/lib/stores/template.ts`).
- [x] Route component mapping by active pack — `*TemplateSwitcher.svelte` + `getTemplatePack`.
- [x] Fallback rendering — pack fallback to `default`; optional `Footer`/`Header` fallback patterns in switchers.
- [x] Admin UI form renderer for typed template options — *partial:* component visibility + site-config template hub; not all `TemplateConfig` fields
- [x] Preview state management and unsaved changes guard

### Testing

- [ ] Unit tests for template resolver and option validation
- [ ] Integration tests for admin template switching flow
- [ ] E2E tests for route rendering across all built-in packs
- [ ] Visual regression checks for top pages per pack

## Acceptance Criteria (MVP)

- [x] Admin can switch templates without code changes — themes + apply + site config.
- [ ] At least 3 built-in packs render all required routes — *functional* for Home/Gallery/Album/Login; **polish** and edge routes tracked in M3.
- [x] Per-template options are editable and persisted — visibility + theme overrides + JSON customize path.
- [x] Fallback behavior prevents broken public pages — pack + `TemplateService` fallback to `default`.
- [ ] Docs allow contributors to create and register a new pack — M4.
