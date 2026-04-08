export interface FontSetting {
  family: string
  size?: string
  weight?: string
}

export interface TemplateConfig {
  templateName: string
  displayName: string
  description: string
  version: string
  author: string
  thumbnail: string
  category: 'minimal' | 'modern' | 'classic' | 'dark' | 'custom' | 'elegant'
  features: {
    responsive: boolean
    darkMode: boolean
    animations: boolean
    seoOptimized: boolean
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    muted: string
  } & Partial<
    Record<
      | 'surfaceCard'
      | 'surfaceCardSecondary'
      | 'surfaceCardTertiary'
      | 'textSubtle'
      | 'borderSubtle'
      | 'lightBackground'
      | 'lightText'
      | 'lightMuted'
      | 'lightSurfaceCard'
      | 'lightSurfaceCardSecondary'
      | 'lightSurfaceCardTertiary'
      | 'lightTextSubtle'
      | 'lightBorderSubtle'
      | 'heroStrip'
      | 'footerStrip'
      | 'lightHeroStrip'
      | 'lightFooterStrip',
      string
    >
  >
  fonts: {
    heading: FontSetting
    body: FontSetting
    links: FontSetting
    lists: FontSetting
    formInputs: FontSetting
    formLabels: FontSetting
  }
  layout: {
    maxWidth: string
    containerPadding: string
    gridGap: string
  }
  /**
   * Default per-page grid (legacy flat shape) for new themes / docs.
   * Live sites use `themes` / `site_config.template.pageLayout` (often per-breakpoint maps).
   */
  pageLayout?: Record<string, { gridRows: number; gridColumns: number }>
  components: {
    hero: string
    albumCard: string
    photoCard: string
    albumList: string
    gallery: string
    navigation: string
    footer: string
  }
  pageConfig?: {
    home?: {
      showHero?: boolean
      showServices?: boolean
      showContact?: boolean
      showTestimonials?: boolean
    }
    albums?: {
      showHeader?: boolean
      showFilters?: boolean
      showSearch?: boolean
    }
    album?: {
      showHeader?: boolean
      showNavigation?: boolean
      showMetadata?: boolean
    }
  }
  componentsConfig?: {
    header?: {
      showLogo?: boolean
      showSiteTitle?: boolean
      menu?: { labelKey?: string; label?: string; href: string }[]
      enableThemeToggle?: boolean
      enableLanguageSelector?: boolean
      showGreeting?: boolean
      showAuthButtons?: boolean
    }
    footer?: {
      showCopyright?: boolean
      showSocialMedia?: boolean
      showPoweredBy?: boolean
    }
  }
  pages: {
    home: string
    gallery: string
    album: string
    search: string
  }
  visibility?: {
    hero?: boolean
    languageSelector?: boolean
    authButtons?: boolean
    footerMenu?: boolean
    statistics?: boolean
    promotion?: boolean
  }
}

export interface TemplatePage {
  name: string
  path: string
  component: string
  props?: Record<string, any>
}

export interface TemplateComponent {
  name: string
  path: string
  props?: Record<string, any>
}

export interface SiteTemplateConfig {
  activeTemplate: string
  customColors?: Partial<TemplateConfig['colors']>
  customFonts?: Partial<TemplateConfig['fonts']>
  customLayout?: Partial<TemplateConfig['layout']>
}
