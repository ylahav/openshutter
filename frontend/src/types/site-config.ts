import type { MultiLangText, MultiLangHTML } from './multi-lang'

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
    /** Legacy; effective pack is `frontendTemplate ?? activeTemplate` (see `$lib/stores/template.ts`). */
    activeTemplate?: string
    /** Preferred visitor pack id. */
    frontendTemplate?: string
    /** @deprecated Always `default` from API. Admin UI is not pack-driven. */
    adminTemplate?: string
    customColors?: import('$lib/template/theme/template-palette').TemplateCustomColors
    customFonts?: {
      heading?: string
      body?: string
    }
    customLayout?:
      | {
          maxWidth?: string
          containerPadding?: string
          gridGap?: string
        }
      | Record<string, { maxWidth?: string; containerPadding?: string; gridGap?: string }>
    pageModules?: Record<string, unknown[] | Record<string, unknown[]>>
    pageLayout?: Record<string, { gridRows?: number; gridColumns?: number } | Record<string, { gridRows?: number; gridColumns?: number }>>
    layoutPresets?: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }>
    layoutShellInstances?: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }>
    componentVisibility?: {
      hero?: boolean
      languageSelector?: boolean
      authButtons?: boolean
      footerMenu?: boolean
      statistics?: boolean
      promotion?: boolean
    }
    headerConfig?: {
      showLogo?: boolean
      showSiteTitle?: boolean
      showMenu?: boolean
      menu?: { labelKey?: string; label?: string; href: string }[]
      enableThemeToggle?: boolean
      enableLanguageSelector?: boolean
      showLanguageSelector?: boolean
      showGreeting?: boolean
      showAuthButtons?: boolean
      showTemplateSelector?: boolean
      languageSelectorVariant?: 'dropdown' | 'flags'
    }
  }
  seo: {
    metaTitle: string
    metaDescription: string
    metaKeywords: MultiLangText
    ogImage?: string
  }
  contact: {
    email?: string
    phone?: string
    address?: MultiLangText
    socialMedia?: {
      facebook?: string
      instagram?: string
      twitter?: string
      linkedin?: string
    }
  }
  homePage?: {
    services?: {
      number: string
      title: MultiLangText
      description: MultiLangHTML
    }[]
    contactTitle?: MultiLangText
  }
  features: {
    enableComments: boolean
    enableSharing: boolean
    enableDownload: boolean
    enableWatermark: boolean
    maxUploadSize: string
  }
  footer?: {
    copyrightText?: string
    termsUrl?: string
    privacyUrl?: string
  }
  whiteLabel?: {
    hideOpenShutterBranding?: boolean
    productName?: MultiLangText
    logo?: string
    favicon?: string
    termsOfServiceUrl?: string
    privacyPolicyUrl?: string
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
  homePage?: Partial<SiteConfig['homePage']>
  features?: Partial<SiteConfig['features']>
  whiteLabel?: Partial<SiteConfig['whiteLabel']>
}
