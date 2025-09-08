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

### 3. Entities
- SiteConfig: title (ml text), description (ml html), logo, languages (active, default), theme
- Album: name (ml text), description (ml html), cover image, alias, parent, counts, visibility
- Photo: title (ml text), description (ml html), tags[], people[], location{name, coords, address}, flags
- User: name (ml text), username(email), passwordHash, role, groupAliases[], blocked
- Group: name (ml text), alias

### 4. Admin UI
- Site Config editor with multi-lang inputs and languages selection
- Users management: create/edit, block toggle, roles, groups
- Groups management: CRUD, name is multi-lang, alias immutable
- Albums admin: list, view, edit; multi-lang rendering with backward compatibility
- Photos admin: edit form uses `MultiLangInput`, `MultiLangHTMLEditor`, `PhotoMetadataEditor`

### 5. Public UI
- Header shows site title (ml), optional logo, LanguageSelector (if >1 active)
- Home hero uses rotating gallery-leading photos, fancy styling, gradients/animations
- Albums page lists root albums in responsive grid using `AlbumCard`
- Album details page shows children and photos with ml rendering

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
- Albums: public GETs for listings/details (existing)

### 8. Data Validation & Migrations
- Utilities migrate legacy string fields to multi-language objects
- APIs validate presence of admin post-changes; prevent last active admin removal
- Photo metadata validated as arrays/shape

### 9. Error Handling
- JSON responses `{ success, data?, error? }`
- Clear admin UI errors, loading states, and empty states
