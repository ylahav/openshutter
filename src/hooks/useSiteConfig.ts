"use client"

import { useSiteConfig as useSiteConfigContext } from '@/contexts/SiteConfigContext'

// Re-export the context hook for backward compatibility
export function useSiteConfig() {
  return useSiteConfigContext()
}
