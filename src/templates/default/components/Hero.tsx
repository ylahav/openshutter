'use client'

import { useState, useEffect } from 'react'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'

export default function Hero() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([])
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const stored = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(stored === 'dark' || (!stored && prefersDark))
    }

    // Listen for theme changes from header
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail.theme
      const isDark = newTheme === 'dark'
      setIsDarkMode(isDark)
    }

    checkTheme()
    window.addEventListener('storage', checkTheme)
    window.addEventListener('themeChanged', handleThemeChange as EventListener)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkTheme)

    return () => {
      window.removeEventListener('storage', checkTheme)
      window.removeEventListener('themeChanged', handleThemeChange as EventListener)
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', checkTheme)
    }
  }, [])

  // Animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Load gallery-leading photos
  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        const response = await fetch('/api/photos/gallery-leading?limit=3')
        if (response.ok) {
          const data = await response.json()
          if (data?.success && Array.isArray(data.data)) {
            setGalleryPhotos(data.data)
          }
        }
      } catch (err) {
        // noop
      }
    }

    fetchGalleryPhotos()
  }, [])

  // Get site title and description
  const getSiteTitle = () => {
    if (!config?.title) return 'OpenShutter'
    return MultiLangUtils.getTextValue(config.title, currentLanguage) || 'OpenShutter'
  }

  const getSiteDescription = () => {
    if (!config?.description) return 'Capturing moments that matter'
    return MultiLangUtils.getHTMLValue(config.description, currentLanguage) || 'Capturing moments that matter'
  }

  // Get hero background image: prefer gallery-leading photo, then logo, then placeholder
  const getHeroImage = () => {
    const first = galleryPhotos[0]
    const url = first?.storage?.url || first?.storage?.thumbnailPath
    return url || config?.logo || '/api/placeholder/1920/1080'
  }

  if (configLoading) {
    return (
      <section className="relative h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-center">
          <div className="h-16 bg-gray-300 rounded w-96 mb-4"></div>
          <div className="h-6 bg-gray-300 rounded w-64"></div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-visible">
      {/* Background Image with Parallax Effect */}
      <div 
        className="absolute inset-0 z-[-1] bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000 hover:scale-100 pointer-events-none"
        style={{
          backgroundImage: `url(${getHeroImage()})`,
          filter: isDarkMode ? 'brightness(0.4) contrast(1.2)' : 'brightness(0.8) contrast(1.1)'
        }}
      />
      
      {/* Overlay for better text contrast */}
      <div 
        className={`absolute inset-0 z-[-1] pointer-events-none ${
          isDarkMode 
            ? 'bg-black/40' 
            : 'bg-white/30'
        }`}
      />
      
      {/* Content Container */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Site Title with Animation */}
        <h1 
          className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          } ${
            isDarkMode 
              ? 'text-white drop-shadow-2xl' 
              : 'text-gray-900 drop-shadow-lg'
          }`}
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '-0.02em',
            lineHeight: '0.9'
          }}
        >
          <span className="block transform hover:scale-105 transition-transform duration-300">
            {getSiteTitle()}
          </span>
        </h1>
        
        {/* Description/Tagline with Animation */}
        <div 
          className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-light mb-8 max-w-3xl mx-auto transition-all duration-1000 delay-300 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          } ${
            isDarkMode 
              ? 'text-gray-200 drop-shadow-xl' 
              : 'text-gray-700 drop-shadow-md'
          }`}
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.01em',
            lineHeight: '1.4'
          }}
          dangerouslySetInnerHTML={{ __html: getSiteDescription() }}
        />
        
        {/* Call to Action Buttons with Animation */}
        <div 
          className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <a
            href="/albums"
            className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
              isDarkMode
                ? 'bg-white text-gray-900 hover:bg-gray-100 shadow-lg'
                : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'
            }`}
          >
            {t('navigation.portfolio')}
          </a>
          
          {config?.pages?.contact?.enabled && (
            <a
              href="/contact"
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 border-2 ${
                isDarkMode
                  ? 'border-white text-white hover:bg-white hover:text-gray-900'
                  : 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
              }`}
            >
              {t('navigation.contact')}
            </a>
          )}
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div 
        className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-1000 delay-700 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex flex-col items-center">
          <span 
            className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            Scroll to explore
          </span>
          <div 
            className={`w-6 h-10 border-2 rounded-full flex justify-center ${
              isDarkMode ? 'border-gray-300' : 'border-gray-600'
            }`}
          >
            <div 
              className={`w-1 h-3 rounded-full mt-2 animate-bounce ${
                isDarkMode ? 'bg-gray-300' : 'bg-gray-600'
              }`}
            />
          </div>
        </div>
      </div>
      
      {/* Subtle Gradient Overlay for Better Text Readability */}
      <div 
        className={`absolute inset-0 pointer-events-none ${
          isDarkMode
            ? 'bg-gradient-to-b from-transparent via-transparent to-black/20'
            : 'bg-gradient-to-b from-transparent via-transparent to-white/20'
        }`}
      />
    </section>
  )
}
