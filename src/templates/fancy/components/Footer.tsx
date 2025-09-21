'use client'

import React from 'react'
import Link from 'next/link'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import styles from '../styles.module.scss'

export default function ElegantFooter() {
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()

  const currentYear = new Date().getFullYear()
  const siteTitle = config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'Elegant Photography'

  return (
    <footer 
      className="elegant-footer"
      style={{
        background: 'var(--elegant-charcoal)',
        color: 'var(--elegant-white)',
        padding: '4rem 0 2rem',
        marginTop: 'auto'
      }}
    >
      <div className="elegant-container">
        <div 
          className="elegant-footer-content"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem'
          }}
        >
          {/* Brand Section */}
          <div className="elegant-footer-brand">
            <h3 
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--elegant-gold)',
                margin: '0 0 1rem 0'
              }}
            >
              {siteTitle}
            </h3>
            
            <p 
              style={{
                color: 'var(--elegant-dark-muted)',
                lineHeight: '1.6',
                marginBottom: '2rem'
              }}
            >
              Professional photography services with elegance and sophistication.
            </p>
          </div>

          {/* Quick Links */}
          <div className="elegant-footer-links">
            <h4 
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.2rem',
                fontWeight: '500',
                color: 'var(--elegant-gold)',
                marginBottom: '1.5rem'
              }}
            >
              Quick Links
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/" style={{ color: 'var(--elegant-dark-muted)', textDecoration: 'none' }}>
                Home
              </Link>
              <Link href="/albums" style={{ color: 'var(--elegant-dark-muted)', textDecoration: 'none' }}>
                Gallery
              </Link>
              <Link href="/about" style={{ color: 'var(--elegant-dark-muted)', textDecoration: 'none' }}>
                About
              </Link>
              <Link href="/contact" style={{ color: 'var(--elegant-dark-muted)', textDecoration: 'none' }}>
                Contact
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="elegant-footer-contact">
            <h4 
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.2rem',
                fontWeight: '500',
                color: 'var(--elegant-gold)',
                marginBottom: '1.5rem'
              }}
            >
              Contact
            </h4>
            
            {config?.contact?.email && (
              <p style={{ color: 'var(--elegant-dark-muted)', margin: '0 0 0.5rem 0' }}>
                {config.contact.email}
              </p>
            )}
            
            {config?.contact?.phone && (
              <p style={{ color: 'var(--elegant-dark-muted)', margin: '0 0 0.5rem 0' }}>
                {config.contact.phone}
              </p>
            )}
          </div>
        </div>

        {/* Footer Bottom */}
        <div 
          style={{
            borderTop: '1px solid rgba(212, 175, 55, 0.2)',
            paddingTop: '2rem',
            textAlign: 'center'
          }}
        >
          <p style={{ color: 'var(--elegant-dark-muted)', margin: 0 }}>
            © {currentYear} {siteTitle}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
