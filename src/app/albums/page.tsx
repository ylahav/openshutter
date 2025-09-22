'use client'

import TemplateWrapper from '@/components/TemplateWrapper'
import DynamicTemplateLoader from '@/components/DynamicTemplateLoader'

export default function AlbumsPage() {
  return (
    <TemplateWrapper pageName="gallery">
      <DynamicTemplateLoader pageName="gallery" />
    </TemplateWrapper>
  )
}
