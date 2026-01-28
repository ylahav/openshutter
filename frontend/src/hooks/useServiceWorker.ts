'use client'

import { useEffect, useState } from 'react'
import { logger } from '$lib/utils/logger'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isOnline: boolean
  registration: ServiceWorkerRegistration | null
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true, // Start as online to avoid false offline detection
    registration: null
  })

  useEffect(() => {
    // Initialize online status
    setState(prev => ({ ...prev, isOnline: navigator.onLine }))

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      logger.debug('Service workers not supported')
      return
    }

    setState(prev => ({ ...prev, isSupported: true }))

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        logger.debug('Service Worker registered successfully:', registration)

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration
        }))

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                logger.info('New content available! Please refresh.')
                // You could show a notification here
              }
            })
          }
        })

      } catch (error) {
        logger.error('Service Worker registration failed:', error)
      }
    }

    registerSW()

    // Listen for online/offline events
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return state
}
