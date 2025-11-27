'use client'

import { useEffect, useState } from 'react'

/**
 * Client-side RightClickDisabler Component
 * 
 * Inlined here to avoid HMR issues with dynamic imports.
 * This component ensures it only runs on the client side.
 * 
 * Disables right-click context menu, developer tools shortcuts, and other common
 * browser features to protect content from being easily copied or inspected.
 * 
 * Controlled by NEXT_PUBLIC_ENABLE_RIGHT_CLICK_DISABLER environment variable.
 * Set to 'true' to enable, 'false' or unset to disable.
 */
interface RightClickDisablerClientProps {
  enabled?: boolean
  showWarning?: boolean
  warningMessage?: string
}

export default function RightClickDisablerClient({ 
  enabled = true, 
  showWarning = true,
  warningMessage = 'Right-click is disabled on this site'
}: RightClickDisablerClientProps) {
  const [mounted, setMounted] = useState(false)

  // Only run after mount to avoid SSR and HMR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Don't run until mounted
    if (!mounted || !enabled) return

    // Check environment variable (must use NEXT_PUBLIC_ prefix for client-side access)
    const envEnabled = process.env.NEXT_PUBLIC_ENABLE_RIGHT_CLICK_DISABLER === 'true'
    if (!envEnabled) return

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
  }, [mounted, enabled, showWarning, warningMessage])

  // This component doesn't render anything
  return null
}
