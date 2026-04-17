import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { SiteConfigService } from '../services/site-config';
import { StorageConfigService } from '../services/storage/config';
import { ownerStorageConfigService } from '../services/storage/owner-storage-config.service';
import { IUserDocument } from '../models/User';
import { PageModel } from '../models/Page';
import * as bcrypt from 'bcryptjs';

// Default page layouts and modules for all themes
const DEFAULT_PAGE_LAYOUTS = {
  home: { gridRows: 2, gridColumns: 1 },
  gallery: { gridRows: 1, gridColumns: 1 },
  album: { gridRows: 1, gridColumns: 1 },
  login: { gridRows: 1, gridColumns: 1 },
  search: { gridRows: 1, gridColumns: 1 },
  blog: { gridRows: 1, gridColumns: 1 },
  'blog-category': { gridRows: 1, gridColumns: 1 },
  'blog-article': { gridRows: 1, gridColumns: 1 },
  header: { gridRows: 1, gridColumns: 5 },
  footer: { gridRows: 2, gridColumns: 1 }
};

const DEFAULT_PAGE_MODULES = {
  home: [
    {
      _id: 'mod_default_home_hero',
      type: 'hero',
      props: {
        title: { en: 'Welcome to Our Gallery' },
        subtitle: { en: 'Discover amazing moments captured in time' },
        ctaLabel: { en: 'Explore Albums' },
        ctaUrl: '/albums',
        backgroundStyle: 'light'
      },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_home_albums',
      type: 'albumsGrid',
      props: { albumSource: 'root' },
      rowOrder: 1,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  gallery: [
    {
      _id: 'mod_default_gallery_albums',
      type: 'albumsGrid',
      props: { albumSource: 'root' },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  album: [
    {
      _id: 'mod_default_album_gallery',
      type: 'albumView',
      props: { albumSource: 'current' },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  login: [
    {
      _id: 'mod_default_login_form',
      type: 'loginForm',
      props: {},
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  search: [
    {
      _id: 'mod_default_search_text',
      type: 'richText',
      props: {
        title: { en: 'Search Results' },
        body: { en: '<p>Use the search bar to find photos, albums, people, and locations.</p>' },
        background: 'white'
      },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  blog: [
    {
      _id: 'mod_default_blog_index',
      type: 'blogArticle',
      props: { scope: 'index' },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  'blog-category': [
    {
      _id: 'mod_default_blog_category',
      type: 'blogCategory',
      props: {},
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  'blog-article': [
    {
      _id: 'mod_default_blog_article',
      type: 'blogArticle',
      props: {},
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  header: [
    {
      _id: 'mod_default_header_logo',
      type: 'logo',
      props: { showAsLink: true },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_header_title',
      type: 'siteTitle',
      props: { showAsLink: true },
      rowOrder: 0,
      columnIndex: 1,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_header_menu',
      type: 'menu',
      props: {},
      rowOrder: 0,
      columnIndex: 2,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_header_language',
      type: 'languageSelector',
      props: {
        showFlags: true,
        showNativeNames: true,
        compact: false
      },
      rowOrder: 0,
      columnIndex: 3,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_header_theme',
      type: 'themeToggle',
      props: {},
      rowOrder: 0,
      columnIndex: 4,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  footer: [
    {
      _id: 'mod_default_footer_social',
      type: 'socialMedia',
      props: {
        align: 'center',
        orientation: 'horizontal',
        iconSize: 'md',
        showLabels: false
      },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_footer_text',
      type: 'richText',
      props: {
        title: {},
        body: { en: '<p>&copy; 2024 OpenShutter. All rights reserved.</p>' },
        background: 'gray'
      },
      rowOrder: 1,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ]
};

// Built-in themes (seeded into themes collection - all themes live in one place)
const BUILT_IN_THEMES = [
  {
    name: 'Noir',
    description: 'Cinematic dark layout — mono typography, grid hero (showcase pack)',
    baseTemplate: 'noir',
    basePalette: null,
    customColors: {
      primary: '#f5f5f3',
      secondary: '#a1a1a1',
      accent: '#f5f5f3',
      background: '#080808',
      text: '#f5f5f3',
      muted: 'rgba(245,245,243,0.38)',
      surfaceCard: '#141414',
      surfaceCardSecondary: '#1c1c1c',
      surfaceCardTertiary: '#232323',
      textSubtle: 'rgba(245,245,243,0.16)',
      borderSubtle: 'rgba(255,255,255,0.07)',
      lightBackground: '#f5f5f3',
      lightText: '#080808',
      lightMuted: 'rgba(8,8,8,0.45)',
      lightSurfaceCard: '#e8e8e5',
      lightSurfaceCardSecondary: '#ddddd9',
      lightSurfaceCardTertiary: '#d2d2ce',
      lightTextSubtle: 'rgba(8,8,8,0.22)',
      lightBorderSubtle: 'rgba(0,0,0,0.08)',
    },
    customFonts: {
      heading: 'DM Sans',
      body: 'DM Mono',
      links: 'DM Mono',
      lists: 'DM Mono',
      formInputs: 'DM Mono',
      formLabels: 'DM Mono',
    },
    customLayout: { maxWidth: '1280px', containerPadding: '2rem', gridGap: '0.125rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: DEFAULT_PAGE_MODULES,
    pageLayout: DEFAULT_PAGE_LAYOUTS,
    isPublished: true,
    isBuiltIn: true,
  },
  {
    name: 'Studio',
    description: 'Editorial portfolio layout — Syne & Outfit, hero strip, card grid',
    baseTemplate: 'studio',
    basePalette: null,
    customColors: {
      primary: '#2563eb',
      secondary: '#1d4ed8',
      accent: '#60a5fa',
      background: '#0f172a',
      text: '#f1f5f9',
      muted: '#94a3b8',
      surfaceCard: '#1e293b',
      surfaceCardSecondary: '#0f172a',
      surfaceCardTertiary: '#1e293b',
      textSubtle: 'rgba(241,245,249,0.2)',
      borderSubtle: '#334155',
      lightBackground: '#f8fafc',
      lightText: '#0f172a',
      lightMuted: '#64748b',
      lightSurfaceCard: '#ffffff',
      lightSurfaceCardSecondary: '#f8fafc',
      lightSurfaceCardTertiary: '#f1f5f9',
      lightTextSubtle: 'rgba(15,23,42,0.22)',
      lightBorderSubtle: '#e2e8f0',
      heroStrip: '#020617',
      footerStrip: '#020617',
      lightHeroStrip: '#0f172a',
      lightFooterStrip: '#0f172a',
    },
    customFonts: {
      heading: 'Syne',
      body: 'Outfit',
      links: 'Outfit',
      lists: 'Outfit',
      formInputs: 'Outfit',
      formLabels: 'Outfit',
    },
    customLayout: { maxWidth: '1200px', containerPadding: '1.75rem', gridGap: '1rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: DEFAULT_PAGE_MODULES,
    pageLayout: DEFAULT_PAGE_LAYOUTS,
    isPublished: true,
    isBuiltIn: true,
  },
  {
    name: 'Atelier',
    description: 'Warm editorial layout — Cormorant Garamond & Jost, tall hero, list albums',
    baseTemplate: 'atelier',
    basePalette: null,
    customColors: {
      primary: '#b8955a',
      secondary: '#5c4033',
      accent: '#d4b07a',
      background: '#1a1008',
      text: '#f0e8d8',
      muted: '#7a6a58',
      surfaceCard: '#231710',
      surfaceCardSecondary: '#1a1008',
      surfaceCardTertiary: '#2e1f14',
      textSubtle: 'rgba(240,232,216,0.25)',
      borderSubtle: '#3a2a1c',
      lightBackground: '#faf6ef',
      lightText: '#2c1f14',
      lightMuted: '#9c8c7a',
      lightSurfaceCard: '#f2ece0',
      lightSurfaceCardSecondary: '#f2ece0',
      lightSurfaceCardTertiary: '#e8dece',
      lightTextSubtle: 'rgba(44,31,20,0.35)',
      lightBorderSubtle: '#e8dece',
      heroStrip: '#0e0804',
      footerStrip: '#0e0804',
      lightHeroStrip: '#2c1f14',
      lightFooterStrip: '#2c1f14',
    },
    customFonts: {
      heading: 'Cormorant Garamond',
      body: 'Jost',
      links: 'Jost',
      lists: 'Jost',
      formInputs: 'Jost',
      formLabels: 'Jost',
    },
    customLayout: { maxWidth: '960px', containerPadding: '2rem', gridGap: '1rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: DEFAULT_PAGE_MODULES,
    pageLayout: DEFAULT_PAGE_LAYOUTS,
    isPublished: true,
    isBuiltIn: true,
  },
];

// Initial admin user configuration
const INITIAL_ADMIN_CREDENTIALS = {
  email: 'admin@openshutter.org',
  password: 'admin123!',
  name: 'System Administrator',
  role: 'admin' as const,
};

const RESERVED_PAGES = [
  { role: 'home', alias: 'home', category: 'system' as const },
  { role: 'gallery', alias: 'gallery', category: 'system' as const },
  { role: 'album', alias: 'album', category: 'system' as const, routeParams: ['albumAlias'] },
  { role: 'login', alias: 'login', category: 'system' as const },
  { role: 'search', alias: 'search', category: 'system' as const },
  { role: 'blog', alias: 'blog', category: 'system' as const },
  { role: 'blog-category', alias: 'blog-category', category: 'system' as const, routeParams: ['categoryAlias'] },
  { role: 'blog-article', alias: 'blog-article', category: 'system' as const, routeParams: ['articleAlias'] },
] as const;

@Injectable()
export class DatabaseInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseInitService.name);
  private readonly siteConfigService = SiteConfigService.getInstance();
  private readonly storageConfigService = StorageConfigService.getInstance();

  constructor(
    @InjectModel('User') private userModel: Model<IUserDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('🚀 DatabaseInitService: Starting database initialization...');
    
    // Add a small delay to ensure all modules are fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for database connection to be ready
    if (this.connection.readyState !== 1) {
      this.logger.log('⏳ Waiting for database connection...');
      try {
        await new Promise<void>((resolve, reject) => {
          if (this.connection.readyState === 1) {
            resolve();
            return;
          }
          
          const timeout = setTimeout(() => {
            reject(new Error('Database connection timeout after 10 seconds'));
          }, 10000);
          
          this.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          this.connection.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      } catch (error) {
        this.logger.error(`❌ Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.logger.error('⚠️  Database initialization will be skipped. Please check MongoDB connection and restart.');
        return;
      }
    }
    
    this.logger.log(`✅ Database connection ready (state: ${this.connection.readyState})`);
    this.logger.log('📝 Starting database initialization...');
    
    try {
      // Initialize in sequence to avoid race conditions
      await this.initializeDefaultAdmin();
      await this.initializeDefaultSiteConfig();
      await this.initializeDefaultStorageConfigs();
      await ownerStorageConfigService.ensureIndexes();
      await this.initializeDefaultThemes();
      await this.ensurePageRolePackIndex();
      await this.initializeReservedPages();
      
      this.logger.log('✅ Database initialization completed successfully');
    } catch (error) {
      this.logger.error(`❌ Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      // Don't throw - allow app to start even if initialization fails
      // The app can still function, and initialization can be retried
      this.logger.warn('⚠️  Application will continue, but some features may not work until initialization succeeds.');
    }
  }

  /**
   * Initialize default admin user if no admin exists
   * Made public for manual initialization endpoint
   */
  async initializeDefaultAdmin(): Promise<void> {
    try {
      this.logger.log('Checking for existing admin user...');
      const existingAdmin = await this.userModel.findOne({ role: 'admin' });
      
      if (existingAdmin) {
        this.logger.log(`Admin user already exists (${existingAdmin.username}), skipping creation`);
        return;
      }

      this.logger.log('No admin user found, creating default admin user...');
      
      // Use the same password hashing method as auth.service for consistency
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(INITIAL_ADMIN_CREDENTIALS.password, salt);
      const now = new Date();
      
      const newUser = await this.userModel.create({
        name: { en: INITIAL_ADMIN_CREDENTIALS.name },
        username: INITIAL_ADMIN_CREDENTIALS.email,
        passwordHash,
        role: 'admin',
        groupAliases: [],
        blocked: false,
        allowedStorageProviders: [],
        createdAt: now,
        updatedAt: now,
      });

      this.logger.log(`✅ Default admin user created successfully`);
      this.logger.log(`   Email: ${INITIAL_ADMIN_CREDENTIALS.email}`);
      this.logger.log(`   User ID: ${newUser._id}`);
      this.logger.warn(`⚠️  IMPORTANT: Change the default admin password after first login!`);
    } catch (error) {
      this.logger.error(`Failed to initialize default admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Initialize default site configuration
   * Made public for manual initialization endpoint
   */
  async initializeDefaultSiteConfig(): Promise<void> {
    try {
      this.logger.log('Initializing site configuration...');
      const config = await this.siteConfigService.initializeDefaultConfig();
      this.logger.log(`✅ Default site configuration initialized (ID: ${config._id || 'N/A'})`);
    } catch (error) {
      this.logger.error(`Failed to initialize site config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Initialize default storage configurations
   * Made public for manual initialization endpoint
   */
  async initializeDefaultStorageConfigs(): Promise<void> {
    try {
      this.logger.log('Initializing storage configurations...');
      await this.storageConfigService.initializeDefaultConfigs();
      this.logger.log('✅ Default storage configurations initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize storage configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Drop legacy built-in themes (simple, modern, elegant, …) from MongoDB and remap
   * custom themes that still reference those packs to `noir`. Fixes template pickers
   * listing removed packs after upgrades.
   */
  private async pruneRetiredPackThemes(
    collection: import('mongoose').mongo.Collection,
    db: import('mongoose').mongo.Db,
    now: Date,
  ): Promise<void> {
    const VALID = new Set(['noir', 'studio', 'atelier']);
    const docs = await collection.find({}).toArray();
    for (const doc of docs) {
      const bt = String(doc.baseTemplate ?? '')
        .trim()
        .toLowerCase();
      if (VALID.has(bt)) continue;
      if (doc.isBuiltIn) {
        await collection.deleteOne({ _id: doc._id });
        this.logger.log(`  Removed retired built-in theme: ${doc.baseTemplate} (${doc.name})`);
      } else {
        await collection.updateOne({ _id: doc._id }, { $set: { baseTemplate: 'noir', updatedAt: now } });
        this.logger.log(`  Remapped custom theme "${doc.name}" baseTemplate → noir (was ${doc.baseTemplate})`);
      }
    }

    const idRows = await collection.find({}).project({ _id: 1 }).toArray();
    const remaining = new Set(idRows.map((doc) => String((doc as { _id: unknown })._id)));
    const siteColl = db.collection('site_config');
    const sc = await siteColl.findOne({});
    const aid = sc?.template?.activeThemeId;
    if (aid && !remaining.has(String(aid))) {
      const noirTheme = await collection.findOne({ isBuiltIn: true, baseTemplate: 'noir' });
      if (noirTheme && sc?._id) {
        await siteColl.updateOne(
          { _id: sc._id },
          { $set: { 'template.activeThemeId': noirTheme._id, updatedAt: now } },
        );
        this.logger.log('  Fixed site_config.activeThemeId after retired theme removal');
      }
    }

    SiteConfigService.getInstance().invalidateCache();
  }

  /**
   * Seed built-in themes into themes collection.
   * All themes (built-in + custom) live in one collection.
   */
  async initializeDefaultThemes(): Promise<void> {
    try {
      this.logger.log('Initializing themes...');
      const db = this.connection.db;
      if (!db) {
        this.logger.warn('Database not connected, skipping themes initialization');
        return;
      }
      const collection = db.collection('themes');
      const now = new Date();
      for (const theme of BUILT_IN_THEMES) {
        const existing = await collection.findOne({ baseTemplate: theme.baseTemplate, isBuiltIn: true });
        if (!existing) {
          await collection.insertOne({
            ...theme,
            createdAt: now,
            updatedAt: now,
          });
          this.logger.log(`  Created theme: ${theme.name}`);
        }
      }

      await this.pruneRetiredPackThemes(collection, db, now);

      this.logger.log('✅ Default themes initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize themes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Replace legacy unique index on `pageRole` with compound unique (pageRole + frontendTemplate)
   * so each pack can have its own row for the same reserved role.
   */
  async ensurePageRolePackIndex(): Promise<void> {
    try {
      const db = this.connection.db;
      if (!db) {
        this.logger.warn('Database not connected, skipping pages index migration');
        return;
      }
      const coll = db.collection('pages');
      const indexes = await coll.indexes();
      const legacy = indexes.find((i) => i.name === 'pageRole_1');
      if (legacy) {
        await coll.dropIndex('pageRole_1');
        this.logger.log('Dropped legacy pages index pageRole_1 (role + pack variants enabled)');
      }
    } catch (err) {
      this.logger.warn(
        `Pages index migration (drop pageRole_1): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    try {
      await PageModel.syncIndexes();
    } catch (err) {
      this.logger.error(
        `PageModel.syncIndexes failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async initializeReservedPages(): Promise<void> {
    try {
      this.logger.log('Initializing reserved pages...');
      const db = this.connection.db;
      if (!db) {
        this.logger.warn('Database not connected, skipping reserved pages initialization');
        return;
      }

      const pagesCollection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');
      const adminUser = await this.userModel.findOne({ role: 'admin' }).sort({ createdAt: 1 }).lean();
      if (!adminUser?._id) {
        this.logger.warn('No admin user found, skipping reserved pages initialization');
        return;
      }

      const now = new Date();
      for (const page of RESERVED_PAGES) {
        const existing = await pagesCollection.findOne({
          $or: [{ pageRole: page.role }, { alias: page.alias }, { slug: page.alias }],
        });
        if (existing) continue;

        const pageDoc: Record<string, unknown> = {
          title: { en: page.alias, he: '' },
          alias: page.alias,
          slug: page.alias,
          pageRole: page.role,
          category: page.category,
          isPublished: true,
          createdBy: adminUser._id,
          updatedBy: adminUser._id,
          createdAt: now,
          updatedAt: now,
          layout: DEFAULT_PAGE_LAYOUTS[page.role as keyof typeof DEFAULT_PAGE_LAYOUTS] || { gridRows: 1, gridColumns: 1, zones: ['main'] },
        };
        const routeParams = 'routeParams' in page ? page.routeParams : undefined;
        if (routeParams?.length) pageDoc.routeParams = [...routeParams];

        const insertResult = await pagesCollection.insertOne(pageDoc);
        const defaultModules = DEFAULT_PAGE_MODULES[page.role as keyof typeof DEFAULT_PAGE_MODULES] || [];
        if (defaultModules.length) {
          await modulesCollection.insertMany(
            defaultModules.map((mod) => {
              const { _id: _seedId, ...rest } = mod;
              return {
                ...rest,
                pageId: insertResult.insertedId,
                createdAt: now,
                updatedAt: now,
              };
            }),
          );
        }
        this.logger.log(`  Created reserved page: ${page.role}`);
      }

      this.logger.log('✅ Reserved pages initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize reserved pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }
}
