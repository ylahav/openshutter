# Create a template pack (built-in style)

OpenShutter maps each **base theme** (`default`, `minimal`, `modern`, `elegant`) to a **template pack**: a set of Svelte shells for public pages (home, gallery, album, login) plus header/footer.

For the authoritative data model behind Admin “Pages” editing and persistence (canonical placement + breakpoint cascade rules), see:
- [`docs/TEMPLATING_REQUIREMENTS.md`](./TEMPLATING_REQUIREMENTS.md)

## Rough mapping from Joomla (mental model)

| Joomla | OpenShutter |
|--------|-------------|
| `index.php` + layout structure | Svelte pack pages (`Home.svelte`, …), `+layout.svelte`, `BodyTemplateWrapper` |
| `templateDetails.xml` (name, version, parameters) | Static template metadata + **themes** collection (`baseTemplate`, colors, fonts, `pageModules`, …) |
| **Module positions** (e.g. `header`, `footer`, `home`) | `site_config.template.pageModules` keyed by page/region (`home`, `gallery`, `header`, `footer`, …). When `pageModules.header` is non-empty, the global header uses the **page builder** (`PageRenderer`) instead of the pack’s `Header.svelte`. Placement uses anchor cell + spans (`rowOrder`, `columnIndex`, `rowSpan`, `colSpan`). |
| **Template overrides** (copy views into `/html/`) | Admin → **Templates → Overrides** (per-theme overrides stored on the theme row; **Apply theme** copies into live `site_config` with **replace** semantics for modules/layout so old positions do not linger). |
| Breakpoints | Page grid/modules can be breakpoint-keyed overlays; runtime resolves the active band with the cascade rules in `TEMPLATING_REQUIREMENTS.md` (§2.2.3). |

If you apply a theme and “nothing changes,” check whether an old `pageModules` still had entries from a previous theme: only **Apply theme** with replace semantics (or clearing those keys) updates positions fully; a plain deep-merge would keep leftover keys.

## 1. Add Svelte components

Under `frontend/src/lib/templates/<packId>/`:

- `Home.svelte`, `Gallery.svelte`, `Album.svelte`
- `Login.svelte` (thin wrapper is fine; see existing packs)
- `components/Header.svelte`, `components/Footer.svelte`
- Optional: `components/Hero.svelte`, `AlbumList.svelte`, etc.

Use Tailwind classes; site **colors/fonts/layout** can come from `siteConfigData` / CSS variables where the app already applies them (`ThemeColorApplier`, etc.).

## 2. Header chrome (per pack)

Public headers read `siteConfig.template.headerConfig`, but **each pack supplies defaults** when a key is omitted (`frontend/src/lib/template-packs/header-visibility.ts`). That way switching **modern / elegant / minimal / default** changes what appears without copying JSON into site config.

Explicit values in **Site configuration → Navigation** (or raw `headerConfig` in the DB) still override the corresponding flag for all packs.

## 3. Register the pack

Edit `frontend/src/lib/template-packs/registry.ts`:

1. Import your page and layout components.
2. Add an entry to the `packs` object with the same key as `packId` (lowercase).
3. **Required** keys on `pages`: `Home`, `Gallery`, `Album`, `Login`.
4. **Optional** on `components`: `Header`, `Footer`, etc.

Export list `TEMPLATE_PACK_IDS` must include your id if it is a first-class built-in.

## 4. Align backend allowlists

Keep these in sync whenever you add a pack id:

- `frontend/src/lib/template-packs/registry.ts` — `TEMPLATE_PACK_IDS` and `packs`
- `backend/src/services/site-config.ts` — `BUILTIN_TEMPLATE_IDS` (site config `frontendTemplate` / `activeTemplate`; `adminTemplate` is legacy and normalized to `default` by the server)
- Theme DTOs: `backend/src/themes/dto/create-theme.dto.ts` / `update-theme.dto.ts` — `@IsIn([...])` for `baseTemplate`
- Static templates for metadata: `backend/src/templates/templates.controller.ts` (and `frontend` `TemplateService` static map if used)

## 5. Themes / site config

- **Themes** in the DB reference a **base template** (`baseTemplate`) that must be one of the built-in ids.
- **Site configuration** stores `template.frontendTemplate` (and related theme fields) for the **visitor** site. The admin panel uses a **fixed UI shell**, not template packs; `template.adminTemplate` is deprecated and should not be treated as a pack selector (see [`ADMIN_UI_ROADMAP.md`](./ADMIN_UI_ROADMAP.md)).

Invalid ids are rejected on **PUT** `/api/admin/site-config` (built-in names only). The public UI **falls back** to the default pack and can show a small banner if the stored name is unknown (until config is fixed).

## 6. Optional: loader validation

`PUBLIC_ENABLE_TEMPLATE_PACK_LOADER=true` enables stricter checks in `frontend/src/services/template.ts` (`validateTemplateConfig`) for static `TemplateConfig` shapes (legacy metadata paths). Built-in Svelte routing uses the **registry**, not dynamic imports, for the main shells.

## 7. Verify

- Switch **base theme** under **Admin → Templates** (or **Site configuration → Theme & layout**) and reload public home, `/albums`, an album, and `/login`.
- Toggle **light/dark** if your pack supports it.
- Test **RTL** / a second language if you change layout direction-sensitive styles.
