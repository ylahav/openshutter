'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PageFiltersProps {
  filterCategory: string
  setFilterCategory: (category: string) => void
  filterPublished: string
  setFilterPublished: (published: string) => void
}

export default function PageFilters({ 
  filterCategory, 
  setFilterCategory, 
  filterPublished, 
  setFilterPublished 
}: PageFiltersProps) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Label htmlFor="category-filter">Category:</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="site">Site</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="published-filter">Status:</Label>
        <Select value={filterPublished} onValueChange={setFilterPublished}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Published</SelectItem>
            <SelectItem value="false">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
