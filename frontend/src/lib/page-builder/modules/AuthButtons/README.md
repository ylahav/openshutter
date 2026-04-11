# Auth buttons (`authButtons`)

## Purpose

Login link and logout control (or similar) with configurable labels and Tailwind-friendly class strings.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `loginLabel` | string | `'Login'` | Login control label |
| `logoutLabel` | string | `'Logout'` | Logout control label |
| `loginUrl` | string | `'/login'` | Login href |
| `buttonClass` | string | (see config) | Base button utilities |
| `loginButtonClass` | string | — | Login-specific classes |
| `logoutButtonClass` | string | — | Logout-specific classes |
| `containerClass` | string | `'flex items-center gap-2'` | Wrapper flex |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `<div class={containerClass}>` — entirely driven by props so packs can restyle without code changes.
