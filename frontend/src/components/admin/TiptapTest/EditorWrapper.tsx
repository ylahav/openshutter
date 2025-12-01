'use client'

import { MultiLangHTML } from '@/types/multi-lang'

interface EditorWrapperProps {
  content: MultiLangHTML
  setContent: (content: MultiLangHTML) => void
}

export default function EditorWrapper({ content, setContent }: EditorWrapperProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Multi-Language HTML Editor</h2>
      <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
        <p className="text-gray-600 text-center py-8">
          Editor will load here... (This component would contain the actual MultiLangHTMLEditor)
        </p>
        <p className="text-sm text-gray-500 text-center">
          The heavy Tiptap editor is loaded dynamically to reduce initial bundle size.
        </p>
      </div>
    </div>
  )
}
