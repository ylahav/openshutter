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
