# Rich text (`richText`)

## Purpose

WYSIWYG-style content block: optional title plus HTML body; background padding variant for light/gray/transparent bands.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang | — | Optional heading |
| `body` | MultiLang HTML | — | HTML content |
| `background` | `'white'` \| `'gray'` \| `'transparent'` | `'white'` | Padding/background preset |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `.pb-richText` with modifiers:
  - `.pb-richText--compact` / `.pb-richText--regular`
  - `.pb-richText--white` / `.pb-richText--gray` / `.pb-richText--transparent`
- **Inner/title/body:** `.pb-richText__inner`, `.pb-richText__title`, `.pb-richText__body`
- **Tokens:** body text uses `--tp-fg-muted`; links use `--os-primary`
