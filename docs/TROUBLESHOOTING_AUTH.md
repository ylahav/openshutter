# Troubleshooting Authentication Issues in Production

## Common Issue: "Invalid or expired token" Error

This error occurs when the frontend SvelteKit server route tries to call the backend API, but authentication fails.

### Root Causes

1. **JWT Secret Mismatch** (Most Common)
   - Frontend and backend must use the **same** `AUTH_JWT_SECRET`
   - Frontend uses it in `hooks.server.ts` to verify tokens
   - Backend uses it in `AdminGuard` to verify tokens
   - If they don't match, tokens will be invalid
   - **Important**: Both servers also use a shared timestamp file (`.server-start-time`) to derive the JWT secret, ensuring sessions are invalidated on restart

2. **Cookie Not Being Forwarded**
   - Cookies might not be forwarded correctly from browser → SvelteKit → Backend
   - Check cookie domain/path settings

3. **Environment Variables Not Set**
   - `AUTH_JWT_SECRET` must be set in both frontend and backend `.env` files
   - `BACKEND_URL` must be set correctly in frontend

### Diagnostic Steps

1. **Check JWT Secrets Match**

   On your server, verify both files have the same secret:

   ```bash
   # Check backend secret
   grep AUTH_JWT_SECRET backend/.env
   
   # Check frontend secret  
   grep AUTH_JWT_SECRET frontend/.env.production
   ```

   They must be **identical**. If they differ, update one to match the other.

2. **Check Backend URL**

   ```bash
   # Check frontend knows where backend is
   grep BACKEND_URL frontend/.env.production
   ```

   Should point to your backend (e.g., `http://localhost:5000` or your backend domain).

3. **Check Logs**

   After deploying with the updated logging, check PM2 logs:

   ```bash
   pm2 logs openshutter-frontend --lines 50
   ```

   Look for:
   - `[Storage API]` log entries showing token status
   - `[Backend API]` log entries showing request details
   - Any errors about missing tokens or secrets

4. **Verify Cookie is Set**

   In browser DevTools → Application → Cookies, check:
   - `auth_token` cookie exists
   - Cookie domain matches your site domain
   - Cookie path is `/` or includes `/admin`

### Fix: Ensure JWT Secrets Match

**Option 1: Use Same Secret in Both Files**

1. Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

2. Add to `backend/.env`:
   ```env
   AUTH_JWT_SECRET=your-generated-secret-here
   ```

3. Add to `frontend/.env.production`:
   ```env
   AUTH_JWT_SECRET=your-generated-secret-here
   ```

4. Restart services:
   ```bash
   pm2 restart all
   ```

**Option 2: Use Environment Variable**

If using PM2 ecosystem.config.js, set it there:

```javascript
env: {
  AUTH_JWT_SECRET: 'your-secret-here',
  // ... other vars
}
```

### Fix: Cookie Domain Issues

If cookies aren't being set correctly, check:

1. **Cookie Settings in Login Route**

   Check `frontend/src/routes/auth/login/+server.ts` - cookies should be set with:
   ```javascript
   cookies.set('auth_token', token, {
     path: '/',
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     maxAge: 60 * 60 * 24 * 7 // 7 days
   });
   ```

2. **Domain Setting**

   If frontend and backend are on different domains, you may need to set cookie domain explicitly.

### Testing After Fix

1. Log out and log back in
2. Check browser cookies - `auth_token` should exist
3. Try accessing `/admin/storage` again
4. Check logs for any remaining errors

### Additional Debugging

If issue persists, enable verbose logging:

1. Check if token exists in SvelteKit:
   - Look for `[Storage API]` logs showing `hasToken: true/false`

2. Check if backend receives token:
   - Backend logs should show token validation attempts
   - Check backend logs: `pm2 logs openshutter-backend`

3. Test backend directly:
   ```bash
   # Get your auth token from browser cookies
   curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
        http://localhost:5000/api/admin/storage
   ```

   If this works but SvelteKit route doesn't, it's a cookie forwarding issue.
