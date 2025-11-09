'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { useSession } from '@/hooks/useAuth'
import { X, Search } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { AlbumFilterSection } from './filter-sections/AlbumFilterSection'
import { TagFilterSection } from './filter-sections/TagFilterSection'
import { PeopleFilterSection } from './filter-sections/PeopleFilterSection'
import { LocationFilterSection } from './filter-sections/LocationFilterSection'
import { AdvancedFilters } from './AdvancedFilterSearch'

interface SearchPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchPopup({ isOpen, onClose }: SearchPopupProps) {
  const { t } = useI18n()
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated' && !!session
  const [filters, setFilters] = useState<AdvancedFilters>({
    albumId: null,
    tags: [],
    people: [],
    locationIds: [],
    dateFrom: '', // Temporarily disabled
    dateTo: '' // Temporarily disabled
  })
  
  // Section collapse state
  const [sectionsExpanded, setSectionsExpanded] = useState({
    albums: true,
    tags: true,
    people: true,
    locations: true
  })
  
  const handleFilterChange = (newFilters: Partial<AdvancedFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }
  
  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const handleSubmit = () => {
    // Build search URL with filters
    const params = new URLSearchParams()
    
    if (filters.albumId) {
      params.set('albumId', filters.albumId)
    }
    if (filters.tags.length > 0) {
      params.set('tags', filters.tags.join(','))
    }
    if (filters.people.length > 0) {
      params.set('people', filters.people.join(','))
    }
    if (filters.locationIds.length > 0) {
      params.set('locationIds', filters.locationIds.join(','))
    }
    // Date range temporarily disabled
    // if (filters.dateFrom) {
    //   params.set('dateFrom', filters.dateFrom)
    // }
    // if (filters.dateTo) {
    //   params.set('dateTo', filters.dateTo)
    // }
    
    // Navigate to search page with filters
    const searchUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`
    router.push(searchUrl)
    onClose()
  }
  
  const clearAllFilters = () => {
    setFilters({
      albumId: null,
      tags: [],
      people: [],
      locationIds: [],
      dateFrom: '',
      dateTo: ''
    })
  }
  
  const activeFilterCount = 
    (filters.albumId ? 1 : 0) +
    filters.tags.length +
    filters.people.length +
    filters.locationIds.length
    // Date range temporarily disabled
    // + (filters.dateFrom || filters.dateTo ? 1 : 0)
  
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  
  if (!isOpen || !mounted) return null
  
  const popupContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Search className="h-6 w-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {t('search.title', 'Search')}
            </h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Filters */}
            <div className="space-y-4">
              {/* Albums Filter */}
              <AlbumFilterSection
                selectedAlbumId={filters.albumId}
                onSelect={(albumId) => handleFilterChange({ albumId })}
                isExpanded={sectionsExpanded.albums}
                onToggle={() => toggleSection('albums')}
                includePrivate={isAuthenticated}
              />
              
              {/* Tags Filter */}
              <TagFilterSection
                selectedTags={filters.tags}
                onSelect={(tags) => handleFilterChange({ tags })}
                isExpanded={sectionsExpanded.tags}
                onToggle={() => toggleSection('tags')}
                isAuthenticated={isAuthenticated}
              />
              
              {/* People Filter */}
              <PeopleFilterSection
                selectedPeople={filters.people}
                onSelect={(people) => handleFilterChange({ people })}
                isExpanded={sectionsExpanded.people}
                onToggle={() => toggleSection('people')}
                isAuthenticated={isAuthenticated}
              />
              
              {/* Location Filter */}
              <LocationFilterSection
                selectedLocationIds={filters.locationIds}
                onSelect={(locationIds) => handleFilterChange({ locationIds })}
                isExpanded={sectionsExpanded.locations}
                onToggle={() => toggleSection('locations')}
                isAuthenticated={isAuthenticated}
              />
            </div>
            
            {/* Right Column - Active Filters */}
            <div>
              {activeFilterCount > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {t('search.activeFilters', 'Active filters')}
                    </h3>
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filters.albumId && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Album selected
                      </span>
                    )}
                    {filters.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Tag: {tag}
                      </span>
                    ))}
                    {filters.people.map(person => (
                      <span key={person} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {person}
                      </span>
                    ))}
                    {filters.locationIds.map(locId => (
                      <span key={locId} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Location: {locId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-600 hover:text-gray-900"
            disabled={activeFilterCount === 0}
          >
            {t('search.clearAll', 'Clear all')}
          </button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-6"
            >
              {t('search.submit', 'Search')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
  
  return createPortal(popupContent, document.body)
}
