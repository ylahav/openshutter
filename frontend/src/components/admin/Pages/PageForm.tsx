'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangInput } from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageCreate } from '@/lib/models/Page'

interface PageFormProps {
  formData: PageCreate
  setFormData: (data: PageCreate) => void
  onSubmit: () => void
  onCancel: () => void
  submitText: string
}

export default function PageForm({ formData, setFormData, onSubmit, onCancel, submitText }: PageFormProps) {
  const { currentLanguage } = useLanguage()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-6">
      {/* Title and Alias */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <MultiLangInput
            value={formData.title}
            onChange={(value) => setFormData({ ...formData, title: value })}
            placeholder="Page title"
            className="text-gray-900"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alias">Alias/Slug *</Label>
          <Input
            id="alias"
            value={formData.alias}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
            placeholder="page-alias"
            className="text-gray-900"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <MultiLangInput
          value={formData.subtitle || { en: '' }}
          onChange={(value) => setFormData({ ...formData, subtitle: value })}
          placeholder="Page subtitle (optional)"
          className="text-gray-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value: 'system' | 'site') => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger className="text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="site">Site</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadingImage">Leading Image</Label>
          <Input
            id="leadingImage"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                // For now, we'll use a placeholder URL. In a real app, you'd upload to a server
                const url = URL.createObjectURL(file)
                setFormData({ ...formData, leadingImage: url })
              }
            }}
            className="text-gray-900"
          />
          {formData.leadingImage && (
            <div className="mt-2">
              <img 
                src={formData.leadingImage} 
                alt="Preview" 
                className="w-32 h-20 object-cover rounded border"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
        <Switch
          id="isPublished"
          checked={formData.isPublished}
          onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
        />
        <Label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
          Published
        </Label>
        <span className="text-xs text-gray-500">
          {formData.isPublished ? 'This page will be visible to visitors' : 'This page will be saved as draft'}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="introText">Intro Text</Label>
        <MultiLangHTMLEditor
          value={formData.introText || { en: '' }}
          onChange={(value) => setFormData({ ...formData, introText: value })}
          placeholder="Introduction text (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <MultiLangHTMLEditor
          value={formData.content || { en: '' }}
          onChange={(value) => setFormData({ ...formData, content: value })}
          placeholder="Main content"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="px-6"
        >
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6">
          {submitText}
        </Button>
      </div>
    </form>
  )
}
