# Google Drive Token Renewal Guide

## Problem
Your Google Drive refresh token has expired or been revoked. This is indicated by the error:
```
invalid_grant: Token has been expired or revoked.
```

## Automatic Detection & Renewal (Recommended)

OpenShutter automatically detects invalid tokens and prompts admins to renew them:

1. **Automatic Detection**: When viewing albums with Google Drive photos, if the token is invalid, admins will see a notification banner
2. **One-Click Renewal**: Click "Renew Token Now" in the notification
3. **Auto-OAuth**: The system automatically opens the OAuth popup
4. **Automatic Save**: After authorization, the new token is saved automatically

**To manually renew from Storage Settings**:
1. Go to `/admin/storage`
2. Click the "Google Drive" tab
3. Click "Renew Token" button next to the Refresh Token field
4. Complete OAuth authorization
5. Token is automatically saved

## Manual Renewal Methods

If automatic detection doesn't work, use one of these manual methods:

### Option 1: Using Browser Console (Quick Method)

1. **Get your current Google Drive configuration:**
   - Open your browser's developer console (F12)
   - Navigate to: `http://localhost:4000/admin` (or your domain)
   - Run this in the console to get your Client ID and Client Secret:
   ```javascript
   fetch('/api/admin/storage/google-drive')
     .then(r => r.json())
     .then(config => {
       console.log('Client ID:', config.config.clientId);
       console.log('Client Secret:', config.config.clientSecret);
       console.log('Storage Type:', config.config.storageType || 'appdata');
     });
   ```

2. **Generate the OAuth URL:**
   ```javascript
   const clientId = 'YOUR_CLIENT_ID'; // From step 1
   const redirectUri = window.location.origin + '/api/auth/google/callback';
   const storageType = 'visible'; // or 'appdata' - match your current config
   
   fetch(`/api/admin/storage/google-drive/auth-url?clientId=${encodeURIComponent(clientId)}&redirectUri=${encodeURIComponent(redirectUri)}&storageType=${storageType}`)
     .then(r => r.json())
     .then(data => {
       console.log('Auth URL:', data.authUrl);
       // Open this URL in a new window
       window.open(data.authUrl, 'google-auth', 'width=600,height=700');
     });
   ```

3. **Handle the OAuth callback:**
   - After authorizing, the callback page will send a message to the parent window
   - Run this listener in the console BEFORE opening the auth URL:
   ```javascript
   window.addEventListener('message', async (event) => {
     if (event.data.type === 'GOOGLE_OAUTH_CODE') {
       const code = event.data.code;
       const clientId = 'YOUR_CLIENT_ID';
       const clientSecret = 'YOUR_CLIENT_SECRET'; // From step 1
       const redirectUri = window.location.origin + '/api/auth/google/callback';
       
       // Exchange code for tokens
       const tokenResponse = await fetch('/api/auth/google/token', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ code, clientId, clientSecret, redirectUri })
       });
       
       const tokenData = await tokenResponse.json();
       
       if (tokenData.success) {
         console.log('Success! Refresh token:', tokenData.refreshToken);
         
         // Save the refresh token to your config
         const updateResponse = await fetch('/api/admin/storage/google-drive', {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             refreshToken: tokenData.refreshToken,
             // Keep your existing config values
             clientId: clientId,
             clientSecret: clientSecret,
             storageType: 'visible', // or 'appdata'
             folderId: 'YOUR_FOLDER_ID', // Keep existing folder ID
             isEnabled: true
           })
         });
         
         const updateResult = await updateResponse.json();
         console.log('Config updated:', updateResult);
         alert('Token saved successfully! Photos should now work.');
       } else {
         console.error('Token exchange failed:', tokenData.error);
         alert('Failed to exchange token: ' + tokenData.error);
       }
     } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
       console.error('OAuth error:', event.data.error);
       alert('Authorization failed: ' + event.data.error);
     }
   });
   ```

4. **Complete the flow:**
   - Run the listener from step 3
   - Run the URL generator from step 2
   - Authorize the app in the popup window
   - The token will be automatically saved

### Option 2: Manual OAuth Flow (If Option 1 doesn't work)

1. **Get your Client ID and Secret** (same as Option 1, step 1)

2. **Build the authorization URL manually:**
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_CLIENT_ID
     &redirect_uri=http://localhost:4000/api/auth/google/callback
     &response_type=code
     &scope=https://www.googleapis.com/auth/drive.file
     &access_type=offline
     &prompt=consent
   ```
   Replace `YOUR_CLIENT_ID` and adjust `redirect_uri` for your domain.

3. **Authorize and get the code:**
   - Open the URL in your browser
   - After authorization, you'll be redirected to `/api/auth/google/callback?code=...`
   - Copy the `code` parameter from the URL

4. **Exchange code for refresh token:**
   ```javascript
   fetch('/api/auth/google/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       code: 'PASTE_CODE_HERE',
       clientId: 'YOUR_CLIENT_ID',
       clientSecret: 'YOUR_CLIENT_SECRET',
       redirectUri: 'http://localhost:4000/api/auth/google/callback'
     })
   })
   .then(r => r.json())
   .then(data => {
     console.log('Refresh token:', data.refreshToken);
     // Now save it using the update endpoint (same as Option 1, step 3)
   });
   ```

### Option 3: Using cURL (For Server/Production)

```bash
# 1. Get auth URL
curl "http://localhost:4000/api/admin/storage/google-drive/auth-url?clientId=YOUR_CLIENT_ID&redirectUri=http://localhost:4000/api/auth/google/callback&storageType=visible"

# 2. Visit the authUrl in browser, get the code from callback URL

# 3. Exchange code for token
curl -X POST http://localhost:4000/api/auth/google/token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTHORIZATION_CODE",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "http://localhost:4000/api/auth/google/callback"
  }'

# 4. Update config with refresh token
curl -X PUT http://localhost:4000/api/admin/storage/google-drive \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{
    "refreshToken": "REFRESH_TOKEN_FROM_STEP_3",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "storageType": "visible",
    "folderId": "YOUR_FOLDER_ID",
    "isEnabled": true
  }'
```

## Important Notes

1. **Storage Type:** Make sure you use the same `storageType` (`visible` or `appdata`) that matches your current configuration. Check your current config first.

2. **Folder ID:** When updating the config, preserve your existing `folderId` - don't change it unless you want to use a different folder.

3. **Redirect URI:** The redirect URI in your Google Cloud Console OAuth app must match exactly: `http://localhost:4000/api/auth/google/callback` (or your production domain).

4. **After saving:** The new refresh token will be automatically used. Try accessing a photo to verify it works.

## Troubleshooting

- **"No refresh token returned"**: Make sure `prompt=consent` is in the auth URL. If you've already authorized, revoke access at https://myaccount.google.com/permissions first.

- **"redirect_uri_mismatch"**: Verify the redirect URI in Google Cloud Console matches exactly.

- **"invalid_client"**: Check that your Client ID and Secret are correct in Google Cloud Console.

- **Still getting errors**: Check backend logs for more details. The token should be automatically saved to the database after refresh (this was fixed in the code).
