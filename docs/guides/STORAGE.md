# Storage Configuration Guide

OpenShutter supports multiple storage providers for photo and album storage. This guide covers configuration and management of all supported storage options.

## Supported Storage Providers

### 1. Local Storage
- **Type**: File system storage
- **Use Case**: Development, small deployments
- **Configuration**: Simple path-based storage

### 2. Google Drive
- **Type**: Cloud storage via Google Drive API
- **Use Case**: Personal photo galleries, Google Workspace integration
- **Configuration**: OAuth2 credentials required

### 3. Amazon S3
- **Type**: Cloud object storage
- **Use Case**: Production deployments, scalable storage
- **Configuration**: AWS credentials and bucket settings

### 4. Backblaze B2
- **Type**: S3-compatible cloud storage
- **Use Case**: Cost-effective cloud storage, backup solutions
- **Configuration**: Application Key ID and Application Key

### 5. Wasabi
- **Type**: S3-compatible cloud storage
- **Use Case**: High-performance cloud storage, enterprise solutions
- **Configuration**: Access Key ID, Secret Access Key, and custom endpoint

## Storage Configuration

### Accessing Storage Settings

**Primary Method: Admin Dashboard (Recommended)**

All storage providers are configured through the admin dashboard at `/admin/storage` (admin access required). Owners who use their **own** storage connection (admin has not set "Use main domain connection") manage storage at **`/owner/storage`**; if that flag is set, visiting `/admin/storage` as an owner redirects to `/owner`. This is the recommended method as it stores configurations securely in the database and provides a user-friendly interface.

**Admin dashboard (`/admin/storage`) behavior**

- **Enable / disable**: Each provider tab shows whether it is enabled for the site (**Enabled** / **Inactive**) and includes a toggle to turn the provider on or off without re-entering credentials.
- **Structured forms**: **Google Drive**, **Local**, **Wasabi**, **Amazon S3**, and **Backblaze B2** each have dedicated form fields on this page (bucket, region, keys, etc.). Only providers without a bespoke UI fall back to **JSON** editing.
- **Browser → API**: The UI calls `/api/admin/storage/*`. In production these paths are handled by **SvelteKit server routes** (`frontend/src/routes/api/admin/storage/...`) which forward the request (and session cookies) to the Nest backend (`BACKEND_URL`). Ensure your reverse proxy forwards `/api` to the Node process that runs the built frontend so these handlers run; alternatively, routing `/api/admin/storage/*` directly to the Nest server also works if paths match the backend’s `/api` prefix.
- **View tree**: Folder browsing is only available for providers that implement tree listing (notably **Google Drive**). The provider must be **enabled**. Large drives use a **background scan** (see below) with live progress in the dialog; errors from the API are shown when the job fails.

#### Dedicated per-owner storage

For multi-tenant setups, an admin can enable **Use dedicated per-owner storage** on an owner account (**Admin → Users** → edit owner). That owner then configures credentials per allowed provider on **`/owner/storage`**; data is stored for that owner only, not in the shared site profile storage block. **Allowed Storage Providers** on the same user form limits which provider tabs they see.

The owner dashboard shows **Storage management** when dedicated storage is enabled, or when the owner manages their own profile storage (not “main domain connection” only).

- Manual QA checklist: [`MANUAL_TEST_DEDICATED_STORAGE.md`](./MANUAL_TEST_DEDICATED_STORAGE.md)
- Automated checks (Playwright): [`e2e/README.md`](../e2e/README.md)

1. **Login as Admin**: Navigate to `http://localhost:4000/login`
2. **Go to Storage**: Click "Storage" in the admin dashboard or navigate to `/admin/storage`
3. **Select Provider**: Choose the storage provider tab you want to configure
4. **Configure Settings**: Fill in the required credentials and settings
5. **Test Connection**: Use the "Test Connection" button to verify settings
6. **View Tree**: Where supported (e.g. Google Drive), use "View Tree" to browse the folder structure—the provider must be enabled. The UI starts an async scan, polls every few seconds, shows the current folder path while scanning, then renders the tree when complete.
7. **Save Configuration**: Click "Save Configuration" to store the settings

**Storage configurations are stored in MongoDB** and encrypted at rest. The admin dashboard provides:
- Visual storage tree browsing for **Google Drive** (async scan; see **Google Drive folder tree** below)
- Connection testing
- Provider enable/disable toggles
- Usage monitoring
- Configuration validation

### Provider-Specific Configuration

**Note**: While environment variables can be used for initial setup, the admin dashboard is the primary configuration method. All settings configured via the dashboard are stored in the database.

#### Local Storage
- **Base Path**: Storage directory path (default: `/app/public/albums`)
- **Max File Size**: Maximum file size limit (default: 100MB)
- Configure via admin dashboard at `/admin/storage`

#### Google Drive

**Auth method** (in storage config):

- **OAuth** (default): Uses Client ID, Client Secret, Refresh Token. Set **Redirect URI** to your production callback URL (e.g. `https://yourdomain.com/api/auth/google/callback`) when deployed, then re-authorize from the deployed site. **Visible** storage uses the **`https://www.googleapis.com/auth/drive`** scope so uploads work in normal My Drive folders (including galleries that were partially managed by a service account before). Add that scope on the OAuth consent screen if prompted. **Hidden (AppData)** still uses **`drive.appdata`** only.
- **Service account** (good for servers that use **Google Workspace**): No redirect or refresh token. Paste **Service account JSON** (from Google Cloud Console → IAM → Service Accounts → Create key) or set **Client email** and **Private key**. **Folder ID** is required.

**Service account and personal Google accounts:** Google does **not** give service accounts “My Drive” storage quota. Uploading **files** into a folder you shared from a **personal** (@gmail.com / Google One) Drive often fails with an API error about **storage quota** / “Service Accounts do not have storage quota”. Folder creation may still appear to work. **Fix:** use **OAuth (user)** for personal Drive, or use a **Google Workspace** account with a **Shared drive** (Team Drive), add the service account as **Content manager** (or higher) on that shared drive, and keep your gallery root **inside** that shared drive. See [`GOOGLE_DRIVE.md`](./GOOGLE_DRIVE.md).

**OAuth fields**: Client ID, Client Secret, Refresh Token, optional Redirect URI. **Storage Type**: `appdata` (hidden) or `visible`. **Folder ID**: optional for OAuth visible; required for Service account.

Configure via admin dashboard at `/admin/storage`.

**OAuth Setup Process**:
1. Enter your Client ID and Client Secret from Google Cloud Console
2. Select your preferred Storage Type (Hidden or Visible)
3. Click "Renew Token" button (or "Generate New Token" if no token exists)
4. Complete the OAuth authorization in the popup window
5. The refresh token will be automatically saved
6. Test the connection to verify everything works

**Important**: When switching storage types **or** when the app’s requested scopes change (e.g. after an upgrade), generate a **new** refresh token. Scopes differ: **`drive.appdata`** (hidden) vs **`drive`** (visible).

#### Google Drive folder tree (View Tree)

**Admin → Storage → Google Drive → View Tree** does not block on a single long HTTP request. That pattern caused **502** errors behind nginx when scans walked thousands of variant folders (`medium`, `micro`, etc.).

**Flow:**

1. UI calls **`POST /api/admin/storage/google-drive/tree/start?maxDepth=3`** (SvelteKit proxies to Nest).
2. Backend runs a **`storage-tree-scan`** job in the background and returns **`jobId`**.
3. UI polls **`GET /api/admin/storage/google-drive/tree/status/:jobId`** every ~2s until **`completed`** or **`failed`**.
4. While running, the dialog shows progress text (e.g. current folder path). When complete, the loading line disappears and the tree renders.

**Scan behavior (preview):**

- Skips known **image variant** subfolders (`hero`, `large`, `medium`, `small`, `micro`, `thumb`, `thumbnails`) so album layout folders are listed without walking every derivative file.
- **Preview mode**: file names are capped per folder; folders with many files show a count summary instead of listing every file.
- Legacy synchronous **`GET .../tree`** remains for API compatibility; prefer the async start/status endpoints for large drives.

See also [`GOOGLE_DRIVE.md`](./GOOGLE_DRIVE.md) and nginx notes in [`SERVER_DEPLOYMENT.md`](./SERVER_DEPLOYMENT.md).

### Automatic Token Renewal Detection

OpenShutter automatically detects when Google Drive tokens expire or become invalid:

**Automatic Detection**:
- When photos fail to load due to invalid tokens, admins see a notification banner at the top of the page
- The notification includes a "Renew Token Now" button that redirects to the storage settings page
- Token validity is automatically checked when:
  - Loading the storage settings page
  - Switching to the Google Drive tab
  - Testing the connection
  - After saving configuration

**Token Renewal Flow**:
1. Admin views an album with Google Drive photos
2. If token is invalid, a red notification banner appears: "Google Drive authentication token is invalid or expired"
3. Admin clicks "Renew Token Now"
4. Redirects to `/admin/storage` with auto-triggered OAuth popup
5. Admin completes OAuth authorization
6. New token is automatically saved
7. Notification disappears and photos load correctly

**Error Throttling**:
- The backend throttles invalid token error retries (5-minute cooldown) to prevent log spam
- Token renewal notifications are throttled (once per minute) to avoid repeated prompts
- Access tokens are automatically persisted to the database after refresh

**For Visitors**:
- Visitors see broken images when tokens are invalid
- Only admins/owners see the renewal notification (since they can fix it)
- Once an admin renews the token, photos become accessible to all visitors

#### Amazon S3
- **Access Key ID**: AWS access key ID
- **Secret Access Key**: AWS secret access key
- **Region**: AWS region (e.g., `us-east-1`)
- **Bucket Name**: S3 bucket name
- **Endpoint**: (Optional) Custom endpoint URL
- **Path-Style Addressing**: Toggle for path-style vs virtual-hosted-style URLs
- Configure via admin dashboard at `/admin/storage`

#### Backblaze B2
- **Application Key ID**: 24-character application key ID (starts with "K")
- **Application Key**: 32-character application key
- **Bucket Name**: B2 bucket name
- **Region**: B2 region (e.g., `us-west-2`)
- **Endpoint**: S3-compatible endpoint URL (e.g., `https://s3.us-west-2.backblazeb2.com`)
- Configure via admin dashboard at `/admin/storage`

#### Wasabi
- **Access Key ID**: Wasabi access key ID
- **Secret Access Key**: Wasabi secret access key
- **Bucket Name**: Wasabi bucket name
- **Region**: Wasabi region (e.g., `us-east-1`)
- **Endpoint**: S3-compatible endpoint URL (e.g., `https://s3.wasabisys.com`)
- **Path-Style Addressing**: Toggle for path-style vs virtual-hosted-style URLs
- Configure via admin dashboard at `/admin/storage`

## Storage Provider Setup Guides

### Backblaze B2 Setup

1. **Create Backblaze Account**: Sign up at [backblaze.com](https://www.backblaze.com)
2. **Create B2 Bucket**: 
   - Go to B2 Cloud Storage
   - Create a new bucket
   - Note the bucket name and region
3. **Generate Application Keys**:
   - Go to "App Keys" in your B2 account
   - Create a new application key
   - **Important**: Copy the Application Key ID (24 characters, starts with "K")
   - Copy the Application Key (32 characters)
4. **Configure in OpenShutter**:
   - Application Key ID: Your 24-character key ID
   - Application Key: Your 32-character application key
   - Bucket Name: Your bucket name
   - Region: Your bucket region (e.g., us-west-2)
   - Endpoint: Usually `https://s3.{region}.backblazeb2.com`

### Wasabi Setup

1. **Create Wasabi Account**: Sign up at [wasabi.com](https://www.wasabi.com)
2. **Create Bucket**:
   - Go to Wasabi console
   - Create a new bucket
   - Note the bucket name and region
3. **Generate Access Keys**:
   - Go to "Access Keys" in your Wasabi account
   - Create a new access key
   - Copy the Access Key ID and Secret Access Key
4. **Configure in OpenShutter**:
   - Access Key ID: Your Wasabi access key
   - Secret Access Key: Your Wasabi secret key
   - Bucket Name: Your bucket name
   - Region: Your bucket region (e.g., us-east-1)
   - Endpoint: Usually `https://s3.wasabisys.com`

## Storage Management

### Switching Storage Providers

1. **Configure New Provider**: Set up the new storage provider in admin settings
2. **Test Connection**: Verify the new provider works correctly
3. **Migrate Data**: Use the migration tools to move existing data
4. **Update Album Settings**: Change album storage provider assignments
5. **Verify Migration**: Test photo uploads and downloads

### Storage Monitoring

- **Usage Statistics**: View storage usage in admin dashboard
- **Performance Metrics**: Monitor upload/download speeds
- **Error Logs**: Check storage-related errors in system logs
- **Cost Tracking**: Monitor storage costs for cloud providers

## Security Considerations

### Access Control
- **Admin Only**: Storage configuration is restricted to admin users
- **Secure Credentials**: Store credentials securely in environment variables
- **Regular Rotation**: Rotate access keys regularly for security

### Data Protection
- **Encryption**: All data is encrypted in transit and at rest
- **Access Logs**: Monitor who accesses storage configuration
- **Backup Strategy**: Implement regular backups of critical data

## Troubleshooting

### Common Issues

#### "Invalid Access Key Id" Error (Backblaze)
- **Cause**: Using Key ID instead of Application Key ID
- **Solution**: Use the 24-character Application Key ID (starts with "K")

#### "Malformed Access Key Id" Error
- **Cause**: Empty or incorrect Application Key ID
- **Solution**: Verify the Application Key ID is exactly 24 characters

#### Google Drive View Tree — HTTP 502 or endless loading

- **Symptom:** Dialog shows **Could not load the folder tree** with **HTTP 502**, while server logs still list Drive API folder walks.
- **Cause (older builds):** A synchronous tree request exceeded the reverse-proxy **`proxy_read_timeout`**.
- **Fix (current):** Use a build with async **tree/start** + **tree/status** polling (see **Google Drive folder tree** above). After deploy, confirm the browser network tab shows **`POST .../tree/start`**, not only **`GET .../tree`**.
- **If status polling still times out:** Raise nginx **`proxy_read_timeout`** on `/api/` (see [`SERVER_DEPLOYMENT.md`](./SERVER_DEPLOYMENT.md)).

#### Connection Test Failures
- **Check Credentials**: Verify all credentials are correct
- **Check Network**: Ensure server can reach storage provider
- **Check Permissions**: Verify access keys have proper permissions
- **Check Bucket**: Ensure bucket exists and is accessible
- **Non-JSON / "Unexpected token '<'" errors (proxy/auth issue)**:
  - Symptom: the UI tries to parse the response as JSON but receives an HTML page (often starts with `<html>`), e.g. `Unexpected token '<', "<html>..." is not valid JSON`.
  - Common causes:
    - Reverse proxy sends `/api/admin/storage/*` to a host that returns **HTML** (SPA fallback 404, login page, or wrong service) instead of JSON.
    - Request is not authenticated (redirect/login HTML page) even though the UI expects JSON.
  - What to do:
    - Confirm `/api/admin/storage` and `/api/admin/storage/*` reach the **Node** process (SvelteKit adapter) that serves the built frontend, **or** route them to the Nest backend at `/api/admin/storage/*`—both can work; the failure mode is usually HTML from nginx “try_files” or an auth redirect.
    - Ensure cookies/session are included (admin UI uses `credentials: include`).
    - Use `curl -i` with an admin session cookie to confirm the endpoint returns `application/json` (not HTML) for both success and error responses.

#### Photo Upload Failures
- **Check Storage Provider**: Verify the album's storage provider is configured
- **Check Permissions**: Ensure write permissions on storage
- **Check Quota**: Verify storage quota is not exceeded
- **Check Network**: Ensure stable network connection

### Debug Mode

Enable debug logging to troubleshoot storage issues:

```env
# Enable storage debugging
DEBUG_STORAGE=true
LOG_LEVEL=debug
```

Check server logs for detailed storage operation information.

## Best Practices

### Provider Selection
- **Development**: Use Local Storage for testing
- **Small Deployments**: Google Drive for personal use
- **Production**: AWS S3, Backblaze B2, or Wasabi for scalability
- **Cost Optimization**: Backblaze B2 for cost-effective storage
- **Performance**: Wasabi for high-performance requirements

### Configuration Management
- **Environment Variables**: Store credentials in environment variables
- **Regular Backups**: Backup storage configurations
- **Documentation**: Document your storage setup
- **Testing**: Test storage providers before production use

### Monitoring and Maintenance
- **Regular Checks**: Monitor storage health regularly
- **Usage Alerts**: Set up alerts for storage quota limits
- **Cost Monitoring**: Track storage costs and optimize usage
- **Security Updates**: Keep storage provider credentials updated

## Support

For storage-related issues:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Test storage provider connectivity
4. Verify credentials and permissions
5. Contact support with specific error messages and logs
