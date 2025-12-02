'use client'

import { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import AlbumList from '../components/AlbumList'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'
import { TemplateAlbum } from '@/types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from '../styles.module.scss'

export default function HomePage() {
  const { t } = useI18n()
  const { isComponentVisible } = useTemplateConfig()
  const [rootAlbums, setRootAlbums] = useState<TemplateAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        setLoading(true)
        // Fetch only root albums (no parent) - API handles access control
        const response = await fetch('/api/albums?parentId=root')
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const albums = await response.json()
        // Backend returns array directly
        if (Array.isArray(albums)) {
          // API already handles access control, so we can use all returned albums
          setRootAlbums(albums)
        } else {
          setError('Failed to fetch albums')
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
