# Manual test: dedicated owner storage & owner dashboard

Use this checklist to verify **admin dedicated-storage flags**, the **Owner panel “Storage management” card**, and **Owner → Storage** after the dedicated-storage work.

## Prerequisites

- Running app (frontend + backend + DB) with at least:
  - One **admin** account
  - One **owner** account (role `owner`) used only for these tests (or one you can reconfigure freely)
- You can log out and log in as different users in the same browser (or use two browsers / incognito for admin vs owner).

Use your real base URL (e.g. `http://localhost:4000` or production) as `{BASE}` below.

## Automated tests (Playwright)

The same flow is covered by **`e2e/dedicated-storage.spec.ts`**. From the repo root:

1. `pnpm exec playwright install chromium` (once per machine)
2. Start the stack (`pnpm dev`; default UI `http://localhost:4000`)
3. Set `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`
4. Run `pnpm test:e2e`

Details: [`e2e/README.md`](../e2e/README.md).

---

## Scenario A — Dedicated on: card visible and storage page reachable

**Goal:** With **Use dedicated per-owner storage** enabled, the owner sees the dashboard card and can open **Owner → Storage**, even if profile storage still uses the main site connection.

| Step | Action | Expected |
|------|--------|----------|
| A1 | Log in as **admin**. Open **Admin → Users**. Edit the test **owner**. | User form opens. |
| A2 | Under **Dedicated storage**, enable **Use dedicated per-owner storage**. | Checkbox checked. |
| A3 | Under **Allowed Storage Providers**, ensure at least **Local Storage** (and optionally others) is selected. | At least one provider allowed. |
| A4 | Save the user. | Save succeeds; no validation error. |
| A5 | (Optional) In the same form, if there is a **“Use main domain connection”** / profile storage toggle for the owner, set it to **on** (use site storage) — *if your product exposes this on the owner profile UI, you can also set it there after logging in as owner*. | Documents the edge case: dedicated flag should still win for showing the card. |
| A6 | Log out. Log in as the **test owner**. Open `{BASE}/owner`. | Owner dashboard loads. |
| A7 | Look for the **Storage management** (or localized equivalent) card. | Card is **visible**. |
| A8 | Click **Manage storage** (or equivalent) → `{BASE}/owner/storage`. | Page loads without redirecting away as “admin manages storage only.” |
| A9 | On `/owner/storage`, confirm copy or UI indicates **dedicated** mode (e.g. banner that dedicated credentials apply per provider). | Dedicated messaging or behavior matches implementation. |
| A10 | If multiple providers are allowed, switch tabs (e.g. Local vs cloud). | Tabs match **Allowed Storage Providers**; no crash. |

**Pass:** A7–A9 succeed. The owner can always reach storage management when dedicated is on.

---

## Scenario B — Dedicated off + main site storage: card hidden

**Goal:** Owner who uses **only** the main site storage connection and **not** dedicated storage should **not** see the storage card (legacy behavior).

| Step | Action | Expected |
|------|--------|----------|
| B1 | As **admin**, edit the same owner: **disable** **Use dedicated per-owner storage**. Save. | Saved. |
| B2 | As **owner**, open **Owner → Profile** (or wherever **Use main domain connection** / site storage is configured). Enable **use main domain / site** storage so the owner does **not** manage their own connection. Save if applicable. | Owner is on “main site” storage only. |
| B3 | Open `{BASE}/owner`. | Dashboard loads. |
| B4 | **Storage management** card. | Card is **not** shown. |
| B5 | Manually navigate to `{BASE}/owner/storage`. | App shows the “using main site storage” (or redirect) message — **not** the full per-owner provider editor. |

**Pass:** B4 and B5 match expectations.

*Note:* If your build does not expose **Use main domain connection** on the owner profile, set the equivalent via API or DB so `storageConfig.useAdminConfig === true` for that user, then repeat B3–B5.

---

## Scenario C — Dedicated off + own profile storage: card visible

**Goal:** Non-dedicated owner who **does** manage their own profile storage still sees the card.

| Step | Action | Expected |
|------|--------|----------|
| C1 | **Dedicated** remains **off** for the owner. | — |
| C2 | As **owner**, on profile storage settings, **disable** “use main domain connection” (use **own** connection). Save. | `useAdminConfig` is not `true`. |
| C3 | Open `{BASE}/owner`. | **Storage management** card is **visible**. |
| C4 | Open `{BASE}/owner/storage`. | Full owner storage UI for allowed providers (non-dedicated copy/behavior). |

**Pass:** C3–C4 succeed.

---

## Scenario D — Allowed providers gating (dedicated)

**Goal:** With dedicated on, the owner only sees providers the admin allowed.

| Step | Action | Expected |
|------|--------|----------|
| D1 | As **admin**, enable **dedicated** for the owner. Set **Allowed Storage Providers** to **only Local** (uncheck others). Save. | — |
| D2 | As **owner**, open `/owner/storage`. | Only **Local** (or expected subset) appears; no tabs for disallowed providers. |
| D3 | As **admin**, add e.g. **Google Drive** to allowed list. Save. | — |
| D4 | Refresh `/owner/storage` as owner. | Google Drive tab appears (if enabled for the site overall per your backend rules). |

**Pass:** D2 and D4 reflect admin’s allowed list.

---

## Optional: API sanity check

With owner session cookies (e.g. from browser devtools or same-origin fetch while logged in):

- `GET {BASE}/api/auth/profile` — response user should include `useDedicatedStorage: true` when the admin flag is on.
- `GET {BASE}/api/owner/storage-options` — should return options consistent with dedicated mode and allowed providers.

---

## Quick regression matrix

| Dedicated | `useAdminConfig` (main site) | Card on `/owner` | `/owner/storage` |
|-----------|------------------------------|------------------|------------------|
| On        | true or false                | Show             | Dedicated owner storage UI |
| Off       | true                         | Hide             | “Site manages storage” message |
| Off       | false                        | Show             | Profile-based owner storage UI |

Record **date**, **build/commit**, and **tester** when you run this for a release sign-off.
