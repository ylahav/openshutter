'use client'

import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { useI18n } from '@/hooks/useI18n'
import { useState } from 'react'

export default function ContactPage() {
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const title = config?.pages?.contact?.title ? MultiLangUtils.getTextValue(config.pages.contact.title, currentLanguage) || 'Contact' : 'Contact'
  const content = config?.pages?.contact?.content ? MultiLangUtils.getHTMLValue(config.pages.contact.content, currentLanguage) || '<p>Reach us via email or phone.</p>' : '<p>Reach us via email or phone.</p>'
  const enabled = config?.pages?.contact?.enabled !== false

  const [form, setForm] = useState({ name: '', email: '', subject: '', request: '', website: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!form.name.trim() || !form.email.trim()) {
      setError(t('contact.validationRequired'))
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      setResult(t('contact.submitted'))
      setForm({ name: '', email: '', subject: '', request: '', website: '' })
    } catch (err: any) {
      setError(err?.message || t('contact.failed'))
    } finally {
      setSubmitting(false)
    }
  }

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
            <div className="mt-8">
              {result && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 text-green-700 px-4 py-3">
                  {result}
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3">
                  {error}
                </div>
              )}
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact.name')}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact.email')}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact.subject')}</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact.request')}</label>
                  <textarea
                    rows={5}
                    value={form.request}
                    onChange={(e) => setForm({ ...form, request: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {submitting ? t('contact.sending') : t('contact.send')}
                  </button>
                </div>
              </form>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  )
}
