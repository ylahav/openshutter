# Templating — architecture, tasks, and theming

This is the **single canonical guide** for OpenShutter’s visitor-site templating: template **packs** (Svelte), **themes** (MongoDB presets + apply to `site_config`), **page builder** modules, and the implementation **checklist**. Older split docs (**`TEMPLATING_REQUIREMENTS.md`**, **`TEMPLATING_TASKS.md`**, **`THEMING.md`**) redirect here.

**Related:** [Page builder modules — authoring & URL context](./PAGE_BUILDER_MODULES.md) · [Operator: what to click in Admin](../guides/TEMPLATE_CONTROL.md) · [Admin UI vs packs](./ADMIN_UI_ROADMAP.md)

## Contents

**Parts (top-level)**

| Part | What to find there |
|------|---------------------|
| **[Part I — Requirements](#part-i--requirements-and-architecture)** | Conceptual model, persistence, functional + non-functional requirements, acceptance criteria |
| **[Part II — Page builder & theme seeding](#part-ii--page-builder-and-theme-seeding)** | Page keys, `PageRenderer`, [built-in theme seeding](#templating-part2-seeding) (**layout-shape note** for contributors) |
| **[Part III — Implementation checklist](#part-iii-implementation-checklist-and-backlog)** | Phased grid work (P0–P4), polish sprint, milestones, backlog |
| **[§8 Appendix — Create a template pack](#8-appendix-create-a-template-pack-built-in)** | Svelte shells, registry, backend allowlists, verification |

**Part I — subsection map** (most navigated specs)

| § | Topic |
|---|--------|
| [§0 Decisions log](#templating-s0) | Load-bearing decisions (D-1 …) |
| [§2.2.1 Canonical JSON](#templating-221) | Redesign target: single-document template shape |
| [§2.2.3 Responsive layouts](#templating-223) | **Breakpoint cascade** — how missing `layouts[bp]` entries resolve (“how does inheritance work”) |
| [§2.2.4 Cell assignment](#templating-224) | Admin workflow: modules on grid cells (anchor + spans) |
| [§3 Functional requirements](#templating-s3) | FR-* requirements (packs, themes, live site, validation) |
| [§6 Acceptance criteria](#templating-s6) | Product-level acceptance tests |

*§2.2.2 (site-wide vs template-specific config), §4 (NFR), and §5 (deferred) sit between §2.2.4 and §3 in the document body.*

## Part I — Requirements and architecture

Normative model for contributors and operators. The **cell-based module assignment workflow** (grid anchor + spans → modules) is in **§2.2.4**. **§8** below is the **appendix** for adding a built-in template pack.

<a id="templating-s0"></a>

## 0. Decisions log (load-bearing)

These choices affect what operators can do in Admin, what the current persistence format supports, and what the renderer expects.

| ID | Topic | Status | Meaning in this repo today |
|----|--------|--------|-----------------------------|
| **D-1** | Single source of truth for page module layout | **Decided** | Assign modules to **grid cell(s)** (anchor + `rowSpan`/`colSpan`). A named “positions-first” semantic layer is **deferred**. |
| **D-2** | Header/footer model | **Decided** | Keep `header` / `footer` as dedicated page keys in the pages layer; the root shell wraps them around route content. |
| **D-3** | Breakpoint dimensioning | **Decided** | Breakpoint keys are `xs…xl`, with cascade/fallback rules in **§2.2.3**. |

## 1. Purpose

- **Site operators** can change the public look and layout (within supported options) **without deploying code**, using Admin UI and persisted configuration.
- **Developers** can add or adjust **built-in template packs** (Svelte) with a clear contract, registry, and allowlists.
- The system remains **safe**: invalid or unknown configuration must **not** break public pages; fallbacks and validation apply.

---

## 2. Conceptual model

### 2.1 UI components (building blocks)

The product is built from reusable **UI components** that define how common views look and behave. Examples include (not exhaustive): **menu**, **logo**, **albums list**, **album card**, **photo card**, **hero**, **footer blocks**, etc.

- In **data-driven** regions (page builder), each placed item references a component by **`type`** (and optional **`props`**) — see `PageModuleData` in the frontend.
- In **pack-authored** regions, the same concepts appear as Svelte components inside a template pack (`Header.svelte`, `Gallery.svelte`, …).

*Requirement:* Template configuration must be able to **assign** these building blocks to **pages** and **grid cells** as described below, in addition to pack-level shells.

### 2.2 Template definition layers (what a “template” specifies)

A full template definition is layered:

| Layer | Role |
|--------|------|
| **Colors** | Palette / CSS variables for the site (as today: `customColors`, theme). |
| **Fonts** | Typography roles and settings (as today: `customFonts`). |
| **Layout (global shell)** | **Per breakpoint:** exactly **three** parameters — **max width**, **container padding**, **grid gap** — that constrain the outer page shell (see **§2.2.1**). Maps to an evolved `customLayout` (today: one flat object; target: keyed by breakpoint). |
| **Pages** | Per logical page (e.g. `home`, `gallery`, `album`, `header`, `footer`, …): for each page, define **grid** (rows × columns) and **module placements** (modules placed on grid cell(s), including spans). **Per breakpoint** when the template is responsive (see **§2.2.3**). |

#### Admin: configuration order (priority)

Implementation should lead operators through template editing in this order (colors and fonts are already in good shape):

1. **Colors** — Palette / CSS variables (`customColors`).
2. **Fonts** — Typography roles (`customFonts`).
3. **Layout (global)** — For **each breakpoint**, set the **three** shell parameters: **max width**, **container padding**, **grid gap**.
4. **Pages** — For **each** page key, configure **grid** and **module placements** (including spans); repeat **per breakpoint** where the page structure differs. Recommended operator order (grid → modules → placement → preview) is in **§2.2.4**.

Steps 3–4 are the **current focus** for Admin: structured **breakpoint-first** editing for shell metrics, then **per-page** grids and module placements.

#### Pages layer (structure)

For each page key, the definition includes:

1. **Grid configuration (per breakpoint)** — The page canvas is a grid: **number of rows** and **number of columns**. **Each breakpoint may use a different grid** so layout can change by viewport (e.g. fewer columns on narrow screens, more on wide). Persisted shape is **per page key and per breakpoint** in the target model (`pageLayout[pageKey][breakpoint]` or equivalent — see **§2.2.1** / **§2.2.3**); legacy storage may still expose a single `gridRows` / `gridColumns` pair per page until migration is complete.
2. **Layout / placement** — Each **cell** (or **merged cell**), **one UI component** is assigned **for that breakpoint’s** grid. A placement is a module instance: `type` + `props`, plus grid addressing.

**Component vs template responsiveness:** A placed **module** may implement **its own** internal layout for different devices (CSS, container queries, or props). Example: a **menu** module can render a horizontal bar on desktop and a **hamburger** pattern on small screens without requiring the template grid to define a separate “mobile menu row.” Use **per-breakpoint grids** when the **page structure** (regions, columns, order of major blocks) must change; use **component internals** when only the **widget’s presentation** adapts.

**Merged cells (spanning):** A component may occupy more than one base cell. Examples:

- **Horizontal:** from row 1 column 1 through row 1 column 3 → three cells in one row (use **column span** = 3).
- **Rectangular:** from row 1 col 1 through row 2 col 2 → four cells in a 2×2 block (use **row span** × **column span**).
- **Vertical:** from row 1 col 1 through row 2 col 1 → two cells in one column (use **row span** = 2).

*Implementation mapping:* `PageModuleData` uses `rowOrder`, `columnIndex` as the anchor cell, and **`rowSpan`** / **`colSpan`** (default 1) for merged regions — aligned with CSS grid–style spanning.

*Requirement:* The admin and persisted data model must support **grid dimensions per page (per breakpoint in the target model)** and **spanning** so that “combined cells” behave as above; rendering (`PageRenderer`) must respect `rowSpan` / `colSpan` where implemented.

**Header and footer** use the same **pages-layer** keys — `pageModules.header` / `pageModules.footer` and matching `pageLayout` — alongside `home`, `gallery`, etc. **Special treatment:** the root layout renders header and footer **around** route content (not as separate routes), but configuration is still “a page” in the template data: grid + module assignments.

<a id="templating-221"></a>

#### 2.2.1 Canonical JSON document (redesign target)

The following **single-document shape** is the intended interchange format for a full template definition. It may be stored as **serialized JSON in MongoDB** (theme row or `site_config`), and/or maintained as **one JSON file per template** in the repository for reviewable diffs and imports.

**Layout (shell):** `layout` is keyed by **breakpoint**. At each breakpoint the shell exposes **only** these **three** parameters (string values, CSS lengths or tokens — same idea as today’s `customLayout` fields):

- **`maxWidth`** — Maximum width of the content shell.
- **`containerPadding`** — Horizontal (or all-around) padding inside the shell.
- **`gridGap`** — Gap between grid tracks **when** the page grid uses this token (page-level grids may still define their own row/column structure in **`pages`**).

**Pages:** Each entry is one logical page/region. For responsive templates, **`layouts`** holds **per breakpoint** the **grid** + **positions** + **components** for that page (see **§2.2.3**). The example below uses one breakpoint (`lg`) for brevity.

```json
{
  "template": "product-page",
  "theme": {
    "fonts": { },
    "colors": { }
  },
  "layout": {
    "xs": {
      "maxWidth": "100%",
      "containerPadding": "1rem",
      "gridGap": "0.75rem"
    },
    "lg": {
      "maxWidth": "1200px",
      "containerPadding": "1.5rem",
      "gridGap": "1.5rem"
    }
  },
  "pages": [
    {
      "name": "hero",
      "layouts": {
        "lg": {
          "grid": { "rows": 3, "cols": 12 },
          "positions": [
            { "name": "header", "cells": [[1, 1], [1, 12]] },
            { "name": "sidebar", "cells": [[2, 1], [3, 3]] },
            { "name": "main", "cells": [[2, 4], [3, 12]] }
          ],
          "components": {
            "header": "HeroBanner",
            "sidebar": "FilterPanel",
            "main": "ProductGrid"
          }
        }
      }
    }
  ]
}
```

**Semantics (normative intent):**

| Field | Role |
|--------|------|
| **`template`** | Built-in pack id (`default`, `minimal`, `modern`, `elegant`, …) or a product-specific template id; must resolve through the **pack registry** for code-backed route shells. |
| **`theme.fonts` / `theme.colors`** | Typography and palette only — same intent as `customFonts` and `customColors` today. |
| **`layout[breakpoint]`** | **Shell** metrics only: **`maxWidth`**, **`containerPadding`**, **`gridGap`** — **required keys at each breakpoint** the template declares (subject to cascade rules if a breakpoint is omitted). |
| **`pages[]`** | One entry per logical page/region (`home`, `gallery`, `album`, `header`, `footer`, …). |
| **`pages[].name`** | Stable key — aligns with current `pageModules` / `pageLayout` object keys. |
| **`pages[].layouts[breakpoint]`** | For that page at that viewport: **`grid`** (`rows` × `cols`), **`positions`** (named rectangles), **`components`** (position name → UI component id). |
| **`pages[].layouts[breakpoint].grid`** | `rows` × `cols` — same intent as `pageLayout[pageKey].gridRows` / `gridColumns` for that breakpoint. |
| **`pages[].layouts[breakpoint].positions`** | Named regions. In **pack / review JSON**, each **`cells`** pair is an inclusive rectangle (**1-based** **authoring** indices); **runtime persistence** uses anchor + span only (**§2.2.1**, canonical wire format). |
| **`pages[].layouts[breakpoint].components`** | Maps **position name** → registered **UI component id** (matches the module **`type`** string in code). |

If a page uses the **same** grid and positions at all widths, a single breakpoint entry (e.g. `default`) may suffice; cascade rules in **§2.2.3** still apply.

**Optional extensions (not shown above):** a parallel map (e.g. `props` or `componentsProps`) keyed by position name or component id for **placement-bound** settings; merge rules in **§2.4**.

**Equivalence to today’s persisted fields:**

| Canonical | Current (`themes` / `site_config.template`) |
|-----------|---------------------------------------------|
| `theme.fonts` / `theme.colors` | `customFonts`, `customColors` |
| `layout[bp].maxWidth` / `containerPadding` / `gridGap` | `customLayout` — today a **single** flat object with those three keys; **target** is **per breakpoint** (migration: nest by breakpoint or parallel field). |
| `pages[].layouts[bp].grid` | `pageLayout[pageKey].gridRows`, `gridColumns` (per breakpoint once implemented). |
| `pages[].layouts[bp].positions` + rectangle `cells` | `pageModules[]` with `rowOrder`, `columnIndex`, `rowSpan`, `colSpan` (anchor + span) |

**Canonical wire format (placement):** For **persistence**, **APIs**, and **runtime** module lists, placement is **only** **`rowOrder`**, **`columnIndex`**, **`rowSpan`**, **`colSpan`** (anchor cell + spans), as in **`PageModuleData`**, using **0-based** row/column indices consistent with the page builder and `PageRenderer`. The **`cells`: `[[r1,c1],[r2,c2]]`** pairs in the **§2.2.1** examples are **1-based** authoring / pack-review notation for **rectangles**; they are **not** a second valid persisted form. Any import or pack-authored JSON that uses `cells` **must** be converted to anchor + span at the boundary (ingest / migration). Implementations **must not** treat both representations as independently valid in Mongo or `site_config` without normalization.

**Derived view:** Corner-pair rectangles may be **computed from** anchor + span for docs, diff tools, or admin “region preview”—but never authoritative for save.

**File vs database:** Authors may maintain **JSON files per template** in Git; runtime continues to read the **database** (`themes` → apply → `site_config`). Files are optional **bootstrap**, migration, and contributor review artifacts — not a second live source unless a sync job is defined.

#### 2.2.2 Component configuration: site-wide vs template-specific

Two classes of component settings (refines **§2.4**):

1. **Site configuration** — One canonical definition for the whole site: **logo**, **main menu**, languages, auth links, etc. Components read **`site_config`** / `headerConfig` (and related fields). Assigning `logo` or `menu` to a header cell chooses **which component renders there**, not a second copy of global data.
2. **Template- or placement-specific** — Options that may differ per theme or per grid placement — e.g. **photo card**: which fields to show (thumbnail, title, description, date, location), aspect ratio, hover style. Stored as **`props`** on the module (and/or theme-level defaults), keyed by placement or merged with component defaults.

**Hybrid** components use a documented merge order (e.g. site defaults → theme defaults → placement `props`).

<a id="templating-223"></a>

#### 2.2.3 Responsive layouts (multi-breakpoint)

*Requirement:* For each logical **page** (`home`, `gallery`, `header`, …), the template definition may specify **more than one layout**: one **per breakpoint** (device type / viewport band). Narrow viewports may use a **different** grid size, **different** position rectangles, and **different** component choices (e.g. sidebar hidden on small screens, or a `MobileNav` instead of `DesktopMenu` in the same named position).

**Breakpoints:** Use the **fixed** keys **`xs`**, **`sm`**, **`md`**, **`lg`**, **`xl`** in **strict ascending** order by **`minWidth`** (mobile-first). Thresholds align with the frontend resolver (see `BREAKPOINT_MIN_WIDTH_PX` / `resolveBreakpointForWidth` in code).

**Normative cascade (when a breakpoint entry is missing)**

Apply separately for **shell `layout`**, **page grid**, and **page module list** (same rules; different blobs). Let `bp` be the resolved viewport band (`xs` … `xl`). Let `layouts` mean the breakpoint-keyed map for that blob (e.g. `pages[].layouts` for a page, or `layout` for the global shell).

1. **Exact match:** If `layouts[bp]` is present and **valid** (for grid: positive integer `rows` / `cols` or `gridRows` / `gridColumns`; for shell: the three required string keys—see **§2.2.1**), use it.
2. **Smaller defined:** Otherwise consider breakpoints **strictly earlier** than `bp` in the fixed order **`xs` → `sm` → `md` → `lg` → `xl`** (narrower / smaller `minWidth`), **nearest to farthest**: e.g. for `lg` try `md`, then `sm`, then `xs`; for `sm` try `xs` only; for `xs` skip. Use the **first** key in that sequence with a valid entry.
3. **Default key:** If still missing, if `layouts.default` (or documented product-wide `default` for shell) is valid, use it.
4. **Product defaults:** Otherwise use built-in defaults for that page (`DEFAULT_PAGE_LAYOUTS` / `DEFAULT_PAGE_MODULES`) or shell defaults.

**Legacy:** A **single** flat `gridRows` / `gridColumns` (or one module array) with **no** breakpoint map applies to **all** bands until a per-breakpoint map replaces it.

**Implementation note:** Partial breakpoint maps in today’s code paths may use helper fallbacks that should **converge** on this ordering over time; if behavior differs, treat **this subsection** as the specification to align to, and track cleanup in **[Part III](#part-iii-implementation-checklist-and-backlog)**.

**Canonical shape (per page):** group grid + positions + components under **`layouts`**, keyed by breakpoint id. The same **position names** across breakpoints are encouraged when the **component** stays the same but **cells** change; operators may swap **component** id per breakpoint when the UX differs.

```json
{
  "name": "hero",
  "layouts": {
    "xs": {
      "grid": { "rows": 6, "cols": 4 },
      "positions": [
        { "name": "header", "cells": [[1, 1], [1, 4]] },
        { "name": "main", "cells": [[2, 1], [6, 4]] }
      ],
      "components": { "header": "HeroBanner", "main": "ProductGrid" }
    },
    "lg": {
      "grid": { "rows": 3, "cols": 12 },
      "positions": [
        { "name": "header", "cells": [[1, 1], [1, 12]] },
        { "name": "sidebar", "cells": [[2, 1], [3, 3]] },
        { "name": "main", "cells": [[2, 4], [3, 12]] }
      ],
      "components": {
        "header": "HeroBanner",
        "sidebar": "FilterPanel",
        "main": "ProductGrid"
      }
    }
  }
}
```

**`theme` vs `layout`:** Colors and fonts are **global** (same as today). The **shell** layout (**`layout`**) is **always** expressed **per breakpoint** with the **three** parameters **`maxWidth`**, **`containerPadding`**, **`gridGap`**. **Font sizes** may become breakpoint-specific inside `theme` later; that is separate from shell `layout`.

**Equivalence to today’s persistence:** Themes and `site_config` may store **legacy** flat `pageLayout[pageKey]` / `pageModules[pageKey]` or **breakpoint-keyed** maps (including overlays such as `pageLayoutByBreakpoint`). The canonical **`layouts`** blob in **§2.2.1** remains the long-term interchange target; the runtime resolves the active band via **viewport** / SSR hints. **Normative validation** for grids, overlap, and position references is in **§3.6 (FR-VAL-3…5)**.

**Admin UX (requirement):** Editors can switch **breakpoint preview** (or device frame) when editing grids so they configure **each** band explicitly, with clear indication of **inheritance** when a breakpoint is left empty (falls back per cascade rules).

<a id="templating-224"></a>

#### 2.2.4 Grid cell module assignment workflow (anchor + spans → modules)

This subsection spells out the **intended admin workflow** for assigning **modules (components)** to **grid cell(s)** on each page (implementation phases: **[Part III](#part-iii-implementation-checklist-and-backlog)**).

The current pages-layer model is **cell-based**: every module placement is defined by an anchor cell plus `rowSpan` / `colSpan` (see **§2.2.1**). A named “positions-first” semantic layer is **deferred** (see **§0 D-1**).

**Goals**

1. Editors configure the **page grid** (rows × columns) per breakpoint.
2. For each module instance, editors pick a module `type` (+ optional `props`) and place it on an **anchor cell**; spanning is controlled by `rowSpan` / `colSpan`.
3. Rendering uses the saved anchor+span geometry consistently across breakpoints and devices.

**Terminology**

| Term | Meaning |
|------|---------|
| **Module** | A configured instance: `type` (from `PAGE_MODULE_TYPES` / registry) + optional `props` (same idea as `PageModuleData`). |
| **Grid cell / span** | Row/column anchor + `rowSpan` / `colSpan` — how the renderer maps a module to CSS grid. |
| **Placement** | `(rowOrder, columnIndex, rowSpan, colSpan)` tuple for one module. |

**Admin workflow (recommended UX order)**

Use this order inside **Templates → Pages** (per page tab, then per breakpoint tab when responsive):

1. **Define or review the grid** — Rows × columns (and breakpoint variants if needed). This sets the “canvas.”
   Shortcut (optional): **“Same for all breakpoints”** — copies the current breakpoint’s **grid** (rows/cols) and **module placements** to every breakpoint key (`xs..xl`) for the same page, so the structure stays identical across devices.
2. **Assign modules to cell(s)** — Place modules in the layout grid by selecting anchor cells and configuring spanning (merged areas).
3. **Preview** — Public preview or Theme builder preview reflects breakpoint + placements.

**Relationship to today’s data model**

Today, modules are addressed by **grid coordinates** (`rowOrder`, `columnIndex`, spans) in `pageModules` / per-breakpoint maps.

*Target shape (conceptual):* per page (and per breakpoint when applicable):

- A grid definition (rows/columns).
- A list/array of module placements where each module carries anchor + spans (`rowOrder`, `columnIndex`, `rowSpan`, `colSpan`) and its `type` (+ `props`).

**Implementation phases**

The phases for cell-based module assignment and breakpoint-safe persistence are tracked in **[Part III](#part-iii-implementation-checklist-and-backlog)** (“Cell-based module assignment — phased implementation”); this requirements doc stays focused on *what* and *why*.

**Validation and safety (cells)**

- **Grid bounds:** grid dimensions must be positive integers and each placement’s anchor+spans must fit within bounds.
- **Non-overlap:** module rectangles (anchor + `rowSpan` / `colSpan`) must not overlap on the same page layout at the same breakpoint.
- **Unknown module type / missing props:** renderer must fail safe (skip / placeholder), never crash public pages.

**Code references (extend when implementing)**

- `frontend/src/lib/page-builder/module-types.ts` — Component `type` allowlist for modules.
- `frontend/src/types/template.ts` — `PageModuleData` and related types.

### 2.3 Persistence layers (where those definitions live)

The same conceptual template is stored in three places:

| Layer | What it is | Persistence |
|-------|------------|-------------|
| **A. Template pack (code)** | Registered Svelte shells: routes like `Home`, `Gallery`, `Album`, `Login`, optional `Header` / `Footer`. Pack id is a **built-in** id (`default`, `minimal`, `modern`, `elegant`, …). | Git / deploy |
| **B. Theme (data)** | MongoDB **`themes`**: `baseTemplate` + optional **colors, fonts, global layout**, **`pageModules`** / **`pageLayout`** (the pages layer above), **`headerConfig`**, **`componentVisibility`**, etc. | MongoDB `themes` |
| **C. Live site config** | **`site_config.template`**: active pack, applied styling, **full pages layer** as applied, chrome flags, optional **`activeThemeId`**. | MongoDB `site_config` |

**Requirement:** Applying a theme from Admin must copy the relevant fields from layer **B** into layer **C** so the public site reflects the selected theme row. Module/layout/colors application must use **replace semantics** for theme-owned fields so stale grid placements do not remain after a switch.

### 2.4 Phase 2 (planned): Rules for new UI components — where configuration lives

Not every UI component is configured the same way. **Phase 2** will define explicit **authoring rules**: how to register a component, which **configuration source** it uses, and how Admin exposes edits. The **site vs template/placement** split is summarized in **§2.2.2**; this section specifies deliverables and the taxonomy table.

#### Configuration sources (taxonomy)

| Kind | Meaning | Typical examples | Where operators edit |
|------|---------|------------------|----------------------|
| **Site-config–bound** | Identity and global chrome: one canonical definition for the whole site. Components **read** nested `site_config` (and related fields), not per-placement props for those aspects. | **Logo** (URL / visibility flags), **main menu** (items, labels, visibility) | Site configuration, Navigation, branding — **not** duplicated inside each grid cell’s `props`. |
| **Assignment-bound** | Per placement: the **template/theme** decides **that** instance’s options when the component is dropped on a page grid. | **Photo card** (aspect ratio, hover style, metadata chips), **album card** layout variant, **hero** copy and CTA for one row only | Theme overrides / page builder: stored on the module as **`props`** (and in the theme row when not yet applied). |
| **Hybrid** (optional) | Global defaults from site config, **overridable** per assignment via `props` (merge order documented per component). | e.g. default button style site-wide; one hero overrides title only | Both global settings and placement `props`. |

*Illustrative distinction:*

- **Logo / menu** — Taken **from site config** (`headerConfig`, `logo`, languages, etc.). Assigning “logo” or “menu” to a header grid cell means **which component renders in that cell**, not a second copy of site-wide menu data.
- **Photo card** — Defined **as part of the assignment** to the template: `type: 'photoCard'` plus **`props`** (and any theme-level defaults merged in a defined order).

*Phase 2 deliverables (requirements, not necessarily implemented yet):*

1. A **component manifest** (or equivalent registry metadata) per registered `type`: declared **configuration source** (`siteConfig` | `assignment` | `hybrid`), JSON Schema or TypeScript type for **`props`**, and merge rules.
2. **Admin UI** behavior: site-config–bound fields are edited in Site configuration / Navigation; assignment-bound fields appear in the module editor when placing or editing a cell.
3. **Contributor guide** section: file layout, registration next to `PageRenderer` module map, validation, and tests.

Until Phase 2 is implemented, these rules are **design intent**, with the following **interim requirement** so configuration does not drift silently:

- **Interim — props documentation:** Every module **`type`** registered for the page builder **must** document its accepted **`props`** keys (and value shapes at a human level) in **one** discoverable place: a short block comment next to the component mapping in **`PageRenderer`** (or adjacent module file), **or** a row in a README under `frontend/src/lib/page-builder/`, **or** both. New `type`s **must not** merge without this minimum. Phase 2 replaces this with manifests / JSON Schema.

---

<a id="templating-s3"></a>

## 3. Functional requirements

### 3.1 Built-in packs

- **FR-PACK-1:** Each supported pack exposes at least: `Home`, `Gallery`, `Album`, `Login` in the registry (`TemplatePack.pages`).
- **FR-PACK-2:** Unknown or invalid pack id in config must resolve to a **defined fallback** (e.g. `default`) without crashing; optional user-visible notice on the public site.
- **FR-PACK-3:** Adding a new first-class pack requires updating the **registry**, backend **built-in id allowlist**, and theme DTO allowlists — documented in **§8**.

### 3.2 Themes collection (presets)

- **FR-THEME-1:** CRUD for theme documents via admin APIs; themes reference exactly one **built-in** `baseTemplate`.
- **FR-THEME-2:** Theme documents may store the same optional payload the live site needs: `customColors`, `customFonts`, `customLayout`, `pageModules`, `pageLayout`, `headerConfig`, `componentVisibility`, etc.
- **FR-THEME-3:** **Apply theme** loads the full theme and updates `site_config.template` with the theme’s values for those fields, including **`replaceTemplateFromTheme`** behavior for module/layout/styling blobs so merges do not leave old keys.

### 3.3 Live site (`site_config.template`)

- **FR-LIVE-1:** Public routes resolve the active pack from `frontendTemplate` / `activeTemplate` (legacy) and render pack pages/components accordingly.
- **FR-LIVE-2:** **`componentVisibility`** and **`headerConfig`** (and pack-level defaults where coded) control which chrome blocks appear; site config overrides pack defaults per field where specified.
- **FR-LIVE-3:** **Pages layer** — `pageModules` is keyed by page/region (`home`, `gallery`, `album`, `header`, `footer`, …). Each module instance selects a **UI component** (`type` + `props`) and placement (`rowOrder`, `columnIndex`, `rowSpan`, `colSpan`). `pageLayout[pageKey]` supplies **gridRows** / **gridColumns** for that page.
- **FR-LIVE-4:** Public route content is wrapped by a shared shell container (`BodyTemplateWrapper` + `.os-shell-container`) that uses CSS variables from **Layout Customization**: `--os-max-width`, `--os-padding`, `--os-gap`. These variables are resolved per breakpoint (`xs..xl`) from `template.customLayout` / `template.customLayoutByBreakpoint` and applied via CSS media queries (mobile-first).

### 3.4 Header and footer rendering (two modes)

- **FR-CHROME-1:** If **`pageModules.header`** is non-empty, the global header is rendered with the **page builder** (`PageRenderer`) for that position — **not** the pack’s `Header.svelte`.
- **FR-CHROME-2:** If `pageModules.header` is empty, the pack’s **`Header.svelte`** is used (with `headerConfig` + per-pack defaults as implemented).
- **FR-CHROME-3:** Footer follows analogous logic (`pageModules.footer` vs pack `Footer.svelte`), with any documented defaults for empty footer modules.

*Rationale:* This matches a “module placements” model (e.g. Joomla): filling an explicit module area replaces the default chrome for that region.

### 3.5 Admin experience

- **FR-ADMIN-1:** Operators can pick the active pack / theme from Admin without code changes (site config and/or themes + apply).
- **FR-ADMIN-2:** Preview/apply flows should not permanently change live config until **Apply** (or equivalent commit action).
- **FR-ADMIN-3:** Overrides editing targets the **theme** row; applying syncs to **site_config** as above.
- **FR-ADMIN-4:** Customization UI follows **§2.2** (colors → fonts → **shell layout** → **pages**). **Shell layout** exposes **max width**, **container padding**, and **grid gap** for **each breakpoint**; **each page** exposes **grid** and **module placements** (including spans), per breakpoint when applicable — see **§2.2.1**, **§2.2.3**, and the admin workflow in **§2.2.4**.

### 3.6 Validation and safety

- **FR-VAL-1:** **PUT** `/api/admin/site-config` rejects invalid built-in template ids for template fields.
- **FR-VAL-2:** Optional stricter client validation for legacy `TemplateConfig` may be enabled via env (`PUBLIC_ENABLE_TEMPLATE_PACK_LOADER`); primary routing uses the **registry**, not dynamic imports, for main shells.
- **FR-VAL-3 — Pages / grid bounds:** For each page (and breakpoint where the model is multi-band), **row/column counts** must be **positive integers** within the product’s documented bounds (e.g. **≥ 1** and **≤ max**, matching Admin). **Zero**, **negative**, or **non-integer** dimensions are **invalid**; persistence layers **must reject** them on save (or normalize only with an explicit, logged policy—**default: reject**).
- **FR-VAL-4 — Pages / non-overlap:** On a given page layout at a given breakpoint, **module rectangles** (anchor + `rowSpan` / `colSpan`) **must not** overlap. Admin SHOULD prevent overlaps interactively; API/theme validation SHOULD reject overlapping payloads where feasible.
- **FR-VAL-5 — Pages / canonical component keys (optional future):** If the template interchange layer uses **`pages[].layouts[bp].components`** keyed by named regions, every key **must** match a **`positions[].name`** in the same `layouts[bp]` object. Orphan keys reject on save. (The current persistence/UI primarily targets `pageModules` anchor+span placements.)

---

## 4. Non-functional requirements

- **NFR-1 — Availability:** Public pages must render if config is partial or outdated; fallbacks apply.
- **NFR-2 — Clarity:** Contributor docs describe pack registration, theme vs site config, and module positions vs pack chrome (**§8**, Joomla-oriented table there).
- **NFR-3 — Evolvability:** New routes (e.g. About, CMS pages) may use `PageRenderer` instead of pack shells; requirement is **consistent behavior** and documentation, not that every route is pack-backed.

---

## 5. Out of scope or deferred (see [Part III](#part-iii-implementation-checklist-and-backlog))

- Third-party installable packs **without** a code deploy (runtime loading of arbitrary Svelte from DB) — not required.
- Full **schema** for every `TemplateConfig` field in admin forms — partial today.
- **Permissions / audit** for template changes beyond admin authentication.
- **Automated** visual regression for all packs — aspirational.
- **Phase 2** — Formal **UI component authoring rules**, manifests (config source per `type`), and split Admin UX for site-config–bound vs assignment-bound configuration — see **§2.4**.

---

<a id="templating-s6"></a>

## 6. Acceptance criteria (product)

1. Switching applied theme updates live **`site_config.template`** so colors, modules, layout, header/visibility (as stored on the theme) match expectations after apply and refresh.
2. Switching **base pack** changes pack shells where **page builder does not override** that region (empty `pageModules` for header/footer).
3. Built-in pack ids are **validated** on save; unknown pack id on read does not crash the site.

---

## Part II — Page builder and theme seeding

### Page builder overview

Themes customize content per **page key** using the page builder. Each theme can store:

- **`pageModules`**: `{ home: [...], gallery: [...], album: [...], search: [...], header: [...], footer: [...] }` (keys vary by product).

### Page types (typical)

| Page key | Role | Common module types |
|----------|------|---------------------|
| `home` | Home | `hero`, `richText`, `featureGrid`, `albumsGrid`, `cta`, … |
| `gallery` | Albums list | `albumsGrid`, `richText`, `cta` |
| `album` | Single album | `albumView`, `albumsGrid`, `richText`, `cta` |
| `search` | Search | `richText`, `albumsGrid`, `cta` |
| `header` | Site header strip | `logo`, `siteTitle`, `menu`, `languageSelector`, `authButtons`, … |
| `footer` | Site footer | `footerMenu` / copyright / `socialMedia` patterns (see code) |

Rendering uses **`PageRenderer`** from theme / `site_config`. **Apply theme** copies theme-owned fields into live **`site_config.template`** with replace semantics for module/layout blobs where implemented.

### Hero and other modules

- **Hero:** background styles (e.g. image vs solid), title/subtitle/CTA — often edited in **Admin → Templates → Overrides** for the active theme.
- Full **module type** list and authoring rules: [`PAGE_BUILDER_MODULES.md`](./PAGE_BUILDER_MODULES.md).

<a id="templating-part2-seeding"></a>

### Seeding built-in themes

OpenShutter seeds built-in theme rows (Modern, Elegant, Minimal, etc.) when the backend starts if missing, via `DatabaseInitService` / `initializeDefaultThemes()` — see `backend/src/database/database-init.service.ts`.

**Manual seed (optional):**

```bash
mongosh mongodb://localhost:27017/openshutter scripts/seed-themes.mongodb.js
# or
export MONGODB_URI="mongodb://localhost:27017/openshutter"
node scripts/seed-themes.js
```

Each theme document includes `name`, `description`, **`baseTemplate`** (built-in pack id: `modern`, `elegant`, `minimal`, …), `customColors`, `customFonts`, `customLayout`, `componentVisibility`, `headerConfig`, `pageModules`, `pageLayout`, `isPublished`, `isBuiltIn`, timestamps. Verify with `db.themes.find({ isBuiltIn: true })` or **`GET /api/admin/themes`** (authenticated).

Seeding is **idempotent**. Empty `pageModules` / `pageLayout` are filled via **Templates → Overrides** / theme builder.

**Contributor note — layout shape:** The **target** persistence model is **breakpoint-keyed** pages data (`pageLayout` / `pageModules` per band, including maps such as `pageLayoutByBreakpoint` / `pageModulesByBreakpoint` where used) as described in **§2.2.1** and **§2.2.3**. In production, **legacy flat** per-page shapes may still sit next to breakpoint-keyed maps until **P4** (migration / compatibility) in the [phased table in Part III](#cell-based-module-assignment--phased-implementation) is implemented. **Do not** add new seed themes or hand-authored JSON that **only** extend the flat legacy pattern; prefer the **breakpoint-keyed** shape wherever Admin and APIs already persist it.

---

## Part III — Implementation checklist and backlog

**Canonical requirements:** [Part I](#part-i--requirements-and-architecture) above.

**Admin UI:** The admin panel uses a **static shell** unrelated to template packs — no admin template selection. See [`ADMIN_UI_ROADMAP.md`](./ADMIN_UI_ROADMAP.md). Items below about themes and site config refer to the **visitor** site unless stated otherwise.

### Cell-based module assignment — phased implementation

Cross-reference **§2.2.1**, **§2.2.3**, and **§2.2.4** in [Part I](#part-i--requirements-and-architecture). Modules are assigned to **grid cell(s)** (anchor + `rowSpan`/`colSpan`).

| Phase | Scope | Outcome |
|-------|--------|---------|
| **P0 — Canonical placement types** | Consolidate placement as **anchor + spans** across frontend and persistence; validators for positive integers + in-bounds rules. | One canonical placement format. |
| **P1 — Admin: grid + spans (per breakpoint)** | Overrides editing supports grid dimensions and placements per breakpoint without corrupting other breakpoints. | Editors can build per-breakpoint layouts. |
| **P2 — Breakpoint utilities + persistence** | “Same for all breakpoints” (copy grid + placements across `xs..xl`), aligned persistence. | Repeatable saves. |
| **P3 — Template pack defaults for cell grids** | Packs ship initial per-page grids + placements per band. | Fresh installs render without manual grid math. |
| **P4 — Migration / compatibility** | Legacy flat `pageLayout` / `pageModules` → breakpoint-aware model; validation. | Old themes still work. |

### Polish sprint (template quality)

| Done | Item |
|------|------|
| [x] | **Full-bleed** page background on `BodyTemplateWrapper` `<main>`; pack route roots must not paint `min-h-screen bg-*` only inside `.os-shell-container`. |
| [x] | **Shell RTL:** `.os-shell-container` logical margin/padding. |
| [x] | **Registry tests:** `frontend/src/lib/template-packs/registry.test.ts`. |
| [x] | **Light/dark** CSS pass on album/gallery/search shells (spot-check Home/Login). |
| [x] | **RTL:** `ms`/`me`/`text-start`/`text-end` in pack chrome where updated. |

### Milestone 1 — Foundation

- [x] Template pack contract — `frontend/src/lib/template-packs/types.ts`.
- [x] Optional components + fallback — `getTemplatePack()`.
- [ ] Full `config.ts`-style schema for all template options in admin — partial today.
- [x] Registry + `*TemplateSwitcher` components.
- [x] Runtime fallback — unknown pack → `default`.
- [x] `PUBLIC_ENABLE_TEMPLATE_PACK_LOADER` opt-in validation.
- [x] Invalid pack UX — `PackFallbackBanner`, API validation.

### Milestone 2 — Admin experience

- [x] Site config **Theme & layout** + template hub; `/admin/template-config` visibility.
- [x] Preview / apply / revert flows.
- [x] Reset visibility to template defaults.
- [ ] Permissions / audit for template changes — *deferred*.

### Milestone 3 — Pack set

- [x] Four built-in packs.
- [ ] **Pack shell parity** — Home / Gallery / Album / Login: all four routes exist per pack with shared shell conventions; **remaining work** is a consistency pass (spacing, typography, dark-mode parity **across** packs — not only within one pack). About / CMS-style pages correctly use **`PageRenderer`** inside the route shell where implemented.
- [x] Light/dark and RTL **CSS passes** (manual edge cases remain).

### Milestones 4–5 — Community / DX

- [x] Pack authoring steps — **[§8 Appendix](#8-appendix-create-a-template-pack-built-in)**.
- [ ] Example pack project, lint for pack contract, snapshot tests, migration notes.
- [ ] Showcase, “submit a pack” guide, release notes policy.

### Technical backlog (abbreviated)

- Backend: tighten template payload validation on PUT.
- Frontend: resolver tests beyond registry; integration/E2E/visual tests for visitor themes.
- MVP: [x] admin switch without code; [x] visibility + theme paths; [x] fallbacks; [ ] contributor pack doc polish in M4–5.

---

## 7. Related documents

| Document | Role |
|----------|------|
| **§8 below** — Create a template pack | How to add/register a pack, Joomla-oriented mapping, verification |
| [`PAGE_BUILDER_MODULES.md`](./PAGE_BUILDER_MODULES.md) | Module authoring: structure, registration, URL context, examples |
| **[Part III](#part-iii-implementation-checklist-and-backlog)** (this file) | Milestones, backlog, MVP acceptance |
| [`TEMPLATE_CONTROL.md`](../guides/TEMPLATE_CONTROL.md) | **Operator guide:** where to click to control colors, fonts, pages, header/footer; Admin URL map |

Phase 2 may add a dedicated **`UI_COMPONENTS.md`** for the contributor workflow in **§2.4** of Part I.

---

## 8. Appendix: Create a template pack (built-in)

OpenShutter maps each **base theme** (`default`, `minimal`, `modern`, `elegant`) to a **template pack**: Svelte shells for public pages (home, gallery, album, login) plus header/footer.

### Rough mapping from Joomla (mental model)

| Joomla | OpenShutter |
|--------|---------------|
| `index.php` + layout structure | Svelte pack pages (`Home.svelte`, …), `+layout.svelte`, `BodyTemplateWrapper` |
| `templateDetails.xml` (name, version, parameters) | Static template metadata + **themes** collection (`baseTemplate`, colors, fonts, `pageModules`, …) |
| **Module positions** | `site_config.template.pageModules` keyed by page/region. When `pageModules.header` is non-empty, the global header uses **page builder** (`PageRenderer`). Placement uses anchor cell + spans (`rowOrder`, `columnIndex`, `rowSpan`, `colSpan`). |
| **Template overrides** | Admin → **Templates → Overrides** (per-theme overrides on the theme row; **Apply theme** copies into live `site_config` with replace semantics). |
| Breakpoints | Page grid/modules can be breakpoint-keyed overlays; cascade rules in **§2.2.3**. |

If you apply a theme and “nothing changes,” check for stale `pageModules` from a previous theme — use **Apply theme** with replace semantics or clear those keys.

### 1. Add Svelte components

Under `frontend/src/lib/templates/<packId>/`: `Home.svelte`, `Gallery.svelte`, `Album.svelte`, `Login.svelte`, `components/Header.svelte`, `components/Footer.svelte`, optional `Hero.svelte`, `AlbumList.svelte`, etc. Use Tailwind; colors/fonts from `siteConfigData` / CSS variables (`ThemeColorApplier`, etc.).

### 2. Header chrome (per pack)

Public headers read `siteConfig.template.headerConfig`; each pack supplies defaults when a key is omitted (`frontend/src/lib/template-packs/header-visibility.ts`). Site configuration → Navigation overrides apply per pack.

### 3. Register the pack

Edit `frontend/src/lib/template-packs/registry.ts`: import components, add `packs` entry matching `packId`, required `pages`: `Home`, `Gallery`, `Album`, `Login`; optional `components`: `Header`, `Footer`. Export `TEMPLATE_PACK_IDS` for first-class built-ins.

### 4. Align backend allowlists

Keep in sync when adding a pack id:

- `frontend/src/lib/template-packs/registry.ts` — `TEMPLATE_PACK_IDS` and `packs`
- `backend/src/services/site-config.ts` — `BUILTIN_TEMPLATE_IDS`
- Theme DTOs: `create-theme.dto.ts` / `update-theme.dto.ts` — `@IsIn` for `baseTemplate`
- `backend/src/templates/templates.controller.ts` (and frontend `TemplateService` static map if used)

### 5. Themes / site config

Themes reference **baseTemplate** (built-in id). **Site configuration** stores `template.frontendTemplate` for the visitor site. Admin uses a fixed shell — see [`ADMIN_UI_ROADMAP.md`](./ADMIN_UI_ROADMAP.md). Invalid ids are rejected on `PUT /api/admin/site-config`.

### 6. Optional: loader validation

`PUBLIC_ENABLE_TEMPLATE_PACK_LOADER=true` enables stricter checks in `frontend/src/services/template.ts` (`validateTemplateConfig`) for legacy static `TemplateConfig` shapes.

### 7. Verify

Switch base theme under **Admin → Templates** (or **Site configuration → Theme & layout**); reload home, `/albums`, an album, `/login`; test light/dark and RTL if applicable.

---

## 9. Revision

When behavior changes (e.g. new built-in pack, new theme fields, or chrome resolution rules), update **this file** and the relevant implementation doc so operators and contributors share one definition of “done.”

**2026-03:** Added **§2.2.1** (canonical JSON document with `theme`, shell **`layout`**, `pages` / `grid` / `positions` / `components`) and **§2.2.2** (site-wide vs template-specific component configuration), as the redesign target alongside existing `pageModules` / `pageLayout` persistence.

**2026-03 (responsive):** Added **§2.2.3** — **multi-layout per breakpoint** (`layouts` keyed by device/breakpoint), cascade/fallback rules, `theme` vs shell **`layout`** notes, gap vs current single-layout persistence, and Admin preview expectations.

**2026-03 (admin focus):** **§2.2** — **Admin configuration order** (colors → fonts → **layout** → **pages**). **`layout`** = **`maxWidth`**, **`containerPadding`**, **`gridGap`** per breakpoint; **`pages`** = **grid** + **module placements** per page (per breakpoint under `pages[].layouts`). Canonical JSON updated; removed ad hoc `base` in favor of **`layout`**.

**2026-03:** Merged standalone `PAGE_POSITIONS_WORKFLOW.md` into **§2.2.4** (requirements now describe cell-based module assignment).

**2026-03:** **Pages layer (structure)** — Grid configuration called out as **per breakpoint**; added **component vs template responsiveness** (e.g. menu / hamburger inside one module vs changing the page grid per breakpoint).

**2026-03 (doc structure):** Added **§0 Decisions log**; **canonical wire format** for placement (anchor + span only at persistence); **normative breakpoint cascade** in **§2.2.3**; **interim props documentation** rule in **§2.4**; **FR-VAL-3…5** for pages-layer validation; moved **P0–P4** phased cell-based module assignment work to **[Part III](#part-iii-implementation-checklist-and-backlog)**; clarified **§2** vs **§3** roles in the intro.

**2026-03:** Added module authoring doc (now [`PAGE_BUILDER_MODULES.md`](./PAGE_BUILDER_MODULES.md)) with structure, registration rules, and examples for `blogCategory` and `blogArticle`.

**2026-03 (layout shell):** Clarified live rendering requirement that public content is wrapped by a shared shell container and that `maxWidth` / `containerPadding` / `gridGap` are sourced from **Layout Customization** per breakpoint via CSS variables.

**2026-04:** Merged **`TEMPLATING_REQUIREMENTS.md`**, **`TEMPLATING_TASKS.md`**, and **`THEMING.md`** into this file (**Parts I–III** + §8); legacy paths redirect here. Module URL and UI-module docs merged into [`PAGE_BUILDER_MODULES.md`](./PAGE_BUILDER_MODULES.md).

**2026-04 (navigation + clarity):** Expanded **Contents** with **Part I subsection map** (anchors **`templating-s0`**, **`templating-221`**, **`templating-223`**, **`templating-224`**, **`templating-s3`**, **`templating-s6`**) and link to **[seeding / layout-shape note](#templating-part2-seeding)**. Part II: contributor warning on **breakpoint-keyed** vs legacy flat layouts (**P4**). Part III: **Milestone 3** pack-shell item clarified (parity vs consistency pass).
