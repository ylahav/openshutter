'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { TemplateAlbum } from '@/types'

interface BreadcrumbItem {
  _id: string
  name: string | { [key: string]: string }
  href: string
}

interface AlbumBreadcrumbsProps {
  album: TemplateAlbum
  role?: 'admin' | 'owner' | 'public'
  currentPage?: 'view' | 'edit'
}

export default function AlbumBreadcrumbs({ album, role = 'public', currentPage }: AlbumBreadcrumbsProps) {
  const { currentLanguage } = useLanguage()
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const buildBreadcrumbs = async () => {
      try {
        setLoading(true)
        const items: BreadcrumbItem[] = []
        
        // Determine base path and root name based on role
        let basePath: string
        let rootName: string
        
        if (role === 'admin') {
          basePath = '/admin/albums'
          rootName = 'Albums Management'
        } else if (role === 'owner') {
          basePath = '/owner/albums'
          rootName = 'My Albums'
        } else {
          // Public pages use aliases
          basePath = '/albums'
          rootName = 'Albums'
        }
        
        // Add root
        items.push({
          _id: 'root',
          name: rootName,
          href: basePath
        })

        // Build parent chain
        const parentChain: TemplateAlbum[] = []
        let currentParentId = (album as any).parentAlbumId
        
        while (currentParentId) {
          try {
            const response = await fetch(`/api/albums/${currentParentId}`)
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data) {
                parentChain.push(result.data)
                currentParentId = (result.data as any).parentAlbumId
              } else {
                break
              }
            } else {
              break
            }
          } catch (error) {
            console.error('Failed to fetch parent album:', error)
            break
          }
        }

        // Reverse to get root-to-leaf order and add to breadcrumbs
        parentChain.reverse().forEach(parent => {
          const parentHref = role === 'public' 
            ? `${basePath}/${parent.alias}`
            : `${basePath}/${parent._id}`
          items.push({
            _id: parent._id,
            name: parent.name,
            href: parentHref
          })
        })

        // Add current album
        const currentHref = role === 'public'
          ? `${basePath}/${album.alias}`
          : `${basePath}/${album._id}${currentPage === 'edit' ? '/edit' : ''}`
        items.push({
          _id: album._id,
          name: album.name,
          href: currentHref
        })

        setBreadcrumbs(items)
      } catch (error) {
        console.error('Failed to build breadcrumbs:', error)
        // Fallback to just root and current album
        let basePath: string
        let rootName: string
        
        if (role === 'admin') {
          basePath = '/admin/albums'
          rootName = 'Albums Management'
        } else if (role === 'owner') {
          basePath = '/owner/albums'
          rootName = 'My Albums'
        } else {
          basePath = '/albums'
          rootName = 'Albums'
        }
        
        const currentHref = role === 'public'
          ? `${basePath}/${album.alias}`
          : `${basePath}/${album._id}${currentPage === 'edit' ? '/edit' : ''}`
        
        setBreadcrumbs([
          {
            _id: 'root',
            name: rootName,
            href: basePath
          },
          {
            _id: album._id,
            name: album.name,
            href: currentHref
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    buildBreadcrumbs()
  }, [album, role, currentPage])

  if (loading) {
    return (
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
        <span>Loading...</span>
      </nav>
    )
  }

  return (
    <nav className="flex items-center space-x-2 text-sm mb-2" aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1
        const displayName = typeof item.name === 'string' 
          ? item.name 
          : MultiLangUtils.getTextValue(item.name, currentLanguage)

        return (
          <div key={item._id} className="flex items-center space-x-2">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {isLast ? (
              <span className="text-gray-900 font-semibold">{displayName}</span>
            ) : (
              <Link
                href={item.href}
                className="text-gray-600 hover:text-gray-900 transition-colors hover:underline"
              >
                {displayName}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
