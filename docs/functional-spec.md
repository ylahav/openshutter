## Functional Specification - OpenShutter

### 1. Languages & RTL
- Global `LanguageProvider` supplies `currentLanguage` and `direction` (ltr/rtl)
- `MultiLangText` and `MultiLangHTML` used across SiteConfig, Album, Photo, User, Group
- `LanguageSelector` shown only if more than one active language in SiteConfig
- `MultiLangUtils.getTextValue/getHTMLValue` extract language-specific strings

### 2. Authentication & Authorization
- NextAuth (credentials, JWT strategy)
- Session includes user `_id`, `role`, `email`
- `AdminGuard` limits admin routes to `role === 'admin'`
- `OwnerGuard` limits owner routes to `role === 'admin'` or `role === 'owner'`
- Blocked users cannot authenticate
- On backend start, ensure at least one active admin must remain after updates/deletes
- **Access Control System:**
  - Public albums: visible to all users (logged in or anonymous)
  - Private albums: require authentication
    - If no `allowedUsers` and no `allowedGroups` (empty or not exist): every logged-in user can see
    - Otherwise: user must be in `allowedUsers` list OR belong to one of `allowedGroups`
  - Owner albums: owners can only edit/delete albums they created (`createdBy` field)
  - Role-based redirection: admins → `/admin`, owners → `/owner`, others → `/` (home page)

### 3. Entities
- SiteConfig: title (ml text), description (ml html), logo, languages (active, default), theme
- Album: name (ml text), description (ml html), cover image, alias, parent, counts, visibility, access control
  - `isPublic`: boolean (public/private)
  - `allowedUsers`: ObjectId[] (specific user access)
  - `allowedGroups`: string[] (group-based access)
  - `createdBy`: string (user ID who created the album)
  - `coverPhotoId`: ObjectId (selected cover photo)
- Photo: title (ml text), description (ml html), tags[], people[], location{name, coords, address}, flags
- Person: firstName (ml text), lastName (ml text), fullName (ml text), nickname (ml text), description (ml text), profileImage, tags[], isActive
- Location: name (ml text), description (ml text), address, city, state, country, coordinates, placeId, category, isActive, usageCount
- Tag: name, description, color, category, isActive, usageCount
- User: name (ml text), username(email), passwordHash, role, groupAliases[], blocked
- Group: name (ml text), alias
- BlogCategory: title (ml text), description (ml text), alias, leadingImage, isActive, sortOrder

### 4. Admin UI
- Site Config editor with multi-lang inputs and languages selection
- Users management: create/edit, block toggle, roles, groups
- Groups management: CRUD, name is multi-lang, alias immutable
- Albums admin: list, view, edit; multi-lang rendering with backward compatibility
  - **Cover Photo Selection:** Modal for selecting album cover photos
    - Shows photos from current album and child albums
    - Pagination support for large photo collections
    - Visual indicator for currently selected cover photo
    - API: GET `/api/admin/albums/[id]/photos`, PUT `/api/admin/albums/[id]/cover-photo`
- Photos admin: edit form uses `MultiLangInput`, `MultiLangHTMLEditor`, `PhotoMetadataEditor`
- **People Management:** Create and manage people with multi-language support
  - Person creation: firstName (ml text), lastName (ml text), nickname (ml text), description (ml text), profileImage
  - Person listing: search, filter by status, pagination support
  - Person editing: full CRUD operations with multi-language inputs
  - Status management: activate/deactivate people
  - API: GET/POST `/api/admin/people`, PUT/DELETE `/api/admin/people/[id]`
- **Location Management:** Create and manage locations with geospatial support
  - Location creation: name (ml text), description (ml text), address, coordinates, category
  - Location listing: search, filter by category, pagination support
  - Location editing: full CRUD operations with multi-language inputs
  - Geospatial search: find locations by coordinates
  - API: GET/POST `/api/admin/locations`, PUT/DELETE `/api/admin/locations/[id]`
- **Tag Management:** Create and manage tags with categories and usage tracking
  - Tag creation: name, description, color, category
  - Tag listing: search, filter by category, pagination support
  - Tag editing: full CRUD operations
  - Usage tracking: monitor tag usage across photos
  - API: GET/POST `/api/admin/tags`, PUT/DELETE `/api/admin/tags/[id]`
- **Blog Categories Management:** Create and manage blog categories with multi-language support
  - Category creation: title (ml text), description (ml text), alias, leading image, sort order
  - Category listing: search, filter by status, pagination support
  - Category editing: full CRUD operations with multi-language inputs
  - Status management: activate/deactivate categories
  - API: GET/POST `/api/admin/blog-categories`, PUT/DELETE `/api/admin/blog-categories/[id]`

### 4.1. Owner UI
- **Owner Dashboard** (`/owner`): Focused interface for album management
  - Profile management: edit name, email, change password
  - Albums management: view, create, edit, delete own albums
  - Album creation: form with auto-generated aliases and privacy settings
- **Access Control**: Owners can only manage albums they created
- **Role-based Interface**: Admin users see full admin panel, owners see simplified interface

### 5. Public UI
- Header shows site title (ml), optional logo, LanguageSelector (if >1 active)
- Home hero uses rotating gallery-leading photos, fancy styling, gradients/animations
- Albums page lists root albums in responsive grid using `AlbumCard`
  - **Access Control:** Shows all albums user has access to (public + private with permissions)
  - **Masonry Layout:** CSS columns for mixed landscape/portrait photo orientations
- Album details page shows children and photos with ml rendering
  - **Access Control:** API-level filtering based on user permissions
  - **Error Handling:** "Access Denied" for restricted albums
- **Search Page** (`/search`): Comprehensive search functionality
  - Search across photos, albums, people, and locations
  - Advanced filtering: tags, dates, storage provider, privacy settings
  - Multi-language search support
  - Sorting options: relevance, date, filename, size
  - Pagination support for large result sets
  - API: GET `/api/search` with comprehensive filtering

### 6. Template Customization
- Admin page `/admin/templates/customize`
- Settings: colors (primary, secondary, accent, background, text), typography, layout, effects
- API: GET/PUT `/api/admin/template-customization` (stored by `key: 'default'`)
- Hook: `useTemplateCustomization()` provides settings to components
- Components (Hero, AlbumCard) apply dynamic styles via CSS vars and helpers

### 7. API Summary
- Site Config: GET `/api/site-config`, admin GET/PUT `/api/admin/site-config`
- Groups: admin GET/POST `/api/admin/groups`, GET/PUT/DELETE `/api/admin/groups/:id`
- Users: admin GET/POST `/api/admin/users`, GET/PUT/DELETE `/api/admin/users/:id`
- Photos: GET/PUT/DELETE `/api/photos/:id`
- Albums: public GETs for listings/details with access control
  - GET `/api/albums` - lists albums with user access filtering
  - GET `/api/albums/by-alias/[alias]` - album details with access control
  - GET `/api/albums/by-alias/[alias]/photos` - album photos with access control
  - GET `/api/admin/albums/[id]/photos` - admin: get photos for cover selection
  - PUT `/api/admin/albums/[id]/cover-photo` - admin: set album cover photo
- Search: GET `/api/search` - comprehensive search across photos, albums, people, locations
- People: admin GET/POST `/api/admin/people`, GET/PUT/DELETE `/api/admin/people/:id`
- Locations: admin GET/POST `/api/admin/locations`, GET/PUT/DELETE `/api/admin/locations/:id`
- Tags: admin GET/POST `/api/admin/tags`, GET/PUT/DELETE `/api/admin/tags/:id`
- Bulk Operations: PUT `/api/photos/bulk-update` - bulk photo metadata updates
- Profile Management: owner GET/PUT `/api/auth/profile` - user profile and password management

### 8. Data Validation & Migrations
- Utilities migrate legacy string fields to multi-language objects
- APIs validate presence of admin post-changes; prevent last active admin removal
- Photo metadata validated as arrays/shape
- **Access Control:** Centralized in `src/lib/access-control.ts`
  - `checkAlbumAccess()` - validates user access to specific album
  - `buildAlbumAccessQuery()` - builds MongoDB query for album filtering
  - Handles both string and ObjectId formats for database compatibility

### 9. Error Handling
- JSON responses `{ success, data?, error? }`
- Clear admin UI errors, loading states, and empty states
- **Access Control Errors:** 403 responses for restricted albums
- **Translation Management:** Cleaned up duplicate keys in i18n files

### 10. Recent Updates
- **Access Control System:** Implemented comprehensive album access control
- **Cover Photo Selection:** Added admin interface for selecting album cover photos
- **UI Improvements:** Masonry layout, role-based redirects, visual indicators
- **Code Cleanup:** Removed duplicate translation keys, improved error handling
- **Database Compatibility:** Fixed ObjectId/string format handling across APIs
- **Owner User Case:** Implemented owner role with dedicated dashboard and album management
  - Owner dashboard with profile management and albums management
  - Album ownership tracking with `createdBy` field
  - Role-based access control for album editing and deletion
  - Profile management API for owners to edit information and change passwords
- **Profile Management:** Users can edit their profiles and change passwords
- **Role-Based Redirects:** Admin → `/admin`, Owner → `/owner`, Guest → `/`
- **Album Ownership:** Track who created each album, owners can only edit their own albums
- **Enhanced Security:** Improved access control validation and error handling
- **Advanced Search System:** Comprehensive search across photos, albums, people, and locations
  - Multi-language search support with filtering and sorting
  - Advanced search page with filters for tags, dates, storage providers
  - Search API with comprehensive filtering capabilities
- **People Management:** Complete people tagging and organization system
  - Multi-language person profiles with firstName, lastName, nickname, description
  - People admin interface with CRUD operations
  - Integration with photos for people tagging
- **Location Management:** Geospatial location tracking and organization
  - Location profiles with coordinates, addresses, and categories
  - Location admin interface with geospatial search
  - Integration with photos for location tagging
- **Enhanced Tag System:** Improved tag management with categories and usage tracking
  - Tag categories for better organization
  - Usage tracking across photos
  - Tag admin interface with bulk operations
- **Bulk Photo Operations:** Efficient management of multiple photos
  - Bulk metadata updates for tags, people, locations
  - Bulk actions component for admin interface
  - Enhanced photo management capabilities
