'use client'

import { Page, PageCreate } from '@/lib/models/Page'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageForm from './PageForm'

interface PageDialogsProps {
  // Create dialog
  isCreateDialogOpen: boolean
  setIsCreateDialogOpen: (open: boolean) => void
  // Edit dialog
  isEditDialogOpen: boolean
  setIsEditDialogOpen: (open: boolean) => void
  editingPage: Page | null
  // Delete dialog
  isDeleteDialogOpen: boolean
  setIsDeleteDialogOpen: (open: boolean) => void
  pageToDelete: Page | null
  setPageToDelete: (page: Page | null) => void
  // Form data
  formData: PageCreate
  setFormData: (data: PageCreate) => void
  // Handlers
  onCreate: () => void
  onUpdate: () => void
  onDelete: () => void
}

export default function PageDialogs({
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  isEditDialogOpen,
  setIsEditDialogOpen,
  editingPage,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  pageToDelete,
  setPageToDelete,
  formData,
  setFormData,
  onCreate,
  onUpdate,
  onDelete
}: PageDialogsProps) {
  const { currentLanguage } = useLanguage()

  return (
    <>
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <PageForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={onCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            submitText="Create Page"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
          </DialogHeader>
          <PageForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={onUpdate}
            onCancel={() => setIsEditDialogOpen(false)}
            submitText="Update Page"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Page"
        message={`Are you sure you want to delete "${pageToDelete ? MultiLangUtils.getTextValue(pageToDelete.title, currentLanguage) : ''}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={onDelete}
        onCancel={() => {
          setIsDeleteDialogOpen(false)
          setPageToDelete(null)
        }}
      />
    </>
  )
}
