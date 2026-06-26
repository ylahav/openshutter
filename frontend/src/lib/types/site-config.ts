import type { MultiLangText, MultiLangHTML } from './multi-lang';
import type { FontSetting, FontRole } from './fonts';
import type { TemplateCustomColors } from '$lib/template/theme/template-palette';
import type { PageModuleData } from './page-builder';

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
    /** Mongo themes collection id last applied from Admin → Templates (optional) */
    activeThemeId?: string
    /**
     * Legacy field; still written by some admin flows. **Effective visitor pack** is
     * `frontendTemplate ?? activeTemplate` (same order as `$stores/template` / `active-template.svelte.ts` and `TemplateService.getActiveTemplateWithOverrides`).
     */
    activeTemplate?: string
    /** Canonical visitor pack id (`noir` | `studio` | `atelier`). Preferred over `activeTemplate`. */
    frontendTemplate?: string
    /** @deprecated Always `default` from API. Admin UI is not pack-driven. */
    adminTemplate?: string
    /** Core + extended semantic colors (surfaces, light-theme overrides). See `template-palette.ts`. */
    customColors?: TemplateCustomColors
    /** Per-role font: family (string) or { family, size?, weight? }. Legacy: string = family only. */
    customFonts?: Partial<Record<FontRole, string | FontSetting>>
    /**
     * Shell layout: either legacy flat `{ maxWidth, containerPadding, gridGap }` or a full
     * breakpoint map `{ xs: { … }, sm: { … }, … }` (same data as `customLayoutByBreakpoint` when saved from Admin).
     */
    customLayout?:
      | {
          maxWidth?: string
          containerPadding?: string
          gridGap?: string
        }
      | Record<string, { maxWidth?: string; containerPadding?: string; gridGap?: string }>
    /** Shell metrics per breakpoint: max width, container padding, grid gap. */
    customLayoutByBreakpoint?: Partial<
      Record<
        string,
        { maxWidth?: string; containerPadding?: string; gridGap?: string }
      >
    >
    /** Per page × breakpoint: grid rows/columns. */
    pageLayoutByBreakpoint?: Record<
      string,
      Partial<Record<string, { gridRows?: number; gridColumns?: number }>>
    >
    /** Per page × breakpoint: module list. */
    pageModulesByBreakpoint?: Record<string, Partial<Record<string, unknown[]>>>
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
      menu?: {
        labelKey?: string
        label?: string
        href: string
        external?: boolean
        roles?: string[]
        showWhen?: 'always' | 'loggedIn' | 'loggedOut'
        type?: 'link' | 'login' | 'logout'
      }[]
      enableThemeToggle?: boolean
      enableLanguageSelector?: boolean
      showLanguageSelector?: boolean
      showGreeting?: boolean
      showAuthButtons?: boolean
      showTemplateSelector?: boolean
      /** Public header language control: compact dropdown (default) or flag buttons. */
      languageSelectorVariant?: 'dropdown' | 'flags'
      /** Theme control in the legacy shared header (not layout-shell header grid). */
      themeToggleVariant?: 'icons' | 'text' | 'both'
    } | null
    /** Legacy flat per page or `{ pageKey: { xs: …, lg: … } }` (Admin saves full map here). */
    pageModules?: Record<string, unknown>
    pageLayout?: Record<string, unknown>
    /** Named reusable grids for `layoutShell` blocks (legacy key). */
    layoutPresets?: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }>
    /** Shared layout-shell instances (preferred key; alias => grid + modules). */
    layoutShellInstances?: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }>
    /**
     * Shared, named instances for any module type with non-trivial props.
     * Shape: `{ [moduleType]: { [instanceName]: { props } } }`. A placement opts in by
     * setting `props.instanceRef = "<name>"`; `PageRenderer` merges the instance's
     * stored props beneath the placement-level props (placement wins). Sibling
     * registries `menuInstances` / `layoutShellInstances` remain authoritative for
     * their own module types.
     */
    moduleInstances?: Record<string, Record<string, { props?: Record<string, unknown> }>>
    /** Site-wide chrome rendered by `PageRenderer` above pages that set `showHeader: true`. */
    headerModules?: PageModuleData[]
    /** Site-wide chrome rendered by `PageRenderer` below pages that set `showFooter: true`. */
    footerModules?: PageModuleData[]
    /**
     * Per-pack header override. When the active pack key is present (even with `[]`), it wins over
     * `headerModules`. `[]` is a deliberate "no chrome for this pack" — distinct from "inherit default".
     */
    headerModulesByPack?: Partial<Record<'noir' | 'studio' | 'atelier', PageModuleData[]>>
    /**
     * Per-pack footer override. Same cascade rules as `headerModulesByPack`.
     */
    footerModulesByPack?: Partial<Record<'noir' | 'studio' | 'atelier', PageModuleData[]>>
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
     * Per built-in pack: CMS page alias / page-builder scoped class prefix (lowercase a–z / 0–9, 1–12 chars).
     * Omitted pack ids use each template pack’s built-in default.
     */
    pageAliasPrefixes?: Record<string, string>
    /**
     * Optional site-wide hero defaults (page-builder `hero` module can override per instance).
     * @see `frontend/src/lib/page-builder/modules/Hero/README.md`
     */
    hero?: {
      layout?: string
      [key: string]: unknown
    }
    /**
     * Default album card preset for album / gallery modules (`auto` defers to pack + layout).
     * Spec tokens: `bare` | `cards` | `list` | `portrait` | `overlay` | `compact`
     */
    albumCard?: string
    /**
     * Default photo grid preset. Spec: `square-tight` | `landscape` | `portrait` | `masonry` | `justified` | `large-preview`
     */
    photoCard?: string
  }
  seo: {
    metaTitle: MultiLangText
    metaDescription: MultiLangText
    /** Comma-separated keywords per language */
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
    enableComments: boolean
    collaboration?: {
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
    enableTagFeedbackSearchBoost?: boolean
  }
  footer?: {
    copyrightText?: string
    termsUrl?: string
    privacyUrl?: string
  }
  /** EXIF metadata display: which fields to show when displaying photo EXIF (empty/undefined = show all) */
  exifMetadata?: {
    displayFields?: string[]
  }
  /** IPTC/XMP metadata display: which fields to show when displaying photo IPTC/XMP (empty/undefined = show all) */
  iptcXmpMetadata?: {
    displayFields?: string[]
  }
  /** SMTP and welcome email (e.g. on user creation) */
  mail?: {
    host?: string
    port?: number
    user?: string
    password?: string
    from?: string
    secure?: boolean
  }
  welcomeEmail?: {
    enabled?: boolean
    subject?: MultiLangText
    body?: MultiLangText
  }
  /** White-label (Solution 1): hide OpenShutter branding and use site title everywhere; optional legal URLs */
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
  /** When true (apply theme), replace template module/layout/colors from payload instead of deep-merge */
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
