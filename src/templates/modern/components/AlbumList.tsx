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
          return new Date((b.createdAt as any) ?? 0).getTime() - new Date((a.createdAt as any) ?? 0).getTime()
        case 'oldest':
          return new Date((a.createdAt as any) ?? 0).getTime() - new Date((b.createdAt as any) ?? 0).getTime()
        case 'name':
          return String((a.name as any) ?? '').localeCompare(String((b.name as any) ?? ''))
        case 'photos':
          return (b.photoCount ?? 0) - (a.photoCount ?? 0)
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
        <div className="max-w-7xl mx-auto px-6">
          {/* Loading skeleton */}
          <div className="text-center mb-12">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-96 mx-auto animate-pulse"></div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mb-4"></div>
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-2"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
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
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Albums</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (filteredAlbums.length === 0) {
    return (
      <section className={`py-16 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Albums Found</h3>
            <p className="text-gray-600">There are no albums available at the moment.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value as typeof sortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mr-3">
                ⭐
              </span>
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
              <h3 className="text-2xl font-bold text-gray-900 mb-8">All Albums</h3>
            )}
            
            {/* Masonry-style grid */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
              {regularAlbums.map((album) => (
                <div key={album._id} className="break-inside-avoid">
                  <AlbumCard album={album} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Load More Button (if needed) */}
        {filteredAlbums.length >= 12 && (
          <div className="text-center mt-12">
            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
              Load More Albums
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
