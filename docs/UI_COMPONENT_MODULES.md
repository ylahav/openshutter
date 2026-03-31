# UI component modules - structure and authoring rules

This document defines a single, repeatable way to build new page-builder modules.
It applies to modules rendered by `PageRenderer` and stored in `pageModules`.

## 1) Module contract (what a module is)

A module is one placed UI block. Each **kind** of module is identified for operators and for persistence as follows:

| Concept | Meaning | In code / DB today |
|--------|---------|--------------------|
| **Title** | Human-readable name shown in Admin (picker, labels). Same module kind always shows the same title. | `label` on each entry in `PAGE_MODULE_TYPES` (`frontend/src/lib/page-builder/module-types.ts`) |
| **Alias** | Unique, stable machine id. Never shown to visitors as UI copy. Used in saved config and renderer routing. **Must be globally unique** across all module kinds. | `type` on `PAGE_MODULE_TYPES` and on each saved module instance (`PageModuleData.type`) |

**Authoring rule:** pick the alias once (camelCase, no spaces), treat it as immutable after release. The title can be refined for clarity without breaking stored themes.

Each **placement** (instance on a grid) also has:

- `props` - JSON-serializable configuration for that one cell
- placement fields - `rowOrder`, `columnIndex`, `rowSpan`, `colSpan`

Placement is handled by page layout; module code must focus on UI behavior and `props`.

## 2) How the UI module list works (no separate “installation”)

There is **no** runtime installer, plugin folder scan, or database table that registers modules. The catalog is **compile-time**:

1. **Canonical list** - `PAGE_MODULE_TYPES` in `frontend/src/lib/page-builder/module-types.ts` is the single array of `{ type, label }` pairs (alias + title). Anything missing here does not exist for the product.

2. **Admin picker groups** - Templates → Overrides (and similar UIs) **subset** that list into buckets with **hardcoded alias filters** (example: `PAGE_CONTENT_MODULES`, `HEADER_MODULES`, `FOOTER_MODULES` in `frontend/src/routes/admin/templates/overrides/+page.svelte`). A new module appears in the picker only if:
   - it is in `PAGE_MODULE_TYPES`, and
   - its alias is included in the right filter array for the page region you care about (content vs header vs footer).

3. **Public render** - `PageRenderer.svelte` maps **alias** → Svelte component in `moduleMap`. Unknown aliases render a safe placeholder, they do not crash the page.

So “registration” is: **edit shipped frontend source** in a few known places (see below). There is no third-party install step.

## 3) Required file structure

For every new module, use this structure:

- `frontend/src/lib/page-builder/modules/<ModuleName>Module.svelte` (adapter)
- `frontend/src/lib/page-builder/modules/<ModuleName>/Layout.svelte` (UI layout)

Example:

- `modules/BlogCategoryModule.svelte`
- `modules/BlogCategory/Layout.svelte`

The adapter keeps `PageRenderer` integration simple. `Layout.svelte` holds view logic.

## 4) Naming rules

- **Alias** (`type`): camelCase, unique globally, immutable once themes may reference it.
- **Title** (`label`): short, operator-friendly (e.g. “Blog categories”).
- Wrapper file: PascalCase + `Module.svelte`.
- Folder name: PascalCase with `Layout.svelte` inside.

## 5) Props rules

- `props` must be optional-safe (`undefined` must not crash rendering).
- Keep `props` JSON-safe (no functions, class instances, Dates as objects).
- **Standard for new modules:** props are **flat** on the module instance (`module.props`), not nested under `props.config`.
- Define defaults in adapter or layout, not in API payload assumptions.
- Support multilingual content with `MultiLangUtils.getTextValue` when text is user-facing.
- Unknown values should gracefully fall back to defaults.
- Declare a local TypeScript props type in the adapter or layout file (do not rely on `any` only).

Recommended shape:

```ts
type BlogCategoryProps = {
  title?: string | Record<string, string>;
  showCount?: boolean;
  maxItems?: number;
  sortBy?: 'name' | 'count';
};
```

Multilingual example:

```ts
// Both are valid inputs for a text prop:
const a = 'Hello';
const b = { en: 'Hello', he: 'שלום' };

// Resolve based on active language:
const titleText = MultiLangUtils.getTextValue(config.title, $currentLanguage);
```

## 6) Registration steps (minimal touch on existing code)

Today, adding a module touches a **small, fixed set** of files. There is no optional path with fewer steps unless we later refactor to a single manifest re-export (future).

| Step | File | What to do |
|------|------|------------|
| 1 | `frontend/src/lib/page-builder/modules/…` | Add adapter + `Layout.svelte`. |
| 2 | `frontend/src/lib/page-builder/module-types.ts` | Add `{ type: '<alias>', label: '<title>' }`. |
| 3 | `frontend/src/lib/page-builder/PageRenderer.svelte` | Import component; add `moduleMap['<alias>']`. |
| 4 | `frontend/src/routes/admin/templates/overrides/+page.svelte` | Add `<alias>` to `PAGE_CONTENT_MODULES`, `HEADER_MODULES`, or `FOOTER_MODULES` filter list so it appears in the right picker. |
| 5 | Comments / tests | Document `props` next to `moduleMap` or module file; add tests per `TEMPLATING_REQUIREMENTS.md` interim rule. |

**Minimal-touch principle:** do not introduce new global registries until a manifest file can replace steps 2–4 with one import. Until then, keep changes limited to the table above.

### Known sync risk (important)

Registration is currently split across multiple files. Missing one step can produce partial behavior without a hard error (example: render map updated but admin picker filter not updated).

To reduce this risk, add a short comment in each touched file:

- `module-types.ts`: "When adding a module, also update PageRenderer and admin overrides filters."
- `PageRenderer.svelte`: "Keep in sync with PAGE_MODULE_TYPES and admin overrides filters."
- `admin/templates/overrides/+page.svelte`: "Keep module filter arrays in sync with PAGE_MODULE_TYPES and PageRenderer."

This is a temporary safeguard until a single manifest-based registry is introduced.

## 7) Behavior and safety rules

- Never throw on bad or partial props.
- Render empty state or nothing when data is missing.
- Keep module independent from route internals except `data` passed from `PageRenderer` (`pageContext`: alias, params, etc.).
- Avoid direct writes to global config from module code.
- Keep side effects in `onMount` minimal and failure-safe.
- Keep module **SSR-safe** using this project standard:
  - put browser-only side effects in `onMount`
  - for inline/browser checks, use `browser` from `$app/environment`
  - avoid direct top-level `window`/`document` access

## 8) Data and the database (rules for persistence)

**Frontend modules never talk to MongoDB or any database driver.** They run in the browser (and optionally SSR in SvelteKit) and must use **HTTP APIs** only.

| Rule | Detail |
|------|--------|
| **Access path** | Use `fetch('/api/...')` (or project `fetch` wrappers) to backend routes. The backend owns collection names, queries, and authorization. |
| **No collection names in UI** | Do not embed Mongo collection names or raw query shapes in module props or Svelte code. The API is the contract. |
| **New domain data** | Add or extend a **NestJS controller/service** (or existing public API) that reads the right collection(s), validates input, and returns DTOs. The module calls that endpoint. |
| **Public vs admin** | Public site modules use **public** or anonymized endpoints appropriate for unauthenticated visitors. Sensitive operations stay on **admin** routes with auth. |
| **IDs in props** | Storing `articleId`, `categoryId`, etc. in `props` is fine; resolving them to documents happens on the server in the API handler, not in the module via DB. |
| **Caching / SSR** | Prefer `+page.server.ts` `load` when the whole page should ship with data; use client `fetch` inside the module when the block loads lazily—still only via HTTP APIs. |

**Summary:** collections and “which document to load” are **server concerns**; modules are **presentation + API clients**.

## 9) Styling rules

- Use Tailwind utility classes consistent with existing modules.
- Respect dark mode classes (`dark:*`) where relevant.
- Do not hardcode colors that bypass theme variables unless intentional.
- Keep spacing consistent with container/grid behavior from page layout.
- Public page content is wrapped by a shared shell container (`.os-shell-container`), whose values come from Layout Customization per breakpoint (`--os-max-width`, `--os-padding`, `--os-gap`). Module layouts should align to that shell and avoid hardcoded page-level `max-w-*` wrappers unless a full-bleed effect is intentional.

## 10) Definition of done checklist

A new module is complete only when:

- alias + title exist in `PAGE_MODULE_TYPES`
- alias appears in the correct Admin filter (content / header / footer)
- `PageRenderer.moduleMap` includes the alias
- rendering works with and without spanning
- props defaults and invalid props are handled safely
- a local TypeScript props type exists and is used by adapter/layout
- multilingual fields resolve correctly
- unknown data states show safe fallback UI
- docs/comments describe supported props
- at least one render test covers default/empty props and one invalid-props case
- data loads only through documented APIs, not direct DB access from the module

## 11) Example module: blog category

### Use case

Render a list of blog categories (chips or list) with optional post counts.

### Alias, title, and props

- **Alias** (`type`): `blogCategory`
- **Title** (`label`): e.g. `Blog categories`
- Suggested props:
  - `title?: string | Record<string, string>`
  - `layout?: 'chips' | 'list'`
  - `showCount?: boolean`
  - `maxItems?: number`
  - `sortBy?: 'name' | 'count'`

### Minimal adapter pattern

```svelte
<script lang="ts">
  import Layout from './BlogCategory/Layout.svelte';
  type BlogCategoryProps = {
    title?: string | Record<string, string>;
    layout?: 'chips' | 'list';
    showCount?: boolean;
    maxItems?: number;
    sortBy?: 'name' | 'count';
  };

  export let props: BlogCategoryProps | undefined = undefined;
  $: config = props ?? {};
</script>

<Layout config={config} />
```

Compatibility note: legacy modules may still read `props?.config` during migration, but new modules should not introduce this pattern.

### Layout expectations

- load categories via a **public API** (e.g. `GET /api/blog/categories`) implemented on the backend; do not query Mongo from Svelte
- fallback to empty list on API failure
- render section title only if provided
- `maxItems` defaults to a safe limit (example: `10`)

## 12) Example module: blog article

### Use case

Render one article card or a compact article list depending on props.

### Alias, title, and props

- **Alias** (`type`): `blogArticle`
- **Title** (`label`): e.g. `Blog article` or `Blog articles`
- Suggested props:
  - `mode?: 'single' | 'list'`
  - `articleId?: string` (for single mode)
  - `categoryId?: string` (optional filter)
  - `limit?: number`
  - `showImage?: boolean`
  - `showExcerpt?: boolean`
  - `showMeta?: boolean`
  - `ctaLabel?: string | Record<string, string>`

### Layout expectations

- if `mode=single` and no `articleId`, render safe placeholder
- if `mode=list`, load via API filtered by `categoryId` and `limit`
- all text fields support multilingual values
- card/list rendering must be responsive and dark-mode safe

## 13) Future enhancement (recommended)

Move from scattered registration to a **module manifest** (one import) that supplies:

- `alias` (wire id)
- `title` (operator label)
- `region`: `content` | `header` | `footer` | `*` (for picker grouping)
- `configSource` (`siteConfig` | `assignment` | `hybrid`)
- `component` (lazy or static)
- runtime `props` schema + defaults

That would reduce “minimal touch” to: new files + one manifest row + backend API if the module needs data.

This aligns with planned Phase 2 component taxonomy and validation in `docs/TEMPLATING_REQUIREMENTS.md`.
