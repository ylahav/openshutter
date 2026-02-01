# Owner Dashboard Documentation

## Overview

The Owner Dashboard provides a focused interface for users with the 'owner' role to manage their photo albums and personal profile without access to system administration features. This dashboard is designed to be simple, intuitive, and focused on core album management tasks.

## Access Control

### Role Requirements
- Users must have `role: 'owner'` or `role: 'admin'`
- Protected by `OwnerGuard` component
- Automatic redirect to `/owner` after login for owner users
- Admin users can access both `/admin` and `/owner` dashboards
- Guest users are redirected to home page (`/`) after login

### Album Access
- **Own Albums**: Can create, edit, and delete albums they created (`createdBy` field matches user ID)
- **Public Albums**: Can view all public albums
- **Granted Access**: Can view albums where they are in `allowedUsers` or belong to `allowedGroups`

## Dashboard Features

### 1. Profile Management (`/owner/profile`)

#### Capabilities
- Edit personal information (name, email)
- Change password with current password verification
- View account information (role, member since date)

#### Form Fields
- **Name**: User's display name
- **Email**: User's email address (used for login)
- **Current Password**: Required when changing password
- **New Password**: New password (minimum 6 characters)
- **Confirm Password**: Password confirmation

#### API Endpoints
- `GET /api/auth/profile` - Retrieve user profile
- `PUT /api/auth/profile` - Update profile and password

#### Security Features
- Current password verification for password changes
- Password hashing and secure storage
- Session update after profile changes
- Input validation and error handling

### 2. Albums Management (`/owner/albums`)

#### Capabilities
- View all accessible albums (own + public + granted access)
- Create new albums with auto-generated aliases
- Edit own albums only
- Delete own albums only
- Set album privacy and featured status

#### Album Cards Display
- Cover photo thumbnail
- Album name and description
- Photo count and creation date
- Privacy status (public/private)
- Featured status indicator
- Action buttons (view, edit, delete)

#### Album Creation (`/owner/albums/new`)

##### Form Fields
- **Album Name**: Required, used to auto-generate alias
- **Alias**: Auto-generated from name, URL-friendly identifier
- **Description**: Optional album description
- **Make Public**: Checkbox to set album visibility
- **Make Featured**: Checkbox to highlight album on homepage

##### Features
- Real-time alias generation from album name
- Form validation and error handling
- Privacy settings configuration
- Auto-redirect to albums list after creation

#### Album Editing
- Same form as creation
- Pre-populated with existing data
- Only accessible for albums created by the user
- Updates album information and settings

#### Album Deletion
- Confirmation dialog before deletion
- Only accessible for albums created by the user
- Removes album and all associated data

### 3. Photo Management (Own Albums)

#### Capabilities
- **Upload photos** (`/owner/albums/[id]` → Upload, or `/admin/photos/upload?albumId=...&returnTo=/owner/albums`): Upload photos into albums the owner created.
- **Edit photo** (`/owner/photos/[id]/edit`): Edit metadata (title, description, tags, people, location, EXIF overrides), publish state, and regenerate thumbnails or re-extract EXIF. Only photos in albums created by the owner are accessible.
- **Delete photo**: From the album detail page, delete a photo (with confirmation). Only photos in own albums.

#### Owner Photo Edit Page
- **URL**: `/owner/photos/[id]/edit` (owners use this; admins use `/admin/photos/[id]/edit`).
- **Navigation**: From `/owner/albums/[id]`, click "Edit" on a photo to open the owner photo edit page.
- **Back / Cancel**: Links return to `/owner/albums` or the album.
- **Backend**: Same admin photo APIs (`GET/PUT/DELETE /api/admin/photos/:id`, etc.) are used; backend enforces that the photo’s album was created by the owner (AdminOrOwnerGuard + ownership checks).

#### API Endpoints (owner access enforced by backend)
- `GET /api/admin/photos/:id` - Get photo (owner: only if album.createdBy === user.id)
- `PUT /api/admin/photos/:id` - Update photo (owner: same check)
- `DELETE /api/admin/photos/:id` - Delete photo (owner: same check)
- `POST /api/admin/photos/:id/regenerate-thumbnails` - Regenerate thumbnails (owner: same check)
- `POST /api/admin/photos/:id/re-extract-exif` - Re-extract EXIF (owner: same check)
- `POST /api/admin/photos/bulk/re-extract-exif` - Bulk re-extract EXIF (admin only in UI; backend allows owner for own album photos)
- `POST /api/admin/photos/bulk/regenerate-thumbnails` - Bulk regenerate thumbnails (admin only in UI; backend allows owner for own album photos)
- `GET /api/admin/albums`, `GET/PUT/DELETE /api/admin/albums/:id`, etc. - Album management (owner: filtered to own albums)

## User Interface

### Design Principles
- **Focused**: Only shows relevant features for album management
- **Simple**: Clean, uncluttered interface
- **Intuitive**: Clear navigation and action buttons
- **Responsive**: Works on all device sizes

### Navigation
- **Header**: Site title, logo, logout button
- **Dashboard**: Overview cards for profile and albums
- **Breadcrumbs**: Clear navigation path
- **Action Buttons**: Prominent call-to-action buttons

### Visual Elements
- **Cards**: Album and feature cards with consistent styling
- **Icons**: Meaningful icons for different actions
- **Status Indicators**: Visual indicators for privacy and featured status
- **Loading States**: Spinners and progress indicators
- **Error Messages**: Clear error and success messages

## API Integration

### Album Operations
```typescript
// Create album
POST /api/albums
{
  name: string,
  alias: string,
  description?: string,
  isPublic: boolean,
  isFeatured: boolean,
  createdBy: string // Set automatically
}

// Update album (only if owner)
PUT /api/albums/[id]
{
  name: string,
  alias: string,
  description?: string,
  isPublic: boolean,
  isFeatured: boolean
}

// Delete album (only if owner)
DELETE /api/albums/[id]
```

### Profile Operations
```typescript
// Get profile
GET /api/auth/profile
// Returns: { user: { _id, name, email, role, createdAt, updatedAt } }

// Update profile
PUT /api/auth/profile
{
  name: string,
  email: string,
  currentPassword?: string, // Required if changing password
  newPassword?: string      // Required if changing password
}
```

## Security Considerations

### Access Control
- Server-side validation of album ownership
- Role-based route protection
- Session-based authentication
- Password verification for sensitive operations

### Data Protection
- Secure password hashing
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Error Handling
- Graceful error handling
- User-friendly error messages
- No sensitive information in error responses
- Proper HTTP status codes

## Internationalization

### Supported Languages
- English (default)
- Hebrew (RTL support)
- Extensible to additional languages

### Translation Keys
All UI text uses translation keys from `src/i18n/en.json`:
- `owner.*` - Owner-specific translations
- `admin.*` - Shared admin/owner translations
- `common.*` - Common UI elements

### RTL Support
- Automatic layout direction switching
- RTL-specific styling
- Proper text alignment and icon positioning

## Performance Considerations

### Loading States
- Skeleton loaders for album cards
- Progress indicators for form submissions
- Optimistic UI updates where appropriate

### Data Fetching
- Efficient API calls
- Proper error handling
- Loading state management
- Caching where appropriate

### Image Optimization
- Thumbnail generation for album covers
- Lazy loading for large image sets
- Responsive image sizing

## Testing

### Unit Tests
- Component rendering tests
- Form validation tests
- API integration tests
- Access control tests

### Integration Tests
- End-to-end user flows
- Role-based access testing
- Error handling scenarios
- Cross-browser compatibility

### Manual Testing
- User role verification
- Album ownership testing
- Profile management flows
- Error scenario handling

## Troubleshooting

### Common Issues

#### Albums Not Showing
- Check user authentication status
- Verify album access permissions
- Check for JavaScript errors in console
- Verify API endpoint responses

#### Profile Update Failures
- Verify current password is correct
- Check password strength requirements
- Ensure all required fields are filled
- Check for network connectivity issues

#### Permission Denied Errors
- Verify user has owner role
- Check album ownership (`createdBy` field)
- Ensure proper authentication
- Check session validity

### Debug Tools
- Browser developer tools
- Network tab for API calls
- Console for JavaScript errors
- Server-side logging

## Future Enhancements

### Planned Features
- Album sharing and collaboration
- Advanced album settings
- Bulk operations
- Album templates
- Export functionality

### Implemented (Owner Management)
- **Photo upload and management**: Owners can upload photos to their albums, edit photos at `/owner/photos/[id]/edit` (metadata, thumbnails, EXIF), and delete photos from the album detail page. Backend enforces ownership via AdminOrOwnerGuard and album.createdBy checks.

### Potential Improvements
- Drag-and-drop album reordering
- Advanced search and filtering
- Album analytics
- Mobile app integration
- Offline support

## Conclusion

The Owner Dashboard provides a focused, user-friendly interface for album owners to manage their photo collections effectively. With proper access control, security measures, and intuitive design, it enables users to organize their photos without the complexity of system administration features.
