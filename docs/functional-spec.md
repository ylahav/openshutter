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
- Blocked users cannot authenticate
- On backend start, ensure at least one active admin must remain after updates/deletes
- **Access Control System:**
  - Public albums: visible to all users (logged in or anonymous)
  - Private albums: require authentication
    - If no `allowedUsers` and no `allowedGroups` (empty or not exist): every logged-in user can see
    - Otherwise: user must be in `allowedUsers` list OR belong to one of `allowedGroups`
  - Role-based redirection: admins → `/admin`, others → `/` (home page)

### 3. Entities
- SiteConfig: title (ml text), description (ml html), logo, languages (active, default), theme
- Album: name (ml text), description (ml html), cover image, alias, parent, counts, visibility, access control
  - `isPublic`: boolean (public/private)
  - `allowedUsers`: ObjectId[] (specific user access)
  - `allowedGroups`: string[] (group-based access)
  - `coverPhotoId`: ObjectId (selected cover photo)
- Photo: title (ml text), description (ml html), tags[], people[], location{name, coords, address}, flags
- User: name (ml text), username(email), passwordHash, role, groupAliases[], blocked
- Group: name (ml text), alias

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

### 5. Public UI
- Header shows site title (ml), optional logo, LanguageSelector (if >1 active)
- Home hero uses rotating gallery-leading photos, fancy styling, gradients/animations
- Albums page lists root albums in responsive grid using `AlbumCard`
  - **Access Control:** Shows all albums user has access to (public + private with permissions)
  - **Masonry Layout:** CSS columns for mixed landscape/portrait photo orientations
- Album details page shows children and photos with ml rendering
  - **Access Control:** API-level filtering based on user permissions
  - **Error Handling:** "Access Denied" for restricted albums

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
