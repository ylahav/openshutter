# Login form (`loginForm`)

## Purpose

Full **login page** UI: email/password, errors, and pack-specific layout. Markup and behavior live in **`Layout.svelte`** in this folder (no separate switcher component). Shared pack hooks: **`section.pb-login`** (inside the site shell `<main>`) plus **`modules/styles/_login-pb.scss`** (studio/atelier + helpers); noir uses **`templates/noir/styles/_login.scss`** (`.tpl-pack-noir .pb-login`).

## Configuration (`props`)

| Key | Type | Description |
| --- | --- | --- |
| `title` | `string` or multi-lang map | Main heading (default: “Sign in to your account”). |
| `subheading` | `string` or multi-lang map | Muted line under the heading; when set, replaces the redirect-based tagline (“Admin access required” / “Access your gallery”). |

Example (site template `pageModules.login` → `loginForm`):

```json
{
  "type": "loginForm",
  "props": {
    "title": { "en": "Welcome back", "he": "ברוך שובך" },
    "subheading": { "en": "Use your gallery credentials." }
  },
  "rowOrder": 0,
  "columnIndex": 0,
  "rowSpan": 1,
  "colSpan": 1
}
```

**Note:** A CMS page whose alias is `s-login` is **not** the `/login` route. `/login` is driven only by **`template.pageModules.login`** (or the built-in default module if that list is empty). Use the props above for copy on `/login`.

## Classes & tokens for template styles

- **Root:** `<section class="pb-login …">` — pack-prefixed tokens from module **`class`**, or **`className`** if `class` is empty (admin often only saves `className`; the grid cell also uses `className`, so the same hook can appear on both nodes until you set `class` for root-only).
- **Design tokens:** `--tp-fg`, `--tp-fg-muted`, `--tp-fg-subtle`, `--os-font-body`, `--os-font-heading`, `--os-primary`, etc.

**Implementation:** `Layout.svelte` (all UI). **`../LoginFormModule.svelte`** is the `PageRenderer` entry (same pattern as `ContactFormModule.svelte` → `ContactForm/Layout.svelte`). Config: `config.ts`.
