'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Settings, 
  Database, 
  Palette, 
  FolderOpen, 
  Users, 
  Tag, 
  MapPin, 
  Image, 
  UserCheck, 
  Users2, 
  BarChart3, 
  FileText, 
  Upload, 
  Download,
  LogOut,
  ArrowLeft
} from 'lucide-react'

interface AdminTemplateProps {
  children: React.ReactNode
  title: string
  description?: string
  showBackButton?: boolean
  backHref?: string
  backLabel?: string
}

export default function AdminTemplate({ 
  children, 
  title, 
  description, 
  showBackButton = true,
  backHref = '/admin',
  backLabel
}: AdminTemplateProps) {
  const router = useRouter()
  const { t } = useI18n()
  const { isRTL } = useLanguage()
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect owners to owner dashboard
  useEffect(() => {
    if (mounted && session?.user && (session.user as any)?.role === 'owner') {
      router.push('/owner')
    }
  }, [mounted, session, router])

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  if (session?.user && (session.user as any)?.role === 'owner') {
    return null // Will redirect to owner dashboard
  }

  const adminMenuItems = [
    {
      name: t('admin.siteConfiguration'),
      href: '/admin/site-config',
      icon: Settings,
      description: t('admin.configureGallery')
    },
    {
      name: t('admin.storageManagement'),
      href: '/admin/storage',
      icon: Database,
      description: t('admin.configureStorage')
    },
    {
      name: t('admin.templateManagement'),
      href: '/admin/templates',
      icon: Palette,
      description: t('admin.chooseTemplate')
    },
    {
      name: t('admin.albumsManagement'),
      href: '/admin/albums',
      icon: FolderOpen,
      description: t('admin.createEditAlbums')
    },
    {
      name: t('admin.peopleManagement'),
      href: '/admin/people',
      icon: Users,
      description: t('admin.managePeopleStructuredData')
    },
    {
      name: t('admin.tagsManagement'),
      href: '/admin/tags',
      icon: Tag,
      description: t('admin.manageTagsStructuredData')
    },
    {
      name: t('admin.locationsManagement'),
      href: '/admin/locations',
      icon: MapPin,
      description: t('admin.manageLocationsStructuredData')
    },
    {
      name: t('admin.photosManagement'),
      href: '/admin/photos',
      icon: Image,
      description: t('admin.uploadOrganizePhotos')
    },
    {
      name: t('admin.usersManagement'),
      href: '/admin/users',
      icon: UserCheck,
      description: t('admin.manageUsersRoles')
    },
    {
      name: t('admin.groupsManagement'),
      href: '/admin/groups',
      icon: Users2,
      description: t('admin.defineUserGroups')
    },
    {
      name: t('admin.analytics'),
      href: '/admin/analytics',
      icon: BarChart3,
      description: t('admin.viewStatistics')
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{t('admin.adminPanel')}</h1>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                {t('navigation.home')}
              </Link>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-700">
                  {session?.user?.name || session?.user?.email}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  {t('auth.logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              {showBackButton && (
                <Link
                  href={backHref}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {backLabel || t('admin.backToAdmin')}
                </Link>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-gray-600 mt-2">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {children}
        </div>
      </div>
    </div>
  )
}
