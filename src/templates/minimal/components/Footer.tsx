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
    ]
  }

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand section */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              {config?.logo ? (
                <div className="relative w-8 h-8 rounded overflow-hidden">
                  <Image
                    src={config.logo}
                    alt={MultiLangUtils.getTextValue(config.title, currentLanguage)}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <span className="text-lg font-medium text-gray-900">
                {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
              </span>
            </div>
            <div 
              className="text-gray-600 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: config?.description ? MultiLangUtils.getHTMLValue(config.description, currentLanguage) : 
                '<p>A clean, minimal photo gallery platform for showcasing your memories.</p>'
              }}
            />
          </div>

          {/* Gallery links */}
          {isComponentVisible('footerMenu') && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Gallery</h3>
              <ul className="space-y-2">
                {footerLinks.gallery.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-300"
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
              <h3 className="text-sm font-medium text-gray-900 mb-4">About</h3>
              <ul className="space-y-2">
                {footerLinks.about.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
              © {currentYear} {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}. All rights reserved.
            </div>
            
            <div className="text-sm text-gray-600">
              Powered by OpenShutter
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
