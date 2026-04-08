# Controlling the template today (operator guide)

This describes what you can change **with the current system** — how each layer maps to **Admin** and to **`site_config.template`** / **themes**. For architecture, see [`TEMPLATING.md`](../development/TEMPLATING.md).

---

## 1. What you are controlling

| Layer | What it affects | Where you edit it (typical) |
|--------|-----------------|-----------------------------|
| **Colors** | CSS variables / palette | Theme or **Site configuration → Theme & layout**, or **Admin → Templates → Overrides** (then **Apply theme**) |
| **Fonts** | Heading/body/etc. | Same as colors |
| **Layout (global)** | Max width, padding, grid gap | Same |
| **Pages** | Per-page grid + which **module** sits in each cell (including merged cells) | **Admin → Templates → Overrides** (`pageModules`, `pageLayout` per page key), then save theme / apply |
| **Navigation / chrome flags** | Menu items, logo visibility, toggles when using **pack header** (not page-builder header) | **Site configuration** (Navigation / template fields), `headerConfig` on theme |

---

## 2. Header and footer: same “pages” model, special placement

In the **data model**, **`header`** and **`footer`** are normal **page keys**, like `home`, `gallery`, or `album`:

- `template.pageLayout.header` / `template.pageLayout.footer` — grid rows × columns for that strip.
- `template.pageModules.header` / `template.pageModules.footer` — list of modules (`type`, `props`, `rowOrder`, `columnIndex`, `rowSpan`, `colSpan`).

**Special treatment in the app shell:** The root layout (`+layout.svelte`) always draws **header** then **main content** then **footer**. So you do not “navigate to a `/header` route”; the shell injects those regions globally. Under the hood it is still the same **pages-layer** definition as other keys.

Default grids for header/footer (see `frontend/src/lib/constants/default-page-layouts.ts`):

- **header** — e.g. `gridRows: 1`, `gridColumns: 5` with modules like `logo`, `siteTitle`, `menu`, `languageSelector`, `themeToggle` in columns.
- **footer** — e.g. two rows: `socialMedia`, then `richText` copyright.

---

## 3. Two ways the header can render

| Situation | What the public site uses |
|-----------|---------------------------|
| **`pageModules.header` is non-empty** | **Page builder** (`PageRenderer`): modules in the grid (logo, menu, …). Logo/menu **types** still tie into **site config** (e.g. menu items from `headerConfig`, logo URL from site branding). |
| **`pageModules.header` is empty or missing** | **Template pack** `Header.svelte` for the active pack, plus **`headerConfig`** and per-pack defaults (`header-visibility.ts`). |

Footer is analogous (`pageModules.footer` vs pack `Footer.svelte`), with sensible defaults if modules are empty.

So: **header/footer are defined as pages in config**, but **routing** only wraps the middle; the shell decides **where** those pages render.

---

## 4. Admin URLs (quick map)

| Goal | Where |
|------|--------|
| **Set the default template** (full theme row from DB → live `site_config`) | **Admin → Templates** only: **Set as default** on a theme card (confirms in a dialog) |
| See current defaults (public preset name, packs) | Top of **Templates** page after load |
| Toggle **component visibility** (hero, auth buttons, …) | **Admin → Template configuration** (`/admin/template-config`) |
| Edit **themes** (full JSON-ish: colors, fonts, `pageModules`, `pageLayout`, `headerConfig`, …) | **Admin → Templates** — list, create, **Overrides** (`/admin/templates/overrides`), **Apply theme** to push to live site |
| **Navigation / menu** when not relying only on modules | **Site configuration** — fields that map to `headerConfig` / menu |

---

## 5. Practical tips

1. **Apply theme** after editing a theme row so **`site_config.template`** matches what you saved (replace semantics for module/layout blobs).
2. If you change **only** Site configuration and not the theme document, you are adjusting **live site config** directly (fine for logo, menu, visibility in pack-header mode).
3. **Merged cells** — set **`rowSpan`** / **`colSpan`** on a module in Overrides / theme JSON; the builder and `PageRenderer` use CSS grid spanning.
4. **Same for all breakpoints** — in **Admin → Templates → Overrides**, choose a page + breakpoint, then use the “apply current breakpoint to all breakpoints” control to copy the current grid (rows/cols) and module placements to `xs..xl` for that page.

### Why the header (or footer) “doesn’t change” when you switch templates

There are **two** different switches:

1. **Frontend template (pack id)** — `noir` / `studio` / `atelier` in **Site configuration** (or `frontendTemplate` in JSON). Legacy `default`, `minimal`, and removed pack ids (`simple`, `modern`, `elegant`) normalize to **`noir`**. This selects **which Svelte pack** runs for route bodies and, when header/footer **don’t** use the page builder, which **pack `Header.svelte` / `Footer.svelte`** runs.

2. **Theme document + Apply** — Each row in **`themes`** can carry its own **`pageModules.header`** / **`pageModules.footer`**. **Live** `site_config` only holds **one** copy of those arrays. Changing only the pack in Site configuration **does not** pull a different theme’s `pageModules` from Mongo — you must **Apply** the theme whose header/footer layout you want (or edit `site_config` directly).

If **`pageModules.header`** is **non-empty**, the global header is drawn with **`PageRenderer`** (modules), not the pack’s `Header.svelte`. Until recently the outer strip looked the same for every pack; the app now applies **pack-matched shell classes** on that strip when you change the active pack so you should at least see chrome (background/border) follow the active pack (**noir** / **studio** / **atelier**). The **module list** itself still comes from **`site_config`** until you apply another theme or edit modules.

To use each pack’s **full** header implementation (layout + behavior), set **`pageModules.header`** to **empty** (no modules) for that site — then the pack **`Header.svelte`** is used and switching the frontend template switches the whole header component.

### How to clear `pageModules.header` (empty array)

**Option A — Admin UI (Templates → Overrides)**  
1. Open **Admin → Templates → Overrides** (with your theme selected, or site overrides if not using a theme row).  
2. In the page-type tabs, choose **header**.  
3. Remove every module from the grid (use the remove control on each cell / module) until there are **no** header modules.  
4. **Save**. The stored value becomes `header: []`; the public site will use the active pack’s **`Header.svelte`**.

**Option B — API**  
`PUT /api/admin/site-config` with a body that sets an empty array (other `pageModules` keys unchanged by merge):

```json
{
  "template": {
    "pageModules": {
      "header": []
    }
  }
}
```

**Also update the theme document** if you rely on **Apply theme** later — otherwise the next apply can restore header modules from the theme row. Edit the same `header: []` in **Admin → Templates → Overrides** for that theme, or `PUT /api/admin/themes/:id` with `pageModules.header: []`.

---

## 6. Named layout regions (`layoutShell`), presets, and cleanup

The **`layoutShell`** module is a **named grid** inside a page cell. Its inner rows, columns, and modules are stored under **`template.layoutPresets`** keyed by **`presetKey`** (a short string you choose, e.g. `site_header`). Several **`layoutShell`** placements can reference the **same** preset name so they share one definition.

**Where to edit**

- **Admin → Templates → Overrides** — add/edit a `layoutShell` module, then use **Edit Layout region (named grid)** to set preset name, rows/columns, and inner modules.
- **Admin → Pages → Edit page** — same preset model; pick or type a preset name so the page uses the shared grid.

**Reusing names across themes**

Preset names you save in overrides / themes accumulate in the **reuse** dropdown where the UI merges known presets (site + themes). Prefer stable names (`site_header`, `page_footer`) so switching templates stays predictable.

**Deleting an unused preset**

Unused entries in `layoutPresets` would otherwise stay in JSON forever. In **Templates → Overrides**, when you edit a **`layoutShell`** module, the preset panel includes:

- **Delete preset** — removes the **current** preset from `layoutPresets` only if **no** `layoutShell` module (any page key, any breakpoint) still references that `presetKey`. If something still references it, the UI lists **where** (page key, breakpoint, row/column) so you can re-point or remove those modules first.
- **Delete all unused presets** — one action removes every preset key that has **zero** references in the editor’s module lists.

Changes apply to the draft overrides until you **Save**; use **Apply theme** when you want the live site row updated.

**Page title in the grid (`pageTitle`)**

If you rely on a header `layoutShell` **above** normal content, you may not want the renderer’s automatic page title block. Add a **`pageTitle`** module where you want the title/subtitle (**props**: show title, show subtitle, alignment). When a **`pageTitle`** module exists on the page layout, the automatic title block is suppressed so order is fully under your control.

---

## 7. See also

- [`TEMPLATING.md`](../development/TEMPLATING.md) — full model (including Phase 2 component rules), **Part III** checklist, **§8** contributor appendix (pack, registry, allowlists).
- [`PAGE_BUILDER_MODULES.md`](../development/PAGE_BUILDER_MODULES.md) — module authoring and URL/`data` context for `PageRenderer`.
