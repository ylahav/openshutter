import { MultiLangText, MultiLangHTML } from './multi-lang'

export interface SiteConfig {
  _id?: string
  title: MultiLangText
  description: MultiLangHTML
  logo?: string
  favicon?: string
  languages: {
    activeLanguages: string[]
    defaultLanguage: string
  }
  theme: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    textColor: string
  }
  template?: {
    activeTemplate: string
    customColors?: {
      primary?: string
      secondary?: string
      accent?: string
      background?: string
      text?: string
      muted?: string
    }
    customFonts?: {
      heading?: string
      body?: string
    }
    customLayout?: {
      maxWidth?: string
      containerPadding?: string
      gridGap?: string
    }
    componentVisibility?: {
      hero?: boolean
      languageSelector?: boolean
      authButtons?: boolean
      footerMenu?: boolean
      statistics?: boolean
      promotion?: boolean
    }
  }
  seo: {
    metaTitle: string
    metaDescription: string
    metaKeywords: string[]
    ogImage?: string
  }
  contact: {
    email?: string
    phone?: string
    address?: string
    socialMedia?: {
      facebook?: string
      instagram?: string
      twitter?: string
      linkedin?: string
    }
  }
  features: {
    enableComments: boolean
    enableSharing: boolean
    enableDownload: boolean
    enableWatermark: boolean
    maxUploadSize: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface SiteConfigUpdate {
  title?: MultiLangText
  description?: MultiLangHTML
  logo?: string
  favicon?: string
  languages?: Partial<SiteConfig['languages']>
  theme?: Partial<SiteConfig['theme']>
  template?: Partial<SiteConfig['template']>
  seo?: Partial<SiteConfig['seo']>
  contact?: Partial<SiteConfig['contact']>
  features?: Partial<SiteConfig['features']>
}
