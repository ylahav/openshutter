// Shared UI-facing types used by template components to avoid local duplicates
// These are intentionally minimal projections of backend models for UI needs.

import { MultiLangHTML, MultiLangText } from '@/types/multi-lang'

export interface TemplateAlbum {
  _id: string
  name: string | MultiLangText
  alias: string
  description?: string | MultiLangHTML
  photoCount?: number
  coverImage?: string
  isPublic: boolean
  isFeatured?: boolean
  createdAt?: string | Date
  level?: number
  parentAlbumId?: string
}

export interface TemplatePhoto {
  _id: string
  title?: string | Record<string, string>
  description?: string | Record<string, string>
  storage?: {
    url: string
  }
  albumId?: string
}
