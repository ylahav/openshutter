'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/hooks/useI18n'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'

interface Photo {
  _id: string
  title: Record<string, string> | string
  storage: {
    url: string
    path: string
    provider: string
  }
}

interface SiteConfig {
  title: any
  description: any
}

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
  const [galleryPhotos, setGalleryPhotos] = useState<Photo[]>([])
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { currentLanguage, isRTL } = useLanguage()
  const { t } = useI18n()

  // Get the correct arrow direction based on RTL
  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"

  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        const response = await fetch('/api/photos/gallery-leading?limit=3')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setGalleryPhotos(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch gallery photos:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchSiteConfig = async () => {
      try {
        const response = await fetch('/api/site-config')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSiteConfig(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch site config:', error)
      }
    }

    fetchGalleryPhotos()
    fetchSiteConfig()
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

  const getDisplayTitle = () => {
    if (title) return title
    if (siteConfig?.title) {
      return MultiLangUtils.getTextValue(siteConfig.title, currentLanguage)
    }
    return t('hero.title')
  }

  const getDisplaySubtitle = () => {
    if (subtitle) return subtitle
    if (siteConfig?.description) {
      // Strip HTML tags for plain text display
      const htmlContent = MultiLangUtils.getHTMLValue(siteConfig.description, currentLanguage)
      return htmlContent.replace(/<[^>]*>/g, '')
    }
    return t('hero.subtitle')
  }

  const currentPhoto = galleryPhotos[currentPhotoIndex]

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      {/* Background photo overlay - very subtle */}
      {currentPhoto && (
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <Image
            src={currentPhoto.storage.url}
            alt={MultiLangUtils.getTextValue(currentPhoto.title, currentLanguage)}
            fill
            className="object-cover transition-opacity duration-2000"
            priority
          />
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-8 leading-tight tracking-tight">
          {getDisplayTitle()}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
          {getDisplaySubtitle()}
        </p>

        {/* CTA Button */}
        <div className="flex justify-center">
          <Link
            href={ctaLink}
            className="group inline-flex items-center px-8 py-4 border-2 border-gray-900 text-gray-900 font-medium hover:bg-gray-900 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <span className="mr-3">{ctaText}</span>
            <svg 
              className="w-4 h-4 transition-transform group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getArrowPath()} />
            </svg>
          </Link>
        </div>

        {/* Photo indicators - minimal */}
        {galleryPhotos.length > 1 && (
          <div className="flex justify-center mt-16 space-x-2">
            {galleryPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPhotoIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentPhotoIndex 
                    ? 'bg-gray-900' 
                    : 'bg-gray-300 hover:bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll indicator - minimal */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-px h-12 bg-gray-300">
          <div className="w-px h-6 bg-gray-900 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}
