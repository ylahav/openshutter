'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SiteConfig } from '@/types/site-config'

interface SiteConfigContextType {
  config: SiteConfig | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined)

interface SiteConfigProviderProps {
  children: ReactNode
}

export function SiteConfigProvider({ children }: SiteConfigProviderProps) {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/site-config')
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.data)
      } else {
        setError('Failed to load site configuration')
      }
    } catch (err) {
      setError('Failed to load site configuration')
      console.error('Error loading site config:', err)
    } finally {
      setLoading(false)
    }
  }

  const refetch = async () => {
    await loadConfig()
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const value: SiteConfigContextType = {
    config,
    loading,
    error,
    refetch
  }

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfigContext() {
  const context = useContext(SiteConfigContext)
  if (context === undefined) {
    throw new Error('useSiteConfigContext must be used within a SiteConfigProvider')
  }
  return context
}

// Backward compatibility hook that uses the context
export function useSiteConfig() {
  const { config, loading, error } = useSiteConfigContext()
  return { config, loading, error }
}
