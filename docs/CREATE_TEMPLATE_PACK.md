# Create a template pack (built-in style)

OpenShutter maps each **base theme** (`default`, `minimal`, `modern`, `elegant`) to a **template pack**: a set of Svelte shells for public pages (home, gallery, album, login) plus header/footer.

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
- `backend/src/services/site-config.ts` — `BUILTIN_TEMPLATE_IDS` (site config `frontendTemplate` / `adminTemplate` / `activeTemplate`)
- Theme DTOs: `backend/src/themes/dto/create-theme.dto.ts` / `update-theme.dto.ts` — `@IsIn([...])` for `baseTemplate`
- Static templates for metadata: `backend/src/templates/templates.controller.ts` (and `frontend` `TemplateService` static map if used)

## 5. Themes / site config

- **Themes** in the DB reference a **base template** (`baseTemplate`) that must be one of the built-in ids.
- **Site configuration** stores `template.frontendTemplate` and `template.adminTemplate` for which pack the public site and admin UI use.

Invalid ids are rejected on **PUT** `/api/admin/site-config` (built-in names only). The public UI **falls back** to the default pack and can show a small banner if the stored name is unknown (until config is fixed).

## 6. Optional: loader validation

`PUBLIC_ENABLE_TEMPLATE_PACK_LOADER=true` enables stricter checks in `frontend/src/services/template.ts` (`validateTemplateConfig`) for static `TemplateConfig` shapes (legacy metadata paths). Built-in Svelte routing uses the **registry**, not dynamic imports, for the main shells.

## 7. Verify

- Switch **base theme** under **Admin → Templates** (or **Site configuration → Theme & layout**) and reload public home, `/albums`, an album, and `/login`.
- Toggle **light/dark** if your pack supports it.
- Test **RTL** / a second language if you change layout direction-sensitive styles.
