# Templating — user guide

How to **use** OpenShutter’s visitor-site templating from **Admin**: what each layer does, where to click, and how to **create a new site template (theme)**. For requirements, code layout, tokens, and adding a **pack** in the repository, see **[`../development/TEMPLATING.md`](../development/TEMPLATING.md)**.

---

## 1. What you are controlling

| Layer | What it affects | Where you edit it (typical) |
|--------|-----------------|-----------------------------|
| **Colors** | CSS variables / palette | Theme or **Site configuration → Theme & layout**, or **Admin → Templates → Overrides** (then apply / set default) |
| **Fonts** | Heading/body/etc. | Same as colors |
| **Layout (global)** | Max width, padding, grid gap | Same |
| **Pages** | Per-page grid + which **module** sits in each cell (including merged cells) | **Admin → Templates → Overrides** (`pageModules`, `pageLayout` per page key), then save / apply |
| **Navigation / chrome flags** | Menu items, logo visibility, toggles when using **pack header** (not page-builder header) | **Site configuration** (Navigation / template fields), `headerConfig` on theme |

---

## 2. Header and footer: same “pages” model, special placement

In the **data model**, **`header`** and **`footer`** are normal **page keys**, like `home`, `gallery`, or `album`:

- `template.pageLayout.header` / `template.pageLayout.footer` — grid rows × columns for that strip.
- `template.pageModules.header` / `template.pageModules.footer` — list of modules (`type`, `props`, `rowOrder`, `columnIndex`, `rowSpan`, `colSpan`).

**Special treatment in the app shell:** The root layout (`+layout.svelte`) always draws **header** then **main content** then **footer**. You do not navigate to a `/header` route; the shell injects those regions globally.

Default grids for header/footer (see `frontend/src/lib/constants/default-page-layouts.ts`):

- **header** — e.g. `gridRows: 1`, `gridColumns: 5` with modules like `logo`, `siteTitle`, `menu`, `languageSelector`, `themeToggle` in columns.
- **footer** — e.g. two rows: `socialMedia`, then `richText` copyright.

---

## 3. How header / footer render

| Situation | What the public site uses |
|-----------|---------------------------|
| **Theme defines a `layoutShell` for the strip** (e.g. preset `atelier_header`) | **Page builder** modules from `template.layoutPresets[presetKey]` inside a full-bleed shell. Menu/logo modules still use **`headerConfig`** and site branding from config. |
| **No shell on a route** | No global chrome for that page unless you add a `layoutShell` block to its `pageModules`. There is no fallback pack `Header.svelte` / `Footer.svelte`. |

Footer uses the same pattern: a named **`layoutShell`** preset (e.g. `atelier_footer`), not a separate pack component.

---

## 4. Admin URLs (quick map)

| Goal | Where |
|------|--------|
| **Set the live theme** (theme row → `site_config`) | **Admin → Templates** (`/admin/templates`): **Set as default** on a theme card (confirm dialog) — applies that theme to the site |
| See current defaults (public theme name, pack) | Top of **Templates** after load |
| Toggle **component visibility** (hero, auth buttons, …) | **Admin → Template configuration** (`/admin/template-config`) |
| Edit **themes** (colors, fonts, `pageModules`, `pageLayout`, `headerConfig`, …) | **Admin → Templates** — **Edit** → **Overrides** (`/admin/templates/overrides?themeId=…`), or **Theme builder** for site-only overrides (`/admin/templates/overrides` without `themeId`) |
| **Navigation / menu** when not relying only on modules | **Site configuration** — fields that map to `headerConfig` / menu |
| **Site-wide pack** field | **Site configuration → Theme & layout** — `frontendTemplate` / active pack (`noir`, `studio`, `atelier`) |

---

## 5. Practical tips

1. After editing a **theme row**, use **Set as default** (or save when that theme is already active — see Overrides save behavior) so **`site_config.template`** matches. Applying a theme uses **replace** semantics for module/layout blobs where implemented.
2. If you change **only** Site configuration and not the theme document, you are adjusting **live site config** directly (fine for logo, menu, and module visibility flags used by chrome modules).
3. **Merged cells** — set **`rowSpan`** / **`colSpan`** on a module in Overrides; the builder and `PageRenderer` use CSS grid spanning.
4. **Same for all breakpoints** — in **Templates → Overrides**, choose a page + breakpoint, then use **apply current breakpoint to all breakpoints** to copy grid and placements to `xs..xl` for that page.

### Why the header (or footer) “doesn’t change” when you switch templates

There are **two** different switches:

1. **Frontend template (pack id)** — `noir` / `studio` / `atelier` in **Site configuration** (or `frontendTemplate` in JSON). This selects **which Svelte pack** runs for **route bodies** (`Home`, `Album`, …) and which **pack `styles.scss`** / tokens apply. **Chrome** (header/footer) comes from your theme’s **`layoutShell`** blocks and **`layoutPresets`**, not from a pack `Header.svelte`.

2. **Theme document + Set as default** — Each row in **`themes`** can carry **`pageModules`**, **`pageLayout`**, and **`layoutPresets`**. **Live** `site_config` holds **one** copy. Changing only the pack in Site configuration **does not** swap another theme’s shells — use **Set as default** (or edit live `site_config` / Overrides).

If a page has **no** `layoutShell` for the strip you expect, add one in **Templates → Overrides** and point it at a **`layoutPresets`** entry (e.g. `atelier_header`). Switching packs changes **styling** and **fallback page templates**; **module placements** still come from the active theme unless you apply a different theme.

**Also update the theme document** if you rely on **Set as default** later — otherwise the next apply can restore header modules from the theme row.

---

## 6. Named layout regions (`layoutShell`), presets, and cleanup

The **`layoutShell`** module is a **named grid** inside a page cell. Inner rows, columns, and modules live under **`template.layoutPresets`** keyed by **`presetKey`** (e.g. `site_header`). Several **`layoutShell`** placements can share one preset name.

**Where to edit**

- **Admin → Templates → Overrides** — add/edit a `layoutShell` module, then **Edit Layout region (named grid)**.
- **Admin → Pages → Edit page** — same preset model.

**Deleting presets**

In Overrides, when you edit a **`layoutShell`** module:

- **Delete preset** — removes the preset from `layoutPresets` only if nothing still references its `presetKey`.
- **Delete all unused presets** — removes every unreferenced preset key.

**Page title in the grid (`pageTitle`)**

Add a **`pageTitle`** module where you want the title/subtitle. When **`pageTitle`** exists on the layout, the automatic title block is suppressed.

---

## 7. Creating a new site template (theme)

In OpenShutter, a **theme** is a saved preset (MongoDB row) with a **name**, **base pack** (`noir`, `studio`, or `atelier`), **base palette** hint, and optional overrides (colors, fonts, layout, page modules). The **pack** itself is **code**; the theme customizes appearance and page-builder content on top.

### Steps

1. Open **Admin → Templates** (`/admin/templates`).
2. Click **Create new theme** (or **Create your first theme** if the list is empty).
3. Enter a **theme name**, choose **base template** (`noir`, `studio`, or `atelier`), and **base palette** (`light`, `dark`, etc.) in the dialog.
4. Confirm — you are taken to **Overrides** for the new theme (`/admin/templates/overrides?themeId=…`).
5. Edit **Colors**, **Fonts**, **Layout**, and **Pages** (including `header` / `footer` / `home` / …). **Save** — if this theme is already the active one, the UI may sync live `site_config`; otherwise you’ll be reminded to apply it.
6. Return to **Templates** and click **Set as default** on your theme card — confirm — this **applies** the theme to the public site (`site_config.template` + `activeThemeId`).
7. **Duplicate** on an existing card copies the whole theme (good starting point for a variant).
8. **Preview** / **Apply preview** lets you try a pack/theme in the current session before committing.

### New **pack** (developer task)

A **pack** is a new set of Svelte shells under `frontend/src/lib/templates/<packId>/` plus registry and backend allowlists. That is **not** done from Admin. See **[`TEMPLATING.md` §8 — Create a template pack](../development/TEMPLATING.md#8-appendix-create-a-template-pack-built-in)**.

---

## 8. See also

- [`../development/TEMPLATING.md`](../development/TEMPLATING.md) — requirements, implementation, tokens, checklist, §8 pack appendix
- [`../development/PAGE_BUILDER_MODULES.md`](../development/PAGE_BUILDER_MODULES.md) — module types, props, URL/`data` context for `PageRenderer`
