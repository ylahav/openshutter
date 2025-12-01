'use client'

import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'

export default function HeroSection() {
  const { config, loading } = useSiteConfig()
  const { currentLanguage } = useLanguage()

  if (loading) {
    return (
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
            <p className="text-xl">Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  const title = MultiLangUtils.getTextValue((config as any)?.title, currentLanguage) || 'OpenShutter'
  const description = MultiLangUtils.getTextValue((config as any)?.description, currentLanguage) || 'Capture, organize, and share your photographic journey with our comprehensive gallery management system'
  const primaryColor = config?.theme?.primaryColor || '#0ea5e9'
  const secondaryColor = config?.theme?.secondaryColor || '#64748b'

  return (
    <section 
      className="relative text-white"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
      }}
    >
      {/* Background Image Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Background Image */}
      <div className="absolute inset-0">
        <div 
          className="w-full h-full"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}80 0%, ${secondaryColor}80 100%)`
          }}
        ></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            {title}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto animate-fade-in animation-delay-200">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-400">
            <a 
              href="/albums" 
              className="btn-primary text-lg px-8 py-3"
            >
              Explore Albums
            </a>
            <a 
              href="/photos" 
              className="btn-secondary text-lg px-8 py-3"
            >
              Browse Photos
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
