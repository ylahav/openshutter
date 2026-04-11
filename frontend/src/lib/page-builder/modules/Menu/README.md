# Menu (`menu`)

## Purpose

Primary navigation: pulls items from site header config (or defaults), supports horizontal/vertical layout, auth/login/logout items, and separators.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `orientation` | `'horizontal'` \| `'vertical'` | `'horizontal'` | Flex direction for items |

Menu item content comes from **site config** (`headerConfig.menu`), not from module props. The module passes `orientation` into `$components/ui/menu/Menu.svelte`.

See `config.ts`.

## Classes & tokens for template styles

Implemented in **`Menu.svelte`** (not in this folder’s `Layout` beyond the wrapper):

- **Root:** `<nav class={finalContainerClass}>` — default container uses `flex` + gap; vertical swaps to `flex-col items-start`
- **Item classes:** defaults use `--tp-fg-muted` / hover `--tp-fg`; active uses `--os-primary`
- **Separators:** `text-[color:var(--tp-fg-subtle)]`

Override via pack SCSS on `nav` inside `.layout-shell`, or extend header config if you add custom `itemClass` / `containerClass` support in `Menu.svelte` later.
