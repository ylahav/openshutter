# Google Drive Authentication Options

This document explains different authentication methods for Google Drive integration and how to make files visible in the user's Drive.

## Current Implementation: OAuth 2.0 with AppData Folder

**Current Setup:**
- Uses `appDataFolder` (hidden from users)
- Scope: `https://www.googleapis.com/auth/drive.appdata`
- Files are **not visible** in the user's Google Drive interface
- Best for: Applications that want to hide storage from users

## Option 1: Make Files Visible in User's Drive

If you want users to see files in their Google Drive, you need to:

### Changes Required

#### 1. Update OAuth Scopes

Change from AppData scope to regular Drive scope:

**Current (Hidden):**
```
https://www.googleapis.com/auth/drive.appdata
```

**New (Visible):**
```
https://www.googleapis.com/auth/drive.file
```
or for full access:
```
https://www.googleapis.com/auth/drive
```

#### 2. Modify Google Drive Service

Update `backend/src/services/storage/providers/google-drive.ts`:

```typescript
// OLD: Uses hidden AppData folder
private getRootFolderId(): string {
  return 'appDataFolder'
}

// NEW: Use configured folder ID or create a visible folder
private getRootFolderId(): string {
  // Use folderId from config if provided
  if (this.config.folderId && this.config.folderId !== 'appDataFolder') {
    return this.config.folderId
  }
  
  // Fallback: Use root of user's Drive (visible)
  return 'root'
}
```

#### 3. Remove AppData-Specific Code

Remove all `spaces: 'appDataFolder'` parameters from API calls:

```typescript
// OLD
await this.drive.files.list({
  q: `'${folderId}' in parents and trashed=false`,
  spaces: 'appDataFolder',  // Remove this
  fields: 'files(id)'
})

// NEW
await this.drive.files.list({
  q: `'${folderId}' in parents and trashed=false`,
  fields: 'files(id)'
})
```

#### 4. Update Authorization URL Generation

When generating the OAuth URL, use the new scope:

```typescript
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/drive.file',  // For app-created files
    // OR
    // 'https://www.googleapis.com/auth/drive'  // For full Drive access
  ],
  redirect_uri: redirectUri
})
```

### Pros and Cons

**Pros:**
- ✅ Users can see files in their Drive
- ✅ Users can manually manage files
- ✅ Better for transparency
- ✅ Users can access files directly from Drive

**Cons:**
- ⚠️ Users might accidentally delete files
- ⚠️ Files count against user's storage quota
- ⚠️ Requires re-authorization with new scopes
- ⚠️ Users see all app-created files

### Implementation Steps

1. **Update OAuth Scopes** in authorization URL generation
2. **Modify `getRootFolderId()`** to use `folderId` from config or `'root'`
3. **Remove `spaces: 'appDataFolder'`** from all Drive API calls
4. **Update validation** to check regular Drive access instead of AppData
5. **Re-authorize** users with new scopes (old tokens won't work)
6. **Migrate existing files** from AppData to regular folder (optional)

---

## Option 2: Service Account Authentication

Service Accounts are for server-to-server communication without user interaction.

### How Service Accounts Work

1. **Create Service Account** in Google Cloud Console
2. **Download JSON Key** file
3. **Use Service Account Email** as the authenticated user
4. **No OAuth flow** required

### Implementation

```typescript
import { google } from 'googleapis';
import { readFileSync } from 'fs';

// Load service account key
const serviceAccountKey = JSON.parse(
  readFileSync('path/to/service-account-key.json', 'utf8')
);

// Authenticate with service account
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });
```

### Accessing User's Drive with Service Account

**Problem:** Service accounts have their own Drive space, not the user's Drive.

**Solutions:**

#### Option A: Domain-Wide Delegation (Google Workspace Only)

For Google Workspace domains, you can impersonate users:

```typescript
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
  subject: 'user@example.com'  // Impersonate this user
});
```

**Limitations:**
- Only works with Google Workspace (not personal Gmail)
- Requires domain admin to enable domain-wide delegation
- More complex setup

#### Option B: Share Folder with Service Account

1. User creates a folder in their Drive
2. User shares folder with service account email
3. Service account accesses shared folder

**Implementation:**
```typescript
// Service account accesses shared folder by ID
const folderId = 'user-provided-folder-id';
await drive.files.list({
  q: `'${folderId}' in parents and trashed=false`
});
```

### Pros and Cons

**Pros:**
- ✅ No user authorization required
- ✅ No refresh tokens to manage
- ✅ Works for automated/background tasks
- ✅ Good for multi-user systems (with domain-wide delegation)

**Cons:**
- ❌ **Cannot access user's Drive directly** (without sharing/delegation)
- ❌ Requires Google Workspace for domain-wide delegation
- ❌ More complex setup
- ❌ Service account has its own Drive space (separate from users)
- ❌ Users must manually share folders (if using Option B)

### When to Use Service Account

**Good for:**
- Internal applications with Google Workspace
- Automated backup systems
- Server-to-server file operations
- When you don't need user-specific data

**Not good for:**
- Personal Gmail accounts
- User-specific photo galleries
- Applications where users want to see their files
- Multi-tenant SaaS applications

---

## Recommendation for OpenShutter

### For Your Use Case (Photo Gallery):

**Stick with OAuth 2.0 + Refresh Tokens**, but consider making files visible:

1. **If users want to see files:** Switch to `drive.file` scope and use regular folders
2. **If files should be hidden:** Keep current AppData implementation
3. **Service Account is NOT recommended** because:
   - Users can't see their own photos
   - Requires complex sharing setup
   - Doesn't work well for personal accounts

### Hybrid Approach (Best of Both Worlds)

Allow users to choose:

```typescript
// Config option
{
  storageType: 'appdata' | 'visible',
  folderId: 'optional-folder-id'  // For visible storage
}

// Implementation
private getRootFolderId(): string {
  if (this.config.storageType === 'visible') {
    return this.config.folderId || 'root'
  }
  return 'appDataFolder'
}

// Scopes based on storage type
const scope = this.config.storageType === 'visible'
  ? 'https://www.googleapis.com/auth/drive.file'
  : 'https://www.googleapis.com/auth/drive.appdata'
```

---

## Migration Guide

If switching from AppData to visible storage:

1. **Backup existing files** from AppData folder
2. **Update code** with new scopes and folder logic
3. **Re-authorize users** (old tokens won't work with new scopes)
4. **Create new folder** in user's Drive (or use existing)
5. **Migrate files** from AppData to new folder
6. **Update database** with new file paths/IDs

---

## Summary Table

| Method | User Sees Files? | Setup Complexity | Best For |
|--------|----------------|------------------|----------|
| **OAuth + AppData** (Current) | ❌ No | Low | Hidden storage |
| **OAuth + Regular Folder** | ✅ Yes | Low | Visible storage |
| **Service Account** | ❌ No* | High | Server-to-server |
| **Service Account + Sharing** | ✅ Yes** | Very High | Enterprise |

*Service account has its own Drive space
**User must manually share folders
