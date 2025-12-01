'use client'

import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronUp, User } from '@/lib/icons'

interface Person {
  _id: string
  fullName?: string | { en?: string; he?: string }
  firstName?: string | { en?: string; he?: string }
  lastName?: string | { en?: string; he?: string }
}

interface PeopleFilterSectionProps {
  selectedPeople: string[]
  onSelect: (people: string[]) => void
  isExpanded: boolean
  onToggle: () => void
  isAuthenticated?: boolean
}

export function PeopleFilterSection({
  selectedPeople,
  onSelect,
  isExpanded,
  onToggle,
  isAuthenticated = false
}: PeopleFilterSectionProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [people, setPeople] = useState<Person[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Load people
  useEffect(() => {
    const loadPeople = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/people?limit=1000')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setPeople(data.data || [])
          }
        }
      } catch (error) {
        console.error('Failed to load people:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadPeople()
  }, [])
  
  // Filter people based on search query
  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people
    
    const searchLower = searchQuery.toLowerCase()
    return people.filter(person => {
      const fullName = person.fullName 
        ? (typeof person.fullName === 'string' 
            ? person.fullName 
            : MultiLangUtils.getTextValue(person.fullName, currentLanguage))
        : ''
      const firstName = person.firstName 
        ? (typeof person.firstName === 'string' 
            ? person.firstName 
            : MultiLangUtils.getTextValue(person.firstName, currentLanguage))
        : ''
      const lastName = person.lastName 
        ? (typeof person.lastName === 'string' 
            ? person.lastName 
            : MultiLangUtils.getTextValue(person.lastName, currentLanguage))
        : ''
      
      const searchableText = `${fullName} ${firstName} ${lastName}`.toLowerCase()
      return searchableText.includes(searchLower)
    })
  }, [people, searchQuery, currentLanguage])
  
  const togglePerson = (personId: string) => {
    if (selectedPeople.includes(personId)) {
      onSelect(selectedPeople.filter(id => id !== personId))
    } else {
      onSelect([...selectedPeople, personId])
    }
  }
  
  const getPersonDisplayName = (person: Person): string => {
    if (person.fullName) {
      return typeof person.fullName === 'string' 
        ? person.fullName 
        : MultiLangUtils.getTextValue(person.fullName, currentLanguage) || ''
    }
    
    const firstName = person.firstName 
      ? (typeof person.firstName === 'string' 
          ? person.firstName 
          : MultiLangUtils.getTextValue(person.firstName, currentLanguage))
      : ''
    const lastName = person.lastName 
      ? (typeof person.lastName === 'string' 
          ? person.lastName 
          : MultiLangUtils.getTextValue(person.lastName, currentLanguage))
      : ''
    
    return `${firstName} ${lastName}`.trim() || 'Unnamed Person'
  }
  
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {t('search.people', 'People')}
          </span>
          {selectedPeople.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {selectedPeople.length}
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
              placeholder={t('search.filterPeople', 'Filter people...')}
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
          
          {/* People List */}
          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('search.loading', 'Loading...')}
            </div>
          ) : filteredPeople.length > 0 ? (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredPeople.map(person => {
                const isSelected = selectedPeople.includes(person._id)
                const displayName = getPersonDisplayName(person)
                
                return (
                  <div
                    key={person._id}
                    onClick={() => togglePerson(person._id)}
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
                            togglePerson(person._id)
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
              {t('search.noPeopleFound', 'No people found')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
