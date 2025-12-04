# Component Migration Status Report

## ✅ Migrated to Svelte (12 components)
Located in `frontend/src/lib/components/`:
- ✅ `AlbumBreadcrumbs.svelte` - Used in admin album pages
- ✅ `AlbumsSection.svelte` - Used in home page
- ✅ `MultiLangInput.svelte` - Used in admin forms
- ✅ `MultiLangHTMLEditor.svelte` - Used in admin forms
- ✅ `NotificationDialog.svelte` - Used in admin pages
- ✅ `PhotoLightbox.svelte` - Used in album pages
- ✅ `Header.svelte` - Used in layouts
- ✅ `Footer.svelte` - Used in layouts
- ✅ `LanguageSelector.svelte` - Used in header
- ✅ `HomeHero.svelte` - Used in home page
- ✅ `HomeTemplateSwitcher.svelte` - Used in home page
- ✅ `TiptapHTMLEditor.svelte` - Used in admin forms

## ⚠️ Still Needed - Used in Next.js App Pages (Critical)

### Guards & Wrappers
- ⚠️ `AdminGuard.tsx` - Used in ALL admin pages (needs SvelteKit equivalent in `+layout.server.ts`)
- ⚠️ `OwnerGuard.tsx` - Used in owner pages (needs SvelteKit equivalent)
- ⚠️ `TemplateWrapper.tsx` - Used in public pages (needs migration)
- ⚠️ `DynamicTemplateLoader.tsx` - Used in public pages (needs migration)

### Dialogs & UI
- ⚠️ `ConfirmDialog.tsx` - Used in admin albums page (needs Svelte version)
- ⚠️ `AlbumTree.tsx` - Used in admin albums page (needs Svelte version)
- ⚠️ `AlbumDetailView.tsx` - Used in admin/owner album pages (needs Svelte version)

### Admin Components
- ⚠️ `AdminTemplate.tsx` - Used in admin pages (layout wrapper)
- ⚠️ `AlbumMetadataEditor.tsx` - Used in album edit pages
- ⚠️ `CollectionPopup.tsx` - Used in admin forms
- ⚠️ `BulkActions.tsx` - Used in admin pages
- ⚠️ `PhotoMetadataEditor.tsx` - Used in photo edit pages

### UI Library (shadcn/ui - React components)
- ⚠️ `ui/button.tsx`
- ⚠️ `ui/input.tsx`
- ⚠️ `ui/dialog.tsx`
- ⚠️ `ui/card.tsx`
- ⚠️ `ui/badge.tsx`
- ⚠️ `ui/tabs.tsx`
- ⚠️ `ui/select.tsx`
- ⚠️ `ui/label.tsx`
- ⚠️ `ui/switch.tsx`
- ⚠️ `ui/alert.tsx`
- ⚠️ `ui/separator.tsx`
- ⚠️ `ui/popover.tsx`
- ⚠️ `ui/scroll-area.tsx`
- ⚠️ `ui/checkbox.tsx`
- ⚠️ `ui/dropdown-menu.tsx`
- ⚠️ `ui/calendar.tsx`

### Other Components
- ⚠️ `ServiceWorkerProvider.tsx` - Used in layout
- ⚠️ `ClientRightClickDisabler.tsx` - Used in layout
- ⚠️ `RightClickDisabler.tsx`
- ⚠️ `theme-provider.tsx` - Used in layout
- ⚠️ `PageDisplay.tsx` - Used in page routes
- ⚠️ `BlogHTMLEditor.tsx` - Used in blog pages
- ⚠️ `BlogImageUpload.tsx` - Used in blog pages
- ⚠️ `FolderSelectionDialog.tsx` - Used in admin import

## 🔄 Face Recognition (Keep for now - pending migration)
- 🔄 `FaceDetectionViewer.tsx`
- 🔄 `FaceMatchingPanel.tsx`
- 🔄 `PhotoFaceRecognition.tsx`

## 📦 Search Components (May need migration)
- 📦 `SearchBar.tsx`
- 📦 `SearchFilters.tsx`
- 📦 `SearchResults.tsx`
- 📦 `SearchPageContent.tsx`
- 📦 `AdvancedFilterSearch.tsx`
- 📦 `SearchPopup.tsx`
- 📦 `PhotoCard.tsx` (search)
- 📦 `AlbumCard.tsx` (search)
- 📦 `PersonCard.tsx`
- 📦 `ActiveFiltersDisplay.tsx`
- 📦 Filter sections (Tag, Location, People, Album, DateRange)

## 📱 Mobile Components (May need migration)
- 📱 `MobileLayout.tsx`
- 📱 `MobileNavigation.tsx`
- 📱 `MobilePhotoGallery.tsx`
- 📱 `MobilePhotoUpload.tsx`
- 📱 `MobileSearch.tsx`
- 📱 `MobileSearchPageContent.tsx`

## 📤 Upload Components (May need migration)
- 📤 `PhotoUpload.tsx`
- 📤 `UploadDropzone.tsx`
- 📤 `UploadForm.tsx`
- 📤 `UploadProgress.tsx`

## 🎨 Template Components (Need migration)
All template components in `frontend/src/templates/*/components/`:
- 🎨 `Hero.tsx` (4 templates)
- 🎨 `Header.tsx` (4 templates)
- 🎨 `Footer.tsx` (4 templates)
- 🎨 `AlbumCard.tsx` (default template)
- 🎨 `PhotoCard.tsx` (default template)
- 🎨 `AlbumList.tsx` (default template)
- 🎨 `ElegantLanguageSelector.tsx` (fancy template)

## 📄 Template Pages (Need migration)
All template pages in `frontend/src/templates/*/pages/`:
- 📄 `Home.tsx` (4 templates)
- 📄 `Album.tsx` (4 templates)
- 📄 `Gallery.tsx` (4 templates)
- 📄 `Search.tsx` (3 templates)
- 📄 `Login.tsx` (4 templates)

## Summary

### Migration Status
- ✅ **Migrated**: 12 components
- ⚠️ **Critical (still used)**: ~30 components
- 🔄 **Face Recognition**: 3 components (keep for now)
- 📦 **Search**: ~15 components
- 📱 **Mobile**: 6 components
- 📤 **Upload**: 4 components
- 🎨 **Templates**: ~15 components + 20 pages

### Action Items Before Next.js Cleanup

1. **Migrate Critical Components** (blocking Next.js removal):
   - `AdminGuard` → SvelteKit `+layout.server.ts` (already done for admin routes)
   - `OwnerGuard` → SvelteKit `+layout.server.ts`
   - `ConfirmDialog` → Svelte component
   - `AlbumTree` → Svelte component
   - `AlbumDetailView` → Svelte component (or inline in pages)
   - `TemplateWrapper` → SvelteKit layout system
   - `DynamicTemplateLoader` → SvelteKit dynamic imports

2. **Migrate or Replace UI Library**:
   - Option A: Migrate shadcn/ui components to Svelte
   - Option B: Use Svelte UI library (e.g., Skeleton UI, Svelte Material UI)
   - Option C: Create simple custom Svelte components

3. **Migrate Template System**:
   - Convert template pages to SvelteKit routes
   - Convert template components to Svelte
   - Update template loading system

4. **After Migration Complete**:
   - Remove all Next.js app pages (`src/app/`)
   - Remove Next.js config (`next.config.js`)
   - Remove Next.js dependencies
   - Remove unused React components (`src/components/`)

