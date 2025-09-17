'use client'

import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'

export default function ServicesPage() {
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const title = config?.pages?.services?.title ? MultiLangUtils.getTextValue(config.pages.services.title, currentLanguage) || 'Services' : 'Services'
  const content = config?.pages?.services?.content ? MultiLangUtils.getHTMLValue(config.pages.services.content, currentLanguage) || '<p>Our services overview.</p>' : '<p>Our services overview.</p>'
  const enabled = config?.pages?.services?.enabled !== false

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!enabled ? (
          <div className="text-center text-gray-500">This page is currently hidden.</div>
        ) : (
          <article className="prose max-w-none">
            <h1>{title}</h1>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </article>
        )}
      </main>
      <Footer />
    </div>
  )
}
