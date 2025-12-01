'use client'

import { MultiLangText } from '@/types/multi-lang'
import MultiLangInput from '@/components/MultiLangInput'

interface PhotoBasicFieldsProps {
  title: MultiLangText
  onTitleChange: (title: MultiLangText) => void
}

export default function PhotoBasicFields({ title, onTitleChange }: PhotoBasicFieldsProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Title
      </label>
      <MultiLangInput
        value={title}
        onChange={onTitleChange}
        placeholder="Enter photo title..."
        required
      />
    </div>
  )
}
