import { Metadata } from 'next'
import { siteConfigService } from '@/services/site-config'
import TemplateWrapper from '@/components/TemplateWrapper'
import DynamicTemplateLoader from '@/components/DynamicTemplateLoader'

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
    <TemplateWrapper pageName="search">
      <DynamicTemplateLoader pageName="search" />
    </TemplateWrapper>
  )
}
