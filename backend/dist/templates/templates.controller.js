"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
// Import static templates directly
const staticTemplates = {
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
let TemplatesController = class TemplatesController {
    /**
     * Get all available templates
     * Path: GET /api/admin/templates
     */
    getTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            // Return all static templates
            return Object.values(staticTemplates);
        });
    }
};
exports.TemplatesController = TemplatesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getTemplates", null);
exports.TemplatesController = TemplatesController = __decorate([
    (0, common_1.Controller)('admin/templates'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], TemplatesController);
