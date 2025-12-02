'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { useTheme } from 'next-themes'
import { TemplatePhoto } from '@/types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AlbumsSection from '@/components/AlbumsSection'

import styles from '../styles.module.scss'

export default function HomePage() {
  const { config, loading } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const { theme } = useTheme()
  const [leadingPhotos, setLeadingPhotos] = useState<TemplatePhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Load leading photos for hero background
  useEffect(() => {
    const fetchLeadingPhotos = async () => {
      try {
        const response = await fetch('/api/photos/gallery-leading?limit=10')
        if (response.ok) {
          const result = await response.json()
          // Note: /api/photos/gallery-leading may be a Next.js route, handle both formats
          const photos = result.success ? result.data : (Array.isArray(result) ? result : result.data || [])
          if (Array.isArray(photos) && photos.length > 0) {
            setLeadingPhotos(photos)
          }
        }
      } catch (error) {
        console.error('Failed to fetch leading photos:', error)
      }
    }

    fetchLeadingPhotos()
  }, [])

  // Auto-rotate through leading photos
  useEffect(() => {
    if (leadingPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % leadingPhotos.length)
      }, 5000) // Change photo every 5 seconds

      return () => clearInterval(interval)
    }
    return undefined
  }, [leadingPhotos])

  // Show loading state while config is loading
  if (loading) {
    return (
      <div className={`min-h-screen ${styles.theme}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`w-16 h-16 ${styles.loading} rounded-full mx-auto mb-4`}></div>
            <div className={styles.textSecondary}>Loading...</div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${styles.theme}`}>
      <Header />
      
      <main className="flex-1">
        {/* Hero Section with Background Leading Photos */}
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            {leadingPhotos.length > 0 ? (
              <Image
                src={leadingPhotos[currentPhotoIndex]?.url || leadingPhotos[currentPhotoIndex]?.storage?.url || '/placeholder.jpg'}
                alt={leadingPhotos[currentPhotoIndex]?.alt ? MultiLangUtils.getTextValue(leadingPhotos[currentPhotoIndex].alt, currentLanguage) : 'Gallery photo'}
                fill
                className={styles.heroBackgroundImage}
                priority
                sizes="100vw"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className={styles.heroBackgroundFallback}>
                {/* Fallback gradient background when no photos are available */}
              </div>
            )}
            {/* Centered content over background image */}
            <div className={styles.heroContent}>
              <h1 className={`${styles.heroTitle} ${styles.animateFadeInUp}`}>
                {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
              </h1>
              <div 
                className={`${styles.heroSubtitle} ${styles.animateFadeIn}`} 
                style={{ animationDelay: '0.3s' }}
                dangerouslySetInnerHTML={{
                  __html: config?.description ? MultiLangUtils.getHTMLValue(config.description, currentLanguage) : 
                  'A modern photo gallery platform for showcasing your memories with style.'
                }}
              />
            </div>
          </div>
        </section>

        {/* Albums Section */}
        <AlbumsSection />

        {/* About Section - Commented out for now */}
        {/* <section id="about" className={`${styles.section} ${styles.sectionNarrow}`}>
          <h2 className={`${styles.sectionTitle} ${styles.animateFadeInUp}`}>
            About Our Platform
          </h2>
          <p className={`${styles.sectionContent} ${styles.animateFadeIn}`} style={{ animationDelay: '0.2s' }}>
            {config?.description ? MultiLangUtils.getHTMLValue(config.description, currentLanguage) : 
             'OpenShutter is a modern, responsive photo gallery platform designed to showcase your memories with elegance and style. Built with the latest web technologies, it provides a seamless experience across all devices.'}
          </p>
          <div className={styles.animateFadeIn} style={{ animationDelay: '0.4s' }}>
            <Link href="/about" className={styles.button}>
              Learn More
            </Link>
          </div>
        </section> */}

        {/* Features Section - Commented out for now */}
        {/* <section className={`${styles.section} ${styles.bgSecondary}`}>
          <div className="max-w-6xl mx-auto">
            <h2 className={`${styles.sectionTitle} text-center ${styles.animateFadeInUp}`}>
              Why Choose OpenShutter?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className={`text-center ${styles.animateFadeIn}`} style={{ animationDelay: '0.1s' }}>
                <div className={`w-16 h-16 ${styles.accentBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'white' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className={`${styles.heading3} mb-2`}>Beautiful Design</h3>
                <p className={styles.textSecondary}>
                  Modern, responsive design that looks great on any device
                </p>
              </div>
              
              <div className={`text-center ${styles.animateFadeIn}`} style={{ animationDelay: '0.2s' }}>
                <div className={`w-16 h-16 ${styles.accentBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'white' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className={`${styles.heading3} mb-2`}>Fast Performance</h3>
                <p className={styles.textSecondary}>
                  Optimized for speed and performance across all platforms
                </p>
              </div>
              
              <div className={`text-center ${styles.animateFadeIn}`} style={{ animationDelay: '0.3s' }}>
                <div className={`w-16 h-16 ${styles.accentBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'white' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className={`${styles.heading3} mb-2`}>Secure & Reliable</h3>
                <p className={styles.textSecondary}>
                  Enterprise-grade security and reliability for your photos
                </p>
              </div>
            </div>
          </div>
        </section> */}

        {/* Contact Section - Commented out for now */}
        {/* <section id="contact" className={`${styles.section} ${styles.sectionNarrow}`}>
          <h2 className={`${styles.sectionTitle} ${styles.animateFadeInUp}`}>
            Get Started Today
          </h2>
          <p className={`${styles.sectionContent} ${styles.animateFadeIn}`} style={{ animationDelay: '0.2s' }}>
            Ready to showcase your photos with a modern, professional gallery? 
            Get started with OpenShutter today and create stunning photo galleries in minutes.
          </p>
          <div className={styles.animateFadeIn} style={{ animationDelay: '0.4s' }}>
            <Link href="/albums" className={styles.button}>
              Start Creating
            </Link>
          </div>
        </section> */}
      </main>
      
      <Footer />
    </div>
  )
}
