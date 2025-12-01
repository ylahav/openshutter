import { Metadata } from 'next'
import { Suspense } from 'react'
import { siteConfigService } from '@/services/site-config'
import MobileSearchPageContent from '@/components/mobile/MobileSearchPageContent'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await siteConfigService.getConfig()
    return {
      title: `${config.seo.metaTitle} - Mobile Search`,
      description: `Mobile-optimized search through ${config.seo.metaDescription}`,
      keywords: [...config.seo.metaKeywords, 'mobile', 'search', 'photos', 'albums'],
      authors: [{ name: (config.title && (config.title.en || Object.values(config.title)[0])) || 'OpenShutter' }],
      openGraph: {
        title: `${config.seo.metaTitle} - Mobile Search`,
        description: `Mobile-optimized search through ${config.seo.metaDescription}`,
        images: config.seo.ogImage ? [config.seo.ogImage] : [],
      },
    }
  } catch (error) {
    return {
      title: 'Mobile Search - OpenShutter',
      description: 'Mobile-optimized search through photos and albums',
      keywords: ['mobile', 'search', 'photos', 'albums', 'gallery'],
      authors: [{ name: 'OpenShutter Team' }],
    }
  }
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: false,
    themeColor: '#2563eb',
  }
}

export default function MobileSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <MobileSearchPageContent />
    </Suspense>
  )
}
