'use client'

import { useState, useEffect } from 'react'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AlbumList from '../components/AlbumList'
import { TemplateAlbum } from '@/types/ui'

interface Album extends TemplateAlbum {
  _id: string
  order: number
}

export default function GalleryPage() {
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
        const response = await fetch('/api/albums?parentId=root')
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          const albums = result.data
          
          // API already handles access control, so we can use all returned albums
          const sortedAlbums = albums.sort((a: Album, b: Album) => a.order - b.order)
          setAlbums(sortedAlbums)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      
      {/* Main Content */}
      <main className="py-16">
        <AlbumList 
          albums={albums}
          loading={loading}
          error={error}
          title={t('albums')}
          subtitle={t('browsePhotoCollections')}
        />
      </main>
      
      <Footer />
    </div>
  )
}
