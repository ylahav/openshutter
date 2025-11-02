'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from '@/hooks/useAuth'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'
import { useActiveTemplate } from '@/hooks/useTemplate'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, X, Sun, Moon, User, LogOut, Globe } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const { theme: activeTheme, setTheme: setThemeNext } = useTheme()
  const pathname = usePathname()
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage, setCurrentLanguage } = useLanguage()
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const { isComponentVisible } = useTemplateConfig()
  const { template: activeTemplate } = useActiveTemplate()

  const isActive = (path: string) => pathname === path

  // Get authentication status from NextAuth session
  const isLoggedIn = status === 'authenticated' && !!session
  const userRole = (session?.user as any)?.role || null

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  // Theme management via next-themes
  useEffect(() => {
    const current = (activeTheme as 'light' | 'dark') || 'light'
    setTheme(current)
  }, [activeTheme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeNext(next)
  }

  // Get user name for display
  const getUserDisplayName = () => {
    if (!session?.user) return 'User'
    const userName = (session.user as any)?.name
    if (!userName) return 'User'
    
    if (typeof userName === 'string') {
      return userName
    }
    
    return MultiLangUtils.getTextValue(userName, currentLanguage) || 'User'
  }

  const navigation = [
    { name: t('navigation.home'), href: '/' },
    { name: t('navigation.albums'), href: '/albums' },
    ...(isLoggedIn && (userRole === 'admin' || userRole === 'owner') ? [
      { 
        name: t('navigation.admin'), 
        href: userRole === 'admin' ? '/admin' : '/owner' 
      }
    ] : [])
  ]

  // Show loading state while config is loading
  if (configLoading) {
    return (
      <header className="minimal-header">
        <nav className="minimal-nav">
          <div className="minimal-logo">
            {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
          </div>
          <div className="minimal-actions">
            <div className="minimal-loading-nav">
              <div className="minimal-loading-item"></div>
              <div className="minimal-loading-item"></div>
            </div>
            <div className="minimal-loading-btn"></div>
          </div>
        </nav>
      </header>
    )
  }

  return (
    <header className="minimal-header" style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
    }}>
      <nav className="minimal-nav">
        {/* Logo */}
        <Link href="/" className="minimal-logo">
          {config?.title ? MultiLangUtils.getTextValue(config.title, currentLanguage) : 'OpenShutter'}
        </Link>

        {/* Desktop Navigation */}
        <ul className="minimal-nav-menu">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`minimal-nav-link ${isActive(item.href) ? 'minimal-nav-link-active' : ''}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="minimal-actions">
          {/* Theme Toggle */}
          {activeTemplate?.componentsConfig?.header?.enableThemeToggle && (
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="minimal-btn"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? 'Dark' : 'Light'}
            </Button>
          )}

          {/* Language Selector */}
          {config?.languages?.activeLanguages && 
           config.languages.activeLanguages.length > 1 && 
           activeTemplate?.componentsConfig?.header?.enableLanguageSelector && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="minimal-btn minimal-btn-with-icon"
                  aria-label="Select language"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {currentLanguage.toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="minimal-dropdown">
                {config.languages.activeLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setCurrentLanguage(lang)}
                    className={`minimal-dropdown-item ${currentLanguage === lang ? 'minimal-dropdown-item-active' : ''}`}
                  >
                    {lang.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Authentication */}
          {activeTemplate?.componentsConfig?.header?.showAuthButtons && (
            <>
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="minimal-btn minimal-btn-with-icon"
                    >
                      <User className="h-4 w-4" />
                      {getUserDisplayName()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="minimal-dropdown">
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="minimal-dropdown-item minimal-dropdown-item-danger"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild className="minimal-btn">
                  <Link href="/login">
                    {t('auth.signIn')}
                  </Link>
                </Button>
              )}
            </>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="minimal-mobile-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="minimal-mobile-menu">
          <div className="minimal-mobile-content">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`minimal-mobile-link ${isActive(item.href) ? 'minimal-mobile-link-active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile Authentication Actions */}
            {activeTemplate?.componentsConfig?.header?.showAuthButtons && (
              <div className="minimal-mobile-auth">
                {isLoggedIn ? (
                  <div className="minimal-mobile-auth-content">
                    <div className="minimal-mobile-welcome">
                      Welcome, {getUserDisplayName()}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="minimal-mobile-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="minimal-mobile-login">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t('auth.signIn')}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
