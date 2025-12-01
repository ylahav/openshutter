'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface UploadProgress {
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface UploadProgressProps {
  uploads: UploadProgress[]
  onRemove: (index: number) => void
}

export default function UploadProgressList({ uploads, onRemove }: UploadProgressProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Upload Progress</h3>
      <AnimatePresence>
        {uploads.map((upload, index) => (
          <motion.div
            key={`${upload.filename}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.filename}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        upload.status === 'completed' ? 'bg-green-500' :
                        upload.status === 'error' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${upload.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {upload.progress}%
                  </span>
                </div>
                {upload.error && (
                  <p className="text-xs text-red-500 mt-1">{upload.error}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(index)}
                className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                disabled={upload.status === 'uploading'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
