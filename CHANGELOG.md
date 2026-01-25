## [Unreleased]

### Added
- **Album Reordering**: Drag-and-drop album reordering in admin albums management
  - Drag handle (⋮⋮) on each album for easy reordering
  - Reorder albums within the same parent or move to different parents
  - Accordion navigation starts collapsed (only root albums visible by default)
  - Click arrow icon to expand/collapse album hierarchies
  - Changes persist to database and survive page reloads
- **Page Builder - Row/Column Layout System**: Enhanced page builder with flexible row/column-based layout
  - Add rows with custom column proportions (e.g., 1,2,3 for 1/6, 1/3, 1/2 widths)
  - Assign modules to individual columns within rows
  - Reorder rows with up/down controls for immediate visual feedback
  - Support for both new row/column and legacy zone-based layouts
- **Module-Specific Forms**: Replaced JSON editing with intuitive forms for module configuration
  - **Feature Grid Module**: Form-based editor with icon selector, title, subtitle, and feature items (icon, title, rich text description)
  - **Rich Text Module**: Form-based editor with title, body (rich text), and background color selection
  - **Albums Grid Module**: Form-based editor with title, description (rich text), and multi-select album picker
    - Checkbox-based album selection from hierarchical list
    - Display only selected albums in the grid
    - Support for selecting multiple albums from any level in the hierarchy
    - Cover images properly displayed for all selected albums
- **Icon Management System**: Comprehensive icon system for page builder modules
  - Icon selector dropdown with visual icon previews next to names
  - Sorted icon list (alphabetically)
  - Support for SVG icons, emojis, and custom text
  - IconRenderer component for consistent icon display across modules
  - Easy icon addition process (add to list + add SVG definition)
- **Page Title/Subtitle Display**: Page titles and subtitles now prominently displayed on public pages
  - Title and subtitle rendered before dynamically rendered modules
  - Multi-language support for page titles and subtitles

### Changed
- **Page Builder UI**: Improved user experience for page management
  - Removed hard-coded `introText` and `content` fields from page administration
  - Module-based content replaces static page fields
- **Albums Grid Module**: Renamed from "Album Gallery" to "Albums Grid" and enhanced functionality
  - Changed from single root album selection to multiple album selection
  - Removed "include root" flag (now shows only explicitly selected albums)
  - Multi-select interface with checkboxes for easier album selection
  - Visual row/column layout builder with drag-and-drop reordering
- **Module Editing**: Streamlined module editing workflow
  - Module-specific forms replace generic JSON editor
  - Better validation and error handling
  - Immediate visual feedback for row reordering
- **Icon System**: Refactored icon management
  - Removed React-specific icon library (lucide-react) dependency
  - Created Svelte-compatible icon system with SVG definitions
  - Icon selector component with visual previews

### Fixed
- **Svelte Reactivity**: Fixed Map reactivity issues in row/column layout builder
- **Icon Display**: Fixed icon rendering to show actual SVG icons instead of text names
- **Page Rendering**: Fixed page title and subtitle not displaying on public pages
- **Row Reordering**: Fixed row reordering to provide immediate visual feedback without page reload
- **Albums Grid Cover Images**: Fixed cover photos not displaying in albums grid module
  - Now properly fetches cover image URLs using the cover-images API endpoint
  - Cover images display correctly for all selected albums in the grid

### Architecture
- **Backend Migration to NestJS**: Migrated backend from Express.js to NestJS framework
  - **NestJS Framework**: Complete migration to NestJS for better structure, dependency injection, and maintainability
  - **Modular Architecture**: Organized code into modules (PhotosModule, AlbumsModule, DatabaseModule, ConfigModule)
  - **Dependency Injection**: Services now use NestJS dependency injection pattern
  - **Configuration Management**: Replaced dotenv with @nestjs/config for centralized configuration
  - **Database Integration**: Migrated to @nestjs/mongoose for MongoDB connection management
  - **Global Middleware**: Implemented ValidationPipe and HttpExceptionFilter for consistent error handling
  - **API Response Format**: Standardized to NestJS response format (removed custom { success, data } wrappers)
  - **File Upload**: Converted multer handling to NestJS FileInterceptor with custom validation
  - **CORS**: Using NestJS built-in CORS support instead of express-cors
  - **Code Cleanup**: Removed old Express routes, unused dependencies (cors, dotenv), and empty directories
- **Frontend/Backend Split**: Separated the monolithic Next.js application into distinct frontend and backend services
  - **Frontend**: Next.js 15 application (port 4000) focused on UI and rendering
  - **Backend**: Node.js/NestJS application (port 5000) handling API, database connections, and business logic
  - **API Proxy**: Frontend proxies API requests to the backend transparently
  - **Improved Scalability**: Better separation of concerns and easier independent scaling
- **Database Optimization**:
  - Direct Mongoose integration via NestJS MongooseModule
  - Improved connection handling and model registration
  - Fixed orphaned data issues during migration

### Added
- **Face Recognition System**: Complete face detection and recognition functionality
  - Client-side face detection using face-api.js with TinyFaceDetector model
  - Face descriptor extraction (128D vectors) for face matching
  - Manual face selection, resizing, and deletion on photos
  - Visual distinction between auto-detected and manually selected faces (different border colors)
  - Face matching against known people with confidence scores
  - Manual face-to-person assignment via dropdown selection
  - Bulk face detection at album level for processing multiple photos
  - Face detection display in frontend album view (PhotoLightbox) with bounding boxes
  - Face recognition models stored in `public/models/face-api/`
  - API endpoints for face detection, matching, and assignment
  - Face data stored in photo documents with descriptors, bounding boxes, and matched person IDs
- **Photo Metadata Display**: Enhanced photo cards with metadata information
  - Tags, people names, and location displayed below photos in album management view
  - Same metadata display in frontend album view (all templates: default, modern, fancy, minimal)
  - People displayed as names (not IDs) using multilingual support
  - Location displayed with multilingual name extraction
  - Tags displayed with multilingual support
- **Popup Dialogs**: Replaced browser alerts with styled popup dialogs
  - Confirmation dialogs for bulk operations (face detection, EXIF re-reading)
  - Notification dialogs for success/error messages
  - Consistent UI/UX across all admin operations
- **Album Breadcrumbs Navigation**: Added breadcrumb navigation to all album pages
  - Breadcrumbs show full album hierarchy (Albums → Parent Albums → Current Album)
  - Available on admin, owner, and public album pages
  - Clickable links for easy navigation through album hierarchy
  - Supports both ID-based (admin/owner) and alias-based (public) routing
  - Integrated into all template styles (default, modern, fancy, minimal)
- **Album Tree Drag-and-Drop**: Implemented drag-and-drop reordering for albums in management page
  - Visual drag handles (⋮⋮) for each album row
  - Reorder albums within same parent or move between parents
  - Optimistic UI updates with server synchronization
  - Prevents moving albums into their own descendants
  - Real-time visual feedback during drag operations
- **Album Tree Accordion**: Added collapsible sections for album hierarchy
  - Accordion toggle for level 2+ albums (level 1 nodes can expand/collapse children)
  - Arrow indicator only appears when album has sub-albums
  - Smooth expand/collapse animations
  - State persists during navigation
- **File Upload Size Limit Documentation**: Added comprehensive documentation for handling file upload size limits
  - Created `docs/UPLOAD_LIMITS.md` with explanations and solutions for Next.js body size limits
  - Documented default limits (~4.5MB for JSON, ~20MB for form data)
  - Provided solutions for development and production environments
  - Added configuration notes in API route and next.config.js
  - API route configured to accept up to 100MB files (server-level limit may need additional configuration)

### Changed
- **Face Recognition UI**: Improved user experience for face detection and matching
  - Replaced browser `alert()` calls with popup notification dialogs
  - Added confirmation dialog for bulk face detection operations
  - Enhanced error handling with user-friendly messages
  - Improved visual feedback during face detection and matching processes
- **Photo API Endpoints**: Enhanced photo APIs to populate metadata references
  - GET `/api/photos/[id]` now populates location object with multilingual name
  - GET `/api/albums/[id]/photos` and `/api/albums/by-alias/[alias]/photos` populate tags, people, and location as display names/objects
  - Bulk update API searches locations by multilingual name fields (name.en, name.he)
- **Photo Metadata Editor**: Improved location handling in photo edit form
  - Added useEffect to sync location prop changes to form fields
  - Ensures form fields update when location data is populated from API
- **Album Page Spacing**: Reduced excessive spacing on album pages for better content density
  - Reduced section padding from 5rem (80px) to 2rem (32px) top, 1rem (16px) bottom
  - Reduced breadcrumb margins from 24px to 8px (mb-6 to mb-2)
  - Reduced bottom margins from 32px to 16px throughout album pages
  - Tighter spacing between album header, sub-albums, and photos sections
  - Improved visual hierarchy with optimized spacing throughout
  - Added `sectionTight` CSS class for compact album page sections
- **Search UI**: Replaced search field in header with search icon that opens a popup
  - Search icon in desktop header opens advanced filter popup (all templates: default, modern, fancy, minimal)
  - Popup includes all filter options (Albums, Tags, People, Locations)
  - Submit button navigates to search page with selected filters as URL parameters
  - Search page automatically reads and applies filter parameters from URL
  - Fixed popup z-index to appear above all content using React portal (renders to document.body)
  - Fixed popup centering with proper overflow handling
- **Date Range Filter**: Temporarily removed from search interface (still supported in API)
  - Date range filter section hidden in both search page and search popup
  - Date parameters still accepted by API but not exposed in UI
- **Public Access Control for Filters**: Tags, People, and Locations filters now show only public content for non-authenticated users
  - Tags API: Returns only tags used in published photos within public albums, plus tags on public albums
  - People API: Returns only people tagged in published photos within public albums
  - Locations API: Returns only locations used in published photos within public albums
  - All filter sections remain visible for all users, but content is filtered based on authentication status
  - Fixed ObjectId handling in all three APIs to properly compare MongoDB ObjectIds with Mongoose ObjectIds

### Added
- **Album File Check Feature**: Added ability to compare local folder with album photos
  - "Check Local Files" button in album management page
  - Compares local files with uploaded photos by `originalFilename`
  - Shows missing files (in local but not uploaded) and extra files (uploaded but not in local)
  - Dialog to select and upload missing files directly from the check results
  - Upload progress indicator during batch upload
  - Supports selecting individual files or all files for upload

### Fixed
- **Face Recognition Errors**: Fixed multiple face recognition issues
  - Fixed "Descriptors must have the same length" error by adding descriptor normalization and validation
  - Fixed face detection not updating photo.people array by preserving matchedPersonId values
  - Fixed TypeScript errors related to faceRecognition property in Photo interface
  - Fixed canvas build errors in Docker by adding Python and graphics libraries
  - Fixed HMR errors related to nested dynamic imports in PhotoFaceRecognition component
- **TypeScript Build Errors**: Fixed TypeScript 5+ compatibility issues
  - Added `override` modifier to ErrorBoundary component methods (componentDidCatch, render)
  - Fixed useState declaration syntax errors
  - Fixed property access errors (detection.detection.box → detection.box)
  - Fixed undefined property access errors (photo.faceRecognition.faces.length)
- **Location Lookup**: Fixed location search in bulk update operations
  - Updated API to search locations by multilingual name fields (name.en, name.he) using case-insensitive regex
  - Fixed location not appearing in photo edit form after bulk update
  - Ensured location data is properly populated from ObjectId references
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
