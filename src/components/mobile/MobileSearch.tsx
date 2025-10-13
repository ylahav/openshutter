'use client'

import { useState, useEffect, useRef } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Search, Filter, X, Camera, MapPin, User, Tag } from 'lucide-react'
import { MobileSearchFilters } from '@/types/search'

interface MobileSearchProps {
  onSearch: (query: string, filters: MobileSearchFilters) => void
  placeholder?: string
  className?: string
}

export default function MobileSearch({
  onSearch,
  placeholder,
  className = ''
}: MobileSearchProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MobileSearchFilters>({
    type: 'all',
    tags: [],
    dateRange: { from: '', to: '' },
    location: ''
  })
  const [isSearching, setIsSearching] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input on mobile when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setIsSearching(true)
    try {
      await onSearch(query, filters)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearSearch = () => {
    setQuery('')
    setFilters({
      type: 'all',
      tags: [],
      dateRange: { from: '', to: '' },
      location: ''
    })
    onSearch('', filters)
  }

  const hasActiveFilters = filters.type !== 'all' || 
    filters.tags.length > 0 || 
    filters.dateRange.from || 
    filters.dateRange.to || 
    filters.location

  return (
    <div className={`mobile-search ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center px-3 py-2 flex-1">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder || t('mobile.search.placeholder', 'Search photos, albums, people...')}
              className="flex-1 text-base bg-transparent border-none outline-none placeholder-gray-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center border-l border-gray-200">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 transition-colors ${
                showFilters || hasActiveFilters 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="p-3 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          {/* Search Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('mobile.search.searchType', 'Search Type')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'all', label: t('mobile.search.all', 'All'), icon: Search },
                { value: 'photos', label: t('mobile.search.photos', 'Photos'), icon: Camera },
                { value: 'albums', label: t('mobile.search.albums', 'Albums'), icon: Tag },
                { value: 'people', label: t('mobile.search.people', 'People'), icon: User },
                { value: 'locations', label: t('mobile.search.locations', 'Locations'), icon: MapPin }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilters(prev => ({ ...prev, type: value as any }))}
                  className={`flex items-center justify-center p-2 rounded-lg border transition-colors ${
                    filters.type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('mobile.search.dateRange', 'Date Range')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, from: e.target.value }
                }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('mobile.search.from', 'From')}
              />
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, to: e.target.value }
                }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('mobile.search.to', 'To')}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('mobile.search.location', 'Location')}
            </label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('mobile.search.locationPlaceholder', 'Enter location name...')}
            />
          </div>

          {/* Filter Actions */}
          <div className="flex space-x-2 pt-2 border-t border-gray-200">
            <button
              onClick={clearSearch}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('mobile.search.clear', 'Clear All')}
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('mobile.search.apply', 'Apply Filters')}
            </button>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.type !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {t(`mobile.search.${filters.type}`, filters.type)}
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.dateRange.from && (
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {t('mobile.search.from', 'From')}: {filters.dateRange.from}
              <button
                onClick={() => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, from: '' }
                }))}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.location && (
            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              {filters.location}
              <button
                onClick={() => setFilters(prev => ({ ...prev, location: '' }))}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
