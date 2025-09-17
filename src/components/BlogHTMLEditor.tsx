'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils, MultiLangHTML, MultiLangText } from '@/types/multi-lang'
import BlogImageUpload from './BlogImageUpload'

interface BlogHTMLEditorProps {
  value: MultiLangHTML
  onChange: (value: MultiLangHTML) => void
  placeholder?: string
  className?: string
}

export default function BlogHTMLEditor({ 
  value, 
  onChange, 
  placeholder = '',
  className = '' 
}: BlogHTMLEditorProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  const extensions = useMemo(() => [
    StarterKit,
    Image.configure({
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg',
      },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 underline',
      },
    }),
  ], [])

  const editor = useEditor({
    extensions,
    content: MultiLangUtils.getTextValue(value, currentLanguage),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(MultiLangUtils.setValue(value, currentLanguage, html))
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
    immediatelyRender: false, // Fix SSR hydration mismatch
  })

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentContent = MultiLangUtils.getTextValue(value, currentLanguage)
      if (editor.getHTML() !== currentContent) {
        editor.commands.setContent(currentContent)
      }
    }
  }, [value, currentLanguage, editor])

  const insertImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ 
        src: imageUrl, 
        alt: imageAlt || '',
        title: imageAlt || ''
      }).run()
      setImageUrl('')
      setImageAlt('')
      setShowImageUpload(false)
    }
  }

  const handleImageUpload = (imageData: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  } | undefined) => {
    if (imageData && editor) {
      editor.chain().focus().setImage({ 
        src: imageData.url, 
        alt: MultiLangUtils.getTextValue(imageData.alt, currentLanguage),
        title: MultiLangUtils.getTextValue(imageData.alt, currentLanguage)
      }).run()
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title={t('owner.bold')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title={t('owner.italic')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4M8 20h4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4l4 16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
          title={t('owner.strikethrough')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l6 0" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l18 0" />
          </svg>
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
          title={t('owner.heading1')}
        >
          H1
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title={t('owner.heading2')}
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
          title={t('owner.heading3')}
        >
          H3
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title={t('owner.bulletList')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title={t('owner.numberedList')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Links */}
        <button
          type="button"
          onClick={() => {
            const url = window.prompt(t('owner.enterUrl'))
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
          title={t('owner.addLink')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('owner.removeLink')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Images */}
        <button
          type="button"
          onClick={() => setShowImageUpload(!showImageUpload)}
          className="p-2 rounded hover:bg-gray-100"
          title={t('owner.addImage')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 rounded hover:bg-gray-100"
          title={t('owner.addHorizontalRule')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('owner.undo')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('owner.redo')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Image Upload Section */}
      {showImageUpload && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">{t('owner.addImage')}</h4>
            
            {/* Upload New Image */}
            <BlogImageUpload
              onChange={handleImageUpload}
              storageProvider="local"
            />

            {/* Or Insert by URL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('owner.orInsertByUrl')}
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t('owner.enterImageUrl')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder={t('owner.altText')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={insertImage}
                  disabled={!imageUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('owner.insert')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="min-h-[200px]">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none"
        />
      </div>
    </div>
  )
}
