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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
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

  const navigation = [
    { name: t('navigation.home'), href: '/' },
    { name: t('navigation.portfolio'), href: '/albums' },
    ...(config?.pages?.about?.enabled === true ? [{ name: t('navigation.about'), href: '/about' }] : []),
    ...(config?.pages?.services?.enabled === true ? [{ name: t('navigation.services'), href: '/services' }] : []),
    // Blog can be enabled later when implemented as a page or list
    ...(config?.pages?.contact?.enabled === true ? [{ name: t('navigation.contact'), href: '/contact' }] : []),
    ...(isLoggedIn && (userRole === 'admin' || userRole === 'owner') ? [
      {
        name: t('navigation.admin'),
        href: userRole === 'admin' ? '/admin' : '/owner'
      }
    ] : [])
  ]

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null
    const prefersDark = typeof window !== 'undefined' ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches : false
    const initialDark = stored ? stored === 'dark' : prefersDark
    setIsDarkMode(initialDark)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', initialDark ? 'dark' : 'light')
    }

    // Listen for theme changes from footer
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail.theme
      const isDark = newTheme === 'dark'
      setIsDarkMode(isDark)
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      }
    }

    window.addEventListener('themeChanged', handleThemeChange as EventListener)
    return () => window.removeEventListener('themeChanged', handleThemeChange as EventListener)
  }, [])

  const toggleTheme = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', next ? 'dark' : 'light')
      // Dispatch custom event to sync with footer
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: next ? 'dark' : 'light' } }))
    }
  }

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
    <header className={`${isDarkMode ? 'text-gray-100' : 'bg-white text-gray-900'} shadow-sm border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} backdrop-blur`} style={isDarkMode ? { backgroundColor: '#111416' } : {}}> 
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
                    onLoad={() => process.env.NODE_ENV === 'development' && console.log('Logo loaded successfully:', config.logo)}
                    onError={(e) => console.error('Logo failed to load:', config.logo, e)}
                  />
                </>
              ) : (
                <div className={`w-10 h-10 ${isDarkMode ? 'bg-primary-500' : 'bg-primary-600'} rounded-lg flex items-center justify-center shrink-0`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
              <span className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
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
                    ? `${isDarkMode ? 'text-primary-300 bg-secondary-800' : 'text-primary-600 bg-primary-50'}`
                    : `${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-secondary-800/70' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
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
              {/* Theme switcher */}
              <button
                aria-label="Toggle theme"
                onClick={toggleTheme}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-md border transition-colors ${isDarkMode ? 'border-secondary-700 text-gray-200 hover:bg-secondary-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  // Moon -> currently dark
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M21.752 15.002A9 9 0 1112.998 2.248a7 7 0 108.754 12.754z" clipRule="evenodd" />
                  </svg>
                ) : (
                  // Sun -> currently light
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm10-7a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm13.657 6.657a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4.222 6.636a1 1 0 010-1.414l.707-.707A1 1 0 116.343 5.93l-.707.707a1 1 0 01-1.414 0zm12.728-2.121a1 1 0 011.414 0l.707.707A1 1 0 0117.95 6.343l-.707-.707a1 1 0 010-1.414zM5.636 18.364a1 1 0 010-1.414l.707-.707A1 1 0 117.757 17.95l-.707.707a1 1 0 01-1.414 0z" />
                  </svg>
                )}
              </button>
              {isComponentVisible('authButtons') && isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Welcome, {getUserDisplayName()}
                  </span>
                  <button
                    onClick={handleLogout}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDarkMode ? 'text-red-200 bg-red-900/30 hover:bg-red-900/50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  >
                    Logout
                  </button>
                </div>
              ) : isComponentVisible('authButtons') ? (
                <Link
                  href="/login"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDarkMode ? 'text-primary-300 bg-secondary-800 hover:bg-secondary-700' : 'text-primary-600 bg-primary-50 hover:bg-primary-100'}`}
                >
                  {t('auth.signIn')}
                </Link>
              ) : null}
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Theme switcher (mobile) */}
            <button
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-md border transition-colors ${isDarkMode ? 'border-secondary-700 text-gray-200 hover:bg-secondary-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M21.752 15.002A9 9 0 1112.998 2.248a7 7 0 108.754 12.754z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm10-7a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm13.657 6.657a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4.222 6.636a1 1 0 010-1.414l.707-.707A1 1 0 116.343 5.93l-.707.707a1 1 0 01-1.414 0zM5.636 18.364a1 1 0 010-1.414l.707-.707A1 1 0 117.757 17.95l-.707.707a1 1 0 01-1.414 0z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`${isDarkMode ? 'text-gray-300 hover:text-white focus:outline-none focus:text-white' : 'text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700'}`}
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
            <div className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? `${isDarkMode ? 'text-primary-300 bg-secondary-800' : 'text-primary-600 bg-primary-50'}`
                      : `${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-secondary-800/70' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Authentication Actions */}
              <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {isLoggedIn ? (
                  <div className="space-y-2">
                    <div className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Welcome, {getUserDisplayName()}
                    </div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-base font-medium rounded-md transition-colors ${isDarkMode ? 'text-red-200 bg-red-900/30 hover:bg-red-900/50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${isDarkMode ? 'text-primary-300 bg-secondary-800 hover:bg-secondary-700' : 'text-primary-600 bg-primary-50 hover:bg-primary-100'}`}
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
