'use client'

import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import AdminGuard from '@/components/AdminGuard'
import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import { MultiLangHTML } from '@/types/multi-lang'

// Dynamic imports for heavy components
const MultiLangHTMLEditor = dynamic(() => import('@/components/MultiLangHTMLEditor'), {
  loading: () => (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
      <p className="text-gray-600 text-center py-8">
        Loading editor...
      </p>
    </div>
  )
})

const EditorDemo = dynamic(() => import('@/components/admin/TiptapTest/EditorDemo'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

export default function TiptapTestPage() {
  const [content, setContent] = useState<MultiLangHTML>({
    en: '<h1>English Content</h1><p>This is a <strong>bold</strong> and <em>italic</em> text with <u>underline</u>.</p><ul><li>First item</li><li>Second item</li></ul>',
    he: '<h1>תוכן עברי</h1><p>זהו טקסט <strong>מודגש</strong> ו<em>נטוי</em> עם <u>קו תחתון</u>.</p><ul><li>פריט ראשון</li><li>פריט שני</li></ul>'
  })

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Tiptap Editor Test</h1>
            
            <div className="space-y-6">
              <Suspense fallback={
                <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <p className="text-gray-600 text-center py-8">Loading editor...</p>
                </div>
              }>
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-3">Multi-Language HTML Editor</h2>
                  <MultiLangHTMLEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Start typing in your preferred language..."
                    height={300}
                    showLanguageTabs={true}
                    defaultLanguage="en"
                  />
                </div>
              </Suspense>

              <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                <EditorDemo content={content} setContent={setContent} />
              </Suspense>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </AdminGuard>
  )
}
