'use client'

import dynamic from 'next/dynamic'
// Lazy-load SessionProvider to avoid Turbopack HMR "module factory not available" issues
const SessionProvider = dynamic(async () => (await import('next-auth/react')).SessionProvider, { ssr: false })
import { SiteConfigProvider } from '@/contexts/SiteConfigContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider'

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <SiteConfigProvider>
        <LanguageProvider>
          <ServiceWorkerProvider />
          {children}
        </LanguageProvider>
      </SiteConfigProvider>
    </SessionProvider>
  )
}
