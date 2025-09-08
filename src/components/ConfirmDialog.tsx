'use client'

import { useEffect, useState } from 'react'
import { useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  showDeleteFromStorage?: boolean
  onDeleteFromStorageChange?: (deleteFromStorage: boolean) => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  showDeleteFromStorage = false,
  onDeleteFromStorageChange
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    if (isOpen) {
      document.addEventListener('keydown', onKey)
      // Lock body scroll while dialog is open
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      // Focus the confirm button for accessibility
      setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 0)
      return () => {
        document.removeEventListener('keydown', onKey)
        document.body.style.overflow = previousOverflow
      }
    }
    return undefined
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmBtnClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
      : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" />
      <div className="flex min-h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <div ref={dialogRef} role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-white shadow-xl animate-scale-in relative z-50">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            
            {showDeleteFromStorage && onDeleteFromStorageChange && (
              <div className="mt-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    onChange={(e) => onDeleteFromStorageChange(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Also delete from storage (files will be permanently removed)
                  </span>
                </label>
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className={`btn ${confirmBtnClasses}`}
                onClick={onConfirm}
                ref={confirmButtonRef}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
