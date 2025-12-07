# Dependency Cleanup Analysis

## Dependencies That Can Be Removed

### Next.js Related (Can be removed - not used in SvelteKit routes)
- `next` - Only used in legacy React templates (`frontend/src/templates/` and `frontend/src/components/`)
- `@next/bundle-analyzer` (devDependency) - Next.js specific
- `eslint-config-next` (devDependency) - Next.js specific

### React-Specific Dependencies (Can be removed - not used in SvelteKit routes)
- `@tiptap/react` - Only used in legacy React components (`TiptapHTMLEditor.tsx`, `BlogHTMLEditor.tsx`, `QuillHTMLEditor.tsx`)
- `@tanstack/react-query` - Not found in SvelteKit routes or lib
- `framer-motion` - Not found in SvelteKit routes or lib
- `react-day-picker` - Not found in SvelteKit routes or lib
- `lucide-react` - Only used in `frontend/src/lib/icons.ts` (can be replaced with inline SVGs or lucide-svelte)
- `@radix-ui/react-*` packages - Not found in SvelteKit routes or lib (only used in legacy React components)
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-label`
  - `@radix-ui/react-popover`
  - `@radix-ui/react-select`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-switch`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-slot` (devDependency)

### Already Removed (Confirmed)
- `react-dropzone` - Already removed
- `react-hook-form` - Already removed
- `react-i18next` - Already removed
- `next-themes` - Already removed
- `next-auth` - Already removed (replaced with JWT)
- `@auth/mongodb-adapter` - Already removed

### Potentially Unused
- `@friendofsvelte/tipex` - Not found in codebase (might be for future use)
- `@dnd-kit/*` - Only found in `AlbumTree.tsx` (legacy React component)
  - `@dnd-kit/core`
  - `@dnd-kit/sortable`
  - `@dnd-kit/utilities`
- `zustand` - Not found in SvelteKit routes or lib
- `i18next` - Not found in SvelteKit routes or lib (might be used in backend or legacy code)

## Dependencies That Should Be Kept

### Core SvelteKit
- `@sveltejs/kit`
- `@sveltejs/vite-plugin-svelte`
- `@sveltejs/adapter-node`
- `svelte`
- `vite`

### Tiptap (Svelte-compatible)
- `@tiptap/core` - Used in `TiptapHTMLEditor.svelte`
- `@tiptap/starter-kit` - Used in `TiptapHTMLEditor.svelte`
- `@tiptap/extension-*` - Used in `TiptapHTMLEditor.svelte`

### Backend/Server-Side
- `mongodb`
- `mongoose`
- `bcryptjs`
- `jose` (JWT)
- `jsonwebtoken`
- `multer`
- `sharp`
- `exif-parser`
- `face-api.js`
- `googleapis`
- `archiver`
- `yauzl`
- `slugify`
- `uuid`
- `canvas`

### AWS/Storage
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

### Styling
- `tailwindcss`
- `@tailwindcss/postcss`
- `autoprefixer`
- `postcss`
- `sass`
- `tailwind-merge` - **KEEP** (used in `lib/utils.ts`, used by SvelteKit routes)
- `clsx` - **KEEP** (used in `lib/utils.ts`, used by SvelteKit routes)
- `class-variance-authority` - **CAN REMOVE** (only used in `components/ui/button.tsx`, not in SvelteKit)

### React (Keep for Legacy Templates)
- `react` - Still used in `frontend/src/templates/` and `frontend/src/components/`
- `react-dom` - Still used in `frontend/src/templates/` and `frontend/src/components/`

## Recommendations

### Safe to Remove Now
1. **Next.js packages** - `next`, `@next/bundle-analyzer`, `eslint-config-next`
2. **React-specific UI libraries** - All `@radix-ui/react-*` packages (not used in SvelteKit routes/lib)
3. **React-specific utilities** - `@tanstack/react-query`, `framer-motion`, `react-day-picker`
4. **Unused packages** - `@friendofsvelte/tipex`, `zustand`, `class-variance-authority`
5. **Webpack-specific** - `@svgr/webpack` (not needed for Vite/SvelteKit)

### Keep for Now (Legacy Templates)
- `@tiptap/react` - Used in legacy React components (`TiptapHTMLEditor.tsx`, `BlogHTMLEditor.tsx`)
- `@dnd-kit/*` - Used in `AlbumTree.tsx` (legacy React component)
- `lucide-react` - Used in `lib/icons.ts` and many React components (24 files), but NOT in SvelteKit routes/lib
- `i18next` - Not found in SvelteKit routes/lib, might be used in backend or legacy code
- `date-fns` - Not found in SvelteKit routes/lib, might be used in backend or legacy code

### Consider Replacing
- `lucide-react` → `lucide-svelte` or inline SVGs (already using inline SVGs in new components)

## Action Plan

1. **Immediate removal** (safe):
   - `next`
   - `@next/bundle-analyzer`
   - `eslint-config-next`
   - `@radix-ui/react-*` (all packages)
   - `@tanstack/react-query`
   - `framer-motion`
   - `react-day-picker`
   - `@friendofsvelte/tipex`
   - `zustand`

2. **After migrating remaining templates**:
   - `@tiptap/react`
   - `@dnd-kit/*`
   - `lucide-react` (replace with lucide-svelte or inline SVGs)

3. **Verify before removing**:
   - `i18next` - Check if used in backend or shared code
