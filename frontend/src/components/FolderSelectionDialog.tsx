'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Folder, FileImage, CheckCircle, XCircle } from 'lucide-react'

interface Folder {
  id: string
  name: string
  path: string
  parentPath: string
  level: number
}


interface FolderSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedFolders: Folder[]) => void
  onScan: () => Promise<{ folders: Folder[] }>
}

export default function FolderSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  onScan
}: FolderSelectionDialogProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolders, setSelectedFolders] = useState<Folder[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      handleScan()
    }
  }, [isOpen])

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const result = await onScan()
      setFolders(result.folders)
    } catch (error) {
      console.error('Error scanning folders:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleFolderToggle = (folder: Folder) => {
    setSelectedFolders(prev => 
      prev.some(f => f.id === folder.id)
        ? prev.filter(f => f.id !== folder.id)
        : [...prev, folder]
    )
  }

  const handleSelectAllFolders = () => {
    if (selectedFolders.length === folders.length) {
      setSelectedFolders([])
    } else {
      setSelectedFolders([...folders])
    }
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(selectedFolders)
      onClose()
    } catch (error) {
      console.error('Error confirming selection:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const getIndentStyle = (level: number) => ({
    marginLeft: `${level * 20}px`
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Select Folders to Import
          </DialogTitle>
        </DialogHeader>

        {isScanning ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Scanning Google Drive...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Summary */}
            <div className="flex gap-4 mb-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                {folders.length} folders
              </Badge>
              <Badge variant="secondary">
                {selectedFolders.length} selected
              </Badge>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto space-y-4">
              {/* Folders Section */}
              {folders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Folders
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllFolders}
                    >
                      {selectedFolders.length === folders.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-auto border rounded-md p-2">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded"
                        style={getIndentStyle(folder.level)}
                      >
                        <Checkbox
                          id={`folder-${folder.id}`}
                          checked={selectedFolders.some(f => f.id === folder.id)}
                          onCheckedChange={() => handleFolderToggle(folder)}
                        />
                        <label
                          htmlFor={`folder-${folder.id}`}
                          className="flex-1 cursor-pointer flex items-center gap-2"
                        >
                          <Folder className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{folder.name}</span>
                          <span className="text-sm text-gray-500">({folder.path})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {folders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <XCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No folders found in Google Drive</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedFolders.length === 0 || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Import Selected ({selectedFolders.length})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
