'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import ListItem from '@tiptap/extension-list-item'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Heading from '@tiptap/extension-heading'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import HardBreak from '@tiptap/extension-hard-break'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Link from '@tiptap/extension-link'
import { useCallback, useEffect, useState } from 'react'

interface TiptapHTMLEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  isRTL?: boolean
  className?: string
}

export default function TiptapHTMLEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  height = 200,
  isRTL = false,
  className = ''
}: TiptapHTMLEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable some default extensions we'll configure individually
        heading: false,
        bold: false,
        italic: false,
        strike: false,
        code: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        hardBreak: false,
        horizontalRule: false,
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Bold,
      Italic,
      Strike,
      Underline,
      Code,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      BulletList,
      OrderedList,
      ListItem,
      HardBreak,
      HorizontalRule,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${isRTL ? 'rtl' : 'ltr'}`,
        dir: isRTL ? 'rtl' : 'ltr',
        style: `min-height: ${height}px;`,
      },
    },
    immediatelyRender: false,
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  // Update direction when isRTL changes
  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom as HTMLElement
      editorElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
      editorElement.className = editorElement.className.replace(/rtl|ltr/g, isRTL ? 'rtl' : 'ltr')
    }
  }, [editor, isRTL])

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run()
  }, [editor])

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run()
  }, [editor])

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run()
  }, [editor])

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run()
  }, [editor])

  const toggleCode = useCallback(() => {
    editor?.chain().focus().toggleCode().run()
  }, [editor])

  const setHeading = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    editor?.chain().focus().toggleHeading({ level }).run()
  }, [editor])

  const setParagraph = useCallback(() => {
    editor?.chain().focus().setParagraph().run()
  }, [editor])

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run()
  }, [editor])

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run()
  }, [editor])

  const setTextAlign = useCallback((alignment: 'left' | 'center' | 'right') => {
    editor?.chain().focus().setTextAlign(alignment).run()
  }, [editor])

  const insertHorizontalRule = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run()
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const unsetLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run()
  }, [editor])

  const openLinkDialog = useCallback(() => {
    if (!editor) return
    
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')
    const url = editor.getAttributes('link').href || ''
    
    setLinkText(text)
    setLinkUrl(url)
    setShowLinkDialog(true)
  }, [editor])

  const handleLinkSubmit = useCallback(() => {
    if (linkUrl) {
      if (linkText) {
        // Replace selected text with link
        editor?.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run()
      } else {
        // Apply link to selected text
        editor?.chain().focus().setLink({ href: linkUrl }).run()
      }
    }
    setShowLinkDialog(false)
    setLinkUrl('')
    setLinkText('')
  }, [editor, linkUrl, linkText])

  const handleLinkCancel = useCallback(() => {
    setShowLinkDialog(false)
    setLinkUrl('')
    setLinkText('')
  }, [])

  if (!editor) {
    return null
  }

  return (
    <div className={`border border-gray-300 rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
          <button
            type="button"
            onClick={toggleBold}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
            title="Bold"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a1 1 0 011-1h5.5a3.5 3.5 0 013.5 3.5v.5a3 3 0 01-1.5 2.6A3.5 3.5 0 0115 14.5V15a3.5 3.5 0 01-3.5 3.5H6a1 1 0 01-1-1V4zm2 1v4h4.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H7zm0 6v4h5.5a1.5 1.5 0 001.5-1.5v-.5a1.5 1.5 0 00-1.5-1.5H7z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleItalic}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
            title="Italic"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 000 2h1.5l-3 10H5a1 1 0 100 2h6a1 1 0 100-2h-1.5l3-10H14a1 1 0 100-2H8z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleUnderline}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
            title="Underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleStrike}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-300' : ''}`}
            title="Strikethrough"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0-4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleCode}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-gray-300' : ''}`}
            title="Code"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
          <select
            value={editor.isActive('heading', { level: 1 }) ? 1 : editor.isActive('heading', { level: 2 }) ? 2 : editor.isActive('heading', { level: 3 }) ? 3 : editor.isActive('heading', { level: 4 }) ? 4 : editor.isActive('heading', { level: 5 }) ? 5 : editor.isActive('heading', { level: 6 }) ? 6 : 0}
            onChange={(e) => {
              const level = parseInt(e.target.value)
              if (level === 0) {
                setParagraph()
              } else {
                setHeading(level as 1 | 2 | 3 | 4 | 5 | 6)
              }
            }}
            className="px-2 py-1 text-sm border border-gray-300 rounded"
          >
            <option value={0}>Paragraph</option>
            <option value={1}>Heading 1</option>
            <option value={2}>Heading 2</option>
            <option value={3}>Heading 3</option>
            <option value={4}>Heading 4</option>
            <option value={5}>Heading 5</option>
            <option value={6}>Heading 6</option>
          </select>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
          <button
            type="button"
            onClick={toggleBulletList}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleOrderedList}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zM6 4a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zM9 4a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Text Alignment */}
        <div className="flex gap-1 border-r border-gray-300 pr-2 mr-2">
          <button
            type="button"
            onClick={() => setTextAlign('left')}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('center')}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('right')}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Other Tools */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={openLinkDialog}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
            title="Add/Edit Link"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
            </svg>
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              onClick={unsetLink}
              className="p-2 rounded hover:bg-gray-200"
              title="Remove Link"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={insertHorizontalRule}
            className="p-2 rounded hover:bg-gray-200"
            title="Horizontal Rule"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-3">
        <EditorContent 
          editor={editor} 
          className="min-h-[200px] focus-within:outline-none"
          style={{ minHeight: `${height}px` }}
        />
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add/Edit Link</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="link-text" className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  id="link-text"
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Enter link text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  id="link-url"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={handleLinkCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkSubmit}
                disabled={!linkUrl.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
