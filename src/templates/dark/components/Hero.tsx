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
  const [configLoading, setConfigLoading] = useState(true)
  const { currentLanguage, isRTL } = useLanguage()
  const { t } = useI18n()

  // Get the correct arrow direction based on RTL
  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"

  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        // First try to get gallery leading photos
        const response = await fetch('/api/photos/gallery-leading?limit=3')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.length > 0) {
            setGalleryPhotos(data.data)
            setLoading(false)
            return
          }
        }
        
        // If no gallery leading photos, try to get recent photos from albums
        const recentResponse = await fetch('/api/photos?limit=3&sort=uploadedAt&order=desc')
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          if (recentData.success && recentData.data.length > 0) {
            setGalleryPhotos(recentData.data)
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
      } finally {
        setConfigLoading(false)
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
    if (configLoading) return '' // Don't show fallback while loading
    if (siteConfig?.title) {
      return MultiLangUtils.getTextValue(siteConfig.title, currentLanguage)
    }
    return t('hero.title')
  }

  const getDisplaySubtitle = () => {
    if (subtitle) return subtitle
    if (configLoading) return '' // Don't show fallback while loading
    if (siteConfig?.description) {
      // Strip HTML tags for plain text display
      const htmlContent = MultiLangUtils.getHTMLValue(siteConfig.description, currentLanguage)
      return htmlContent.replace(/<[^>]*>/g, '')
    }
    return t('hero.subtitle')
  }

  const currentPhoto = galleryPhotos[currentPhotoIndex]

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          animation: 'float 20s ease-in-out infinite'
        }}></div>
      </div>

      {/* Background photo overlay with dark overlay */}
      {currentPhoto && (
        <div className="absolute inset-0">
          <Image
            src={currentPhoto.storage.url}
            alt={MultiLangUtils.getTextValue(currentPhoto.title, currentLanguage)}
            fill
            className="object-cover opacity-20 transition-opacity duration-2000"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
        </div>
      )}

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Main heading with glow effect */}
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
            {configLoading ? (
              <span className="inline-block w-64 h-16 bg-gray-700/50 rounded animate-pulse"></span>
            ) : (
              getDisplayTitle()
            )}
          </span>
        </h1>

        {/* Subtitle with subtle glow */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed font-light drop-shadow-lg">
          {configLoading ? (
            <span className="inline-block w-96 h-8 bg-gray-700/50 rounded animate-pulse mx-auto"></span>
          ) : (
            getDisplaySubtitle()
          )}
        </p>

        {/* CTA Button with dark theme */}
        <div className="flex justify-center">
          <Link
            href={ctaLink}
            className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105"
          >
            <span className="mr-3 text-lg">{ctaText}</span>
            <svg 
              className="w-5 h-5 transition-transform group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getArrowPath()} />
            </svg>
            
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10"></div>
          </Link>
        </div>

        {/* Photo indicators with dark theme */}
        {galleryPhotos.length > 1 && (
          <div className="flex justify-center mt-16 space-x-3">
            {galleryPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPhotoIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentPhotoIndex 
                    ? 'bg-white shadow-lg shadow-white/50' 
                    : 'bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll indicator with dark theme */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/50 to-transparent">
          <div className="w-px h-8 bg-white animate-pulse"></div>
        </div>
      </div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
    </section>
  )
}
