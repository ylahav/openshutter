# Templating refactor

Single source for goals, current architecture notes, and phased work.
Use this as the working document for the multi-pack/page-builder integration.

## Goals

1. **Multiple visual identities** — Noir, Studio, Atelier from one codebase (tokens + variants, not forked apps).
2. **Pack-level page components** — Each pack owns full-page layouts for reserved roles (Home, Gallery, Album, About, Contact, Login, Search, CmsPage, …).
3. **Config-driven** — Pack id, colors, fonts, layout, header/menu from DB / `SiteConfig`, not code edits.
4. **Page builder fallback** — When `pageModules` (etc.) is meaningfully set, `PageRenderer` wins; otherwise the pack page renders.
5. **CSS tokens** — `--tp-*` (and related `--os-*`), dark/light, per-pack SCSS limited to structure not one-off hex.
6. **SSR** — Public pages render real HTML on the server for SEO.
7. **RTL** — Logical CSS + `dir` from locale (e.g. Hebrew).
8. **Reactive** — Pack switch, theme toggle, font changes without full page reload.

## Current architecture (2026-04)

1. **Page ownership model**:
   - Pages are still DB-backed.
   - Reserved roles (`home`, `gallery`, `album`, `login`, `search`, `blog`, `blog-category`, `blog-article`) resolve with pack-aware fallback.
   - Pack-owned full pages are the default rendering path for reserved roles.
   - Page-builder modules/layers override pack defaults when configured.
2. **Pack assignment model**:
   - `frontendTemplates: string[]` is the primary per-page pack assignment field.
   - Legacy `frontendTemplate` stays as compatibility fallback while data is being migrated.
3. **Shared instance configs**:
   - `template.layoutShellInstances` stores reusable layout-shell grids.
   - `template.menuInstances` stores reusable menu definitions.
   - Modules reference these via `props.instanceRef`.

## Known issues (current codebase)

1. **Svelte 4 stores vs Svelte 5 runes** — **Visitor pack id** (`active-template.svelte.ts`) and **site-config–derived branding** (`site-config-derivatives.svelte.ts`: `productName`, `publicSiteLogo`, `publicSiteFavicon`) use `$derived` + `fromStore`/`toStore`; call sites keep `$productName` etc. **`language`** `isRTL` / `textDirection` stay `derived` for now (module init order). Full `siteConfig` writable→runes is optional follow-up.
2. **`TemplateService` vs registry** — Visitor pages must use `getTemplatePack()` from `lib/template-packs/registry.ts`. `TemplateService` remains for static metadata, overrides, and admin fetch paths; shrink or rename over time so “pack loader” is unambiguously the registry.
3. **Loose `PageData`** — Fields like `introText`, `content` are loosely typed; pack pages can ignore required CMS props without compile errors. Tighten shared types and pack page prop contracts.

## Phased implementation

### Phase A — Single source for pack defaults (done)

- Semantic **colors/fonts** for `TemplateService.getTemplateConfig()` come from each pack’s `theme.defaults.json` (not duplicated literals in `template.ts`).
- Visitor **`--tp-*` / `--os-*`**: `mergePackColorsWithCustom` + `buildVisitorThemeStylesheet()` merge pack JSON **then** `site_config.template.customColors` / `customFonts`. Fonts fall back to pack defaults when a role is unset in config.
- **SSR**: root `+layout.server` returns `visitorSiteConfig`; `siteConfig.hydrateFromServer()` runs on mount; `ThemeColorApplier` emits a **`data:` stylesheet** link on the server (avoids a literal `<style>` block in Svelte, which the compiler treats as scoped CSS). Client replaces `#theme-custom-colors` with an injected `<style>` as before.
- **Pack resolution** is shared: `resolveVisitorTemplatePackId()` in `$lib/template-packs/resolve-visitor-pack.ts` (used by `activeTemplate` and the theme CSS builder).

### Phase B — Registry and types (done)

- **`pack-page-props.ts`**: per-page contracts (`PackGalleryPageProps`, `PackAboutPageProps`, …) and shared `PackGalleryAlbumListItem` for album tiles.
- **`TemplatePack.pages`**: typed as `Component<Props>` (Svelte 5) per route; registry uses `packPage<Props>()` casts from dynamic imports.
- **`PageBuilderModuleMap`**: uses `Component<any>` so pack overrides stay compatible with the page builder.
- **`HomeTemplateSwitcher`**: no longer passes unused `data` (pack `Home` components fetch internally).
- Next: consolidate naming docs only — **pack** = visitor identity (`frontendTemplate`).

### Phase C — Runes migration (visitor pack + branding reads)

- **`active-template.svelte.ts`**: `fromStore(page)` + `fromStore(siteConfigData)` → `$derived.by` → `resolveVisitorTemplatePackId` → **`toStore`** → **`$activeTemplate`** unchanged for consumers.
- **`site-config-derivatives.svelte.ts`**: `fromStore(siteConfigData)` + `fromStore(currentLanguage)` → **`$productName`**, **`$publicSiteLogo`**, **`$publicSiteFavicon`** via **`toStore`**; **`siteConfig.ts`** re-exports them (same `$stores/siteConfig` path).
- **`stores/template.ts`**: re-exports `activeTemplate` only.
- **Pattern**: runes for derived logic on top of legacy stores; **`toStore`** where the app still uses store subscription / `$` syntax.
- **No SvelteKit request** (`activeTemplate` only): reading `page` throws outside a request; branch **falls back** to `getConfiguredPackId(siteConfig)`.

### Phase D — Consolidate docs (done)

- Removed stale duplicate architecture notes.
- Kept this file as the active high-level refactor tracker.

## Related files

- Pack registry: `frontend/src/lib/template-packs/registry.ts`
- Template metadata / overrides: `frontend/src/services/template.ts`, `template-overrides.ts`, `template-config.ts`
- Active pack: `frontend/src/lib/stores/active-template.svelte.ts` (re-export `frontend/src/lib/stores/template.ts`)
- Branding readables: `frontend/src/lib/stores/site-config-derivatives.svelte.ts` (re-export `frontend/src/lib/stores/siteConfig.ts`)
- Theme application: `frontend/src/lib/components/ThemeColorApplier.svelte`, `lib/theme/build-visitor-theme-css.ts`, `lib/theme/template-palette.ts`, `lib/template/pack-theme-defaults.ts`
- Pack defaults: `frontend/src/templates/<pack>/theme.defaults.json`
