'use client'

import { useMemo, useState, useEffect } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { X } from '@/lib/icons'
import { AdvancedFilters } from './AdvancedFilterSearch'

interface ActiveFiltersDisplayProps {
  filters: AdvancedFilters
  onRemove: (type: keyof AdvancedFilters, value?: string) => void
  onClearAll: () => void
}

export function ActiveFiltersDisplay({
  filters,
  onRemove,
  onClearAll
}: ActiveFiltersDisplayProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  
  // Load filter data for display names
  const [albumName, setAlbumName] = useState<string | null>(null)
  const [tagNames, setTagNames] = useState<Map<string, string>>(new Map())
  const [peopleNames, setPeopleNames] = useState<Map<string, string>>(new Map())
  
  // Load album name
  useEffect(() => {
    if (filters.albumId) {
      fetch(`/api/albums/${filters.albumId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const name = typeof data.data.name === 'string'
              ? data.data.name
              : MultiLangUtils.getTextValue(data.data.name, currentLanguage)
            setAlbumName(name)
          }
        })
        .catch(() => {})
    } else {
      setAlbumName(null)
    }
  }, [filters.albumId, currentLanguage])
  
  // Load tag names
  useEffect(() => {
    if (filters.tags.length > 0) {
      Promise.all(
        filters.tags.map(tagId =>
          fetch(`/api/tags/${tagId}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data) {
                const name = typeof data.data.name === 'string'
                  ? data.data.name
                  : MultiLangUtils.getTextValue(data.data.name, currentLanguage)
                return { id: tagId, name }
              }
              return null
            })
            .catch(() => null)
        )
      ).then(results => {
        const map = new Map<string, string>()
        results.forEach(result => {
          if (result) map.set(result.id, result.name)
        })
        setTagNames(map)
      })
    } else {
      setTagNames(new Map())
    }
  }, [filters.tags, currentLanguage])
  
  // Load people names
  useEffect(() => {
    if (filters.people.length > 0) {
      Promise.all(
        filters.people.map(personId =>
          fetch(`/api/people/${personId}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data) {
                const fullNameValue: string | { en?: string; he?: string } | undefined = data.data.fullName
                const fullName = fullNameValue
                  ? (typeof fullNameValue === 'string'
                      ? fullNameValue
                      : MultiLangUtils.getTextValue(fullNameValue, currentLanguage))
                  : ''
                const firstNameValue: string | { en?: string; he?: string } | undefined = data.data.firstName
                const firstName = firstNameValue
                  ? (typeof firstNameValue === 'string'
                      ? firstNameValue
                      : MultiLangUtils.getTextValue(firstNameValue, currentLanguage))
                  : ''
                const lastNameValue: string | { en?: string; he?: string } | undefined = data.data.lastName
                const lastName = lastNameValue
                  ? (typeof lastNameValue === 'string'
                      ? lastNameValue
                      : MultiLangUtils.getTextValue(lastNameValue, currentLanguage))
                  : ''
                const name = fullName || `${firstName} ${lastName}`.trim() || 'Unnamed Person'
                return { id: personId, name }
              }
              return null
            })
            .catch(() => null)
        )
      ).then(results => {
        const map = new Map<string, string>()
        results.forEach(result => {
          if (result) map.set(result.id, result.name)
        })
        setPeopleNames(map)
      })
    } else {
      setPeopleNames(new Map())
    }
  }, [filters.people, currentLanguage])
  
  const [locationNames, setLocationNames] = useState<Map<string, string>>(new Map())
  
  // Load location names
  useEffect(() => {
    if (filters.locationIds && filters.locationIds.length > 0) {
      Promise.all(
        filters.locationIds.map(locationId =>
          fetch(`/api/locations/${locationId}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data) {
                const name = data.data.name || data.data.names
                const nameStr = typeof name === 'string'
                  ? name
                  : MultiLangUtils.getTextValue(name, currentLanguage)
                return { id: locationId, name: nameStr }
              }
              return null
            })
            .catch(() => null)
        )
      ).then(results => {
        const map = new Map<string, string>()
        results.forEach(result => {
          if (result) map.set(result.id, result.name)
        })
        setLocationNames(map)
      })
    } else {
      setLocationNames(new Map())
    }
  }, [filters.locationIds, currentLanguage])
  
  const filterPills = useMemo(() => {
    const pills: Array<{ type: keyof AdvancedFilters; label: string; value?: string }> = []
    
    if (filters.albumId && albumName) {
      pills.push({ type: 'albumId', label: albumName })
    }
    
    filters.tags.forEach(tagId => {
      const name = tagNames.get(tagId) || tagId
      pills.push({ type: 'tags', label: name, value: tagId })
    })
    
    filters.people.forEach(personId => {
      const name = peopleNames.get(personId) || personId
      pills.push({ type: 'people', label: name, value: personId })
    })
    
    filters.locationIds.forEach(locationId => {
      const name = locationNames.get(locationId) || locationId
      pills.push({ type: 'locationIds', label: name, value: locationId })
    })
    
    if (filters.dateFrom || filters.dateTo) {
      let dateLabel = ''
      if (filters.dateFrom && filters.dateTo) {
        dateLabel = `${filters.dateFrom} to ${filters.dateTo}`
      } else if (filters.dateFrom) {
        dateLabel = `From ${filters.dateFrom}`
      } else if (filters.dateTo) {
        dateLabel = `To ${filters.dateTo}`
      }
      pills.push({ type: 'dateFrom', label: dateLabel })
    }
    
    return pills
  }, [filters, albumName, tagNames, peopleNames, locationNames])
  
  if (filterPills.length === 0) return null
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700 mr-2">
          {t('search.activeFilters', 'Active filters')}:
        </span>
        {filterPills.map((pill, index) => (
          <button
            key={`${pill.type}-${pill.value || index}`}
            onClick={() => onRemove(pill.type, pill.value)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
          >
            <span>{pill.label}</span>
            <X className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  )
}
