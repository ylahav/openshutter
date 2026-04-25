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

- **Root:** `pb-blogCategory`
- **Heading / status:** `pb-blogCategory__heading`, `pb-blogCategory__status`
- **List mode:** `pb-blogCategory__list`, `pb-blogCategory__listItem`, `pb-blogCategory__listLink`, `pb-blogCategory__listRow`, `pb-blogCategory__count`
- **Chips:** `pb-blogCategory__chips`, `pb-blogCategory__chip`, `pb-blogCategory__chip--interactive` (links), counts use `pb-blogCategory__count--chip`
