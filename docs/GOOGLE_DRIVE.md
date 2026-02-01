# Google Drive Storage

One guide for Google Drive in OpenShutter: auth methods (Service Account and OAuth), visible vs hidden storage, and token renewal.

---

## Auth methods

### Service Account (recommended for deployed servers)

Avoids OAuth redirect URI and refresh token issues on production.

1. **Google Cloud Console** → IAM & Admin → Service Accounts → Create service account → Create key (JSON) → Download.
2. **Admin → Storage → Google Drive** → Set **Auth method** to **Service account**. Paste the full JSON into **Service account JSON** (or set **Client email** and **Private key**).
3. **Folder**: Create a folder in Google Drive (or use an existing one). Share it with the **service account email** (e.g. `xxx@yyy.iam.gserviceaccount.com`) with **Editor** access. Set **Folder ID** to that folder’s ID (from the URL: `https://drive.google.com/drive/folders/FOLDER_ID`).
4. No OAuth flow, no redirect URI, no refresh token.

### OAuth (local or single-user)

- **Storage type**
  - **Hidden (AppData)**: Files not visible in the user’s Drive; scope `drive.appdata`.
  - **Visible**: Files visible in the user’s Drive; scope `drive.file`; optional **Folder ID** (defaults to root).
- **Production**: In Google Cloud Console, add your production callback URL (e.g. `https://yourdomain.com/api/auth/google/callback`). In storage config set **Redirect URI** to that exact URL and re-authorize from the **deployed** site so the refresh token is issued for production.

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
