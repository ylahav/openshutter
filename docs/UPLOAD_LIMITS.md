# File Upload Size Limits

## Current Configuration
File uploads are handled through a two-tier architecture:

1. **SvelteKit Frontend Route**: `POST /api/photos/upload` (port 4000)
   - This route proxies uploads to the backend
   - Requires admin authentication
   - Handles SvelteKit body size limits

2. **NestJS Backend API**: `POST /api/photos/upload` (port 5000)
   - The actual upload handler
   - Configured to accept files up to **100MB**
   - Processes the file and stores it via the configured storage provider

The SvelteKit route (`frontend/src/routes/api/photos/upload/+server.ts`) acts as a proxy, forwarding the FormData to the backend while handling authentication and error messages.

## Solutions

### Development Mode

For local development, the default limits should be sufficient. If you need to increase limits:

### Production Mode

For production deployments, you need to configure limits at **two levels**:

#### 1. SvelteKit BODY_SIZE_LIMIT (Required)

SvelteKit has a default body size limit of **512KB**. You **must** set the `BODY_SIZE_LIMIT` environment variable to allow larger uploads.

**Option A: PM2 Ecosystem Config**
Add to your `ecosystem.config.js`:
```javascript
env: {
  BODY_SIZE_LIMIT: '100M',
  // ... other env vars
}
```

**Option B: Environment Variable**
Set before starting the server:
```bash
export BODY_SIZE_LIMIT=100M
node build
```

**Option C: .env File**
Add to your `.env` or `.env.production` file:
```bash
BODY_SIZE_LIMIT=100M
```

**Important**: You must restart your SvelteKit server after setting this variable.

#### 2. Nginx Configuration (Required)

If using nginx as a reverse proxy, you **must** configure `client_max_body_size` to allow large file uploads.

**Quick Fix**: Add this to your nginx server block:
```nginx
client_max_body_size 100M;
```

**Complete Configuration**: See `docs/nginx-openshutter.conf` for a complete nginx configuration that includes:
- `client_max_body_size 100M;` - Allows 100MB uploads (matches backend limit)
- Increased timeouts for large file uploads
- Proper proxy configuration for API routes to backend (port 5000)
- Disabled buffering for file uploads to improve performance

**To apply the fix on your server:**
1. Edit your nginx config: `sudo nano /etc/nginx/sites-available/openshutter` (or your config file)
2. Add `client_max_body_size 100M;` inside the `server { }` block
3. Test configuration: `sudo nginx -t`
4. Reload nginx: `sudo systemctl reload nginx`

### Alternative Solutions

1. **Chunked Uploads**: Implement chunked file uploads to bypass the body size limit
2. **Direct Storage Upload**: Upload files directly to storage (S3, etc.) from the client
3. **Streaming**: Use streaming uploads instead of buffering the entire file

## Current Status

- **Backend API limit**: **100MB** (configured in NestJS backend)
- **SvelteKit body size limit**: **512KB default** (must set `BODY_SIZE_LIMIT=100M` environment variable)
- **Nginx limit**: **1MB default** (must set `client_max_body_size 100M;` in config)
- **Frontend limit**: **100MB** (configured in upload components)

## Testing

To test upload limits:
1. Try uploading files of various sizes up to 100MB
2. Check the browser console and server logs for error messages
3. Verify the file is successfully uploaded and stored

## Common Errors

### "Content-length of X exceeds limit of 524288 bytes"
This means SvelteKit's `BODY_SIZE_LIMIT` is too low. Set `BODY_SIZE_LIMIT=100M` environment variable and restart the server.

### "413 Request Entity Too Large" (from nginx)
This means nginx's `client_max_body_size` is too low. Add `client_max_body_size 100M;` to your nginx server block and reload nginx.

## Notes

- SvelteKit routes proxy directly to NestJS backend
- Error messages may indicate "Request entity too large" or "Content-length exceeds limit"
- The NestJS backend handles uploads directly and has higher limits configured (100MB)
- For production, you must configure **both** SvelteKit (`BODY_SIZE_LIMIT`) and nginx (`client_max_body_size`)
