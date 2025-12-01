'use client'

import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, Folder } from '@/lib/icons'

interface Album {
  _id: string
  name: string | { en?: string; he?: string }
  photoCount: number
  children?: Album[]
  level?: number
}

interface AlbumFilterSectionProps {
  selectedAlbumId: string | null
  onSelect: (albumId: string | null) => void
  isExpanded: boolean
  onToggle: () => void
  includePrivate?: boolean
}

export function AlbumFilterSection({
  selectedAlbumId,
  onSelect,
  isExpanded,
  onToggle,
  includePrivate = false
}: AlbumFilterSectionProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [albums, setAlbums] = useState<Album[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Helper function to get all child album IDs recursively
  const getAllChildAlbumIds = (node: Album): string[] => {
    const ids: string[] = [node._id]
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        ids.push(...getAllChildAlbumIds(child))
      })
    }
    return ids
  }
  
  // Load albums hierarchy
  useEffect(() => {
    const loadAlbums = async () => {
      setLoading(true)
      try {
        const url = `/api/albums/hierarchy${includePrivate ? '?includePrivate=true' : ''}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAlbums(data.data || [])
          }
        }
      } catch (error) {
        console.error('Failed to load albums:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadAlbums()
  }, [includePrivate])
  
  // Filter albums based on search query
  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums
    
    const searchLower = searchQuery.toLowerCase()
    
    const filterTree = (nodes: Album[]): Album[] => {
      return nodes
        .map(node => {
          const name = typeof node.name === 'string' 
            ? node.name 
            : MultiLangUtils.getTextValue(node.name, currentLanguage)
          const nameLower = name.toLowerCase()
          
          // Check if this node matches
          const nodeMatches = nameLower.includes(searchLower)
          
          // Filter children recursively
          const filteredChildren = node.children ? filterTree(node.children) : []
          
          // If node matches or has matching children, include it
          if (nodeMatches || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren.length > 0 ? filteredChildren : node.children
            }
          }
          
          return null
        })
        .filter(Boolean) as Album[]
    }
    
    return filterTree(albums)
  }, [albums, searchQuery, currentLanguage])
  
  const renderAlbumTree = (nodes: Album[], level = 0): React.ReactElement[] => {
    return nodes.map(node => {
      const name = typeof node.name === 'string' 
        ? node.name 
        : MultiLangUtils.getTextValue(node.name, currentLanguage)
      const isSelected = selectedAlbumId === node._id
      
      const handleSelect = () => {
        if (isSelected) {
          onSelect(null)
        } else {
          // When selecting, pass the parent album ID
          // The search API will handle including children
          onSelect(node._id)
        }
      }
      
      return (
        <div key={node._id}>
          <div
            onClick={handleSelect}
            className={`
              flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors
              ${isSelected 
                ? 'bg-blue-100 text-blue-900' 
                : 'hover:bg-gray-100 text-gray-700'
              }
            `}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Folder className="h-4 w-4 shrink-0" />
              <span className="truncate">{name || 'Unnamed Album'}</span>
            </div>
            {node.photoCount !== undefined && (
              <span className="text-xs text-gray-500 ml-2 shrink-0">
                ({node.photoCount})
              </span>
            )}
          </div>
          {node.children && node.children.length > 0 && (
            <div className="ml-4">
              {renderAlbumTree(node.children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }
  
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {t('search.albums', 'Albums')}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder={t('search.filterAlbums', 'Filter albums...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm pl-8"
            />
            <svg
              className="absolute left-2.5 top-2 h-3 w-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          {/* Album Tree */}
          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('search.loading', 'Loading...')}
            </div>
          ) : filteredAlbums.length > 0 ? (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {renderAlbumTree(filteredAlbums)}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('search.noAlbumsFound', 'No albums found')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
