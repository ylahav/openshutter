# Next.js/React Removal Plan

## Overview
This document tracks the removal of Next.js/React code as we complete the SvelteKit migration.

## Migration Status

### ✅ Fully Migrated to SvelteKit (Can Remove Next.js Pages)
- `/admin` → `routes/admin/+page.svelte`
- `/admin/albums` → `routes/admin/albums/+page.svelte`
- `/admin/albums/[id]` → `routes/admin/albums/[id]/+page.svelte`
- `/admin/albums/[id]/edit` → `routes/admin/albums/[id]/edit/+page.svelte`
- `/admin/photos/[id]/edit` → `routes/admin/photos/[id]/edit/+page.svelte`
- `/admin/users` → `routes/admin/users/+page.svelte`
- `/admin/groups` → `routes/admin/groups/+page.svelte`
- `/admin/analytics` → `routes/admin/analytics/+page.svelte`
- `/admin/deployment` → `routes/admin/deployment/+page.svelte`
- `/admin/pages` → `routes/admin/pages/+page.svelte`
- `/admin/backup-restore` → `routes/admin/backup-restore/+page.svelte`
- `/admin/tags` → `routes/admin/tags/+page.svelte`
- `/admin/locations` → `routes/admin/locations/+page.svelte`
- `/admin/blog-categories` → `routes/admin/blog-categories/+page.svelte`
- `/admin/people` → `routes/admin/people/+page.svelte`
- `/admin/templates` → `routes/admin/templates/+page.svelte`
- `/admin/templates/overrides` → `routes/admin/templates/overrides/+page.svelte`
- `/admin/site-config` → `routes/admin/site-config/+page.svelte`
- `/albums` → `routes/albums/+page.svelte`
- `/albums/[alias]` → `routes/albums/[alias]/+page.svelte`
- `/albums/new` → `routes/albums/new/+page.svelte`
- `/login` → `routes/login/+page.svelte`

### ⚠️ Partially Migrated (Keep Next.js for now)
- `/admin/photos/upload` - No SvelteKit equivalent yet
- `/admin/storage` - No SvelteKit equivalent yet
- `/admin/audit-logs` - No SvelteKit equivalent yet
- `/admin/template-config` - No SvelteKit equivalent yet
- `/admin/import-sync` - No SvelteKit equivalent yet
- `/admin/multi-lang-demo` - No SvelteKit equivalent yet
- `/admin/tiptap-test` - No SvelteKit equivalent yet
- `/admin/templates/customize` - No SvelteKit equivalent yet
- `/admin/blog-categories/[id]/edit` - No SvelteKit equivalent yet
- `/admin/blog-categories/new` - No SvelteKit equivalent yet
- `/owner/*` - All owner routes still Next.js
- `/search` - Still Next.js
- `/mobile/search` - Still Next.js
- `/photos` - Still Next.js
- `/photos/upload` - Still Next.js
- `/page` - Still Next.js
- `/[alias]` - Still Next.js

### 🔄 API Routes (Still Needed - Migrate Later)
All API routes in `app/api/` are still being used by SvelteKit routes.
These need to be migrated to SvelteKit format (`routes/api/**/+server.ts`) before removing Next.js.

## Removal Strategy

### Phase 1: Remove Migrated Next.js Pages (SAFE) ✅ COMPLETED
Removed Next.js pages that have complete SvelteKit equivalents:
- ✅ `app/admin/page.tsx` - REMOVED
- ✅ `app/admin/albums/page.tsx` - REMOVED
- ✅ `app/admin/albums/[id]/page.tsx` - REMOVED
- ✅ `app/admin/albums/[id]/edit/page.tsx` - REMOVED
- ✅ `app/admin/photos/[id]/edit/page.tsx` - REMOVED
- ✅ `app/admin/users/page.tsx` - REMOVED
- ✅ `app/admin/groups/page.tsx` - REMOVED
- ✅ `app/admin/analytics/page.tsx` - REMOVED
- ✅ `app/admin/deployment/page.tsx` - REMOVED
- ✅ `app/admin/pages/page.tsx` - REMOVED
- ✅ `app/admin/backup-restore/page.tsx` - REMOVED
- ✅ `app/admin/tags/page.tsx` - REMOVED
- ✅ `app/admin/locations/page.tsx` - REMOVED
- ✅ `app/admin/blog-categories/page.tsx` - REMOVED
- ✅ `app/admin/people/page.tsx` - REMOVED
- ✅ `app/admin/templates/page.tsx` - REMOVED
- ✅ `app/admin/templates/overrides/page.tsx` - REMOVED
- ✅ `app/admin/site-config/page.tsx` - REMOVED
- ✅ `app/albums/page.tsx` - REMOVED
- ✅ `app/albums/[alias]/page.tsx` - REMOVED
- ✅ `app/albums/new/page.tsx` - REMOVED
- ✅ `app/login/page.tsx` - REMOVED

**Total: 21 pages removed**

### Phase 2: Remove React Components with Svelte Equivalents
- `components/MultiLangInput.tsx` → Already have `lib/components/MultiLangInput.svelte`
- `components/MultiLangHTMLEditor.tsx` → Already have `lib/components/MultiLangHTMLEditor.svelte`
- `components/NotificationDialog.tsx` → Already have `lib/components/NotificationDialog.svelte`
- `components/ConfirmDialog.tsx` → Already have `lib/components/ConfirmDialog.svelte`
- `components/admin/CollectionPopup.tsx` → Already have `lib/components/CollectionPopup.svelte`

### Phase 3: Migrate API Routes ✅ IN PROGRESS
Convert `app/api/**/route.ts` to `routes/api/**/+server.ts` format.

**Completed:**
- ✅ `/api/admin/tags` - GET, POST
- ✅ `/api/admin/tags/[id]` - GET, PUT, DELETE
- ✅ `/api/admin/people` - GET, POST
- ✅ `/api/admin/people/[id]` - GET, PUT, DELETE
- ✅ `/api/admin/locations` - GET, POST
- ✅ `/api/admin/locations/[id]` - GET, PUT, DELETE
- ✅ `/api/admin/users` - GET, POST
- ✅ `/api/admin/users/[id]` - GET, PUT, DELETE
- ✅ `/api/admin/groups` - GET, POST
- ✅ `/api/admin/groups/[id]` - GET, PUT, DELETE
- ✅ `/api/admin/pages` - GET, POST
- ✅ `/api/admin/pages/[id]` - GET, PUT, DELETE
- ✅ `/api/admin/blog-categories` - GET, POST
- ✅ `/api/admin/blog-categories/[id]` - GET, PUT, DELETE
- ✅ `/api/admin/site-config` - GET, PUT
- ✅ `/api/admin/analytics` - GET
- ✅ `/api/admin/templates` - GET, PUT
- ✅ `/api/admin/languages` - GET

**Remaining:**
- `/api/admin/albums` - Various routes
- `/api/admin/photos` - Various routes
- `/api/admin/deployment` - POST
- `/api/admin/backup-restore` - Various routes
- `/api/admin/audit-logs` - GET
- `/api/admin/analytics` - GET
- `/api/admin/import-sync` - Various routes
- `/api/admin/face-recognition` - Various routes
- `/api/albums` - Various routes
- `/api/photos` - Various routes
- `/api/search` - GET
- `/api/auth` - Various routes (partially migrated)
- `/api/storage` - Various routes
- Public routes: `/api/tags`, `/api/people`, `/api/locations` (keep for public access)

### Phase 4: Remove React Dependencies
After all React code is removed:
- `react`, `react-dom`
- `next`
- `next-auth` (replace with SvelteKit auth)
- `@tanstack/react-query` (replace with Svelte stores)
- `react-hook-form` (replace with Svelte forms)
- `react-i18next`, `next-i18next` (replace with Svelte i18n)
- `@radix-ui/react-*` (replace with Svelte equivalents or keep if used)
- `framer-motion` (replace with Svelte transitions)
- `next-themes` (replace with Svelte theme store)

### Phase 5: Remove React Contexts and Hooks
- `contexts/LanguageContext.tsx` → Already have `lib/stores/language.ts`
- `contexts/SiteConfigContext.tsx` → Already have `lib/stores/siteConfig.ts`
- `hooks/useAuth.ts` → Already have `lib/stores/auth.ts`
- `hooks/useI18n.ts` → Replace with Svelte stores
- `hooks/useSiteConfig.ts` → Replace with Svelte stores
- `hooks/useTemplate.ts` → Migrate to Svelte
- Other hooks → Migrate to Svelte stores or utilities

## Notes
- API routes (`app/api/`) must stay until migrated to SvelteKit format
- Some React components may still be used by remaining Next.js pages
- Templates (`templates/*`) are React components - migrate to Svelte templates later
- Be careful with shared utilities and services - they may be used by both
- Next.js config files (`next.config.js`, `next-env.d.ts`) must stay until all Next.js pages are removed

## Progress Summary
- ✅ Phase 1: Removed 21 migrated Next.js pages
- ⏳ Phase 2: Waiting for remaining Next.js pages to be migrated before removing React components
- ⏳ Phase 3: API routes migration (61 routes remaining)
- ⏳ Phase 4: React dependencies removal
- ⏳ Phase 5: React contexts and hooks removal

## Next Steps
1. Migrate remaining Next.js pages to SvelteKit
2. Start migrating API routes from `app/api/**/route.ts` to `routes/api/**/+server.ts`
3. Remove React components once no longer used
4. Remove Next.js config files once all pages are migrated
5. Remove React dependencies from package.json
