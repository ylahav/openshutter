import { MultiLangText, MultiLangHTML } from './multi-lang'
import type { ShellLayout } from '../template/shell-layout'

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
    /** Mongo themes collection id last applied from Admin → Templates (optional, for display/debug) */
    activeThemeId?: string
    activeTemplate?: string // Deprecated: use frontendTemplate instead, kept for backward compatibility
    frontendTemplate?: string // Template for public-facing frontend pages
    /** @deprecated Ignored for UI. Always `default` in API responses and on save; admin uses a fixed Skeleton shell. */
    adminTemplate?: string
    /** Core + extended semantic colors (see frontend `template-palette.ts`). */
    customColors?: Record<string, string | undefined>
    /** Per-role font: string (family) or { family?, size?, weight? }. */
    customFonts?: Record<string, string | { family?: string; size?: string; weight?: string }>
    /** Legacy flat shell or breakpoint-keyed map (xs … xl). Values may include pack tokens (radius, etc.). */
    customLayout?: ShellLayout | Record<string, ShellLayout>
    customLayoutByBreakpoint?: Record<string, ShellLayout>
    pageLayoutByBreakpoint?: Record<
      string,
      Record<string, { gridRows?: number; gridColumns?: number }>
    >
    pageModulesByBreakpoint?: Record<string, Record<string, any[]>>
    componentVisibility?: {
      hero?: boolean
      languageSelector?: boolean
      authButtons?: boolean
      footerMenu?: boolean
      statistics?: boolean
      promotion?: boolean
    } | null
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
    } | null
    /** Legacy flat per page, or `{ pageKey: { xs: …, lg: … } }` map. */
    pageModules?: Record<string, any[] | Record<string, any[]>>
    pageLayout?: Record<string, { gridRows?: number; gridColumns?: number } | Record<string, { gridRows?: number; gridColumns?: number }>>
    /**
     * Named grid regions (e.g. shared header strip). Referenced by page-builder modules `type: layoutShell`, `props.presetKey`.
     */
    layoutPresets?: Record<string, { gridRows?: number; gridColumns?: number; modules?: any[] }>
    /** Shared layout-shell instances (preferred; module points via `props.instanceRef`). */
    layoutShellInstances?: Record<string, { gridRows?: number; gridColumns?: number; modules?: any[] }>
    /** Shared menu instances (for MenuModule `props.instanceRef`). */
    menuInstances?: Record<string, { items?: any[]; [key: string]: any }>
    /** Site-wide chrome rendered by `PageRenderer` above pages that opt in via `page.showHeader`. */
    headerModules?: any[]
    /** Site-wide chrome rendered by `PageRenderer` below pages that opt in via `page.showFooter`. */
    footerModules?: any[]
    /**
     * Per-pack header override. When the active pack key is present (even with `[]`), it wins over
     * `headerModules`. `[]` is a deliberate "no chrome for this pack" — distinct from "inherit default".
     */
    headerModulesByPack?: Partial<Record<'noir' | 'studio' | 'atelier', any[]>>
    /**
     * Per-pack footer override. Same cascade rules as `headerModulesByPack`.
     */
    footerModulesByPack?: Partial<Record<'noir' | 'studio' | 'atelier', any[]>>
    /** Site-wide: render the page-builder header with `position: sticky; top: 0`. */
    headerSticky?: boolean
    /** Per-pack override for `headerSticky` (explicit `true`/`false` wins; missing key inherits default). */
    headerStickyByPack?: Partial<Record<'noir' | 'studio' | 'atelier', boolean>>
    /**
     * Per-row `grid-template-columns` for the site-wide header rows (keys are row indexes as strings).
     * Same syntax as `layoutShell` row templates: e.g. `{ "0": "auto 1fr auto", "1": "1-3-1" }`.
     */
    headerRowTemplates?: Record<string, string>
    /** Per-pack override for `headerRowTemplates`. Missing pack key inherits default. */
    headerRowTemplatesByPack?: Partial<Record<'noir' | 'studio' | 'atelier', Record<string, string>>>
    /** Per-row `grid-template-columns` for the site-wide footer rows. Same syntax as `headerRowTemplates`. */
    footerRowTemplates?: Record<string, string>
    /** Per-pack override for `footerRowTemplates`. Missing pack key inherits default. */
    footerRowTemplatesByPack?: Partial<Record<'noir' | 'studio' | 'atelier', Record<string, string>>>
    /**
     * Per built-in pack: CMS page alias / page-builder scoped class prefix (lowercase alphanumeric, 1–12 chars).
     * Keys: `noir` | `studio` | `atelier`. Omitted packs use each template's built-in default.
     */
    pageAliasPrefixes?: Record<string, string>
  }
  seo: {
    metaTitle: MultiLangText
    metaDescription: MultiLangText
    /** Comma-separated keywords per locale (same storage shape as other MultiLang text fields). */
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
      flickr?: string
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
    /** @deprecated Prefer features.collaboration; when false and collaboration unset, all collaboration is off. */
    enableComments: boolean
    /**
     * Per-service collaboration visibility: visitors (not signed in) vs signed-in users.
     * When any key is set, granular mode is active; omitted service keys still default to on unless legacy enableComments is false alone.
     */
    collaboration?: {
      /** `enabled: false` turns the service off for everyone except album moderators (same as audience flags). */
      comments?: { enabled?: boolean; public?: boolean; authenticated?: boolean }
      tasks?: { enabled?: boolean; public?: boolean; authenticated?: boolean }
      activity?: { enabled?: boolean; public?: boolean; authenticated?: boolean }
    }
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
    /** Optional Stage 4 flag: apply/dismiss-based boost for tag search relevance. */
    enableTagFeedbackSearchBoost?: boolean
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
  /** Welcome email when a new user is created. Subject/body per language; placeholders: {{name}}, {{username}}, {{loginUrl}}, {{siteTitle}}, {{password}} */
  welcomeEmail?: {
    enabled?: boolean
    subject?: MultiLangText
    body?: MultiLangText
  }
  /** White-label (Solution 1): hide OpenShutter branding and use site title everywhere; optional legal URLs */
  whiteLabel?: {
    hideOpenShutterBranding?: boolean
    /** Optional display name (per language) for headers/emails when it differs from public site title */
    productName?: MultiLangText
    /** Optional public-site logo URL (global `logo` remains default / admin reference) */
    logo?: string
    /** Optional public-site favicon URL (global `favicon` remains default) */
    favicon?: string
    termsOfServiceUrl?: string
    privacyPolicyUrl?: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface SiteConfigUpdate {
  /**
   * When true (e.g. Admin → Apply theme), `template` fields that come from a theme document
   * replace the stored values entirely instead of deep-merging with existing `pageModules` /
   * `pageLayout` / colors — so old "positions" do not stick around.
   */
  replaceTemplateFromTheme?: boolean
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
  whiteLabel?: Partial<SiteConfig['whiteLabel']>
}
