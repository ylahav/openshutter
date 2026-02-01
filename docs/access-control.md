# Access Control System

OpenShutter implements a comprehensive access control system for managing album visibility and user permissions.

## Overview

The access control system determines which albums users can view based on their authentication status, role, and specific permissions.

## Album Access Levels

### 1. Public Albums
- **Visibility**: All users (logged in or anonymous)
- **Configuration**: `isPublic: true`
- **Use Case**: General galleries, public photo collections

### 2. Private Albums
- **Visibility**: Requires authentication
- **Configuration**: `isPublic: false`

#### 2.1 Open Private Albums
- **Access**: All logged-in users
- **Configuration**: `isPublic: false` with no `allowedUsers` or `allowedGroups`
- **Use Case**: Internal galleries for authenticated users

#### 2.2 Restricted Private Albums
- **Access**: Specific users or groups only
- **Configuration**: `isPublic: false` with `allowedUsers` and/or `allowedGroups`
- **Use Case**: Family albums, team galleries, confidential collections

## User Roles

### Admin
- **Access**: Full system access
- **Redirect**: `/admin` after login
- **Capabilities**: All album management, user management, system configuration

### Owner
- **Access**: Own albums + public albums + albums with user/group access
- **Redirect**: `/owner` (owner dashboard) after login
- **Capabilities**: 
  - Create, edit, and delete own albums
  - Upload and manage photos in own albums
  - Edit profile and change password
  - View public albums and albums with granted access
  - Access owner dashboard with focused interface

### Guest
- **Access**: Based on album permissions
- **Redirect**: `/` (home page) after login
- **Capabilities**: View permitted albums and photos

## Database Schema

### Album Model
```typescript
{
  _id: ObjectId,
  name: MultiLangText,
  description: MultiLangHTML,
  alias: string,
  isPublic: boolean,
  allowedUsers: ObjectId[], // Array of user IDs
  allowedGroups: string[],  // Array of group aliases
  createdBy: string,        // User ID who created the album
  coverPhotoId: ObjectId,   // Selected cover photo
  // ... other fields
}
```

### User Model
```typescript
{
  _id: ObjectId,
  email: string,
  role: 'admin' | 'owner' | 'guest',
  groupAliases: string[], // Groups user belongs to
  // ... other fields
}
```

### Group Model
```typescript
{
  _id: ObjectId,
  alias: string,
  name: MultiLangText,
  // ... other fields
}
```

## Access Control Logic

### 1. Public Albums
```typescript
// Always visible
const publicAlbums = albums.filter(album => album.isPublic === true)
```

### 2. Private Albums
```typescript
// For logged-in users only
const privateAlbums = albums.filter(album => {
  if (album.isPublic === true) return false
  
  // Open private albums (no restrictions)
  if (!album.allowedUsers?.length && !album.allowedGroups?.length) {
    return true // All logged-in users can see
  }
  
  // Restricted private albums
  const hasUserAccess = album.allowedUsers?.includes(user._id)
  const hasGroupAccess = album.allowedGroups?.some(group => 
    user.groupAliases?.includes(group)
  )
  
  return hasUserAccess || hasGroupAccess
})
```

## API Implementation

### Centralized Access Control
Location: `src/lib/access-control.ts`

#### Functions
- `checkAlbumAccess(album, user)`: Validates user access to specific album
- `buildAlbumAccessQuery(user)`: Builds MongoDB query for album filtering
- `canCreateAlbums(user)`: Checks if user can create albums
- `canEditAlbum(album, user)`: Checks if user can edit specific album
- `canDeleteAlbum(album, user)`: Checks if user can delete specific album

#### Usage
```typescript
// Check single album access
const hasAccess = await checkAlbumAccess(album, user)

// Build query for album listing
const query = buildAlbumAccessQuery(user)
const albums = await db.collection('albums').find(query).toArray()
```

### API Endpoints

#### Public Endpoints
- `GET /api/albums` - Lists albums with access control
- `GET /api/albums/by-alias/[alias]` - Album details with access control
- `GET /api/albums/by-alias/[alias]/photos` - Album photos with access control

#### Admin Endpoints
- `GET /api/admin/albums/[id]/photos` - Get photos for cover selection
- `PUT /api/admin/albums/[id]/cover-photo` - Set album cover photo

## Frontend Implementation

### Role-Based Redirects
Location: `src/app/login/page.tsx`

```typescript
useEffect(() => {
  if (session?.user) {
    if (session.user.role === 'admin') {
      router.push('/admin')
    } else if (session.user.role === 'owner') {
      router.push('/owner')
    } else {
      router.push('/')
    }
  }
}, [session, router])
```

### Access Control in Components
- **Home Page**: Shows all accessible albums
- **Album Pages**: Displays "Access Denied" for restricted albums
- **Admin Interface**: Full access for admin users
- **Owner Interface**: Access to own albums + public albums + granted access albums

## Owner Dashboard

### Overview
The Owner Dashboard (`/owner`) provides a focused interface for album owners to manage their photo collections without access to system administration features.

### Features
- **Profile Management** (`/owner/profile`): Edit personal information and change password
- **Albums Management** (`/owner/albums`): View, create, edit, and delete own albums
- **Album Creation** (`/owner/albums/new`): Create new albums with privacy settings

### Access Control
- Owners can only edit/delete albums they created (`createdBy` field matches user ID)
- Owners can view all public albums and albums with granted access
- Owners cannot access admin-only features (user management, system configuration, etc.)

### API Endpoints
- `GET /api/auth/profile` - Get user profile information
- `PUT /api/auth/profile` - Update user profile and password
- `GET /api/albums` - List accessible albums (filtered by ownership and permissions)
- `POST /api/albums` - Create new album (sets `createdBy` field)
- `PUT /api/albums/[id]` - Update album (only if owner)
- `DELETE /api/albums/[id]` - Delete album (only if owner)

### Owner Management (AdminOrOwnerGuard)
Owners can manage **their own** albums and photos using the same backend APIs as admins, with ownership enforced server-side:

- **Backend**: `AdminOrOwnerGuard` allows both `admin` and `owner` roles. Controllers (`AlbumsAdminController`, `PhotosAdminController`) enforce ownership: owners may only access albums/photos where `album.createdBy === user.id`.
- **Admin album APIs** (`/api/admin/albums/*`): Owners can call these; backend filters album list to own albums and checks ownership on get/update/delete/reorder.
- **Admin photo APIs** (`/api/admin/photos/:id`, PUT, DELETE, regenerate-thumbnails, re-extract-exif; bulk/re-extract-exif, bulk/regenerate-thumbnails, bulk/regenerate-thumbnails-stream): Owners can call these; backend verifies the photo’s album was created by the owner before allowing access.
- **Frontend**: Owner album management uses `/owner/albums` and `/owner/albums/[id]`; photo edit uses **`/owner/photos/[id]/edit`** (not `/admin/photos/[id]/edit`). Photo edit page loads photo server-side when possible and falls back to client fetch with credentials.

## Error Handling

### Access Denied
- **HTTP Status**: 403 Forbidden
- **Response**: `{ success: false, error: 'Access denied' }`
- **UI Display**: "Access Denied" message

### Authentication Required
- **HTTP Status**: 401 Unauthorized
- **Response**: `{ success: false, error: 'Authentication required' }`
- **UI Display**: Redirect to login page

## Security Considerations

### 1. Server-Side Validation
- All access control logic implemented on the server
- Client-side filtering is supplementary only
- API endpoints enforce access control

### 2. Database Queries
- Access control integrated into MongoDB queries
- No client-side filtering of sensitive data
- Efficient querying with proper indexing

### 3. Session Management
- User roles and groups stored in session
- Session validation on each request
- Secure session handling with NextAuth.js

## Testing

### Test Script
Location: `src/scripts/test-access-control.js`

The test script creates test users, groups, and albums with various access configurations to verify the access control system works correctly.

### Test Scenarios
1. **Anonymous User**: Can only see public albums
2. **Logged-in User**: Can see public + open private albums
3. **Group Member**: Can see albums with group access
4. **Specific User**: Can see albums with user access
5. **Admin User**: Can see all albums

## Migration Notes

### Database Compatibility
- Handles both string and ObjectId formats for `albumId` and `parentAlbumId`
- Backward compatibility with existing data
- Graceful handling of missing access control fields

### Translation Files
- Cleaned up duplicate keys in i18n files
- Consistent translation structure
- No linting errors

## Best Practices

### 1. Album Configuration
- Use public albums for general content
- Use open private albums for internal content
- Use restricted private albums for sensitive content

### 2. User Management
- Assign users to appropriate groups
- Use specific user access for individual permissions
- Regularly review and update permissions

### 3. Security
- Never rely on client-side access control alone
- Always validate permissions on the server
- Log access attempts for security monitoring

## Troubleshooting

### Common Issues

#### 1. Albums Not Showing
- Check if user is logged in
- Verify album access permissions
- Check user group memberships

#### 2. Access Denied Errors
- Verify album is not restricted
- Check user permissions
- Ensure proper authentication

#### 3. Database Errors
- Check ObjectId format compatibility
- Verify database connection
- Check query syntax

### Debug Tools
- Access control test script
- MongoDB query logging
- Browser developer tools
- Server-side logging

## Implementation Status (Roles & Groups)

### Done
- **User roles**: Admin, Owner, Guest; JWT includes role; AdminGuard (admin only), AdminOrOwnerGuard (admin or owner for album/photo management), OptionalAdminGuard (optional auth for public album APIs).
- **Role-based redirect**: After login, admin → `/admin`, owner → `/owner`, guest → `/`.
- **Route protection**: `/admin` requires admin (owners allowed for albums and photo upload/edit); `/owner` requires owner or admin.
- **Groups**: CRUD in admin; User has `groupAliases[]`; assign groups in user edit.
- **Album access (backend)**:
  - Visitors: only public AND unrestricted albums.
  - Logged-in: public unrestricted OR open private (private, no restrictions) OR creator OR in `allowedUsers` OR in `allowedGroups`. Restricted albums only for creator/allowed users/groups.
- **Album edit UI (admin)**: Restrict access section with allowedGroups and allowedUsers; list shows Group/Users badges.
- **Public album APIs**: Forward cookies so backend can apply group/user access (guest sees group albums).
- **Frontend access helpers**: `canCreateAlbums`, `canEditAlbum`, `canDeleteAlbum` (admin or owner-own-album).
- **Owner management**: Owner album management at `/owner/albums`; owner photo edit at `/owner/photos/[id]/edit`. Backend `AlbumsAdminController` and `PhotosAdminController` use AdminOrOwnerGuard and enforce ownership (album.createdBy / photo’s album.createdBy === user.id). Frontend admin album/photo API routes allow owner role; backend enforces ownership.

### Optional / To Verify
- **Access control doc**: `src/lib/access-control.ts` in docs refers to `checkAlbumAccess` / `buildAlbumAccessQuery`; actual logic lives in backend `AlbumsService.buildVisibilityCondition` and `canAccessAlbum`. Update docs or add thin server helpers if you want a single place in the frontend.
