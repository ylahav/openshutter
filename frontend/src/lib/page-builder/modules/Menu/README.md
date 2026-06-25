# Menu (`menu`)

## Purpose

Primary navigation: pulls items from a **named menu** under `template.menuInstances[instanceRef]` (managed in **Admin → Site config → Navigation**), with fall-through to the legacy `template.headerConfig.menu` when no instance is picked. Supports horizontal/vertical layout, auth/login/logout items, and separators.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `instanceRef` | string | — | Name of a menu under `template.menuInstances`. Omit to use the legacy `headerConfig.menu` fallback. |
| `orientation` | `'horizontal'` \| `'vertical'` | `'horizontal'` | Flex direction. Overrides the named menu's own `orientation` when set. |
| `showAuthButtons` | boolean | — | Per-placement override for the named menu's `showAuthButtons`. |

Resolution: `MenuModule.svelte` looks up `template.menuInstances[instanceRef]` and merges per-module `props` on top (so the page-builder placement can override the named menu's defaults). The resolved config is forwarded into `$pageBuilder/primitives/menu/Menu.svelte`.

If `instanceRef` is missing or doesn't resolve to a saved instance, `Menu.svelte` reads items from `config.menu` (i.e. `template.headerConfig.menu`) and finally falls back to the built-in defaults.

See `config.ts`. Named menus are CRUD'd at `/admin/site-config?tab=navigation`.

## Classes & tokens for template styles

Implemented in **`Menu.svelte`**. The page-builder wrapper adds **`pb-menuModule`** around the component.

- **Root nav:** `pb-menu`, `pb-menu--horizontal` \| `pb-menu--vertical`, optional `containerClass`
- **Items:** default `pb-menu__link`, active `pb-menu__link--active`
- **Separators:** `.pb-menu__separator`

Override via pack SCSS under `.layout-shell`, or pass custom `itemClass` / `containerClass` from site header config.
