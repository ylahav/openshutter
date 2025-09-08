'use client'

import { useState, useEffect } from 'react'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import TemplateWrapper from '@/components/TemplateWrapper'
import DynamicTemplateLoader from '@/components/DynamicTemplateLoader'

interface Album {
  _id: string
  name: any // MultiLangText or string
  alias: string
  description: any // MultiLangHTML or string
  photoCount: number
  childAlbumCount?: number
  coverPhotoId?: string
  isPublic: boolean
  isFeatured: boolean
  createdAt: string
  level: number
  order: number
}

export default function AlbumsPage() {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        setLoading(true)
        // Fetch only root albums (no parent)
        const response = await fetch('/api/albums?parentId=root&isPublic=true')
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          const albums = result.data
          
          // Filter to only public albums and sort by order
          const publicAlbums = albums
            .filter((album: Album) => album.isPublic)
            .sort((a: Album, b: Album) => a.order - b.order)
          
          setAlbums(publicAlbums)
        } else {
          setError(result.error || 'Failed to fetch albums')
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error)
        setError('Failed to fetch albums')
      } finally {
        setLoading(false)
      }
    }

    fetchRootAlbums()
  }, [])

  return (
    <TemplateWrapper pageName="gallery">
      <DynamicTemplateLoader pageName="gallery" />
    </TemplateWrapper>
  )
}
