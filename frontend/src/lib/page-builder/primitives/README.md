# Page builder primitives (`src/lib/page-builder/primitives`)

Reusable, site-facing controls that are also wrapped by **page builder modules** (header chrome, menus, toggles). Each subfolder has its own `README.md` and a single primary `.svelte` file.

| Folder | Component | Typical module |
|--------|-----------|----------------|
| [`menu/`](./menu/README.md) | `Menu.svelte` | `menu` |
| [`language-selector/`](./language-selector/README.md) | `LanguageSelector.svelte` | `languageSelector` |
| [`theme-toggle/`](./theme-toggle/README.md) | `ThemeToggle.svelte` | `themeToggle` |
| [`template-selector/`](./template-selector/README.md) | `TemplateSelector.svelte` | `themeSelect` |

## Import alias

Use the `$pageBuilder` alias (see `svelte.config.js`):

```ts
import Menu from '$pageBuilder/primitives/menu/Menu.svelte';
```

ESLint **`no-restricted-imports`** rejects the old paths (`$components/ui`, `$lib/components/ui`, and `**/lib/components/ui/**`) so new code cannot regress.

## Documentation in admin

Admins can open **UI component docs** (same README sources) at **`/admin/docs/ui`**.

## Broader `components` folder

Feature-specific widgets (admin, search, auth, editors) stay under [`../../components/README.md`](../../components/README.md) until explicitly moved here.
