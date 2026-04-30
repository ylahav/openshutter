# Social media (`socialMedia`)

## Purpose

Renders social links with icons from a **JSON list** in module props, or from **site contact** settings when the JSON field is empty.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `linksJson` | string | — | JSON array of `{ "platform": string, "url": string, "label"?: string, "icon"?: string }`. `href` is accepted instead of `url`. When empty or invalid, falls back to legacy `socialMedia` object (if any), then site `contact.socialMedia`. |
| `socialMedia` | object | — | **Legacy:** `{ facebook?, instagram?, twitter?, linkedin?, … }`. Merged on top of site contact when `linksJson` is not used. |
| `iconSize` | `'sm'` \| `'md'` \| `'lg'` | `'md'` | Icon box size |
| `iconColor` | string | `'current'` | `current`, theme foreground (`pb-socialMedia__iconTone--fg`), a CSS color (`#…`, `rgb`, `hsl`), or legacy Tailwind utilities (`text-…`, `text-[…]`) |
| `showLabels` | boolean | false | Text labels next to icons |
| `orientation` | `'horizontal'` \| `'vertical'` | `'horizontal'` | Flex direction |
| `align` | `'start'` \| `'center'` \| `'end'` | `'start'` | Alignment |
| `gap` | `'tight'` \| `'normal'` \| `'loose'` | `'normal'` | Spacing |
| `className` | string | — | Extra on container |

Known `platform` values get default icons (Facebook, Instagram, Twitter, LinkedIn, YouTube, GitHub); others use the `Globe` icon unless `icon` is set to a name supported by `IconRenderer`.

See `config.ts` and `resolveLinks.ts`.

## Classes & tokens for template styles

- **Root:** `pb-socialMedia` with modifiers `--horizontal` / `--vertical`, `--gapTight` / `--gapNormal` / `--gapLoose`, `--alignStart` / `--alignCenter` / `--alignEnd`, plus optional `className`.
- **Link:** `pb-socialMedia__link`
- **Icon wrap:** `pb-socialMedia__icon` + `--sm` | `--md` | `--lg`; tone: `--current`, `--fg`, or legacy utility from `iconColor`.
- **Label:** `pb-socialMedia__label` · **Text-only row:** `pb-socialMedia__textOnly`

Custom `iconColor` (hex/rgb/hsl) uses inline `style` on the icon wrapper.
