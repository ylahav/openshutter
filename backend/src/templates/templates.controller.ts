import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import type { TemplateConfig, FontSetting } from '../types/template';

const font = (family: string, size?: string, weight?: string): FontSetting =>
  size || weight ? { family, size, weight } : { family };

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
    fonts: {
      heading: font('Inter', '1.25rem', '600'),
      body: font('Inter', '1rem', '400'),
      links: font('Inter'),
      lists: font('Inter'),
      formInputs: font('Inter'),
      formLabels: font('Inter'),
    },
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
    colors: { primary: '#2563EB', secondary: '#334155', accent: '#22D3EE', background: '#0F172A', text: '#E2E8F0', muted: '#94A3B8' },
    fonts: {
      heading: font('Inter', '1.25rem', '600'),
      body: font('Inter', '1rem', '400'),
      links: font('Inter'),
      lists: font('Inter'),
      formInputs: font('Inter'),
      formLabels: font('Inter'),
    },
    layout: { maxWidth: '1280px', containerPadding: '1.5rem', gridGap: '1.75rem' },
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
  'elegant': {
    templateName: 'elegant',
    displayName: 'Elegant',
    description: 'Elegant and sophisticated design',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/elegant/thumbnail.jpg',
    category: 'elegant',
    features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
    colors: { primary: '#7C3AED', secondary: '#C4B5FD', accent: '#F59E0B', background: '#1F1437', text: '#F5F3FF', muted: '#C4B5FD' },
    fonts: {
      heading: font('Playfair Display', '1.25rem', '600'),
      body: font('Lora', '1rem', '400'),
      links: font('Inter'),
      lists: font('Inter'),
      formInputs: font('Inter'),
      formLabels: font('Inter'),
    },
    layout: { maxWidth: '1100px', containerPadding: '2rem', gridGap: '2rem' },
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
    colors: { primary: '#111111', secondary: '#9CA3AF', accent: '#111111', background: '#FFFFFF', text: '#111111', muted: '#9CA3AF' },
    fonts: {
      heading: font('Inter', '1.125rem', '500'),
      body: font('Inter', '0.95rem', '400'),
      links: font('Inter'),
      lists: font('Inter'),
      formInputs: font('Inter'),
      formLabels: font('Inter'),
    },
    layout: { maxWidth: '980px', containerPadding: '0.75rem', gridGap: '0.75rem' },
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
