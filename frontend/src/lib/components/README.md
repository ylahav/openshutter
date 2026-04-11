# Shared components (`$lib/components`)

This folder holds **reusable UI** for the app: admin chrome, search, auth helpers, editors, and building blocks used by **page builder modules**.

**Site-facing chrome controls** used by the header and page builder live under **[`ui/`](./ui/README.md)** (each with its own README). Admins can read the same docs at **`/admin/docs/ui`**.

## Template / pack styling

Blocks that appear in **public gallery layouts** (home, header, footer, etc.) are implemented as **page builder modules** under:

**[`src/lib/page-builder/modules/README.md`](../page-builder/modules/README.md)**

Each module folder there includes a `README.md` with:

1. Purpose  
2. Config / `props`  
3. CSS classes and **`--tp-*` / `--os-*` tokens** you can rely on in template pack SCSS  

Many modules **wrap** a file from this directory—for example:

| Page module | Underlying component(s) |
|-------------|-------------------------|
| `menu` | [`ui/menu/Menu.svelte`](./ui/menu/README.md) |
| `languageSelector` | [`ui/language-selector/LanguageSelector.svelte`](./ui/language-selector/README.md) |
| `themeToggle` | [`ui/theme-toggle/ThemeToggle.svelte`](./ui/theme-toggle/README.md) |
| `themeSelect` | [`ui/template-selector/TemplateSelector.svelte`](./ui/template-selector/README.md) |
| `loginForm` | `LoginTemplateSwitcher.svelte` |

For those, the module README summarizes props; **additional markup/classes** live in the component source.

## What lives here

- **`admin/`** — Admin panel UI (not themed with gallery packs).
- **`analytics/`**, **`search/`**, **`auth/`**, **`ai-tagging/`** — Feature-specific widgets.
- **Root `.svelte` files** — Cross-cutting UI (e.g. `Header.svelte`, `Footer.svelte`, `ThemeProvider.svelte`) used by app routes and/or templates.

When adding a **new site-facing block**, prefer a **page builder module** + `module-types.ts` + `PageRenderer` so it participates in the grid and documentation index above.
