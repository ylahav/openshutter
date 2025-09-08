import { Metadata } from 'next'
import { siteConfigService } from '@/services/site-config'
import TemplateWrapper from '@/components/TemplateWrapper'
import DynamicTemplateLoader from '@/components/DynamicTemplateLoader'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await siteConfigService.getConfig()
    return {
      title: config.seo.metaTitle,
      description: config.seo.metaDescription,
      keywords: config.seo.metaKeywords.join(', '),
      authors: [{ name: (config.title && (config.title.en || Object.values(config.title)[0])) || 'OpenShutter' }],
      openGraph: {
        title: config.seo.metaTitle,
        description: config.seo.metaDescription,
        images: config.seo.ogImage ? [config.seo.ogImage] : [],
      },
    }
  } catch (error) {
    // Fallback to default metadata
    return {
      title: 'OpenShutter - Photo Gallery Management System',
      description: 'A comprehensive photo gallery management system with multi-storage support',
      keywords: ['photo gallery', 'image management', 'photography', 'cloud storage'],
      authors: [{ name: 'OpenShutter Team' }],
    }
  }
}

export default function HomePageWrapper() {
  return (
    <TemplateWrapper pageName="home">
      <DynamicTemplateLoader pageName="home" />
    </TemplateWrapper>
  )
}
