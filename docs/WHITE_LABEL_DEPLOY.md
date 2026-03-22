# White-label and owner-domain deployment notes

Short runbook for **Phase 4 Stage 1**: Solution 1 (single branded install) and Solution 2 (per-owner custom domains). For full stack setup, start with [`SERVER_DEPLOYMENT.md`](./SERVER_DEPLOYMENT.md) and [`ADMIN_SETUP.md`](./ADMIN_SETUP.md).

## Solution 1: One branded installation

1. **Canonical URLs**  
   Set **`FRONTEND_URL`** to the public site origin (no trailing slash). Set **`EMAIL_BASE_URL`** if email links must use a different host than the main app. Set **`BACKEND_URL`** on the SvelteKit server so API proxying targets the NestJS instance.

2. **Site config (Admin → Site config)**  
   - **Branding:** site title, logo, favicon (global defaults and admin reference).  
   - **White-label:** optional **`productName`** (per language); optional **public-only** **`logo`** / **`favicon`** when the visitor-facing brand should differ from global assets; enable **Hide OpenShutter branding**; set terms/privacy URLs if needed.

3. **TLS**  
   Terminate HTTPS at your reverse proxy or host; ensure cookies and `Secure` flags match your environment.

4. **CORS**  
   Backend **`FRONTEND_URL`** / **`CORS_ORIGINS`** must include your real browser origin(s).

## Solution 2: Owner custom domains

1. **DNS**  
   Point each owner hostname (e.g. `photos.client.com`) to your **frontend** load balancer or server (A/AAAA or CNAME as appropriate).

2. **TLS for customer hosts**  
   Use a wildcard cert, SNI with multiple certs, or an ACME integration that issues per-host certificates. The app does not obtain certificates by itself.

3. **Register the hostname**  
   In **Admin → Users**, edit the **owner** user → **Owner Domains** → add the exact hostname the browser sends (including **port** in local dev, e.g. `sara.localhost:4000`). See [`WHITE_LABEL_DESIGN.md`](./WHITE_LABEL_DESIGN.md) “Testing owner domains on localhost”.

4. **Proxy headers**  
   In production, forward **`Host`** (or **`X-Forwarded-Host`**) from the edge to the NestJS backend so **`SiteContextMiddleware`** resolves the correct owner. The SvelteKit **`backendRequest`** helper forwards the visitor host for server-side API calls.

5. **Content**  
   Public albums, photos, search, CMS pages, and blog list/article APIs are **scoped by owner** when the request host maps to an owner domain (see **`docs/PHASE_4_WORKFLOW.md`** §1.2).

## Optional checks

- Send a **test email** after configuring SMTP (Admin → Site config → Email) and verify **`{{siteTitle}}`** matches **`productName`** or title.  
- After enabling **Hide OpenShutter branding**, spot-check login, footer, and a welcome email.
- **SEO:** On an owner domain, view page source and confirm **`<link rel="canonical">`** and **`og:url`** use that domain’s origin (not the main site URL). Ensure your reverse proxy forwards **`Host`** / **`X-Forwarded-Host`** (and **`X-Forwarded-Proto`** if TLS terminates at the edge) so SSR builds the correct absolute URLs.
