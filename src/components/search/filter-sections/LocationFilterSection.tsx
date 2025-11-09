'use client'

import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronUp, MapPin } from '@/lib/icons'

interface Location {
  _id: string
  name?: string | { en?: string; he?: string }
  names?: string | { en?: string; he?: string }
}

interface LocationFilterSectionProps {
  selectedLocationIds: string[]
  onSelect: (locationIds: string[]) => void
  isExpanded: boolean
  onToggle: () => void
  isAuthenticated?: boolean
}

export function LocationFilterSection({
  selectedLocationIds,
  onSelect,
  isExpanded,
  onToggle,
  isAuthenticated = false
}: LocationFilterSectionProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [locations, setLocations] = useState<Location[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/locations?limit=1000')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setLocations(data.data || [])
          }
        }
      } catch (error) {
        console.error('Failed to load locations:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadLocations()
  }, [])
  
  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations
    
    const searchLower = searchQuery.toLowerCase()
    return locations.filter(location => {
      const name = location.name || location.names
      if (!name) return false
      
      const nameStr = typeof name === 'string' 
        ? name 
        : MultiLangUtils.getTextValue(name, currentLanguage)
      return nameStr.toLowerCase().includes(searchLower)
    })
  }, [locations, searchQuery, currentLanguage])
  
  const getLocationDisplayName = (location: Location): string => {
    const name = location.name || location.names
    if (!name) return 'Unnamed Location'
    
    return typeof name === 'string' 
      ? name 
      : MultiLangUtils.getTextValue(name, currentLanguage) || 'Unnamed Location'
  }
  
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {t('search.locations', 'Locations')}
          </span>
          {selectedLocationIds.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {selectedLocationIds.length}
            </span>
          )}
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
              placeholder={t('search.filterLocations', 'Filter locations...')}
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
          
          {/* Locations List */}
          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('search.loading', 'Loading...')}
            </div>
          ) : filteredLocations.length > 0 ? (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredLocations.map(location => {
                const isSelected = selectedLocationIds.includes(location._id)
                const displayName = getLocationDisplayName(location)
                
                const toggleLocation = () => {
                  if (isSelected) {
                    onSelect(selectedLocationIds.filter(id => id !== location._id))
                  } else {
                    onSelect([...selectedLocationIds, location._id])
                  }
                }
                
                return (
                  <div
                    key={location._id}
                    onClick={toggleLocation}
                    className={`
                      flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked !== isSelected) {
                            toggleLocation()
                          }
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{displayName}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('search.noLocationsFound', 'No locations found')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
