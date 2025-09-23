import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'OpenShutter - Photo Gallery Management System',
  description: 'A comprehensive photo gallery management system with multi-storage support, advanced organization features, and beautiful presentations.',
  keywords: ['photo gallery', 'image management', 'photo organization', 'cloud storage', 'google drive', 'aws s3'],
  authors: [{ name: 'OpenShutter Team' }],
  creator: 'OpenShutter Team',
  publisher: 'OpenShutter',
  robots: 'index, follow',
  manifest: '/manifest.json',
  openGraph: {
    title: 'OpenShutter - Photo Gallery Management System',
    description: 'A comprehensive photo gallery management system with multi-storage support.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenShutter - Photo Gallery Management System',
    description: 'A comprehensive photo gallery management system with multi-storage support.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
