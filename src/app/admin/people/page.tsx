'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, Edit, Trash2, User, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { MultiLangText, MultiLangUtils } from '@/types/multi-lang'
import { MultiLangInput } from '@/components/MultiLangInput'
import AdminTemplate from '@/components/admin/AdminTemplate'
import { Person } from '@/types/index'

// Using IPerson from @/lib/models/Person.ts instead of local interface


export default function PeopleManagementPage() {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: { en: '', he: '' } as MultiLangText,
    lastName: { en: '', he: '' } as MultiLangText,
    nickname: { en: '', he: '' } as MultiLangText,
    birthDate: '',
    description: { en: '', he: '' } as MultiLangText,
    tags: '',
    isActive: true
  })
  
  // Set mounted to true after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (!mounted) return // Wait for component to mount
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/login?callbackUrl=/admin/people')
      return
    }
    fetchPeople()
  }, [mounted, session, status, router, searchTerm])
  
  const fetchPeople = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/people?${params.toString()}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to access this page')
        }
        throw new Error('Failed to fetch people')
      }
      
      const data = await response.json()
      if (data.success) {
        setPeople(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch people')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreate = async () => {
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: tagsArray
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create person')
      }
      
      const data = await response.json()
      if (data.success) {
        setPeople([...people, data.data])
        resetForm()
        setIsCreateDialogOpen(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person')
    }
  }
  
  const handleEdit = async () => {
    if (!editingPerson) return
    
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      
      const response = await fetch(`/api/people/${editingPerson._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: tagsArray
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update person')
      }
      
      const data = await response.json()
      if (data.success) {
        setPeople(people.map(p => p._id === editingPerson._id ? data.data : p))
        resetForm()
        setIsEditDialogOpen(false)
        setEditingPerson(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update person')
    }
  }
  
  const handleDelete = async () => {
    if (!personToDelete) return
    
    try {
      const response = await fetch(`/api/people/${personToDelete._id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete person')
      }
      
      const data = await response.json()
      if (data.success) {
        setPeople(people.filter(p => p._id !== personToDelete._id))
        setIsDeleteDialogOpen(false)
        setPersonToDelete(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete person')
    }
  }
  
  const resetForm = () => {
    setFormData({
      firstName: { en: '', he: '' } as MultiLangText,
      lastName: { en: '', he: '' } as MultiLangText,
      nickname: { en: '', he: '' } as MultiLangText,
      birthDate: '',
      description: { en: '', he: '' } as MultiLangText,
      tags: '',
      isActive: true
    })
  }
  
  const openEditDialog = (person: Person) => {
    setEditingPerson(person)
    setFormData({
      firstName: person.firstName || { en: '', he: '' } as MultiLangText,
      lastName: person.lastName || { en: '', he: '' } as MultiLangText,
      nickname: person.nickname || { en: '', he: '' } as MultiLangText,
      birthDate: person.birthDate ? format(new Date(person.birthDate), 'yyyy-MM-dd') : '',
      description: person.description || { en: '', he: '' } as MultiLangText,
      tags: person.tags.map(tag => typeof tag === 'string' ? tag : tag.name).join(', '),
      isActive: person.isActive
    })
    setIsEditDialogOpen(true)
  }
  
  const openDeleteDialog = (person: Person) => {
    setPersonToDelete(person)
    setIsDeleteDialogOpen(true)
  }
  
  // Always show loading state until component is mounted and authenticated
  if (!mounted || status === 'loading' || loading) {
    return (
      <AdminTemplate 
        title={t('admin.peopleManagement')}
        description={t('admin.managePeopleStructuredData')}
      >
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminTemplate>
    )
  }

  return (
    <AdminTemplate 
      title={t('admin.peopleManagement')}
      description={t('admin.managePeopleStructuredData')}
    >
      <div className="p-6">
        {/* Search and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Person
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Person</DialogTitle>
            </DialogHeader>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md relative z-10">
                <p className="text-red-600">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <MultiLangInput
                    value={formData.firstName}
                    onChange={(value) => setFormData({...formData, firstName: value})}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <MultiLangInput
                    value={formData.lastName}
                    onChange={(value) => setFormData({...formData, lastName: value})}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="nickname">Nickname</Label>
                <MultiLangInput
                  value={formData.nickname}
                  onChange={(value) => setFormData({...formData, nickname: value})}
                  placeholder="Johnny"
                />
              </div>
              
              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <MultiLangInput
                  value={formData.description}
                  onChange={(value) => setFormData({...formData, description: value})}
                  placeholder="Brief description..."
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="family, friend, colleague"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Create Person
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* People List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading people...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading people</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No people found</h3>
          <p className="text-gray-600">Start by adding your first person.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((person) => (
            <div key={person._id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {typeof person.fullName === 'string' ? person.fullName : MultiLangUtils.getValue(person.fullName as any, currentLanguage)}
                    </h3>
                    {person.nickname && (typeof person.nickname === 'string' ? person.nickname : MultiLangUtils.getValue(person.nickname as any, currentLanguage)) && (
                      <p className="text-sm text-gray-600">
                        "{typeof person.nickname === 'string' ? person.nickname : MultiLangUtils.getValue(person.nickname as any, currentLanguage)}"
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(person)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(person)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {person.description && (typeof person.description === 'string' ? person.description : MultiLangUtils.getValue(person.description as any, currentLanguage)) && (
                <p className="text-sm text-gray-600 mb-3">
                  {typeof person.description === 'string' ? person.description : MultiLangUtils.getValue(person.description as any, currentLanguage)}
                </p>
              )}
              
              {person.birthDate && (
                <p className="text-sm text-gray-500 mb-3">
                  Born: {format(new Date(person.birthDate), 'MMM dd, yyyy')}
                </p>
              )}
              
              {person.tags && person.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {person.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {typeof tag === 'string' ? tag : tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name *</Label>
                <MultiLangInput
                  value={formData.firstName}
                  onChange={(value) => setFormData({...formData, firstName: value})}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name *</Label>
                <MultiLangInput
                  value={formData.lastName}
                  onChange={(value) => setFormData({...formData, lastName: value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="editNickname">Nickname</Label>
              <MultiLangInput
                value={formData.nickname}
                onChange={(value) => setFormData({...formData, nickname: value})}
              />
            </div>
            
            <div>
              <Label htmlFor="editBirthDate">Birth Date</Label>
              <Input
                id="editBirthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <MultiLangInput
                value={formData.description}
                onChange={(value) => setFormData({...formData, description: value})}
              />
            </div>
            
            <div>
              <Label htmlFor="editTags">Tags (comma-separated)</Label>
              <Input
                id="editTags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit}>
                Update Person
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Person</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>
                {personToDelete && personToDelete.fullName 
                  ? (typeof personToDelete.fullName === 'string' 
                      ? personToDelete.fullName 
                      : MultiLangUtils.getValue(personToDelete.fullName as any, currentLanguage))
                  : ''}
              </strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
              >
                Delete Person
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AdminTemplate>
  )
}
