'use client'

import { useState, useEffect, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage, setCurrentLanguage } = useLanguage()
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const { isComponentVisible } = useTemplateConfig()

  const isActive = (path: string) => pathname === path

  // Get authentication status from NextAuth session
  const isLoggedIn = status === 'authenticated' && !!session
  const userRole = (session?.user as any)?.role || null

  const handleLogout = () => {
    // Use NextAuth's signOut to properly invalidate the session
    signOut({ callbackUrl: '/' })
  }

  const navigation = [
    { name: t('navigation.home'), href: '/' },
    { name: t('navigation.albums'), href: '/albums' },
    ...(isLoggedIn && userRole === 'admin' ? [
      { name: t('navigation.admin'), href: '/admin' }
    ] : [])
  ]

  // Show loading state while config is loading
  if (configLoading) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Loading Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse shrink-0"></div>
                <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Loading Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </nav>
            
            {/* Loading Language Selector */}
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              {config?.logo ? (
                <>
                  <img 
                    src={config.logo} 
                    alt={MultiLangUtils.getTextValue(config?.title, currentLanguage) || 'OpenShutter'} 
                    className="w-10 h-10 object-contain shrink-0"
                    onLoad={() => console.log('Logo loaded successfully:', config.logo)}
                    onError={(e) => console.error('Logo failed to load:', config.logo, e)}
                  />
                </>
              ) : (
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
              <span className="text-xl font-bold text-gray-900">
                {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Language Selector and Authentication Actions */}
            <div className="flex items-center gap-3">
              {/* Only show language selector if more than one language is active and component is enabled */}
              {config?.languages?.activeLanguages && 
               config.languages.activeLanguages.length > 1 && 
               isComponentVisible('languageSelector') && (
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  onLanguageChange={setCurrentLanguage}
                  compact
                />
              )}
              {isComponentVisible('authButtons') && isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    Welcome, {userRole === 'admin' ? 'Admin' : 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : isComponentVisible('authButtons') ? (
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                >
                  {t('auth.signIn')}
                </Link>
              ) : null}
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Authentication Actions */}
              <div className="pt-4 border-t border-gray-200">
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 text-sm text-gray-600">
                      Welcome, {userRole === 'admin' ? 'Admin' : 'User'}
                    </div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-base font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-base font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
