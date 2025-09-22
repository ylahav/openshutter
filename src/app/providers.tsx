'use client'

import { SessionProvider } from 'next-auth/react'
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
