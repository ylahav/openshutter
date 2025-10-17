'use client'

import { useEffect } from 'react'

/**
 * RightClickDisabler Component
 * 
 * Disables right-click context menu, developer tools shortcuts, and other common
 * browser features to protect content from being easily copied or inspected.
 * 
 * Features:
 * - Prevents right-click context menu (except in text editors and input fields)
 * - Blocks F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U keyboard shortcuts
 * - Prevents Ctrl+S (save page)
 * - Prevents drag and drop of images
 * - Shows warning messages when blocked actions are attempted
 * 
 * Usage:
 * <RightClickDisabler enabled={true} showWarning={true} />
 */
interface RightClickDisablerProps {
  enabled?: boolean
  showWarning?: boolean
  warningMessage?: string
}

export default function RightClickDisabler({ 
  enabled = true, 
  showWarning = true,
  warningMessage = 'Right-click is disabled on this site'
}: RightClickDisablerProps) {
  useEffect(() => {
    // Component only runs on client side due to dynamic import with ssr: false
    if (!enabled) return

    // Prevent right-click context menu (except in text editors and input fields)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Allow right-click in text editors and input fields
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('.ProseMirror') ||
        target.closest('.ql-editor') ||
        target.closest('.tiptap-editor') ||
        target.closest('[contenteditable]')
      ) {
        return true // Allow context menu
      }
      
      e.preventDefault()
      if (showWarning) {
        alert(warningMessage)
      }
      return false
    }

    // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (view source)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault()
        if (showWarning) {
          alert('Developer tools are disabled on this site')
        }
        return false
      }
      
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        if (showWarning) {
          alert('Developer tools are disabled on this site')
        }
        return false
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        if (showWarning) {
          alert('Developer tools are disabled on this site')
        }
        return false
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault()
        if (showWarning) {
          alert('View source is disabled on this site')
        }
        return false
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        if (showWarning) {
          alert('Saving pages is disabled on this site')
        }
        return false
      }
      
      // Allow other keys
      return true
    }

    // Prevent text selection (optional - can be disabled if needed)
    const handleSelectStart = (e: Event) => {
      // Uncomment the next line to prevent text selection
      // e.preventDefault()
    }

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // Prevent image dragging
    const handleImageDrag = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('drag', handleImageDrag)

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('drag', handleImageDrag)
    }
  }, [enabled, showWarning, warningMessage])

  // This component doesn't render anything
  return null
}
