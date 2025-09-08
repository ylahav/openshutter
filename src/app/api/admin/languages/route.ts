import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'

// Language metadata mapping
const languageMetadata: Record<string, { name: string; flag: string }> = {
  'en': { name: 'English', flag: '🇺🇸' },
  'he': { name: 'Hebrew', flag: '🇮🇱' },
  'ar': { name: 'Arabic', flag: '🇸🇦' },
  'es': { name: 'Spanish', flag: '🇪🇸' },
  'fr': { name: 'French', flag: '🇫🇷' },
  'de': { name: 'German', flag: '🇩🇪' },
  'it': { name: 'Italian', flag: '🇮🇹' },
  'pt': { name: 'Portuguese', flag: '🇵🇹' },
  'ru': { name: 'Russian', flag: '🇷🇺' },
  'ja': { name: 'Japanese', flag: '🇯🇵' },
  'ko': { name: 'Korean', flag: '🇰🇷' },
  'zh': { name: 'Chinese', flag: '🇨🇳' },
  'nl': { name: 'Dutch', flag: '🇳🇱' },
  'sv': { name: 'Swedish', flag: '🇸🇪' },
  'no': { name: 'Norwegian', flag: '🇳🇴' },
  'da': { name: 'Danish', flag: '🇩🇰' },
  'fi': { name: 'Finnish', flag: '🇫🇮' },
  'pl': { name: 'Polish', flag: '🇵🇱' },
  'tr': { name: 'Turkish', flag: '🇹🇷' },
  'hi': { name: 'Hindi', flag: '🇮🇳' }
}

export async function GET() {
  try {
    // Read the i18n directory to get available language files
    const i18nPath = join(process.cwd(), 'src', 'i18n')
    const files = await readdir(i18nPath)
    
    // Filter for .json files and extract language codes
    const languageFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
    
    // Map language codes to their metadata
    const availableLanguages = languageFiles.map(code => {
      const metadata = languageMetadata[code] || { 
        name: code.toUpperCase(), 
        flag: '🌐' 
      }
      return {
        code,
        name: metadata.name,
        flag: metadata.flag
      }
    })
    
    // Sort languages alphabetically by name
    availableLanguages.sort((a, b) => a.name.localeCompare(b.name))
    
    return NextResponse.json({
      success: true,
      data: availableLanguages
    })
  } catch (error) {
    console.error('Error reading language files:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load available languages' },
      { status: 500 }
    )
  }
}
