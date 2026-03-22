# End-to-end tests (Playwright)

## Setup

1. Install browsers once (from repo root):

   ```bash
   pnpm exec playwright install chromium
   ```

2. Start the full stack so the UI is reachable (default `http://localhost:4000`):

   ```bash
   pnpm dev
   ```

3. Create **dedicated test accounts** in your environment (recommended: a throwaway owner, not production data).

4. Export credentials (PowerShell example):

   ```powershell
   $env:E2E_ADMIN_EMAIL = "admin@example.com"
   $env:E2E_ADMIN_PASSWORD = "…"
   $env:E2E_OWNER_EMAIL = "owner-e2e@example.com"
   $env:E2E_OWNER_PASSWORD = "…"
   ```

   Bash:

   ```bash
   export E2E_ADMIN_EMAIL=admin@example.com
   export E2E_ADMIN_PASSWORD='…'
   export E2E_OWNER_EMAIL=owner-e2e@example.com
   export E2E_OWNER_PASSWORD='…'
   ```

   Optional: `PLAYWRIGHT_BASE_URL` if the app is not on port 4000.

## Run

From repo root:

```bash
pnpm test:e2e
```

Debug / UI mode:

```bash
pnpm test:e2e:ui
```

## Specs

| File | What it covers |
|------|----------------|
| `dedicated-storage.spec.ts` | Admin toggles **Use dedicated per-owner storage**, owner dashboard storage card, `/owner/storage` dedicated banner vs site-admin panel. |

The dedicated-storage spec runs **serially** and ends by turning dedicated storage **back on** for the owner so local DB state stays convenient for the next run.

## Requirements

- Owner user must not be blocked and should not be forced to change password on login (complete first login manually if your policy requires it).
- Default UI language **English** is assumed for a few role/name matchers (`Users Management`, `Edit User`, `Sign in`). For Hebrew-only admins, extend selectors or force `en` in the app for E2E.
