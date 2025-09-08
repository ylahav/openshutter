'use client'

import { useState } from 'react'
import AdminGuard from '@/components/AdminGuard'
import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import { MultiLangHTML } from '@/types/multi-lang'

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

              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Current Content (JSON)</h2>
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-64">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Rendered Content</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-md font-medium text-gray-600 mb-2">English:</h3>
                    <div 
                      className="prose max-w-none p-4 border border-gray-200 rounded-md bg-white"
                      dangerouslySetInnerHTML={{ __html: content.en || '<p>No content</p>' }}
                    />
                  </div>
                  <div>
                    <h3 className="text-md font-medium text-gray-600 mb-2">Hebrew:</h3>
                    <div 
                      className="prose max-w-none p-4 border border-gray-200 rounded-md bg-white"
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: content.he || '<p>אין תוכן</p>' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </AdminGuard>
  )
}
