'use client'

import { useState, useEffect, useContext } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'
import { useI18n } from '@/hooks/useI18n'
import { useActiveTemplate } from '@/hooks/useTemplate'
import { useTheme } from 'next-themes'
import { SearchPopup } from '@/components/search/SearchPopup'
import { Search } from '@/lib/icons'
import styles from '../styles.module.scss'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage, setCurrentLanguage } = useLanguage()
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const { template: activeTemplate } = useActiveTemplate()
  const { theme, setTheme } = useTheme()

  const isActive = (path: string) => pathname === path

  // Get authentication status from NextAuth session
  const isLoggedIn = status === 'authenticated' && !!session
  const userRole = (session?.user as any)?.role || null

  const handleLogout = () => {
    // Use NextAuth's signOut to properly invalidate the session
    signOut({ callbackUrl: '/' })
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  // Get header config from active template
  const headerCfg = activeTemplate?.componentsConfig?.header || null

  // Get user name for display
  const getUserDisplayName = () => {
    if (!session?.user) return 'User'
    const userName = (session.user as any)?.name
    if (!userName) return 'User'
    
    // Handle both string and multi-language object names
    if (typeof userName === 'string') {
      return userName
    }
    
    // Extract name from multi-language object
    return MultiLangUtils.getTextValue(userName, currentLanguage) || 'User'
  }

  const baseMenu = headerCfg?.menu && headerCfg.menu.length
    ? headerCfg.menu.map((item: { labelKey?: string; label?: string; href: string }) => ({
        name: item.labelKey ? t(item.labelKey) : (item.label || ''),
        href: item.href
      }))
    : [
        { name: t('navigation.home'), href: '/' },
        { name: t('navigation.albums'), href: '/albums' },
        { name: t('search.title'), href: '/search' },
      ]
  const navigation = [
    ...baseMenu,
    ...(isLoggedIn && (userRole === 'admin' || userRole === 'owner') ? [
      { name: t('navigation.admin'), href: userRole === 'admin' ? '/admin' : '/owner' }
    ] : [])
  ]

  // Show loading state while config is loading
  if (configLoading) {
    return (
      <header className="bg-background shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Loading Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse shrink-0"></div>
                <div className="w-32 h-6 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Loading Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
              <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
            </nav>
            
            {/* Loading Language Selector */}
            <div className="w-20 h-8 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }
  
  return (
    <header className={`${styles.header} shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className={`flex items-center ${styles.logoContainer}`}>
            <Link href="/" className="flex items-center space-x-3">
              {(headerCfg?.showLogo ?? true)
                ? (
                    config?.logo
                      ? (
                        <Image 
                          src={config.logo} 
                          alt={MultiLangUtils.getTextValue(config?.title, currentLanguage) || 'OpenShutter'} 
                          width={40}
                          height={40}
                          className="w-10 h-10 object-contain shrink-0"
                          priority
                        />
                      )
                      : (
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      )
                  )
                : null}
              {(headerCfg?.showSiteTitle ?? true) && (
                <span className="text-xl font-bold text-foreground">
                  {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
                </span>
              )}
            </Link>
          </div>

          {/* Search Icon */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 justify-center">
            <button
              onClick={() => setIsSearchPopupOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center gap-6 ${styles.headerNav}`}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'active'
                    : ''
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Optional Controls */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              {(headerCfg?.enableThemeToggle ?? true) && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`${styles.themeToggle} px-3 py-2 text-sm rounded-md`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
              )}
              {/* Only show language selector if more than one language is active and component is enabled */}
              {config?.languages?.activeLanguages && 
               config.languages.activeLanguages.length > 1 && 
               (headerCfg?.enableLanguageSelector ?? true) && (
                <div className={styles.languageSelector}>
                  <LanguageSelector
                    currentLanguage={currentLanguage}
                    onLanguageChange={setCurrentLanguage}
                    compact
                  />
                </div>
              )}
              {(headerCfg?.showAuthButtons ?? true) && isLoggedIn ? (
                <div className="flex items-center gap-3">
                  {(headerCfg?.showGreeting ?? false) && (
                    <span className="text-sm text-muted-foreground">
                      {t('admin.success') ? t('admin.success') && '' : ''}
                      Welcome, {getUserDisplayName()}
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className={`${styles.logoutButton} px-4 py-2 text-sm font-medium rounded-md`}
                  >
                    Logout
                  </button>
                </div>
              ) : (headerCfg?.showAuthButtons ?? true) ? (
                <Link
                  href="/login"
                  className={`${styles.authButton} px-4 py-2 text-sm font-medium rounded-md`}
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
              className="text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground"
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
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border">
              {/* Mobile Search Bar */}
              <div className="px-3 py-2">
                <SearchBar
                  query=""
                  onSearch={(query) => {
                    handleSearch(query)
                    setIsMobileMenuOpen(false)
                  }}
                  placeholder={t('search.placeholder', 'Search photos and albums...')}
                />
              </div>
              
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Authentication Actions */}
              <div className="pt-4 border-t border-border">
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Welcome, {getUserDisplayName()}
                    </div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-base font-medium text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-base font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
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
      <SearchPopup
        isOpen={isSearchPopupOpen}
        onClose={() => setIsSearchPopupOpen(false)}
      />
    </header>
  )
}
