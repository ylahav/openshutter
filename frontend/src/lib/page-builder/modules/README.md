# Page builder modules

These Svelte modules render **site-facing** blocks placed via the theme layout grid (`PageRenderer` → `PageBuilderGrid`). Each row in `module-types.ts` maps to a `*Module.svelte` entry in `PageRenderer`’s `moduleMap`.

This documentation and the current class refactor scope focus on **visitor UI output only** (module layouts and shared site-facing UI components). Admin builder/editor screens and shared renderer/grid shell scaffolding are intentionally out of scope unless explicitly requested.

## UI styling contract (modules + visitor primitives)

**Goal:** templates can restyle page-builder output without forking Svelte, using only **class hooks** and **separate SCSS**.

1. **Markup** — Components expose stable, BEM-style hooks such as `pb-hero`, `pb-themeToggle`, `pb-menu__link`, etc. **Do not** rely on Tailwind or ad-hoc inline styles for the default visitor look; structure + classes only in `*Module.svelte` / `Layout.svelte` and shared primitives.
2. **Base SCSS** — Default (shared) presentation: co-locate with primitives when it’s a shared widget (e.g. **`primitives/theme-toggle/_theme-toggle.scss`**), or next to the module (e.g. **`Hero/_hero.scss`**), re-used from **`modules/styles/_index.scss`**. This layer is loaded from the global template pipeline (`src/templates/styles/_components.scss` → `main.scss` → `BodyTemplateWrapper`).
3. **Template overrides** — Packs import shared tokens (`--tp-*`, `--os-*`) and override by nesting selectors under **`.tpl-pack-<pack>`** (and optional **`[data-layout-preset]`**) so rules beat the base layer without touching TS/Svelte. Example: `.tpl-pack-studio .pb-themeToggle { … }` in `templates/<pack>/styles/*.scss`.
4. **Optional pack partials** — Some widgets also support a dedicated file under **`templates/<pack>/styles/_*.scss`** (e.g. **`_themeToggle.scss`**, **`_authButtons.scss`**, **`_hero.scss`**, **`_albumsGrid.scss`**) loaded after the main pack stylesheet via **`loadPackPageBuilderPartials`** (and/or **`@use`** from the pack’s **`styles.scss`**) so overrides stay out of bloated entry stylesheets.
5. **Optional component overrides** — For rare structural differences, use **`template-module-overrides.ts`** to swap a pack-specific `*Module.svelte` adapter; visuals should still target the same **`pb-*`** classes where possible.

**Legacy:** Many modules still ship `<style>` blocks in `.svelte` files; migrate new work and refactors toward **classes + `modules/styles/*.scss`** so packs can override cleanly.

## Shared behavior

### Optional grid placement

Any module’s `props` may include **`placement`** (see `module-cell-placement.ts`):

- `horizontal`: `default` | `start` | `center` | `end` | `stretch`
- `vertical`: same set

The grid wraps each module in a cell with class **`pbModuleCell`** plus your module `className` / `wrapperClassByPack`. For **layout-shell grid rows**, placement uses **`pbModuleCell--shellGrid`** and **`pbModuleCell--align-self-*` / `pbModuleCell--justify-self-*`** (see `modules/styles/_module-cell.scss`) instead of inline styles. **Flex** rows (no row template) still apply placement as **inline** flex on the wrapper. **`placement`** is not passed through to the module component (it is stripped before spread).

### Template pack styling (SCSS)

Modules use **palette tokens** so packs can theme them without editing components:

| Token (examples) | Typical use |
|------------------|-------------|
| `--tp-fg`, `--tp-fg-muted`, `--tp-fg-subtle` | Text |
| `--tp-border` | Dividers, card borders |
| `--tp-surface-1` … `--tp-surface-3` | Surfaces |
| `--tp-canvas` | Page background (outer page shell) |
| `--tp-brand`, `--tp-on-brand` | Brand fills and text on brand |
| `--tp-hero-strip-bg`, `--tp-overlay-scrim` | Hero bands / image overlays |
| `--os-primary` | Accent / links (legacy name, still widely used) |

Use **`[data-layout-preset="…"]`** on layout regions and module-specific classes below in pack SCSS (e.g. `.layout-shell`, `.os-divider`).

## Module index

| Type (`props` / module) | Documentation |
|-------------------------|---------------|
| `hero` | [Hero/README.md](./Hero/README.md) |
| `richText` | [RichText/README.md](./RichText/README.md) |
| `divider` | [Divider/README.md](./Divider/README.md) |
| `featureGrid` | [FeatureGrid/README.md](./FeatureGrid/README.md) |
| `albumsGrid` | [AlbumsGrid/README.md](./AlbumsGrid/README.md) |
| `rootAlbumsList` | Root-level album name list (`RootAlbumsList/Layout.svelte`) |
| `albumView` | [AlbumGallery/README.md](./AlbumGallery/README.md) |
| `cta` | [Cta/README.md](./Cta/README.md) |
| `blogCategory` | [BlogCategory/README.md](./BlogCategory/README.md) |
| `blogArticle` | [BlogArticle/README.md](./BlogArticle/README.md) |
| `logo` | [Logo/README.md](./Logo/README.md) |
| `siteTitle` | [SiteTitle/README.md](./SiteTitle/README.md) |
| `menu` | [Menu/README.md](./Menu/README.md) |
| `languageSelector` | [LanguageSelector/README.md](./LanguageSelector/README.md) |
| `themeToggle` | [ThemeToggle/README.md](./ThemeToggle/README.md) |
| `themeSelect` | [ThemeSelect/README.md](./ThemeSelect/README.md) |
| `userGreeting` | [UserGreeting/README.md](./UserGreeting/README.md) |
| `authButtons` | [AuthButtons/README.md](./AuthButtons/README.md) |
| `socialMedia` | [SocialMedia/README.md](./SocialMedia/README.md) |
| `layoutShell` | [LayoutShell/README.md](./LayoutShell/README.md) |
| `pageTitle` | [PageTitle/README.md](./PageTitle/README.md) |
| `loginForm` | [LoginForm/README.md](./LoginForm/README.md) |
| `contactForm` | Contact form module (`ContactForm/Layout.svelte`) |
| `searchBar` | Search input primitive module (`SearchBarModule.svelte`) |
| `searchFilter` | Search filter primitive module (`SearchFilterModule.svelte`) |
| `searchForm` | Composed search module (`SearchFormModule.svelte`) |
| `searchResults` | Search results module (`SearchResultsModule.svelte`) |

Underlying Svelte for **`menu`**, **`languageSelector`**, **`themeToggle`**, and **`themeSelect`** lives under **[`primitives/README.md`](../primitives/README.md)** (per-component READMEs).

Keep **`module-types.ts`**, **`PageRenderer.svelte`** (`moduleMap`), and theme override pickers in sync when adding types.

## Search module stack

Search modules are split for composition:

- `searchBar` → query input primitive
- `searchFilter` → filter trigger + filter chips + popup
- `searchForm` → composed module that uses `searchBar` + `searchFilter`
- `searchResults` → search results/listing module

Shared query/filter state is coordinated via `search-modules-store.ts`, so modules can be placed in separate grid cells and still work together.
