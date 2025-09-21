'use client'

import React, { useEffect, useState } from 'react'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import styles from '../styles.module.scss'

interface Photo {
  _id: string
  title: string | Record<string, string>
  storage: {
    url: string
    thumbnailPath?: string
  }
}

const ElegantHero: React.FC = () => {
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        setLoading(true)
        // Fetch gallery leading photos
        const response = await fetch('/api/photos/gallery-leading?limit=5')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setPhotos(data.data || [])
          }
        }
      } catch (error) {
        console.error('Error fetching gallery photos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGalleryPhotos()
  }, [])

  // Auto-rotate photos
  useEffect(() => {
    if (photos.length <= 1) return

    const interval = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [photos.length])

  const title = config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'Elegant Photography'
  const description = config?.description ? MultiLangUtils.getHTMLValue(config.description, currentLanguage) : 'Professional photography services with a focus on elegance, sophistication, and timeless beauty. Specializing in weddings, portraits, and fine art photography.'

  return (
    <section className="elegant-hero">
      {/* Background Image */}
      {!loading && photos.length > 0 && (
        <div className="elegant-hero-bg">
          <img
            key={photos[currentPhotoIndex]._id}
            src={photos[currentPhotoIndex].storage.thumbnailPath || photos[currentPhotoIndex].storage.url}
            alt={typeof photos[currentPhotoIndex].title === 'string' ? photos[currentPhotoIndex].title : MultiLangUtils.getTextValue(photos[currentPhotoIndex].title, currentLanguage)}
            className="elegant-hero-bg-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      {/* Decorative Pattern Overlay */}
      <div className="elegant-hero-pattern"></div>

      {/* Hero Content */}
      <div className="elegant-hero-content">
        <h1 className="elegant-hero-title">
          {title}
        </h1>
        
        <div 
          className="elegant-hero-description"
          dangerouslySetInnerHTML={{ __html: description }}
        />
        
        <div className="elegant-divider"></div>
        
        <a href="/albums" className="elegant-cta-button">
          Explore Gallery
        </a>
      </div>
    </section>
  )
}

export default ElegantHero
