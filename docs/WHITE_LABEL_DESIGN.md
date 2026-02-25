# White-Label Design Document (Phase 4 – Solution 1)

**Stage:** 4.1 Design  
**Status:** Design Complete  
**Date:** 2026-02-23

## Overview

This document defines the design for **Solution 1: Clean white-label installation** — one deployment that appears as a completely separate product with no OpenShutter branding visible to end users.

---

## Goals

1. **Branding (global):** Site name, logo, favicon, and colors used consistently (header, login, emails).
2. **Removal of upstream branding:** A config flag hides "OpenShutter" everywhere and replaces it with the configured product name.
3. **Legal/terms:** Configurable terms of service and privacy policy URLs in site config.

---

## Config Schema

### New fields on `SiteConfig`

| Field | Type | Description |
|-------|------|-------------|
| `whiteLabel.hideOpenShutterBranding` | `boolean` | When `true`, all user-facing text uses the site `title` (product name); "OpenShutter" is never shown. Default: `false`. |
| `whiteLabel.termsOfServiceUrl` | `string` (optional) | URL to terms of service. Shown in footer and/or login/register when set. |
| `whiteLabel.privacyPolicyUrl` | `string` (optional) | URL to privacy policy. Shown in footer and/or login/register when set. |

Existing fields already used for branding:

- `title` (MultiLangText) — product name (header, emails, fallback when branding hidden).
- `logo`, `favicon` — already in site config.
- `template.customColors`, `theme` — Theme Builder / site config.

---

## Override Points

| Location | Behavior |
|----------|----------|
| **Header** | Site title from `config.title`; when `hideOpenShutterBranding`, fallback is product name (no "OpenShutter"). |
| **Footer** | Copyright line: "© {year} {productName}". Product name = `getProductName(config, lang)` (title or "OpenShutter" / "Site" per flag). |
| **Login / Register** | Page title and any footer text use product name when branding hidden. |
| **Email templates** | Already support `{{siteTitle}}`; ensure value is from `config.title` when white-label. |
| **Admin shell** | Logo and name from site config (no change; admin may still need to know it’s OpenShutter internally). |
| **Page titles** | All `<title>… - OpenShutter</title>` use product name when branding hidden. |
| **Default footer module** | RichText body may use placeholder `{{productName}}` for copyright line. |

### Product name helper

- **`getProductName(config, lang): string`**
  - If `config.title` is set: return `MultiLangUtils.getTextValue(config.title, lang)`.
  - Else if `config.whiteLabel?.hideOpenShutterBranding`: return `'Site'`.
  - Else: return `'OpenShutter'`.

---

## Legal / Terms

- **Terms of service:** Optional URL in `whiteLabel.termsOfServiceUrl`. Link can appear in footer and on login/register.
- **Privacy policy:** Optional URL in `whiteLabel.privacyPolicyUrl`. Link can appear in footer and on login/register.
- No inline legal text in config for Phase 4; only URLs. Inline text can be added later if needed.

---

## Admin UI

- **Branding tab** (existing) extended with:
  - **White-label**
    - Checkbox: "Hide OpenShutter branding" (`hideOpenShutterBranding`). When checked, all public and email-facing text uses site name only.
    - Optional text inputs: "Terms of service URL", "Privacy policy URL".
- No change to domain or TLS in this solution; one canonical base URL per install (existing `FRONTEND_URL` / `EMAIL_BASE_URL`).

---

## Deliverables

- [x] Design doc (this document).
- [ ] Backend: add `whiteLabel` to `SiteConfig` and defaults; expose in GET/PATCH.
- [ ] Frontend: add `whiteLabel` to types; `getProductName()` helper; use in header, footer, page titles, default footer module.
- [ ] Admin UI: white-label section in Site config (Branding tab).
- [ ] Email: ensure `{{siteTitle}}` uses site config title (already in place; verify when white-label is on).
- [ ] Runbook for white-label deploy (DNS, TLS, config) — short addendum to existing deployment docs.

---

## References

- [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) — White-label solutions (Section 1)
- [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md) — Deployment and env vars
