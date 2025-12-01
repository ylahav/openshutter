'use client'

import TemplateWrapper from '@/components/TemplateWrapper'
import DynamicTemplateLoader from '@/components/DynamicTemplateLoader'

export default function LoginPage() {
  return (
    <TemplateWrapper pageName="login">
      <DynamicTemplateLoader pageName="login" />
    </TemplateWrapper>
  )
}
