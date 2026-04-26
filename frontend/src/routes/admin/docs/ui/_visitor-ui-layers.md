# Two layers of visitor-facing UI

OpenShutter splits **reusable widgets** and **page modules**. Both ship Markdown READMEs in the repo; this admin page renders them as HTML.

## Quick comparison

| | **`src/lib/page-builder/primitives`** | **`src/lib/page-builder/modules`** |
|---|-----------------------------|--------------------------------------|
| **What it is** | Small **building-block** components: one primary `.svelte` per folder (menu, language selector, …). | **Page builder modules**: each type has a `*Module.svelte` entry in `PageRenderer`’s `moduleMap`, plus `config.ts` for the admin editor. |
| **How it gets on the site** | You **import** it in template/layout Svelte (e.g. `import Menu from '$pageBuilder/primitives/menu/Menu.svelte'`). | Editors **place** it on the theme **grid** (rows/columns); props are saved per instance. |
| **Typical examples** | `Menu`, `LanguageSelector`, `ThemeToggle`, `TemplateSelector`. | `hero`, `featureGrid`, `albumView`, `albumsGrid`, `layoutShell`, … |
| **Relationship** | Often **embedded inside** a module’s layout. | The **`menu` _module_** (and similar) may **wrap** the **`Menu`** primitive—same UI, different “packaging” for the grid + admin. |

## When to read which docs

- **`page-builder/primitives`** — Styling or behavior of a **single control**; wiring it in a template without the page builder.
- **`page-builder/modules`** — **Grid placement**, **module props**, **tokens** (`--tp-*`), and full blocks like **Hero** or **album gallery**.

Use the sidebar: **Start here** (this page), then **UI building blocks — import in code** or **Page modules — grid & admin**.
