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

- **Root:** `pb-blogArticle`
- **Section title:** `pb-blogArticle__heading`
- **Loading / empty / error:** `pb-blogArticle__status`
- **List:** `pb-blogArticle__list` · **Card (article or list item):** `pb-blogArticle__card`
- **Media:** `pb-blogArticle__mediaLink`, `pb-blogArticle__image` + `--single` | `--list`
- **Body:** `pb-blogArticle__body` · **Title:** `pb-blogArticle__title` · **Link:** `pb-blogArticle__titleLink` (hover uses `var(--os-primary)`)
- **Date:** `pb-blogArticle__meta` · **Excerpt:** `pb-blogArticle__excerpt` (3-line clamp)
