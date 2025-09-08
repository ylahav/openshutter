'use client'

import { useState, useEffect, useRef } from 'react'

interface QuillHTMLEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  height?: number
  isRTL?: boolean
}

export function QuillHTMLEditor({
  value,
  onChange,
  placeholder = 'Enter HTML content...',
  className = '',
  required = false,
  height = 300,
  isRTL = false
}: QuillHTMLEditorProps) {
  const [editorContent, setEditorContent] = useState(value || '')
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEditorContent(value || '')
    if (mode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value, mode])

  const handleVisualChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      setEditorContent(newContent)
      onChange(newContent)
    }
  }

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setEditorContent(newContent)
    onChange(newContent)
  }

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    handleVisualChange()
  }

  const toolbar = [
    { command: 'bold', icon: 'B', title: 'Bold' },
    { command: 'italic', icon: 'I', title: 'Italic' },
    { command: 'underline', icon: 'U', title: 'Underline' },
    { command: 'insertOrderedList', icon: '1.', title: 'Numbered List' },
    { command: 'insertUnorderedList', icon: '•', title: 'Bullet List' },
    { command: 'createLink', icon: '🔗', title: 'Insert Link' },
    { command: 'formatBlock', icon: 'H', title: 'Header', value: 'h2' },
  ]

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-1">
          {toolbar.map((item) => (
            <button
              key={item.command}
              type="button"
              onClick={() => {
                if (item.command === 'createLink') {
                  const url = prompt('Enter URL:')
                  if (url) applyFormat(item.command, url)
                } else if (item.command === 'formatBlock') {
                  applyFormat(item.command, item.value)
                } else {
                  applyFormat(item.command)
                }
              }}
              className="px-2 py-1 text-sm font-medium bg-white border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={item.title}
            >
              {item.icon}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`px-3 py-1 text-sm rounded ${
              mode === 'visual'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setMode('html')}
            className={`px-3 py-1 text-sm rounded ${
              mode === 'html'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            HTML
          </button>
        </div>
      </div>

      {/* Editor Content */}
      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleVisualChange}
          onBlur={handleVisualChange}
          className="p-3 min-h-[200px] outline-none"
          style={{ 
            height: height - 50,
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left'
          }}
          dangerouslySetInnerHTML={{ __html: editorContent }}
          data-placeholder={placeholder}
        />
      ) : (
        <textarea
          value={editorContent}
          onChange={handleHtmlChange}
          placeholder={placeholder}
          className="w-full p-3 border-none outline-none resize-none font-mono text-sm"
          style={{ 
            height: height - 50,
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left'
          }}
          required={required}
        />
      )}

      {/* Character Count */}
      <div className="px-3 py-1 text-xs text-gray-500 text-right border-t border-gray-200 bg-gray-50">
        Characters: {editorContent.replace(/<[^>]*>/g, '').length}
      </div>
    </div>
  )
}

export default QuillHTMLEditor
