'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { signOut } from '@/hooks/useAuth'
import { 
  Home, 
  Search, 
  Camera, 
  User, 
  Settings, 
  Menu, 
  X,
  Upload,
  Grid3X3,
  Users,
  MapPin,
  Tag
} from 'lucide-react'

interface MobileNavigationProps {
  userRole?: 'admin' | 'owner' | 'guest'
  className?: string
}

export default function MobileNavigation({ 
  userRole = 'guest', 
  className = '' 
}: MobileNavigationProps) {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const navigationItems = [
    {
      name: t('mobile.nav.home', 'Home'),
      href: '/',
      icon: Home,
      show: true
    },
    {
      name: t('mobile.nav.search', 'Search'),
      href: '/search',
      icon: Search,
      show: true
    },
    {
      name: t('mobile.nav.albums', 'Albums'),
      href: '/albums',
      icon: Grid3X3,
      show: true
    },
    {
      name: t('mobile.nav.upload', 'Upload'),
      href: '/photos/upload',
      icon: Upload,
      show: userRole === 'admin' || userRole === 'owner'
    },
    {
      name: t('mobile.nav.people', 'People'),
      href: '/admin/people',
      icon: Users,
      show: userRole === 'admin'
    },
    {
      name: t('mobile.nav.locations', 'Locations'),
      href: '/admin/locations',
      icon: MapPin,
      show: userRole === 'admin'
    },
    {
      name: t('mobile.nav.tags', 'Tags'),
      href: '/admin/tags',
      icon: Tag,
      show: userRole === 'admin'
    },
    {
      name: t('mobile.nav.dashboard', 'Dashboard'),
      href: userRole === 'admin' ? '/admin' : '/owner',
      icon: Settings,
      show: userRole === 'admin' || userRole === 'owner'
    }
  ]

  const filteredItems = navigationItems.filter(item => item.show)

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header */}
      <header className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-200
        ${isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}
        ${className}
      `}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="text-xl font-bold text-gray-900"
            >
              OpenShutter
            </button>
          </div>

          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Mobile Menu */}
      <div className={`
        fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('mobile.nav.menu', 'Menu')}
            </h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href)
                      setIsMenuOpen(false)
                    }}
                    className={`
                      w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors
                      ${active 
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Menu Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-2">
              <button
                onClick={() => {
                  router.push('/login')
                  setIsMenuOpen(false)
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('mobile.nav.login', 'Login')}
              </button>
              
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/' })
                  setIsMenuOpen(false)
                }}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('mobile.nav.logout', 'Logout')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation (for main sections) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {[
            { href: '/', icon: Home, label: t('mobile.nav.home', 'Home') },
            { href: '/search', icon: Search, label: t('mobile.nav.search', 'Search') },
            { href: '/albums', icon: Grid3X3, label: t('mobile.nav.albums', 'Albums') },
            { href: '/photos/upload', icon: Upload, label: t('mobile.nav.upload', 'Upload'), show: userRole === 'admin' || userRole === 'owner' },
            { href: userRole === 'admin' ? '/admin' : '/owner', icon: Settings, label: t('mobile.nav.dashboard', 'Dashboard'), show: userRole === 'admin' || userRole === 'owner' }
          ].filter(item => item.show !== false).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`
                  flex flex-col items-center py-2 px-3 rounded-lg transition-colors
                  ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Spacer for fixed header */}
      <div className="h-16" />
      
      {/* Spacer for bottom navigation */}
      <div className="h-16" />
    </>
  )
}
