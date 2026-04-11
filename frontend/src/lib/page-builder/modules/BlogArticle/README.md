# Blog articles (`blogArticle`)

## Purpose

Shows a **list** of blog posts (with optional category filter) or a **single** article card/summary, driven by public `/api/blog` endpoints.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang | — | Section heading |
| `mode` | `'list'` \| `'single'` | `'list'` | Layout mode |
| `categoryAlias` | string | — | Filter list by category |
| `syncCategoryFromPageUrl` | boolean | true | Use `?category=` from URL when alias unset |
| `slug` | string | — | **Single** mode: article slug |
| `limit` | number | 10 | List page size (1–50) |
| `showImage` | boolean | true | Leading image |
| `showExcerpt` | boolean | true | Text excerpt |
| `showMeta` | boolean | true | Date line |
| `articlePathPrefix` | string | `'/blog'` | Link prefix to article page |

Types: `types.ts` (`BlogArticleLayoutConfig`).

## Classes & tokens for template styles

- **Root:** `<section class="text-[color:var(--tp-fg)]" aria-label="…">`
- **Cards:** `border border-[color:var(--tp-border)] rounded-lg … bg-[color:var(--tp-surface-2)]`
- **Links / hover:** `hover:text-[color:var(--os-primary)]`
- **Meta:** `text-[color:var(--tp-fg-subtle)]`, body `text-[color:var(--tp-fg-muted)]`
