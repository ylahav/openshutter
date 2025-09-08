'use client'

import { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import AlbumList from '../components/AlbumList'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface Album {
  _id: string
  name: string
  alias: string
  description: string
  photoCount: number
  coverImage?: string
  isPublic: boolean
  isFeatured: boolean
  createdAt: string
  level: number
  parentAlbumId?: string
}

export default function HomePage() {
  const { t } = useI18n()
  const { isComponentVisible } = useTemplateConfig()
  const [rootAlbums, setRootAlbums] = useState<Album[]>([])
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
          
          // Filter to only public albums
          const publicAlbums = albums.filter((album: Album) => album.isPublic)
          setRootAlbums(publicAlbums)
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
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      {isComponentVisible('hero') && <Hero />}
      
      {/* Root Albums Gallery Section */}
      <AlbumList
        albums={rootAlbums}
        loading={loading}
        error={error}
        title={t('albums.galleryTitle')}
        subtitle={t('albums.gallerySubtitle')}
        className="bg-white"
      />
      
      {/* Footer */}
      <Footer />
    </div>
  )
}
