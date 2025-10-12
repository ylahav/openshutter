'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface SearchBarProps {
  query: string
  onSearch: (query: string) => void
  loading?: boolean
  placeholder?: string
}

export function SearchBar({ 
  query, 
  onSearch, 
  loading = false,
  placeholder 
}: SearchBarProps) {
  const { t } = useI18n()
  const [inputValue, setInputValue] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Update input when query prop changes
  useEffect(() => {
    setInputValue(query)
  }, [query])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(inputValue.trim())
  }
  
  const handleClear = () => {
    setInputValue('')
    onSearch('')
    inputRef.current?.focus()
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur()
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('search.placeholder', 'Search photos and albums...')}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          disabled={loading}
        />
        
        {inputValue && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
      )}
    </form>
  )
}
