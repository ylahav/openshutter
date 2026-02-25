# Google Drive Storage

One guide for Google Drive in OpenShutter: auth methods (Service Account and OAuth), visible vs hidden storage, and token renewal.

---

## Auth methods

### Service Account (recommended for deployed servers)

Avoids OAuth redirect URI and refresh token issues on production.

1. **Google Cloud Console** → IAM & Admin → Service Accounts → Create service account → Create key (JSON) → Download.
2. **Admin → Storage → Google Drive** → Set **Auth method** to **Service account**. Paste the full JSON key into the **Service account JSON** textarea (or use **Client email** + **Private key** if your backend supports that). The Admin form shows OAuth vs Service account fields based on the selected auth method.
3. **Folder**: Create a folder in Google Drive (or use an existing one). Share it with the **service account email** (e.g. `xxx@yyy.iam.gserviceaccount.com`) with **Editor** access. Set **Folder ID** to that folder’s ID (from the URL: `https://drive.google.com/drive/folders/FOLDER_ID`).
4. No OAuth flow, no redirect URI, no refresh token.

### OAuth (local or single-user)

- **Storage type**
  - **Hidden (AppData)**: Files not visible in the user’s Drive; scope `drive.appdata`.
  - **Visible**: Files visible in the user’s Drive; scope `drive.file`; optional **Folder ID** (defaults to root).
- **Production**: In Google Cloud Console, add your production callback URL (e.g. `https://yourdomain.com/api/auth/google/callback`). In storage config set **Redirect URI** to that exact URL and re-authorize from the **deployed** site so the refresh token is issued for production.

---

## "Access blocked: Authorization Error" when renewing token

This usually means one of two things:

### 1. App is in Testing mode and your account is not a test user

If your OAuth consent screen is in **Testing** mode, only accounts listed as **Test users** can sign in.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project.
2. Go to **APIs & Services** → **OAuth consent screen**.
3. Under **Test users**, click **+ ADD USERS** and add the **exact Google account** you use to renew the token (e.g. your admin email).
4. Save, then try **Renew token** again from Admin → Storage → Google Drive.

### 2. Redirect URI mismatch

The **Redirect URI** used when opening the OAuth popup must **exactly** match one of the **Authorized redirect URIs** in your OAuth 2.0 Client.

1. In Admin → Storage → Google Drive, check the **Redirect URI** field. It should be the full callback URL, e.g.:
   - Local: `http://localhost:4000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
2. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, ensure the same URL is listed **exactly** (same scheme, host, port, path). Add it if missing and save.
4. Try **Renew token** again.

**Tip:** The app builds the default redirect URI from `GOOGLE_OAUTH_CALLBACK_BASE_URL` or `FRONTEND_URL` (backend `.env`). If you use a different frontend URL (e.g. port 3021), set **Redirect URI** in storage config to that exact callback URL and add it in Google Cloud Console.

---

## "deleted_client" or "invalid_client" (connection test or token renewal)

This means the **OAuth 2.0 Client** (Client ID / Client Secret) you configured was **deleted** or is no longer valid in Google Cloud Console.

**Fix:**

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Credentials**.
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**.
3. Application type: **Web application**. Name it (e.g. "OpenShutter Drive").
4. Under **Authorized redirect URIs**, add your callback URL (e.g. `http://localhost:4000/api/auth/google/callback` or your production URL). Save.
5. Copy the new **Client ID** and **Client Secret**.
6. In **Admin → Storage → Google Drive**, replace the old Client ID and Client Secret with the new ones. Set **Redirect URI** to the same URL you added in step 4.
7. Click **Generate New Token** (or **Renew token**) and complete the OAuth flow. The new refresh token will work with the new client.

---

## Token renewal (OAuth only)

If you see **invalid_grant** or “Token has been expired or revoked”:

1. **From the app**: Open **Admin → Storage → Google Drive** and use **Renew token** (or **Generate new token**). Complete the OAuth popup; the new token is saved automatically.
2. **Automatic prompt**: When viewing albums that use Google Drive, admins may see a “Renew token” banner; use it to open the OAuth flow and save the new token.

**If renewal from the UI fails** (e.g. popup blocked):

- Ensure **Redirect URI** in storage config matches the URL in Google Cloud Console (e.g. `https://yourdomain.com/api/auth/google/callback`).
- Use the same **Storage type** (visible vs appdata) as your current config when generating the auth URL.
- Revoke app access at https://myaccount.google.com/permissions and try again with `prompt=consent`.

Manual options (browser console or cURL) are documented in the repo history; the preferred path is Admin → Storage → Renew token.

---

## Summary

| Method              | User sees files? | Best for              |
|---------------------|------------------|------------------------|
| **Service Account**| Yes (shared folder) | Deployed servers   |
| **OAuth + AppData** | No              | Hidden storage         |
| **OAuth + Visible** | Yes             | Local / single-user    |

For deployment, use **Service Account** when possible. See [Server Deployment](./SERVER_DEPLOYMENT.md) and [Storage Configuration](./STORAGE.md) for more.
