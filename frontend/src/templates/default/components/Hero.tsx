'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/hooks/useI18n'
import styles from '../styles.module.scss'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { TemplatePhoto } from '@/types'
import LazyImage from '@/components/LazyImage'


interface HeroProps {
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
  backgroundImage?: string
}

export default function Hero({
  title,
  subtitle,
  ctaText = "Explore Gallery",
  ctaLink = "/albums",
  backgroundImage
}: HeroProps) {
  const [galleryPhotos, setGalleryPhotos] = useState<TemplatePhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { currentLanguage, isRTL } = useLanguage()
  const { t } = useI18n()
  const { config: siteConfig } = useSiteConfig()

  // Get the correct arrow direction based on RTL
  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"

  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        const response = await fetch('/api/photos/gallery-leading?limit=3')
        if (response.ok) {
          const data = await response.json()
          // Note: /api/photos/gallery-leading may be a Next.js route, handle both formats
          const photos = data.success ? data.data : (Array.isArray(data) ? data : data.data || [])
          setGalleryPhotos(Array.isArray(photos) ? photos : [])
        }
      } catch (error) {
        console.error('Failed to fetch gallery photos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGalleryPhotos()
  }, [])

  // Auto-rotate background photos
  useEffect(() => {
    if (galleryPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length)
      }, 8000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [galleryPhotos.length])

  // Use provided props or fall back to site config (multi-language aware)
  const displayTitle = title || (loading ? '' : (siteConfig?.title ? MultiLangUtils.getTextValue(siteConfig.title, currentLanguage) : '') || t('hero.defaultTitle'))
  const displaySubtitle = subtitle || (loading ? '' : (() => {
    if (siteConfig?.description) {
      // Strip HTML tags for plain text display
      const htmlContent = MultiLangUtils.getHTMLValue(siteConfig.description, currentLanguage)
      return htmlContent.replace(/<[^>]*>/g, '')
    }
    return t('hero.defaultSubtitle')
  })())

  // Get current background image
  const currentPhoto = galleryPhotos[currentPhotoIndex]
  const backgroundImageUrl = backgroundImage || (currentPhoto ? decodeURIComponent(currentPhoto.storage.url) : null)

  // If there are no photos and no explicit background, hide the hero entirely
  if (!loading && !backgroundImageUrl) {
    return null
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary/80">
      {/* Background */}
      {backgroundImageUrl ? (
        <div className="absolute inset-0">
          <LazyImage
            src={backgroundImageUrl}
            alt="Hero background"
            fill
            className="w-full h-full"
            imageClassName="object-cover transition-all duration-1000 ease-in-out"
            priority={currentPhotoIndex === 0}
            sizes="100vw"
            unoptimized={backgroundImageUrl.startsWith('http')}
          />
          {/* Removed gradient overlays to show background photos clearly */}
        </div>
      ) : null}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-center text-foreground">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-lg">{t('loading')}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          {displayTitle}
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
          {displaySubtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={ctaLink}
            className="inline-flex items-center px-8 py-4 bg-background text-foreground font-semibold rounded-lg hover:bg-muted transition-colors duration-300 shadow-lg"
          >
            <span className="mr-2">{ctaText}</span>
            <svg 
              className="w-5 h-5 transition-transform group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getArrowPath()} />
            </svg>
          </Link>
        </div>

        {/* Photo indicators */}
        {galleryPhotos.length > 1 && (
          <div className="flex justify-center mt-12 space-x-2">
            {galleryPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPhotoIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentPhotoIndex 
                    ? 'bg-white' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-px h-12 bg-white/50">
          <div className="w-px h-6 bg-white animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}
