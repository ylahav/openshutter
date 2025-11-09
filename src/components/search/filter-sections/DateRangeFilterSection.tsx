'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, Calendar } from '@/lib/icons'

interface DateRangeFilterSectionProps {
  dateFrom: string
  dateTo: string
  onDateChange: (dateFrom: string, dateTo: string) => void
  isExpanded: boolean
  onToggle: () => void
}

export function DateRangeFilterSection({
  dateFrom,
  dateTo,
  onDateChange,
  isExpanded,
  onToggle
}: DateRangeFilterSectionProps) {
  const { t } = useI18n()
  
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(e.target.value, dateTo)
  }
  
  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(dateFrom, e.target.value)
  }
  
  const hasDateRange = dateFrom || dateTo
  
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {t('search.dateRange', 'Date Range')}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* From Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              {t('search.from', 'From')}
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={handleDateFromChange}
              className="h-9 text-sm"
            />
          </div>
          
          {/* To Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              {t('search.to', 'To')}
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={handleDateToChange}
              className="h-9 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
