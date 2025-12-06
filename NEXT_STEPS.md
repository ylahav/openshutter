# Next Steps for SvelteKit Migration

## ✅ Completed
- **65 API routes migrated** to SvelteKit (`routes/api/**/+server.ts`)
- **21 Next.js pages removed** (replaced with SvelteKit equivalents)
- **NextAuth removed** and replaced with JWT-based auth
- **Next.js config files removed** (`next.config.js`, `next-env.d.ts`, `next.json`)
- **Core components migrated** to Svelte

## 🎯 Immediate Next Steps

### 1. Remove Old Next.js API Routes ⚠️
**Status:** All API routes are migrated - safe to remove
- Delete `frontend/src/app/api/` directory
- All routes now exist in `frontend/src/routes/api/`
- **Action:** Remove the entire `app/api/` directory

### 2. Migrate Remaining Next.js Pages
**Priority order:**

#### High Priority (Core Features):
1. `/admin/storage` - Storage configuration page
2. `/admin/audit-logs` - Audit log viewer
3. `/search` - Search functionality
4. `/[alias]` - Dynamic page routes

#### Medium Priority:
5. `/admin/photos/upload` - Photo upload interface
6. `/admin/template-config` - Template configuration
7. `/admin/import-sync` - Import/sync interface
8. `/photos` - Public photos page

#### Lower Priority (Owner Routes):
9. `/owner/*` - All owner routes (may be less critical)

### 3. Remove React Dependencies
**After pages are migrated:**
- `react`, `react-dom`
- `next`
- `@tanstack/react-query` (replace with Svelte stores)
- `react-hook-form` (replace with Svelte forms)
- `react-i18next`, `next-i18next` (replace with Svelte i18n)
- `@radix-ui/react-*` (check if still needed)
- `framer-motion` (replace with Svelte transitions)
- `next-themes` (replace with Svelte theme store)

### 4. Remove React Components
**After pages are migrated:**
- Check which React components are still used
- Remove unused React components
- Migrate any remaining React components to Svelte

### 5. Clean Up
- Remove React contexts and hooks
- Update all imports from `@/` to `$lib/`
- Remove any remaining Next.js-specific code
- Update documentation

## 📊 Current Status

**API Routes:** ✅ 100% Complete (65/65 routes)
**Pages:** ⏳ ~60% Complete (21/35+ pages)
**Components:** ⏳ ~70% Complete
**Dependencies:** ⏳ 0% Removed (waiting for page migration)

## 🚀 Recommended Order

1. **Remove `app/api/` directory** (immediate - all routes migrated)
2. **Migrate high-priority pages** (storage, audit-logs, search)
3. **Remove Next.js dependencies** (after pages are migrated)
4. **Clean up React components** (after dependencies removed)
5. **Final testing and cleanup**

