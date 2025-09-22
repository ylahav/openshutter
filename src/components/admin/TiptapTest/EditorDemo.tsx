'use client'

import { useState } from 'react'
import { MultiLangHTML } from '@/types/multi-lang'

interface EditorDemoProps {
  content: MultiLangHTML
  setContent: (content: MultiLangHTML) => void
}

export default function EditorDemo({ content, setContent }: EditorDemoProps) {
  return (
    <div className="space-y-6">
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
  )
}
