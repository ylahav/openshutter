# Horizontal line (`divider`)

## Purpose

Visual separator: semantic `<hr>` using the theme border color, with optional thickness, vertical spacing, and line style.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `thickness` | `'thin'` \| `'medium'` | `'thin'` | Border-top width |
| `margin` | `'none'` \| `'sm'` \| `'md'` \| `'lg'` | `'sm'` | Vertical margin (`my-*`) |
| `lineStyle` | `'solid'` \| `'dashed'` \| `'dotted'` | `'solid'` | `border-*` style |
| `className` | string | — | Appended to the `<hr>` |

Flat props from the grid (`thickness`, etc.) merge with `props` (see `DividerModule.svelte`).

## Classes & tokens for template styles

- **Stable classes:** `pb-divider` + `os-divider` on `<hr>`
- **Modifiers:** `pb-divider--thin|medium`, `pb-divider--solid|dashed|dotted`, `pb-divider--mNone|mSm|mMd|mLg`
- **Tokens:** `--tp-border`

Example pack override:

```scss
.os-divider {
  border-color: color-mix(in srgb, var(--tp-border) 70%, var(--tp-fg)) !important;
}
```
