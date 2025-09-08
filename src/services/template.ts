import { TemplateConfig, SiteTemplateConfig } from '@/types/template'
import path from 'path'
import fs from 'fs/promises'

export class TemplateService {
  private static instance: TemplateService
  private templateCache: Map<string, TemplateConfig> = new Map()
  private activeTemplate: TemplateConfig | null = null

  private constructor() {}
  
  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService()
    }
    return TemplateService.instance
  }

  async getAvailableTemplates(): Promise<TemplateConfig[]> {
    const templates: TemplateConfig[] = []

    try {
      // Try to discover templates by scanning the templates directory for config files
      const templatesDir = path.join(process.cwd(), 'src', 'templates')
      const entries = await fs.readdir(templatesDir, { withFileTypes: true })

      const discoveredNames: string[] = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const dirName = entry.name
        const configPath = path.join(templatesDir, dirName, 'template.config.json')
        try {
          const stat = await fs.stat(configPath)
          if (stat.isFile()) {
            discoveredNames.push(dirName)
          }
        } catch {
          // No config file, skip
        }
      }

      const templateNames = discoveredNames.length > 0
        ? discoveredNames
        : ['default', 'modern', 'minimal', 'dark'] // fallback to static list

      for (const templateName of templateNames) {
        const template = await this.loadTemplate(templateName)
        if (template) {
          templates.push(template)
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }

    return templates
  }

  async loadTemplate(templateName: string): Promise<TemplateConfig | null> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!
    }

    try {
      // First try to load from per-template config file if present
      const config = await this.readTemplateConfigFromFile(templateName)
      if (config) {
        this.templateCache.set(templateName, config)
        return config
      }

      // Fallback to static config map
      const template = await this.getTemplateConfig(templateName)
      if (template) {
        this.templateCache.set(templateName, template)
        return template
      }
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error)
    }

    return null
  }

  private async readTemplateConfigFromFile(templateName: string): Promise<TemplateConfig | null> {
    try {
      const configPath = path.join(process.cwd(), 'src', 'templates', templateName, 'template.config.json')
      const json = await fs.readFile(configPath, 'utf-8')
      const parsed = JSON.parse(json) as TemplateConfig
      // Basic validation of required fields
      if (!parsed.templateName) parsed.templateName = templateName
      if (!parsed.components || !parsed.pages) return null
      return parsed
    } catch {
      return null
    }
  }

  async getActiveTemplate(): Promise<TemplateConfig | null> {
    if (this.activeTemplate) {
      return this.activeTemplate
    }

    try {
      // Use API call instead of direct service import
      const response = await fetch('/api/admin/site-config')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const templateName = result.data.template?.activeTemplate || 'default'
          const template = await this.loadTemplate(templateName)
          if (template) {
            this.activeTemplate = template
            return template
          }
        }
      }
    } catch (error) {
      console.error('Error loading active template:', error)
    }

    // Fallback to default template
    return await this.loadTemplate('default')
  }

  async setActiveTemplate(templateName: string): Promise<boolean> {
    try {
      const template = await this.loadTemplate(templateName)
      if (!template) {
        return false
      }

      // This method is now handled by the API route directly
      // The API route will update the site config
      this.activeTemplate = template
      this.templateCache.clear() // Clear cache to force reload
      return true
    } catch (error) {
      console.error('Error setting active template:', error)
      return false
    }
  }

  async getTemplateComponent(templateName: string, componentName: string): Promise<any> {
    try {
      const template = await this.loadTemplate(templateName)
      if (!template) {
        return null
      }

      const componentPath = template.components[componentName as keyof typeof template.components]
      if (!componentPath) {
        return null
      }

      // Dynamic import of the component
      const component = await import(`@/templates/${templateName}/${componentPath}`)
      return component.default || component
    } catch (error) {
      console.error(`Error loading template component ${componentName}:`, error)
      return null
    }
  }

  async getTemplatePage(templateName: string, pageName: string): Promise<any> {
    try {
      const template = await this.loadTemplate(templateName)
      if (!template) {
        return null
      }

      const pagePath = template.pages[pageName as keyof typeof template.pages]
      if (!pagePath) {
        return null
      }

      // Dynamic import of the page
      const page = await import(`@/templates/${templateName}/${pagePath}`)
      return page.default || page
    } catch (error) {
      console.error(`Error loading template page ${pageName}:`, error)
      return null
    }
  }

  async getTemplateConfig(templateName: string): Promise<TemplateConfig | null> {
    // Static template configurations
    const templates: Record<string, TemplateConfig> = {
      default: {
        templateName: 'default',
        displayName: 'Default',
        description: 'Clean and simple default template',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/default/thumbnail.jpg',
        category: 'minimal',
        features: {
          responsive: true,
          darkMode: false,
          animations: true,
          seoOptimized: true
        },
        colors: {
          primary: '#3B82F6',
          secondary: '#1F2937',
          accent: '#F59E0B',
          background: '#FFFFFF',
          text: '#1F2937',
          muted: '#6B7280'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        },
        layout: {
          maxWidth: '1200px',
          containerPadding: '1rem',
          gridGap: '1.5rem'
        },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx'
        },
        visibility: {
          hero: true,
          languageSelector: true,
          authButtons: true,
          footerMenu: true
        },
        pages: {
          home: 'pages/Home.tsx',
          gallery: 'pages/Gallery.tsx',
          album: 'pages/Album.tsx'
        }
      },
      modern: {
        templateName: 'modern',
        displayName: 'Modern',
        description: 'Contemporary design with bold typography',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/modern/thumbnail.jpg',
        category: 'modern',
        features: {
          responsive: true,
          darkMode: true,
          animations: true,
          seoOptimized: true
        },
        colors: {
          primary: '#8B5CF6',
          secondary: '#1E293B',
          accent: '#F97316',
          background: '#F8FAFC',
          text: '#0F172A',
          muted: '#64748B'
        },
        fonts: {
          heading: 'Poppins',
          body: 'Inter'
        },
        layout: {
          maxWidth: '1400px',
          containerPadding: '2rem',
          gridGap: '2rem'
        },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx'
        },
        visibility: {
          hero: true,
          languageSelector: true,
          authButtons: true,
          footerMenu: true
        },
        pages: {
          home: 'pages/Home.tsx',
          gallery: 'pages/Gallery.tsx',
          album: 'pages/Album.tsx'
        }
      },
      minimal: {
        templateName: 'minimal',
        displayName: 'Minimal',
        description: 'Minimalist design focusing on content',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/minimal/thumbnail.jpg',
        category: 'minimal',
        features: {
          responsive: true,
          darkMode: false,
          animations: false,
          seoOptimized: true
        },
        colors: {
          primary: '#000000',
          secondary: '#333333',
          accent: '#666666',
          background: '#FFFFFF',
          text: '#000000',
          muted: '#999999'
        },
        fonts: {
          heading: 'Helvetica',
          body: 'Helvetica'
        },
        layout: {
          maxWidth: '1000px',
          containerPadding: '0.5rem',
          gridGap: '1rem'
        },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx'
        },
        visibility: {
          hero: true,
          languageSelector: true,
          authButtons: true,
          footerMenu: true
        },
        pages: {
          home: 'pages/Home.tsx',
          gallery: 'pages/Gallery.tsx',
          album: 'pages/Album.tsx'
        }
      },
      dark: {
        templateName: 'dark',
        displayName: 'Dark',
        description: 'Dark theme for modern aesthetics',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/dark/thumbnail.jpg',
        category: 'dark',
        features: {
          responsive: true,
          darkMode: true,
          animations: true,
          seoOptimized: true
        },
        colors: {
          primary: '#10B981',
          secondary: '#374151',
          accent: '#F59E0B',
          background: '#111827',
          text: '#F9FAFB',
          muted: '#9CA3AF'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        },
        layout: {
          maxWidth: '1200px',
          containerPadding: '1rem',
          gridGap: '1.5rem'
        },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx'
        },
        visibility: {
          hero: true,
          languageSelector: true,
          authButtons: true,
          footerMenu: true
        },
        pages: {
          home: 'pages/Home.tsx',
          gallery: 'pages/Gallery.tsx',
          album: 'pages/Album.tsx'
        }
      }
    }

    return templates[templateName] || null
  }
}

export const templateService = TemplateService.getInstance()
