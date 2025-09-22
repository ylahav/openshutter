'use client'

import { useEffect } from 'react'
import { useServiceWorker } from '@/hooks/useServiceWorker'

export default function ServiceWorkerProvider() {
  const { isSupported, isRegistered, isOnline } = useServiceWorker()

  useEffect(() => {
    if (isSupported && isRegistered) {
      console.log('Service Worker is active and ready')
    }
  }, [isSupported, isRegistered])

  return (
    <>
      {/* Show offline indicator when offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 text-sm font-medium z-50">
          📡 You're offline - Some features may be limited
        </div>
      )}
    </>
  )
}
