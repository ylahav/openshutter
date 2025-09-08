'use client'

import { useState, useEffect } from 'react'
import AlbumCard from './AlbumCard'
import { useI18n } from '@/hooks/useI18n'
import { TemplateAlbum } from '@/types/ui'

interface AlbumListProps {
  albums: TemplateAlbum[]
  loading?: boolean
  error?: string | null
  title?: string
  subtitle?: string
  className?: string
  showFeatured?: boolean
}

export default function AlbumList({ 
  albums, 
  loading = false, 
  error = null, 
  title = "Albums",
  subtitle,
  className = '',
  showFeatured = true
}: AlbumListProps) {
  const { t } = useI18n()
  const [filteredAlbums, setFilteredAlbums] = useState<TemplateAlbum[]>(albums)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'photos'>('newest')

  useEffect(() => {
    setFilteredAlbums(albums)
  }, [albums])

  const handleSort = (sortType: typeof sortBy) => {
    setSortBy(sortType)
    const sorted = [...albums].sort((a, b) => {
      switch (sortType) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        case 'photos':
          return b.photoCount - a.photoCount
        default:
          return 0
      }
    })
    setFilteredAlbums(sorted)
  }

  const featuredAlbums = showFeatured ? filteredAlbums.filter(album => album.isFeatured) : []
  const regularAlbums = showFeatured ? filteredAlbums.filter(album => !album.isFeatured) : filteredAlbums

  if (loading) {
    return (
      <section className={`py-16 ${className}`}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Loading skeleton */}
          <div className="text-center mb-12">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={`py-16 ${className}`}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Albums</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (filteredAlbums.length === 0) {
    return (
      <section className={`py-16 ${className}`}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">No Albums Found</h3>
            <p className="text-gray-600">There are no albums available at the moment.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="photos">Most Photos</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            {filteredAlbums.length} {filteredAlbums.length === 1 ? 'album' : 'albums'}
          </div>
        </div>

        {/* Featured Albums Section */}
        {featuredAlbums.length > 0 && (
          <div className="mb-16">
            <h3 className="text-xl font-medium text-gray-900 mb-8 border-b border-gray-200 pb-2">
              Featured Albums
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredAlbums.map((album) => (
                <AlbumCard key={album._id} album={album} />
              ))}
            </div>
          </div>
        )}

        {/* Regular Albums Section */}
        {regularAlbums.length > 0 && (
          <div>
            {featuredAlbums.length > 0 && (
              <h3 className="text-xl font-medium text-gray-900 mb-8 border-b border-gray-200 pb-2">
                All Albums
              </h3>
            )}
            
            {/* Clean grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {regularAlbums.map((album) => (
                <AlbumCard key={album._id} album={album} />
              ))}
            </div>
          </div>
        )}

        {/* Load More Button */}
        {filteredAlbums.length >= 12 && (
          <div className="text-center mt-12">
            <button className="px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-300">
              Load More Albums
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
