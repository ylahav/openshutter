'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/hooks/useI18n'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTemplateCustomization, getCustomCSSProperties, getDynamicClasses } from '@/hooks/useTemplateCustomization'

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
  const { customization } = useTemplateCustomization()
  const { t } = useI18n()

  // Get the correct arrow direction based on RTL
  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"

  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        const response = await fetch('/api/photos/gallery-leading?limit=6')
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
      }, 5000)
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-blue-500/20 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-cyan-500/10 via-transparent to-purple-500/10"></div>
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-cyan-500/20 rounded-full blur-lg animate-bounce"></div>
        <div className="absolute bottom-40 right-1/3 w-24 h-24 bg-pink-500/20 rounded-full blur-xl animate-pulse"></div>
      </div>

      {/* Background photo overlay */}
      {currentPhoto && (
        <div className="absolute inset-0 opacity-20">
          <Image
            src={currentPhoto.storage.url}
            alt={MultiLangUtils.getTextValue(currentPhoto.title, currentLanguage)}
            fill
            className="object-cover transition-opacity duration-1000"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60"></div>
        </div>
      )}

      {/* Glassmorphism content container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl">
          {/* Main heading with gradient text */}
          <h1 className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent leading-tight">
            {getDisplayTitle()}
          </h1>

          {/* Subtitle with modern typography */}
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            {getDisplaySubtitle()}
          </p>

          {/* CTA Button with modern styling */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href={ctaLink}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                {ctaText}
                <svg 
                  className="w-5 h-5 transition-transform group-hover:translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getArrowPath()} />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>

            {/* Secondary CTA */}
            <Link
              href="/photos"
              className="px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-full hover:bg-white/10 hover:border-white/50 transition-all duration-300 backdrop-blur-sm"
            >
              View All Photos
            </Link>
          </div>
        </div>

        {/* Photo indicators */}
        {galleryPhotos.length > 1 && (
          <div className="flex justify-center mt-12 space-x-3">
            {galleryPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPhotoIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentPhotoIndex 
                    ? 'bg-white scale-125' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}
