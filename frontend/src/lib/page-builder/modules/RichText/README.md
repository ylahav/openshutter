# Rich text (`richText`)

## Purpose

Optional **title** plus **HTML body**; **background** can follow theme surfaces, be **transparent**, or use a **custom CSS color**.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang | — | Optional heading |
| `body` | MultiLang HTML | — | HTML content |
| `background` | `'white'` \| `'gray'` \| `'transparent'` \| `'custom'` | `'white'` | Preset band or custom |
| `backgroundColor` | string | — | When `background` is `'custom'`, any CSS color (hex, `rgb()`, `hsl()`, named). If `custom` is selected but this is empty, the block renders **transparent**. |

See **`config.ts`**. The **Background color** field in admin is shown only when **Custom** is selected (`visibleWhen` in **`ModulePropsForm`**).

## Classes & tokens for template styles

- **Root:** `.pb-richText` with modifiers:
  - `.pb-richText--compact` / `.pb-richText--regular`
  - `.pb-richText--white` / `.pb-richText--gray` / `.pb-richText--transparent`
  - `.pb-richText--custom` — background comes from **inline `style`** (only when `backgroundColor` is non-empty)
- **Inner/title/body:** `.pb-richText__inner`, `.pb-richText__title`, `.pb-richText__body`
- **Tokens:** body text uses `--tp-fg-muted`; links use `--os-primary`
