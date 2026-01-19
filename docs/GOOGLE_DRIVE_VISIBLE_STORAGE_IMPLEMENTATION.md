# Google Drive Visible Storage Implementation Summary

## ✅ Implementation Complete

All backend and frontend changes have been implemented to support both AppData (hidden) and visible storage types for Google Drive.

### Changes Made

1. **GoogleDriveService** (`backend/src/services/storage/providers/google-drive.ts`)
   - Added `getRootFolderId()` method that supports both storage types
   - Added `isAppDataStorage()` helper method
   - Updated all Drive API calls to conditionally use `spaces: 'appDataFolder'` only for AppData storage
   - Updated validation to handle both storage types

2. **Storage Config** (`backend/src/services/storage/config.ts`)
   - Added `storageType: 'appdata'` to default Google Drive config
   - Supports `'appdata'` (hidden) or `'visible'` (user sees files)

3. **OAuth URL Endpoint** (`backend/src/storage/storage-admin.controller.ts`)
   - New endpoint: `GET /api/admin/storage/google-drive/auth-url`
   - Parameters:
     - `clientId` (required): OAuth client ID
     - `redirectUri` (required): OAuth redirect URI
     - `storageType` (optional): `'appdata'` or `'visible'` (defaults to `'appdata'`)
   - Returns:
     ```json
     {
       "success": true,
       "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
       "scope": "https://www.googleapis.com/auth/drive.file",
       "storageType": "visible"
     }
     ```

4. **Types** (`backend/src/services/storage/types.ts`)
   - Added `storageType?: 'appdata' | 'visible'` to `GoogleDriveConfig` interface

### API Endpoints

#### Generate OAuth URL
```
GET /api/admin/storage/google-drive/auth-url?clientId=...&redirectUri=...&storageType=visible
```

#### Update Storage Config
```
PUT /api/admin/storage/google-drive
Body: {
  config: {
    clientId: "...",
    clientSecret: "...",
    refreshToken: "...",
    folderId: "...",  // Optional, defaults to 'root' for visible storage
    storageType: "visible"  // or "appdata"
  },
  isEnabled: true
}
```

## ✅ Frontend Implementation Complete

The frontend storage configuration page (`/admin/storage`) has been implemented with the following features:

### Required UI Elements

1. **Storage Type Selector**
   ```svelte
   <div>
     <label>Storage Type</label>
     <select bind:value={storageType}>
       <option value="appdata">Hidden (AppData Folder)</option>
       <option value="visible">Visible in User's Drive</option>
     </select>
     <p class="help-text">
       {#if storageType === 'appdata'}
         Files will be hidden from users in AppData folder
       {:else}
         Files will be visible in user's Google Drive
       {/if}
     </p>
   </div>
   ```

2. **OAuth URL Generation**
   ```typescript
   async function generateAuthUrl() {
     const response = await fetch(
       `/api/admin/storage/google-drive/auth-url?clientId=${clientId}&redirectUri=${redirectUri}&storageType=${storageType}`
     );
     const data = await response.json();
     if (data.success) {
       window.location.href = data.authUrl;
     }
   }
   ```

3. **Config Form Fields**
   - Client ID
   - Client Secret
   - Refresh Token (obtained via OAuth flow)
   - Folder ID (optional, only shown for visible storage)
   - Storage Type (dropdown: appdata/visible)
   - Enable/Disable toggle

### Implementation Complete

1. ✅ Storage configuration page exists at `/frontend/src/routes/admin/storage/+page.svelte`
2. ✅ Tabs for each storage provider (Google Drive, AWS S3, Backblaze, Wasabi, Local)
3. ✅ Google Drive tab includes:
   - Storage type selector (dropdown: Hidden/Visible)
   - OAuth URL generation uses new endpoint with `storageType` parameter
   - Folder ID field shown only when `storageType === 'visible'`
   - Save handler includes `storageType` in config
   - Help text explaining the difference between storage types
4. ✅ OAuth callback route configured (`/api/auth/google/callback`)
5. ✅ Vite proxy configured to bypass Google OAuth routes
6. ✅ Nested config structure prevention and cleanup implemented

### Frontend Implementation Details

The frontend implementation includes:

- **Storage Type Selector**: Dropdown to choose between "Hidden (AppData Folder)" and "Visible in User's Drive"
- **Conditional Folder ID Field**: Only shown when storage type is "visible"
- **OAuth Flow Integration**: 
  - Uses `/api/admin/storage/google-drive/auth-url` endpoint to generate OAuth URL with correct scope
  - Opens OAuth popup window
  - Receives authorization code via `postMessage` from callback page
  - Exchanges code for refresh token using `/api/auth/google/token` endpoint
  - Automatically updates configuration with new refresh token
- **Real-time UI Updates**: Storage type changes update the UI immediately
- **Help Text**: Dynamic help text explaining the selected storage type
- **Error Handling**: Comprehensive error handling with user-friendly messages

### OAuth Callback Route

The OAuth callback route (`/api/auth/google/callback`) is implemented as a SvelteKit server route that:
- Receives the authorization code from Google
- Sends it to the parent window via `postMessage`
- Closes the popup window automatically
- Handles errors gracefully

**Important**: The Vite proxy configuration must bypass `/api/auth/google/` routes to allow SvelteKit to handle them. This is configured in `vite.config.ts`.

## 🔄 Migration Notes

### For Existing Installations

- **Default behavior**: Existing configs will continue using AppData (hidden) storage
- **No breaking changes**: The `storageType` field is optional and defaults to `'appdata'`
- **Switching to visible**: Users need to:
  1. Go to `/admin/storage` in the admin dashboard
  2. Expand Google Drive configuration
  3. Change "Storage Type" from "Hidden (AppData Folder)" to "Visible in User's Drive"
  4. Click "Generate New Token" to re-authorize with new scope (`drive.file` instead of `drive.appdata`)
  5. Complete the OAuth flow
  6. Optionally specify a Folder ID to organize files in a specific folder
  7. Test the connection to verify everything works

### Data Structure Cleanup

If you encounter nested `config.config` structures in your database (from previous versions), you can:

1. **Use the cleanup endpoint**: `POST /api/admin/storage/cleanup`
   - This will automatically flatten any nested config structures
   - Safe to run multiple times

2. **Auto-fix on next update**: The system will automatically flatten nested structures when you update any storage configuration

3. **Manual MongoDB cleanup** (if needed):
   ```javascript
   db.storage_configs.updateMany(
     { "config.config": { $exists: true } },
     [
       { $set: { config: { $mergeObjects: ["$config", "$config.config"] } } },
       { $unset: "config.config" }
     ]
   )
   ```

### Scope Changes

- **AppData storage**: Uses `https://www.googleapis.com/auth/drive.appdata` scope
- **Visible storage**: Uses `https://www.googleapis.com/auth/drive.file` scope

**Important**: When switching storage types, users must re-authorize because the OAuth scopes are different.

## ✅ Testing Checklist

- [x] Test AppData storage (default, hidden files)
- [x] Test visible storage with root folder
- [x] Test visible storage with specific folder ID
- [x] Test OAuth URL generation for both storage types
- [x] Test validation for both storage types
- [x] Test file uploads with both storage types
- [x] Verify files are visible/hidden as expected in Google Drive
- [x] Test storage type toggle in admin UI
- [x] Test OAuth callback flow
- [x] Test nested config structure prevention

## 🔧 Technical Notes

### Vite Proxy Configuration

The frontend Vite proxy must be configured to bypass Google OAuth routes so SvelteKit can handle them:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: BACKEND_URL,
    bypass: (req) => {
      const url = req.url || '';
      if (url.startsWith('/api/auth/google/')) {
        return req.url; // Let SvelteKit handle it
      }
      return null; // Proxy to backend
    }
  }
}
```

This ensures that `/api/auth/google/callback` and `/api/auth/google/token` are handled by SvelteKit routes, not proxied to the backend.

### Nested Config Prevention

The system includes automatic prevention and cleanup of nested `config.config` structures:
- Frontend: Filters out nested config properties before sending
- Backend Controller: Recursively flattens nested structures
- Backend Service: Flattens configs when reading from database
- Cleanup Endpoint: Available at `POST /api/admin/storage/cleanup`

## 📚 Related Documentation

- [Google Drive Auth Options](./GOOGLE_DRIVE_AUTH_OPTIONS.md) - Detailed explanation of authentication methods
- [Storage Configuration](./STORAGE.md) - General storage configuration guide
- [Admin Setup Guide](./ADMIN_SETUP.md) - Initial admin configuration
