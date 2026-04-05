# Page builder modules — authoring contract and URL context

This document is the **canonical guide** for modules rendered by **`PageRenderer`** and stored in **`site_config.template.pageModules`** (and theme overrides). It merges the former **UI component modules** and **module URL parameters** docs.

**See also:** [Templating — architecture, tasks, and theming](./TEMPLATING.md) (packs, themes, page keys, seeding, checklist). For operators, [TEMPLATE_CONTROL.md](../guides/TEMPLATE_CONTROL.md).

---

## Relationship to templating

| Topic | Where |
|--------|--------|
| Page keys (`home`, `gallery`, `album`, `header`, …), theme seeding, apply semantics | [Templating, Part II](./TEMPLATING.md#part-ii--page-builder-and-theme-seeding) |
| Grid placement, breakpoints, acceptance criteria | [Templating, Part I](./TEMPLATING.md#part-i--requirements-and-architecture) |
| Adding a **template pack** (Svelte shells, registry) | [Templating §8 appendix](./TEMPLATING.md#8-appendix-create-a-template-pack-built-in) |

---

## 1. Module contract (what a module is)

A module is one placed UI block. Each **kind** of module is identified for operators and for persistence as follows:

| Concept | Meaning | In code / DB today |
|--------|---------|--------------------|
| **Title** | Human-readable name shown in Admin (picker, labels). Same module kind always shows the same title. | `label` on each entry in `PAGE_MODULE_TYPES` (`frontend/src/lib/page-builder/module-types.ts`) |
| **Alias** | Unique, stable machine id. Never shown to visitors as UI copy. Used in saved config and renderer routing. **Must be globally unique** across all module kinds. | `type` on `PAGE_MODULE_TYPES` and on each saved module instance (`PageModuleData.type`) |

**Authoring rule:** pick the alias once (camelCase, no spaces), treat it as immutable after release. The title can be refined for clarity without breaking stored themes.

Each **placement** (instance on a grid) also has:

- **`props`** — JSON-serializable configuration for that cell (often flattened onto the component; see below)
- **placement fields** — `rowOrder`, `columnIndex`, `rowSpan`, `colSpan` (and legacy `zone` / `order` in some paths)

Placement is handled by page layout; module code must focus on UI behavior and `props`.

### Implemented UI components (catalog)

These **`type`** aliases are registered today in **`PAGE_MODULE_TYPES`** (`frontend/src/lib/page-builder/module-types.ts`), **`PageRenderer.moduleMap`**, and the Admin Overrides picker filters (`PAGE_CONTENT_MODULES`, `HEADER_MODULES`, `FOOTER_MODULES` in `templates/overrides/+page.svelte`). “Typical picker” is where the module **usually** appears; a few aliases are allowed in more than one region.

| Alias (`type`) | Admin label | Typical picker |
|----------------|-------------|----------------|
| `hero` | Hero | Content |
| `richText` | Rich Text | Content; Footer |
| `featureGrid` | Feature Grid | Content |
| `albumsGrid` | Albums Grid | Content |
| `albumView` | Album view | Content |
| `cta` | Call to Action | Content; Footer |
| `blogCategory` | Blog categories | Content |
| `blogArticle` | Blog articles | Content |
| `logo` | Logo | Header |
| `siteTitle` | Site Title | Header |
| `menu` | Menu | Header |
| `languageSelector` | Language Selector | Header |
| `themeToggle` | Theme Toggle | Header |
| `themeSelect` | Theme Select | Header; Footer |
| `userGreeting` | User Greeting | Header |
| `authButtons` | Auth Buttons | Header |
| `socialMedia` | Social Media | Header; Footer |

Legacy saved type **`albumGallery`** is normalized to **`albumView`** in `PageRenderer`.

---

## 2) How the module catalog works (no separate “installation”)

There is **no** runtime installer, plugin folder scan, or database table that registers modules. The catalog is **compile-time**:

1. **Canonical list** — `PAGE_MODULE_TYPES` in `frontend/src/lib/page-builder/module-types.ts` is the single array of `{ type, label }` pairs. Anything missing here does not exist for the product.

2. **Admin picker groups** — Templates → Overrides (and similar UIs) **subset** that list into buckets with **hardcoded alias filters** (e.g. `PAGE_CONTENT_MODULES`, `HEADER_MODULES`, `FOOTER_MODULES` in `frontend/src/routes/admin/templates/overrides/+page.svelte`). A new module appears in the picker only if:
   - it is in `PAGE_MODULE_TYPES`, and
   - its alias is included in the right filter array for the page region (content vs header vs footer).

3. **Public render** — `PageRenderer.svelte` maps **alias** → Svelte component in `moduleMap`. Unknown aliases render a safe placeholder; they do not crash the page.

So “registration” is: **edit shipped frontend source** in a few known places (see §6). There is no third-party install step.

---

## 3) Required file structure

For every new module, use this structure:

- `frontend/src/lib/page-builder/modules/<ModuleName>Module.svelte` (adapter)
- `frontend/src/lib/page-builder/modules/<ModuleName>/Layout.svelte` (UI layout)

Example:

- `modules/BlogCategoryModule.svelte`
- `modules/BlogCategory/Layout.svelte`

The adapter keeps `PageRenderer` integration simple. `Layout.svelte` holds view logic.

---

## 4) Naming rules

- **Alias** (`type`): camelCase, unique globally, immutable once themes may reference it.
- **Title** (`label`): short, operator-friendly (e.g. “Blog categories”).
- Wrapper file: PascalCase + `Module.svelte`.
- Folder name: PascalCase with `Layout.svelte` inside.

---

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
const titleText = MultiLangUtils.getTextValue(config.title, $currentLanguage);
```

**Legacy:** some modules still accept nested `props.config` during migration; new modules should prefer flat `module.props` only.

---

## 6) Registration steps (minimal touch)

| Step | File | What to do |
|------|------|------------|
| 1 | `frontend/src/lib/page-builder/modules/…` | Add adapter + `Layout.svelte`. |
| 2 | `frontend/src/lib/page-builder/module-types.ts` | Add `{ type: '<alias>', label: '<title>' }`. |
| 3 | `frontend/src/lib/page-builder/PageRenderer.svelte` | Import component; add `moduleMap['<alias>']`. |
| 4 | `frontend/src/routes/admin/templates/overrides/+page.svelte` | Add `<alias>` to `PAGE_CONTENT_MODULES`, `HEADER_MODULES`, or `FOOTER_MODULES` so it appears in the right picker. |
| 5 | Comments / tests | Document `props` next to `moduleMap` or module file; add tests per **§2.4** interim props rule in [Templating, Part I](./TEMPLATING.md#part-i--requirements-and-architecture). |

**Minimal-touch principle:** do not introduce new global registries until a manifest file can replace steps 2–4 with one import.

### Known sync risk

Registration is split across multiple files. Missing one step can produce partial behavior (e.g. render map updated but admin picker not). Add short “keep in sync” comments in `module-types.ts`, `PageRenderer.svelte`, and the admin overrides page (already present on `PageRenderer`).

---

## 7) Behavior and safety rules

- Never throw on bad or partial props.
- Render empty state or nothing when data is missing.
- Keep modules independent from route internals except **`data`** passed from `PageRenderer` (see §8).
- Avoid direct writes to global config from module code.
- Keep side effects in `onMount` minimal and failure-safe.
- **SSR-safe:** browser-only side effects in `onMount`; use `browser` from `$app/environment`; avoid top-level `window`/`document`.

---

## 8) URL parameters and page context (`data`)

`PageRenderer` does **not** pass a generic `data` object from the route loader alone. It builds a **`pageContext`** object and passes it to every module as **`data={pageContext}`** alongside spread props:

```ts
// PageRenderer.svelte (conceptual)
$: pageContext = {
  alias: page?.alias || $pageStore.params?.alias || $pageStore.params?.id || null,
  params: $pageStore.params || {}
};
```

```svelte
<svelte:component
  this={moduleMap[module.type]}
  {...module.props}
  data={pageContext}
  compact={compact}
/>
```

### What modules receive

| Field | Meaning |
|--------|---------|
| **`data.alias`** | Album (or similar) slug from the **page** payload or from **`$page.params`** (`alias` or `id` fallback). |
| **`data.params`** | Full SvelteKit **`$page.params`** for the active route. Use `data.params.mySegment` for any named param. |

The context is **reactive** when navigating client-side (e.g. between albums).

### Albums grid: “current album from URL”

On **`/albums/[alias]`**, set in the module config:

```json
{
  "_id": "mod_album_subalbums",
  "type": "albumsGrid",
  "props": { "albumSource": "current" },
  "rowOrder": 0,
  "columnIndex": 0
}
```

With **`albumSource: 'current'`**, `AlbumsGrid` / `Layout` uses **`data.alias`** to load sub-albums for the album in the URL (via public APIs — see §9). **`current`** only applies on routes that expose an album alias (or compatible `id`).

### Supported `albumSource` values (`albumsGrid`)

| Value | Behavior |
|--------|----------|
| **`root`** | Root albums (default) |
| **`featured`** | Featured albums only |
| **`selected`** | Albums listed in `selectedAlbums` |
| **`current`** | Sub-albums of the album from **`data.alias`** |

### Snippet: reading context in a module

```svelte
<script lang="ts">
  export let data: { alias?: string | null; params?: Record<string, string> } | null = null;
  $: albumSlug = data?.alias ?? null;
  $: galleryParam = data?.params?.galleryId; // example if route defines it
</script>
```

---

## 9) Data and the database

**Frontend modules never talk to MongoDB.** Use **HTTP APIs** only.

| Rule | Detail |
|------|--------|
| **Access path** | `fetch('/api/...')` or project wrappers. |
| **No collection names in UI** | Do not embed Mongo collection names in module props. |
| **New domain data** | Add or extend a NestJS controller/service; module calls that endpoint. |
| **Public vs admin** | Visitor modules use public endpoints; sensitive ops stay on admin routes. |
| **IDs in props** | Storing ids in `props` is fine; resolution happens on the server. |

---

## 10) Styling rules

- Tailwind utilities consistent with existing modules; `dark:*` where relevant.
- Do not hardcode colors that bypass theme variables unless intentional.
- Public content uses the shared shell (`.os-shell-container`); align with `--os-max-width`, `--os-padding`, `--os-gap` from layout customization.

---

## 11) Definition of done checklist

- [ ] Alias + title in `PAGE_MODULE_TYPES`
- [ ] Alias in correct Admin filter (content / header / footer)
- [ ] `PageRenderer.moduleMap` includes the alias
- [ ] Renders with and without spanning; safe with empty/invalid props
- [ ] Local TypeScript props type; multilingual fields resolve correctly
- [ ] Docs/comments for supported props; tests for default and invalid props
- [ ] Data only via documented APIs

---

## 12) Worked examples (built-in modules)

Patterns below mirror **`frontend/src/lib/page-builder/modules/`**. **New modules** should use **flat** `module.props` only (**§5**). Several **older** adapters still contain a **temporary** merge path for legacy payloads that nested options under **`props.config`** — that is **debt to remove** as themes are normalized, not a pattern to copy for new work.

### 12.1 Hero (`hero`)

Typical props: `title`, `subtitle`, `ctaLabel`, `ctaUrl`, `backgroundStyle` (`light` | `dark` | `image` | `galleryLeading`), `backgroundImage`.

```json
{
  "type": "hero",
  "props": {
    "title": { "en": "Welcome", "he": "ברוכים הבאים" },
    "subtitle": "Portfolio",
    "ctaLabel": "View galleries",
    "ctaUrl": "/albums",
    "backgroundStyle": "image",
    "backgroundImage": "/uploads/hero.jpg"
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

### 12.2 Rich text (`richText`)

Props: `title`, `body` (string or per-locale map), `background` (`white` | `gray` | `transparent`).

```json
{
  "type": "richText",
  "props": {
    "title": "About",
    "body": "<p>We shoot events and portraits.</p>",
    "background": "gray"
  },
  "rowOrder": 1,
  "columnIndex": 0
}
```

### 12.3 Albums grid — root vs current URL (`albumsGrid`)

**Home / gallery page** — list root albums:

```json
{
  "type": "albumsGrid",
  "props": {
    "title": "Albums",
    "albumSource": "root",
    "limit": 12,
    "showCover": true
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

**Album page** — sub-albums of the album in the URL:

```json
{
  "type": "albumsGrid",
  "props": {
    "albumSource": "current",
    "limit": 24
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

### 12.4 Single album view (`albumView`)

Renders one album’s photos; often used on the album route with grid placement. Configure via Overrides like other modules; pair with pack shell that mounts `PageRenderer` for the `album` page key.

### 12.5 Header strip: logo + menu (`logo`, `menu`)

Header modules use **`compact`** and the same `data` prop. Example pair stored under **`pageModules.header`** (structure depends on your theme; placement uses `rowOrder` / `columnIndex` within the header page modules list).

```json
{
  "type": "logo",
  "props": {},
  "rowOrder": 0,
  "columnIndex": 0
}
```

```json
{
  "type": "menu",
  "props": {},
  "rowOrder": 0,
  "columnIndex": 1
}
```

(`menu` / `logo` props are extended in their `Layout` components — keep defaults safe.)

### 12.6 Call to action (`cta`)

Props include multilingual `title`, `description`, `primaryLabel`, `primaryHref`, optional `secondaryLabel` / `secondaryHref` (see `CtaModule.svelte`).

### 12.7 Albums, album view, blog modules (`albumsGrid`, `albumView`, `blogCategory`, `blogArticle`)

Quick JSON lives in **§12.3–12.4** above. For **props semantics**, URL-aware **`albumSource`**, and adapter patterns, see **§13**.

---

## 13) Extended examples: `albumsGrid`, `albumView`, `blogCategory`, `blogArticle`

### 13.1 Albums grid (`albumsGrid`)

**Component:** `AlbumsGridModule.svelte` → `AlbumsGrid/Layout.svelte`.  
**Role:** Card grid of **albums** (covers, titles, optional counts). Data comes from public album APIs, driven by **`albumSource`** and optional filters.

**`albumSource`** (see also [§8 — URL context](#8-url-parameters-and-page-context-data)):

| Value | Behavior |
|-------|----------|
| `root` | Root-level albums (default). |
| `featured` | Featured albums only. |
| `selected` | Albums whose ids are listed in **`selectedAlbums`**. |
| `current` | On routes with an album slug (e.g. `/albums/[alias]`), children of the album in **`data.alias`**. |

Other props worth knowing (defaults in code): `title`, `description`, `selectedAlbums`, `rootAlbumId`, `rootGallery`, `includeRoot`, `showCover`, `coverAspect`, `showDescription`, `descriptionLines`, `cardFieldOrder`, `showPhotoCount`, `showFeaturedBadge`, `sortBy`, `sortDirection`, `limit`.

**Gallery listing page** — root albums:

```json
{
  "type": "albumsGrid",
  "props": {
    "title": "Collections",
    "albumSource": "root",
    "sortBy": "name",
    "sortDirection": "asc",
    "limit": 12,
    "showCover": true,
    "coverAspect": "video"
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

**Album detail route** — sub-albums of the current URL album:

```json
{
  "type": "albumsGrid",
  "props": {
    "albumSource": "current",
    "limit": 24,
    "showDescription": true
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

**Adapter pattern (reference — see `AlbumsGridModule.svelte` for the complete file):** `PageRenderer` spreads **`module.props`** onto the adapter as top-level `export let`s. The adapter merges those with any legacy **`props.config`** into one **`config`** object and passes **`data`** (page context from **§8**) into `Layout` — required for **`albumSource: 'current'`** (resolves the album from **`data.alias`**).

```svelte
<script lang="ts">
	import Layout from './AlbumsGrid/Layout.svelte';

	type AlbumsGridProps = {
		title?: string | Record<string, string>;
		albumSource?: 'root' | 'featured' | 'selected' | 'current';
		// …full type matches AlbumsGridModule
	};
	type Legacy = { config?: AlbumsGridProps } & AlbumsGridProps;

	// Defaults for every prop PageRenderer may pass (see module source)
	export let title: NonNullable<AlbumsGridProps['title']> = '';
	export let albumSource: NonNullable<AlbumsGridProps['albumSource']> = 'root';
	// …

	export let props: Legacy | undefined = undefined;
	export let data: unknown = null;

	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			albumSource
			// …all other flat exports, same names as AlbumsGridModule
		}) satisfies AlbumsGridProps;
</script>

<Layout {config} {data} />
```

`Layout.svelte` uses **`config`** for public API calls and **`data?.alias`** when **`albumSource === 'current'`**.

### 13.2 Album view (`albumView`)

**Component:** `AlbumGalleryModule.svelte` → `AlbumGallery/Layout.svelte` (alias **`albumView`**; legacy type **`albumGallery`** is normalized here).  
**Role:** **Single-album** experience: album header (title, description, stats) plus **sub-albums and/or photos** in one or more card layouts. Uses **`data`** (`alias` / `params`) when **`albumSource`** is `current` so the correct album loads on `/albums/[alias]`.

High-signal props (see `AlbumGalleryModule.svelte` for the full type): `title`, `description`, `albumHeaderFieldOrder`, `showAlbumPageTitle`, `albumSource` (`root` | `featured` | `selected` | `current`), `selectedAlbums`, `cardDataType` (`subAlbums` | `photos` | `both`), `mixedDisplayMode` (`grouped` | `interleaved`), `showSectionLabels`, `coverAspect`, card field orders (`albumCardFieldOrder`, `photoCardFieldOrder`, …), `sortBy`, `sortDirection`, `limit`.

**Typical album page** — current album from URL, albums + photos:

```json
{
  "type": "albumView",
  "props": {
    "albumSource": "current",
    "cardDataType": "both",
    "mixedDisplayMode": "grouped",
    "showAlbumPageTitle": true,
    "showAlbumPageDescription": true,
    "limit": 48,
    "coverAspect": "video"
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

**Photos only** inside the current album:

```json
{
  "type": "albumView",
  "props": {
    "albumSource": "current",
    "cardDataType": "photos",
    "showTitle": true,
    "limit": 60
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

### 13.3 Blog category (`blogCategory`)

**Alias:** `blogCategory` · **Label:** Blog categories  

Suggested props: `title`, `layout` (`chips` | `list`), `showCount`, `maxItems`, `sortBy` (`name` | `count`).

- Load categories via a **public API** (e.g. `GET /api/blog/categories`); never query Mongo from Svelte.
- Fallback to empty list on failure.
- `maxItems` default to a safe cap (e.g. 10).

**Adapter pattern:** this module is simpler than **`albumsGrid`** (no `data` / URL coupling). Minimal shape:

```svelte
<script lang="ts">
  import Layout from './BlogCategory/Layout.svelte';
  type BlogCategoryProps = { title?: string | Record<string, string>; /* … */ };
  export let props: BlogCategoryProps | undefined = undefined;
  $: config = props ?? {};
</script>
<Layout {config} />
```

For the **full** pattern — flat `export let` props, legacy **`props.config`** merge, and passing **`data`** to `Layout` — use **§13.1** (`AlbumsGridModule`) as the canonical reference.

### 13.4 Blog article (`blogArticle`)

**Alias:** `blogArticle` · **Label:** Blog articles  

Suggested props: `mode` (`single` | `list`), `articleId`, `categoryId`, `limit`, `showImage`, `showExcerpt`, `showMeta`, multilingual `ctaLabel`.

- If `mode=single` and no `articleId`, show a safe placeholder.
- If `mode=list`, load via API with filters and `limit`.

---

## 14) Future enhancement (module manifest)

Move from scattered registration to a **single manifest** (alias, title, region, component, optional schema). That aligns with Phase 2 in [Templating, Part I — §2.4](./TEMPLATING.md#part-i--requirements-and-architecture).

---

## 15) Revision

**2026-04:** Consolidated **`UI_COMPONENT_MODULES.md`** and **`MODULE_URL_PARAMS.md`** into this file; expanded examples for hero, rich text, albums grid, header modules, and clarified `PageRenderer` **`data`** / **`pageContext`** shape.

**2026-04:** Added **implemented UI components** table (§1); extended **§13** with **`albumsGrid`** and **`albumView`** narratives and JSON, plus renumbered blog examples to **§13.3–§13.4**.

**2026-04:** **§12** — clarified legacy **`props.config`** as debt, not a pattern for new modules. **§13.1** — **`albumsGrid`** adapter reference (flat props + **`data`**); **§13.3** blog adapter called minimal vs §13.1.
