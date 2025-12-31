import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import type { TemplateConfig } from '../types/template';

// Import static templates directly
const staticTemplates: Record<string, TemplateConfig> = {
  'default': {
    templateName: 'default',
    displayName: 'Default',
    description: 'Clean and minimal template',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/default/thumbnail.jpg',
    category: 'minimal',
    features: { responsive: true, darkMode: false, animations: true, seoOptimized: true },
    colors: { primary: '#3B82F6', secondary: '#1F2937', accent: '#F59E0B', background: '#FFFFFF', text: '#1F2937', muted: '#6B7280' },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
    components: {
      hero: 'components/Hero.tsx',
      albumCard: 'components/AlbumCard.tsx',
      photoCard: 'components/PhotoCard.tsx',
      albumList: 'components/AlbumList.tsx',
      gallery: 'components/Gallery.tsx',
      navigation: 'components/Navigation.tsx',
      footer: 'components/Footer.tsx',
    },
    visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
    pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
  },
  'modern': {
    templateName: 'modern',
    displayName: 'Modern',
    description: 'Contemporary and sleek design',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/modern/thumbnail.jpg',
    category: 'modern',
    features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
    colors: { primary: '#3b82f6', secondary: '#6b7280', accent: '#10b981', background: '#ffffff', text: '#111827', muted: '#6b7280' },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
    components: {
      hero: 'components/Hero.tsx',
      albumCard: 'components/AlbumCard.tsx',
      photoCard: 'components/PhotoCard.tsx',
      albumList: 'components/AlbumList.tsx',
      gallery: 'components/Gallery.tsx',
      navigation: 'components/Navigation.tsx',
      footer: 'components/Footer.tsx',
    },
    visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
    pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
  },
  'fancy': {
    templateName: 'fancy',
    displayName: 'Fancy',
    description: 'Elegant and sophisticated design',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/fancy/thumbnail.jpg',
    category: 'elegant',
    features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
    colors: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#f59e0b', background: '#ffffff', text: '#1f2937', muted: '#6b7280' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
    components: {
      hero: 'components/Hero.tsx',
      albumCard: 'components/AlbumCard.tsx',
      photoCard: 'components/PhotoCard.tsx',
      albumList: 'components/AlbumList.tsx',
      gallery: 'components/Gallery.tsx',
      navigation: 'components/Navigation.tsx',
      footer: 'components/Footer.tsx',
    },
    visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
    pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
  },
  'minimal': {
    templateName: 'minimal',
    displayName: 'Minimal',
    description: 'Ultra-minimal and clean design',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/minimal/thumbnail.jpg',
    category: 'minimal',
    features: { responsive: true, darkMode: false, animations: false, seoOptimized: true },
    colors: { primary: '#000000', secondary: '#6b7280', accent: '#000000', background: '#ffffff', text: '#000000', muted: '#6b7280' },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1rem' },
    components: {
      hero: 'components/Hero.tsx',
      albumCard: 'components/AlbumCard.tsx',
      photoCard: 'components/PhotoCard.tsx',
      albumList: 'components/AlbumList.tsx',
      gallery: 'components/Gallery.tsx',
      navigation: 'components/Navigation.tsx',
      footer: 'components/Footer.tsx',
    },
    visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
    pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
  }
};

@Controller('admin/templates')
@UseGuards(AdminGuard)
export class TemplatesController {
  /**
   * Get all available templates
   * Path: GET /api/admin/templates
   */
  @Get()
  async getTemplates(): Promise<TemplateConfig[]> {
    // Return all static templates
    return Object.values(staticTemplates);
  }
}
