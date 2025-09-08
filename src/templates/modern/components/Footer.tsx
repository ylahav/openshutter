'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'

export default function Footer() {
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const { isComponentVisible } = useTemplateConfig()

  const currentYear = new Date().getFullYear()

  const footerLinks = {
    gallery: [
      { name: t('navigation.home'), href: '/' },
      { name: t('navigation.albums'), href: '/albums' },
      { name: 'Featured Photos', href: '/photos?featured=true' },
      { name: 'Recent Uploads', href: '/photos?recent=true' }
    ],
    about: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' }
    ],
    social: [
      { name: 'Instagram', href: '#', icon: 'instagram' },
      { name: 'Facebook', href: '#', icon: 'facebook' },
      { name: 'Twitter', href: '#', icon: 'twitter' },
      { name: 'YouTube', href: '#', icon: 'youtube' }
    ]
  }

  const getSocialIcon = (iconName: string) => {
    const icons = {
      instagram: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.781c-.49 0-.98-.49-.98-.98s.49-.98.98-.98.98.49.98.98-.49.98-.98.98z"/>
        </svg>
      ),
      facebook: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      twitter: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      ),
      youtube: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    }
    return icons[iconName as keyof typeof icons] || null
  }

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              {config?.logo ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                  <Image
                    src={config.logo}
                    alt={MultiLangUtils.getTextValue(config.title, currentLanguage)}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
              </span>
            </div>
            <div 
              className="text-gray-300 mb-6 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: config?.description ? MultiLangUtils.getHTMLValue(config.description, currentLanguage) : 
                '<p>A modern, beautiful photo gallery platform for showcasing your memories and moments.</p>'
              }}
            />
            
            {/* Social links */}
            <div className="flex space-x-4">
              {footerLinks.social.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-300"
                >
                  {getSocialIcon(social.icon)}
                </Link>
              ))}
            </div>
          </div>

          {/* Gallery links */}
          {isComponentVisible('footerMenu') && (
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Gallery</h3>
              <ul className="space-y-3">
                {footerLinks.gallery.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About links */}
          {isComponentVisible('footerMenu') && (
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">About</h3>
              <ul className="space-y-3">
                {footerLinks.about.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Newsletter signup */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Stay Updated</h3>
            <p className="text-gray-300 mb-4">
              Subscribe to get the latest updates and featured galleries.
            </p>
            <div className="flex flex-col space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}. All rights reserved.
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>Powered by OpenShutter</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
