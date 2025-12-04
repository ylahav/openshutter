# API Migration Test Plan

## Overview
This document tracks testing of the newly migrated SvelteKit API routes and removal of old Next.js routes.

## Migrated Routes

### ✅ Admin Tags API (`/api/admin/tags`)
- **GET** `/api/admin/tags` - List all tags (admin only)
- **POST** `/api/admin/tags` - Create new tag
- **GET** `/api/admin/tags/[id]` - Get tag by ID
- **PUT** `/api/admin/tags/[id]` - Update tag
- **DELETE** `/api/admin/tags/[id]` - Delete tag

**Status**: ✅ Created in SvelteKit format
**Old Next.js Route**: ❌ Never existed (new route)

### ✅ Admin People API (`/api/admin/people`)
- **GET** `/api/admin/people` - List all people (admin only)
- **POST** `/api/admin/people` - Create new person
- **GET** `/api/admin/people/[id]` - Get person by ID
- **PUT** `/api/admin/people/[id]` - Update person
- **DELETE** `/api/admin/people/[id]` - Delete person

**Status**: ✅ Created in SvelteKit format
**Old Next.js Route**: ❌ Never existed (new route)

### ✅ Admin Locations API (`/api/admin/locations`)
- **GET** `/api/admin/locations` - List all locations (admin only)
- **POST** `/api/admin/locations` - Create new location
- **GET** `/api/admin/locations/[id]` - Get location by ID
- **PUT** `/api/admin/locations/[id]` - Update location
- **DELETE** `/api/admin/locations/[id]` - Delete location

**Status**: ✅ Created in SvelteKit format
**Old Next.js Route**: ❌ Never existed (new route)

## Testing Checklist

### Admin Tags Page (`/admin/tags`)
- [ ] Load tags list (GET `/api/admin/tags`)
- [ ] Create new tag (POST `/api/admin/tags`)
- [ ] Edit existing tag (PUT `/api/admin/tags/[id]`)
- [ ] Delete tag (DELETE `/api/admin/tags/[id]`)
- [ ] Search/filter tags
- [ ] Verify admin authentication required

### Admin People Page (`/admin/people`)
- [ ] Load people list (GET `/api/admin/people`)
- [ ] Create new person (POST `/api/admin/people`)
- [ ] Edit existing person (PUT `/api/admin/people/[id]`)
- [ ] Delete person (DELETE `/api/admin/people/[id]`)
- [ ] Search/filter people
- [ ] Multi-language fields (firstName, lastName, nickname, description)
- [ ] Tags association
- [ ] Verify admin authentication required

### Admin Locations Page (`/admin/locations`)
- [ ] Load locations list (GET `/api/admin/locations`)
- [ ] Create new location (POST `/api/admin/locations`)
- [ ] Edit existing location (PUT `/api/admin/locations/[id]`)
- [ ] Delete location (DELETE `/api/admin/locations/[id]`)
- [ ] Search/filter locations
- [ ] Multi-language fields (name, description)
- [ ] Address fields (city, country, etc.)
- [ ] Verify admin authentication required

## Public Routes (Keep These)
These routes are still used by public pages and should remain:
- `/api/tags` - Public tags API (with public filtering)
- `/api/people` - Public people API (with public filtering)
- `/api/locations` - Public locations API (with public filtering)

## Notes
- All admin routes require `locals.user.role === 'admin'`
- Admin routes show ALL data (no public filtering)
- Response format: `{ success: true, data: [...] }` or `{ success: false, error: "..." }`
- The admin routes we created are NEW - they never existed in Next.js format
- Frontend pages have been updated to handle wrapped response format (`responseData.data || responseData`)

## Important: No Old Routes to Remove!
**The admin API routes (`/api/admin/tags`, `/api/admin/people`, `/api/admin/locations`) never existed in Next.js format.** They are brand new routes we created.

**Public routes to keep:**
- `/api/tags` - Used by public pages (with public filtering)
- `/api/people` - Used by public pages (with public filtering)
- `/api/locations` - Used by public pages (with public filtering)

These public routes should remain as Next.js routes until the public pages are migrated.

## Testing Instructions

### Quick Test Checklist
1. **Start the dev server**: `pnpm dev`
2. **Login as admin**: Navigate to `/login` and login with admin credentials
3. **Test Tags**:
   - Go to `/admin/tags`
   - Create a new tag
   - Edit an existing tag
   - Delete a tag
   - Verify all operations work
4. **Test People**:
   - Go to `/admin/people`
   - Create a new person (with multi-language fields)
   - Edit an existing person
   - Delete a person
   - Verify tags association works
   - Verify multi-language fields work
5. **Test Locations**:
   - Go to `/admin/locations`
   - Create a new location
   - Edit an existing location
   - Delete a location
   - Verify address fields work

### Expected Behavior
- All CRUD operations should work without errors
- Response should be in format: `{ success: true, data: {...} }`
- Error responses: `{ success: false, error: "..." }`
- Admin authentication should be enforced (non-admins get 401)
- All data should be visible (no public filtering)

## Next Steps After Testing
1. ✅ Verify all CRUD operations work
2. ✅ Verify authentication works correctly
3. ✅ Verify response formats match frontend expectations
4. ✅ Document any issues found
5. Once confirmed working, mark routes as production-ready

