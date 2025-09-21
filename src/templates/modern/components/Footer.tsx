'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'
import styles from '../styles.module.scss'

export default function Footer() {
  const { config, loading } = useSiteConfig()
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

  // Don't render until config is loaded
  if (loading) {
    return (
      <footer className={styles.footer}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex justify-center">
            <div className={`${styles.loading} animate-pulse`}>Loading...</div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className={styles.footer}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Main footer content - only show if footer menu is enabled */}
        {isComponentVisible('footerMenu') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand section */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                {config?.logo ? (
                  <div className={`relative w-8 h-8 rounded-lg overflow-hidden ring-2 ring-opacity-20 ${styles.accent}`}>
                    <Image
                      src={config.logo}
                      alt={MultiLangUtils.getTextValue(config.title, currentLanguage)}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className={`w-8 h-8 ${styles.accentBg} rounded-lg flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'white' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <span className={`text-lg font-semibold ${styles.theme}`}>
                  {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
                </span>
              </div>
              <div 
                className={`${styles.textSecondary} text-sm leading-relaxed`}
                dangerouslySetInnerHTML={{ 
                  __html: config?.description ? MultiLangUtils.getHTMLValue(config.description, currentLanguage) : 
                  '<p>A modern photo gallery platform for showcasing your memories with style.</p>'
                }}
              />
            </div>

            {/* Gallery links */}
            <div>
              <h3 className={`text-sm font-semibold ${styles.theme} mb-4`}>
                <span className={styles.accent}>
                  Gallery
                </span>
              </h3>
              <ul className="space-y-2">
                {footerLinks.gallery.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className={`text-sm ${styles.textSecondary} hover:${styles.theme} transition-colors duration-300 hover:translate-x-1 transform inline-block`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* About links */}
            <div>
              <h3 className={`text-sm font-semibold ${styles.theme} mb-4`}>
                <span className={styles.accent}>
                  About
                </span>
              </h3>
              <ul className="space-y-2">
                {footerLinks.about.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className={`text-sm ${styles.textSecondary} hover:${styles.theme} transition-colors duration-300 hover:translate-x-1 transform inline-block`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Bottom section - always show copyright and social icons */}
        <div className={`${styles.border} border-t ${isComponentVisible('footerMenu') ? 'pt-8' : 'pt-4'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className={`text-sm ${styles.textMuted}`}>
              © {currentYear} {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}. All rights reserved.
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`text-sm ${styles.textMuted}`}>
                Powered by OpenShutter
              </div>
              
              {/* Social links */}
              <div className="flex items-center space-x-3">
                {config?.contact?.socialMedia?.twitter && (
                  <a href={config.contact.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className={`${styles.textMuted} hover:${styles.theme} transition-colors duration-300`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </a>
                )}
                {config?.contact?.socialMedia?.facebook && (
                  <a href={config.contact.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className={`${styles.textMuted} hover:${styles.theme} transition-colors duration-300`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                {config?.contact?.socialMedia?.instagram && (
                  <a href={config.contact.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className={`${styles.textMuted} hover:${styles.theme} transition-colors duration-300`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                    </svg>
                  </a>
                )}
                {config?.contact?.socialMedia?.linkedin && (
                  <a href={config.contact.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className={`${styles.textMuted} hover:${styles.theme} transition-colors duration-300`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
