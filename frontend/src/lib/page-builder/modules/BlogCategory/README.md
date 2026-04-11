# Blog categories (`blogCategory`)

## Purpose

Fetches public blog categories and renders a **list** or **chips** UI with optional counts and links into the articles list (`?category=`).

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang | — | Section heading |
| `categoryAlias` | string | — | Show only this alias |
| `layout` | `'chips'` \| `'list'` | `'chips'` | Presentation |
| `showCount` | boolean | false | Fetch/display article counts |
| `maxItems` | number | 10 | Cap (1–100) |
| `sortBy` | `'name'` \| `'count'` | `'name'` | Sort order |
| `linkToArticles` | boolean | false | Link rows to article list |
| `articlesListPath` | string | `'/blog'` | Base path for links |

Types: `types.ts` (`BlogCategoryLayoutConfig`).

## Classes & tokens for template styles

- **Root:** `<section class="text-[color:var(--tp-fg)]" aria-label="…">`
- **Chips:** `rounded-full border border-[color:var(--tp-border)] … bg-[color:var(--tp-surface-2)]`
- **Links:** `text-[color:var(--os-primary)]`
- **Muted:** `--tp-fg-muted`, `--tp-fg-subtle`
