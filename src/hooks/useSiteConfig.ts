"use client"

import { useState, useEffect } from 'react'
import { SiteConfig } from '@/types/site-config'

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/site-config')
        const data = await response.json()
        
        if (data.success) {
          setConfig(data.data)
        } else {
          setError('Failed to load site configuration')
        }
      } catch (err) {
        setError('Failed to load site configuration')
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  return { config, loading, error }
}
