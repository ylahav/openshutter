'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if it's an HMR error
    const isHMRError = error.message?.includes('module factory is not available') ||
                      error.message?.includes('was instantiated') ||
                      error.message?.includes('HMR')
    
    if (isHMRError) {
      // For HMR errors, suggest a refresh
      return { hasError: true, error }
    }
    
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // If it's an HMR error, log it but don't auto-reload to prevent infinite loops
    const isHMRError = error.message?.includes('module factory is not available') ||
                      error.message?.includes('was instantiated') ||
                      error.message?.includes('HMR')
    
    if (isHMRError) {
      console.warn('HMR error detected. Please refresh the page manually (Ctrl+F5) to fix.')
      // Don't auto-reload - let the user manually refresh to prevent infinite loops
    }
  }

  override render() {
    if (this.state.hasError) {
      const isHMRError = this.state.error?.message?.includes('module factory is not available') ||
                         this.state.error?.message?.includes('was instantiated') ||
                         this.state.error?.message?.includes('HMR')
      
      if (isHMRError) {
        // Show a simple message for HMR errors with manual reload button
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">HMR Error Detected</h2>
              <p className="text-gray-600 mb-4">Please refresh the page to fix this issue.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      }
      
      // For other errors, show the fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
