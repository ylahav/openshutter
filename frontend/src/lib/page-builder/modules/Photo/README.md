# Photo module (`photo`)

Single image block with optional caption, credit, link and sizing. Placed via the
page-builder grid like any other module.

## Source options

| Source | How |
|--------|-----|
| Upload | Use the **Image URL** field's upload button; the file is stored via `/api/admin/site-config/upload-asset` and the returned URL is written to `src`. |
| Album photo | Paste the public serve URL (`/api/storage/serve/<provider>/<path>`) into **Image URL**. An in-dialog album picker is on the v2 roadmap. |
| External URL | Any `https://…` URL. Goes straight into the `<img>` tag, no proxy. |

## Props

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `src` | string | — | Required. Image URL. |
| `alt` | string \| MultiLangText | falls back to `caption` | Accessibility label. |
| `caption` | string \| MultiLangText | — | Shown beneath the image. |
| `credit` | string \| MultiLangText | — | Italic, after the caption. |
| `href` | string | — | Optional click-through link. |
| `target` | `_self` \| `_blank` | `_self` | Link target. `_blank` adds `rel="noopener noreferrer"`. |
| `aspect` | `auto` \| `square` \| `video` \| `4/3` \| `3/2` \| `21/9` | `auto` | Frame ratio. |
| `fit` | `cover` \| `contain` | `cover` | Only relevant when `aspect` is fixed. |
| `rounded` | `none` \| `sm` \| `md` \| `lg` \| `full` | `none` | Corner radius. `full` = circle (pairs with `square`). |
| `align` | `left` \| `center` \| `right` | `center` | Block alignment inside the cell. |
| `maxWidth` | string | — | CSS value, e.g. `600px` or `40rem`. |
| `captionAlign` | `left` \| `center` \| `right` | `center` | Caption/credit alignment. |

## Instance support

`photo` participates in the generic `moduleInstances` registry. Configure a named
instance at **Admin → Modules**, then set a placement's **Use shared instance**
dropdown to reuse it across pages. Placement-level props (e.g. a per-page
`caption`) override the instance.

## Roadmap

- In-dialog album/photo picker (v2)
- Multi-photo gallery variant (`grid`, `carousel`) — likely a sibling module
  rather than a mode on this one
