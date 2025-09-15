## v0.9 (Pre-release) - 2025-09-15

### Highlights
- Admin: Blog Categories Management (create/edit/list with search, status filter, pagination)
- Owner Dashboard: Initial pages and guards
- API: Admin CRUD for blog categories; owner blog endpoints
- i18n: Added missing admin keys and pagination; EN/HE coverage
- Docs: Updated README, functional spec, admin setup; added translation guide

### Features
- Admin blog categories UI (list, create, edit, activate/deactivate, sort order, leading image)
- Admin API: `/api/admin/blog-categories`, `/api/admin/blog-categories/[id]`
- Owner blog endpoints and pages scaffold
- Safer client fetching handling for varying API response shapes

### Documentation
- README: Added Blog Categories feature; structure updates
- Functional Spec: BlogCategory entity; admin UI flow; endpoints
- Admin Setup: Content Management includes Blog Categories
- New: `docs/translation-guide.md`
- Index: linked translation guide

### Internationalization
- Added admin keys and pagination (EN/HE). Examples:
  - `admin.blogCategories`, `admin.manageBlogCategories`, `admin.createNewCategory`
  - `admin.basicInformation`, `admin.leadingImage`, `admin.sortOrderHelp`
  - `pagination.previous`, `pagination.next`

### Fixes/Improvements
- Prevented runtime TypeError on categories when undefined
- Robust pagination parsing on client
- Minor UI/RTL tweaks

### Breaking Changes
- None

### Upgrade Notes
- Ensure env and DB are configured; migrate translations if you maintain custom locales
- Clear browser cache for new admin assets
- Rebuild after pulling: `pnpm install && pnpm build`


