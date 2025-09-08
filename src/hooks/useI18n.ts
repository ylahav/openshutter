import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import en from '@/i18n/en.json'
import he from '@/i18n/he.json'

type Dictionary = Record<string, any>

function getNested(dictionary: Dictionary, path: string): string | undefined {
  const parts = path.split('.')
  let current: any = dictionary
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

export function useI18n() {
  const { currentLanguage } = useLanguage()

  const dictionaries: Record<string, Dictionary> = useMemo(() => ({
    en,
    he,
  }), [])

  const dict = dictionaries[currentLanguage] || dictionaries.en

  const t = (key: string, fallback?: string): string => {
    const val = getNested(dict, key)
    if (typeof val === 'string') return val
    const enVal = getNested(dictionaries.en, key)
    if (typeof enVal === 'string') return enVal
    return fallback ?? key
  }

  return { t, lang: currentLanguage }
}
