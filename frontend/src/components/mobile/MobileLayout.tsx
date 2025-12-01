'use client'

import { ReactNode } from 'react'
import { useI18n } from '@/hooks/useI18n'
import MobileNavigation from './MobileNavigation'
import ServiceWorkerProvider from '../ServiceWorkerProvider'

interface MobileLayoutProps {
  children: ReactNode
  userRole?: 'admin' | 'owner' | 'guest'
  showNavigation?: boolean
  className?: string
}

export default function MobileLayout({
  children,
  userRole = 'guest',
  showNavigation = true,
  className = ''
}: MobileLayoutProps) {
  const { t } = useI18n()

  return (
    <div className={`mobile-layout min-h-screen bg-gray-50 ${className}`}>
      <ServiceWorkerProvider />
      
      {/* Mobile Navigation */}
      {showNavigation && (
        <MobileNavigation userRole={userRole} />
      )}

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

        {/* Mobile-specific meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OpenShutter" />
        
        {/* Touch icons for iOS */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
        
        {/* Splash screens for iOS */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Android theme color */}
        <meta name="theme-color" content="#2563eb" />
        
        {/* Prevent zoom on input focus (iOS) */}
        <style jsx global>{`
          input[type="text"],
          input[type="email"],
          input[type="password"],
          input[type="search"],
          textarea,
          select {
            font-size: 16px !important;
          }
          
          /* Mobile-specific styles */
          @media (max-width: 768px) {
            .mobile-layout {
              -webkit-overflow-scrolling: touch;
            }
            
            /* Prevent horizontal scroll */
            body {
              overflow-x: hidden;
            }
            
            /* Touch-friendly button sizes */
            button, .btn {
              min-height: 44px;
              min-width: 44px;
            }
            
            /* Better touch targets */
            a, button, input, select, textarea {
              touch-action: manipulation;
            }
            
            /* Smooth scrolling */
            html {
              -webkit-overflow-scrolling: touch;
            }
          }
          
          /* PWA styles */
          @media (display-mode: standalone) {
            .mobile-layout {
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
            }
          }
        `}</style>
    </div>
  )
}
