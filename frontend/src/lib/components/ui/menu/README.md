# `Menu.svelte`

Navigation list used by the page builder **`menu`** module and anywhere else you need a configurable `<nav>`.

## Purpose

Render menu items from **`items`**, from **`config.menu`** (e.g. `headerConfig`), or from built-in defaults; optional login/logout entries; active route styling; horizontal or vertical layout.

## Configuration (props)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `MenuItem[]` | `[]` | Direct item list (wins over `config.menu`) |
| `config` | `MenuConfig` | — | Site header-style blob with `menu[]`, `showMenu` |
| `itemClass` | string | see below | Classes on each link/control |
| `activeItemClass` | string | `os-primary` accent | Classes when item matches current route |
| `containerClass` | string | `flex items-center gap-4` | `<nav>` wrapper |
| `separator` | string \| boolean | `false` | Between-item separator (`\|` or custom string) |
| `orientation` | `'horizontal'` \| `'vertical'` | `'horizontal'` | Layout |
| `showActiveIndicator` | boolean | `true` | Apply active classes from URL |
| `showAuthButtons` | boolean | `false` | Append login/logout items when needed |

`MenuItem`: `labelKey`, `label`, `href`, `external`, `icon`, `roles`, `showWhen`, `type` (`login` \| `logout` \| `link`), `condition`.

Default **`itemClass`:** `text-[color:var(--tp-fg-muted)] hover:text-[color:var(--tp-fg)]`  
Default **`activeItemClass`:** `text-[color:var(--os-primary)] font-medium`

Vertical layout uses `flex flex-col items-start` for the container (derived from `containerClass`).

## Classes and tokens for template styles

- **Root:** `<nav class={finalContainerClass}>`
- **Links:** `getItemClasses(item)` merges `itemClass` + optional `activeItemClass`
- **Separators:** `text-[color:var(--tp-fg-subtle)]`
- **Icon span:** `class="icon-{item.icon}"` when `icon` is set

Pack overrides: pass **`itemClass` / `containerClass`** from a forked page module, or use `:global(nav)` under `.layout-shell` (watch specificity).

See also: **[page-builder `menu` module](../../../page-builder/modules/Menu/README.md)**.

## Import

```ts
import Menu from '$components/ui/menu/Menu.svelte';
```
