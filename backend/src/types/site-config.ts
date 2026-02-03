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
    activeTemplate?: string // Deprecated: use frontendTemplate instead, kept for backward compatibility
    frontendTemplate?: string // Template for public-facing frontend pages
    adminTemplate?: string // Template for admin area pages
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
    }
  }
  seo: {
    metaTitle: MultiLangText
    metaDescription: MultiLangText
    metaKeywords: string[]
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
    /** Which share buttons to show: 'twitter' | 'facebook' | 'whatsapp' | 'copy'. Omit or empty = all. */
    sharingOptions?: ('twitter' | 'facebook' | 'whatsapp' | 'copy')[]
    /** Show share block on album/gallery pages. Default true. */
    sharingOnAlbum?: boolean
    /** Show share block in photo lightbox. Default true. */
    sharingOnPhoto?: boolean
    enableDownload: boolean
    enableWatermark: boolean
    maxUploadSize: string
  }
  /** EXIF metadata display: which fields to show when displaying photo EXIF (empty/undefined = show all) */
  exifMetadata?: {
    displayFields?: string[]
  }
  /** IPTC/XMP metadata display: which fields to show when displaying photo IPTC/XMP (empty/undefined = show all) */
  iptcXmpMetadata?: {
    displayFields?: string[]
  }
  /** Mail server (SMTP) for sending emails e.g. welcome email on user creation */
  mail?: {
    host?: string
    port?: number
    user?: string
    password?: string
    from?: string // e.g. "OpenShutter <noreply@example.com>"
    secure?: boolean
  }
  /** Welcome email sent when a new user is created. Placeholders: {{name}}, {{username}}, {{loginUrl}} */
  welcomeEmail?: {
    enabled?: boolean
    subject?: string
    body?: string
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
  exifMetadata?: Partial<SiteConfig['exifMetadata']>
  iptcXmpMetadata?: Partial<SiteConfig['iptcXmpMetadata']>
  mail?: Partial<SiteConfig['mail']>
  welcomeEmail?: Partial<SiteConfig['welcomeEmail']>
}
