## [Unreleased]

### Added
- **Album File Check Feature**: Added ability to compare local folder with album photos
  - "Check Local Files" button in album management page
  - Compares local files with uploaded photos by `originalFilename`
  - Shows missing files (in local but not uploaded) and extra files (uploaded but not in local)
  - Dialog to select and upload missing files directly from the check results
  - Upload progress indicator during batch upload
  - Supports selecting individual files or all files for upload

### Fixed
- **Logout Redirect**: Fixed production logout redirecting to localhost instead of production domain
  - Updated MobileNavigation to use NextAuth's signOut with relative callback URL
  - Fixed logout flow to respect NEXTAUTH_URL environment variable
- **Locations API**: Fixed 500 error when fetching locations
  - Added connectMongoose() call before using LocationModel (Mongoose models require Mongoose connection)
  - Replaced $text search with regex search across multilingual fields (name.en, name.he, names.en, names.he)
  - Fixed sorting to use only root-level fields (removed nested multilingual fields from sort options)
  - Added comprehensive error logging for debugging
- **Locations Display**: Fixed empty location names in admin interface
  - Updated admin locations page to handle both 'name' and 'names' fields
  - Improved getDisplayName helper to extract text from multilingual objects correctly
  - Added fallback display showing location ID when name is missing
- **CollectionPopup Locations**: Fixed location selection and display in popup
  - Updated to handle both 'name' and 'names' fields when displaying locations
  - Fixed search filtering to work with multilingual location names
  - Enhanced search to include address, city, and country fields
  - Updated API search to query both 'name' and 'names' fields
- **Person Creation**: Fixed person creation from photo edit page
  - Improved name parsing to split full names into firstName and lastName
  - Handles single-word names by using the name for both fields
  - Ensures both firstName and lastName have values (required by API validation)
- **Photo People Update**: Fixed people not being saved when editing photos
  - Enhanced people lookup to search across all multilingual fields (fullName.en/he, firstName.en/he, lastName.en/he)
  - Added ObjectId support for direct ID lookups
  - Improved error handling with detailed logging for missing people
  - Added validation to return clear error messages when people aren't found
- **Search Functionality**: Enhanced person search to support first names, last names, and full names with comprehensive matching
  - Added word-by-word matching in fullName fields
  - Improved ObjectId matching for photos referencing people
  - Added debug logging for troubleshooting search issues
  - Fixed search results to only show photos and albums (removed people/locations from results)
- **React Error #31**: Fixed production error where multilingual objects were being rendered directly
  - Fixed album name display in photo upload page to properly extract text from multilingual objects
  - Added proper MultiLangUtils handling throughout upload components
- **Photo Thumbnails**: Fixed black boxes in search results
  - Switched from Next.js Image component to regular img tag for API-served images
  - Improved thumbnail path handling with fallback to full image URL
- **Search Filters**: Simplified left sidebar filters
  - Removed unnecessary filters (date range, storage provider, visibility, mine only, tags)
  - Streamlined to essential filters: Search Type, Album, and Sort options
- **Turbopack HMR**: Fixed Hot Module Replacement issues
  - Created wrapper modules for next-auth/react (`src/hooks/useAuth.ts`)
  - Created wrapper module for lucide-react icons (`src/lib/icons.ts`)
  - Updated all components to use wrappers instead of direct imports
- **Icon Manifest**: Fixed PWA manifest errors
  - Removed references to missing screenshot files
  - Cleaned up shortcut icon references
- **Storage API**: Improved error handling and logging
  - Added better path validation and error messages
  - Enhanced logging for debugging image loading issues

## v0.9.5 - 2025-10-29

### Highlights
- Infrastructure: Upgrade Docker base to Node.js 20 for Next.js 16 compatibility
- Deployment: Added external MongoDB compose using host networking; improved build artifacts packaging and cleanup
- Frontend: Album lightbox on modern template with prev/next, EXIF toggle, and autoplay
- Admin: Album page shows fetched photos immediately (no manual refresh required)

### Features
- Docker
  - Builder/runner images updated to `node:20-alpine`
  - New `docker-compose.external-mongodb.yml` for deployments with external MongoDB (same-host friendly via `network_mode: host`)
- Frontend Album View (Modern Template)
  - Integrated `PhotoLightbox` with:
    - Navigation (prev/next, arrow keys)
    - EXIF panel (toggle with button or “I”)
    - Slideshow autoplay (toggle with button or spacebar)
- Documentation
  - Deployment docs updated with external Mongo option and host networking notes
  - Docker deployment guide updated with run instructions for both modes
  - PRD updated to include Wasabi/Backblaze as S3-compatible providers and required config

### Fixes
- Build scripts: remove old `openshutter-image.tar` and `openshutter-deployment.tar.gz` before exporting to prevent file growth across builds
- Admin Albums: `AlbumDetailView` now syncs `localPhotos` with incoming `photos` prop so photos render as soon as they load
- Fetch freshness: album/photos/sub-albums requests use `cache: 'no-store'` and a timestamp to avoid stale responses

### Upgrade Notes
- Rebuild Docker images after pulling: `pnpm build:prod` or `pnpm docker:build`
- For external MongoDB on the same server, set `MONGODB_URI=mongodb://localhost:27017/openshutter` and use `docker-compose.external-mongodb.yml`
- For Wasabi/Backblaze usage, configure endpoint, region, bucket, and credentials in admin storage settings

## v0.9.3 (Pre-release) - 2025-01-15

### Highlights
- **Content Protection System**: Advanced right-click and developer tools protection
- **Enhanced Theme System**: Improved theme provider with proper client-side mounting
- **Security Features**: Comprehensive content protection with customizable warnings
- **CSS Utilities**: New utility classes for content protection and user interaction control

### Features
- **Right-Click Protection**:
  - Disables right-click context menu (except in text editors and input fields)
  - Blocks F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U keyboard shortcuts
  - Prevents Ctrl+S (save page) and drag-and-drop of images
  - Configurable warning messages for blocked actions
  - Smart detection of text editors and input fields to allow context menus
- **Content Protection Components**:
  - `RightClickDisabler`: Core protection component with event handling
  - `ClientRightClickDisabler`: Client-side wrapper with dynamic import
  - Integration with root layout for site-wide protection
- **Enhanced Theme Provider**:
  - Proper client-side mounting to prevent hydration issues
  - Improved theme switching with system preference detection
  - Better performance with conditional rendering

### Security Features
- **Multi-layer Protection**:
  - CSS-based user selection and drag prevention
  - JavaScript event blocking for developer tools
  - Keyboard shortcut interception
  - Image and media protection
- **Smart Exceptions**:
  - Allows right-click in text editors (ProseMirror, Quill, TipTap)
  - Preserves functionality in input fields and contenteditable elements
  - Maintains accessibility for legitimate user interactions
- **Configurable Warnings**:
  - Customizable warning messages for blocked actions
  - Optional warning display with user-friendly messages
  - Professional content protection without breaking UX

### CSS Enhancements
- **Content Protection Utilities**:
  - `.no-context-menu`: Prevents text selection and context menus
  - `.no-drag`: Disables drag and drop functionality
  - `.no-copy`: Prevents content copying
- **Media Protection**:
  - Global image and video protection
  - Selective re-enabling for interactive elements
  - Gallery image clickability preservation
- **Template Variables**:
  - Enhanced CSS custom properties for all templates
  - Improved dark mode support
  - Better color consistency across themes

### Technical Improvements
- **Client-Side Optimization**:
  - Dynamic imports for right-click protection
  - SSR-safe component loading
  - Performance-optimized event handling
- **Theme System**:
  - Hydration-safe theme provider
  - System preference detection
  - Smooth theme transitions
- **Code Quality**:
  - TypeScript improvements
  - Better error handling
  - Enhanced maintainability

### Internationalization
- **Content Protection Messages**:
  - Configurable warning messages in multiple languages
  - Professional content protection messaging
  - User-friendly security notifications

### Fixes/Improvements
- **Theme Provider**: Fixed hydration issues with proper client-side mounting
- **Content Protection**: Added comprehensive right-click and developer tools blocking
- **CSS Utilities**: Enhanced content protection with smart exceptions
- **Performance**: Optimized client-side component loading
- **Security**: Multi-layer content protection system

### Breaking Changes
- None

### Upgrade Notes
- Content protection is enabled by default but can be configured
- Theme provider changes are backward compatible
- Clear browser cache for new CSS utilities
- Rebuild after pulling: `pnpm install && pnpm build`

## v0.9.2 (Pre-release) - 2025-01-15

### Highlights
- **Advanced Search System**: Comprehensive search across photos, albums, people, and locations
- **People Management**: Complete people tagging and organization system with multi-language support
- **Location Management**: Geospatial location tracking with coordinates and categories
- **Enhanced Tag System**: Improved tag management with categories and usage tracking
- **Bulk Photo Operations**: Efficient management of multiple photos with metadata updates
- **Multi-Language Search**: Search functionality with RTL support and language-specific queries
- **Mobile-First PWA**: Progressive Web App with offline capabilities and mobile optimization
- **Touch-Optimized Interface**: Mobile navigation, photo upload, and search with gesture support

### Features
- **Search Page** (`/search`): Advanced search interface with filtering and sorting
  - Search across photos, albums, people, and locations
  - Advanced filtering: tags, dates, storage provider, privacy settings
  - Multi-language search support with RTL compatibility
  - Sorting options: relevance, date, filename, size
  - Pagination support for large result sets
- **People Management System**:
  - Person profiles with firstName, lastName, fullName, nickname, description (multi-language)
  - People admin interface with CRUD operations
  - Integration with photos for people tagging
  - Profile image support with storage provider integration
- **Location Management System**:
  - Location profiles with coordinates, addresses, and categories
  - Geospatial search capabilities
  - Location admin interface with coordinate-based search
  - Integration with photos for location tagging
- **Enhanced Tag System**:
  - Tag categories for better organization (general, location, event, object, mood, technical, custom)
  - Usage tracking across photos
  - Tag admin interface with bulk operations
  - Color coding and description support
- **Bulk Photo Operations**:
  - Bulk metadata updates for tags, people, locations
  - Bulk actions component for admin interface
  - Enhanced photo management capabilities
  - Batch operations for large photo collections
- **Mobile Capabilities**:
  - Progressive Web App (PWA) with offline support
  - Mobile-optimized components for navigation, search, and photo management
  - Touch-friendly interface with gesture support
  - Camera integration for direct photo capture
  - Mobile-specific routes and layouts
  - Enhanced service worker for better mobile caching

### API Endpoints
- **Search**: GET `/api/search` - comprehensive search with filtering
- **People**: GET/POST `/api/admin/people`, GET/PUT/DELETE `/api/admin/people/[id]`
- **Locations**: GET/POST `/api/admin/locations`, GET/PUT/DELETE `/api/admin/locations/[id]`
- **Tags**: GET/POST `/api/admin/tags`, GET/PUT/DELETE `/api/admin/tags/[id]`
- **Bulk Operations**: PUT `/api/photos/bulk-update` - bulk photo metadata updates

### Database Models
- **Person Model**: Multi-language person profiles with relationships
- **Location Model**: Geospatial location data with coordinates and categories
- **Tag Model**: Enhanced tag system with categories and usage tracking
- **Photo Model**: Updated with people, location, and enhanced tag relationships

### Documentation
- Updated README.md with new search, people, locations, and tags features
- Updated functional-spec.md with new entities and API endpoints
- Updated SYSTEM_PRD.md with new user stories and requirements
- Enhanced project structure documentation

### Internationalization
- Added search functionality translations (EN/HE)
- Added people management translations
- Added location management translations
- Added tag management translations
- Enhanced multi-language search support

### Fixes/Improvements
- Enhanced database optimization for search operations
- Improved multi-language field handling
- Better error handling for search operations
- Enhanced UI components for search and management interfaces
- **Type Consolidation**: Consolidated duplicate `SearchFilters` interfaces into shared types
- **Build Optimization**: Fixed TypeScript errors and improved type consistency
- **Code Quality**: Eliminated duplicate code and improved maintainability

### Breaking Changes
- None

### Upgrade Notes
- Ensure env and DB are configured; new models will be created automatically
- Clear browser cache for new search and admin assets
- Rebuild after pulling: `pnpm install && pnpm build`
- New search functionality requires no additional configuration

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
