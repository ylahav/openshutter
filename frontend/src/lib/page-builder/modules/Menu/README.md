# Menu (`menu`)

## Purpose

Primary navigation: pulls items from site header config (or defaults), supports horizontal/vertical layout, auth/login/logout items, and separators.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `orientation` | `'horizontal'` \| `'vertical'` | `'horizontal'` | Flex direction for items |

Menu item content comes from **site config** (`headerConfig.menu`), not from module props. The module passes `orientation` into `$pageBuilder/primitives/menu/Menu.svelte`.

See `config.ts`.

## Classes & tokens for template styles

Implemented in **`Menu.svelte`**. The page-builder wrapper adds **`pb-menuModule`** around the component.

- **Root nav:** `pb-menu`, `pb-menu--horizontal` \| `pb-menu--vertical`, optional `containerClass`
- **Items:** default `pb-menu__link`, active `pb-menu__link--active`
- **Separators:** `.pb-menu__separator`

Override via pack SCSS under `.layout-shell`, or pass custom `itemClass` / `containerClass` from site header config.
