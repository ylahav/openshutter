'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { MultiLangUtils } from '@/types/multi-lang'
import { ElegantLanguageSelector } from './ElegantLanguageSelector'
import styles from '../styles.module.scss'

const ElegantHeader: React.FC = () => {
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const siteTitle = config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'Elegant Photography'

  const menuItems = [
    { labelKey: 'navigation.home', href: '/' },
    { labelKey: 'navigation.albums', href: '/albums' },
    { labelKey: 'navigation.about', href: '/about' },
    { labelKey: 'navigation.contact', href: '/contact' }
  ]

  return (
    <header 
      className={`elegant-header ${isScrolled ? 'scrolled' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        // Always have a semi-transparent background for contrast, lighter when not scrolled
        background: isScrolled ? 'rgba(250, 249, 247, 0.95)' : 'rgba(250, 249, 247, 0.7)',
        backdropFilter: isScrolled ? 'blur(10px)' : 'blur(5px)',
        borderBottom: isScrolled ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid rgba(212, 175, 55, 0.1)',
        transition: 'all 0.3s ease'
      }}
    >
      <div className="elegant-container">
        <nav 
          className="elegant-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 0',
            minHeight: '80px'
          }}
        >
          {/* Logo and Site Title */}
          <Link 
            href="/" 
            className="elegant-logo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              textDecoration: 'none',
              color: 'var(--elegant-charcoal)',
              transition: 'all 0.3s ease'
            }}
          >
            {config?.logo && (
              <Image 
                src={config.logo} 
                alt={siteTitle}
                width={50}
                height={50}
                style={{
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
                priority
              />
            )}
            <span 
              className="elegant-site-title"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--elegant-charcoal)'
              }}
            >
              {siteTitle}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div 
            className="elegant-nav-menu desktop-only"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem'
            }}
          >
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="elegant-nav-link"
                style={{
                  textDecoration: 'none',
                  color: 'var(--elegant-charcoal)',
                  fontWeight: '500',
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  padding: '0.5rem 0'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--elegant-gold)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--elegant-charcoal)'
                }}
              >
                {t(item.labelKey)}
                <span 
                  className="elegant-nav-underline"
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    width: '0',
                    height: '2px',
                    background: 'var(--elegant-gold)',
                    transition: 'width 0.3s ease'
                  }}
                />
            </Link>
            ))}
          </div>

          {/* Language Selector and Auth Buttons */}
          <div 
            className="elegant-nav-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <ElegantLanguageSelector />

          {/* Theme Toggle */}
            <button
              className="elegant-theme-toggle"
              onClick={() => {
                // Toggle theme logic - you can implement this based on your theme system
                const html = document.documentElement
                const isDark = html.classList.contains('dark')
                if (isDark) {
                  html.classList.remove('dark')
                  localStorage.setItem('theme', 'light')
                } else {
                  html.classList.add('dark')
                  localStorage.setItem('theme', 'dark')
                }
              }}
              style={{
                width: '40px',
                height: '40px',
                background: 'transparent',
                border: '2px solid var(--elegant-gold)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                color: 'var(--elegant-gold)',
                fontSize: '1.2rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--elegant-gold)'
                e.currentTarget.style.color = 'var(--elegant-white)'
                e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--elegant-gold)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              aria-label="Toggle theme"
            >
              <span className="theme-icon">
                {/* Sun icon for light mode */}
                <svg 
                  className="sun-icon"
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                
                {/* Moon icon for dark mode */}
                <svg 
                  className="moon-icon"
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </span>
            </button>
            
            <div 
              className="elegant-auth-buttons"
              style={{
                display: 'flex',
                gap: '0.5rem'
              }}
            >
              <Link
                href="/login"
                className="elegant-auth-link"
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid var(--elegant-gold)',
                  borderRadius: '25px',
                  textDecoration: 'none',
                  color: 'var(--elegant-gold)',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--elegant-gold)'
                  e.currentTarget.style.color = 'var(--elegant-white)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--elegant-gold)'
                }}
              >
                {t('auth.login')}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="elegant-mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span 
                style={{
                  width: '25px',
                  height: '2px',
                  background: 'var(--elegant-charcoal)',
                  transition: 'all 0.3s ease',
                  transform: isMobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
                }}
              />
              <span 
                style={{
                  width: '25px',
                  height: '2px',
                  background: 'var(--elegant-charcoal)',
                  transition: 'all 0.3s ease',
                  opacity: isMobileMenuOpen ? '0' : '1'
                }}
              />
              <span 
                style={{
                  width: '25px',
                  height: '2px',
                  background: 'var(--elegant-charcoal)',
                  transition: 'all 0.3s ease',
                  transform: isMobileMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none'
                }}
              />
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div 
          className={`elegant-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--elegant-cream)',
            borderTop: '1px solid rgba(212, 175, 55, 0.2)',
            padding: '2rem',
            display: isMobileMenuOpen ? 'block' : 'none',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
          }}
        >
          <div 
            className="elegant-mobile-nav-menu"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="elegant-mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  color: 'var(--elegant-charcoal)',
                  fontWeight: '500',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--elegant-gold)'
                  e.currentTarget.style.paddingLeft = '1rem'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--elegant-charcoal)'
                  e.currentTarget.style.paddingLeft = '0'
                }}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .elegant-nav-menu.desktop-only {
            display: none;
          }
          
          .elegant-mobile-menu-button {
            display: flex !important;
          }
          
          .elegant-nav-actions {
            gap: 0.5rem;
          }
          
          .elegant-auth-buttons {
            display: none;
          }
        }
        
        .elegant-nav-link:hover .elegant-nav-underline {
          width: 100%;
        }
      `}</style>
    </header>
  )
}

export default ElegantHeader
