import { Metadata } from 'next'
import { Suspense } from 'react'
import { siteConfigService } from '@/services/site-config'
import SearchPageContent from '@/components/search/SearchPageContent'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await siteConfigService.getConfig()
    return {
      title: `${config.seo.metaTitle} - Search`,
      description: `Search through ${config.seo.metaDescription}`,
      keywords: [...config.seo.metaKeywords, 'search', 'find', 'photos', 'albums'],
      authors: [{ name: (config.title && (config.title.en || Object.values(config.title)[0])) || 'OpenShutter' }],
      openGraph: {
        title: `${config.seo.metaTitle} - Search`,
        description: `Search through ${config.seo.metaDescription}`,
        images: config.seo.ogImage ? [config.seo.ogImage] : [],
      },
    }
  } catch (error) {
    // Fallback to default metadata
    return {
      title: 'Search - OpenShutter',
      description: 'Search through photos and albums in your gallery',
      keywords: ['search', 'photos', 'albums', 'gallery', 'find'],
      authors: [{ name: 'OpenShutter Team' }],
    }
  }
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>}>
      <SearchPageContent />
    </Suspense>
  )
}
