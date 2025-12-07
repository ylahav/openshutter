/**
 * React hook for accessing theme from Svelte store
 * This is a compatibility layer for React components that still need theme access
 * 
 * Note: This hook accesses the Svelte theme store, so it works in both Next.js and SvelteKit contexts
 */

import { useEffect, useState } from 'react'
import { get } from 'svelte/store'
import { themeStore, resolvedTheme, setTheme as setThemeStore, toggleTheme as toggleThemeStore } from '$lib/stores/theme'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get initial value from store
    if (typeof window !== 'undefined') {
      return get(themeStore) as Theme
    }
    return 'system'
  })

  const [resolved, setResolvedState] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return get(resolvedTheme)
    }
    return 'light'
  })

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribeTheme = themeStore.subscribe((value) => {
      setThemeState(value as Theme)
    })

    const unsubscribeResolved = resolvedTheme.subscribe((value) => {
      setResolvedState(value)
    })

    return () => {
      unsubscribeTheme()
      unsubscribeResolved()
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeStore(newTheme)
  }

  const toggleTheme = () => {
    toggleThemeStore()
  }

  return {
    theme: resolved, // Return resolved theme (light/dark) for compatibility
    setTheme,
    toggleTheme,
    systemTheme: theme === 'system' ? resolved : theme
  }
}
