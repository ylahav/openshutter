/**
 * Seed built-in themes (noir, studio, atelier) into MongoDB
 * 
 * Usage:
 *   Option 1: Run with mongosh
 *     mongosh mongodb://localhost:27017/openshutter scripts/seed-themes.js
 * 
 *   Option 2: Run with Node.js (requires mongodb driver)
 *     node scripts/seed-themes.js
 * 
 *   Option 3: Run from backend directory with environment variables
 *     cd backend && MONGODB_URI=mongodb://localhost:27017/openshutter node ../scripts/seed-themes.js
 */

const BUILT_IN_THEMES = [
  {
    name: 'Noir',
    description: 'Cinematic dark layout — mono typography, grid hero',
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
      lightBorderSubtle: 'rgba(0,0,0,0.08)'
    },
    customFonts: {
      heading: 'DM Sans',
      body: 'DM Mono',
      links: 'DM Mono',
      lists: 'DM Mono',
      formInputs: 'DM Mono',
      formLabels: 'DM Mono'
    },
    customLayout: {
      maxWidth: '1280px',
      containerPadding: '2rem',
      gridGap: '0.125rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true
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
      lightFooterStrip: '#0f172a'
    },
    customFonts: {
      heading: 'Syne',
      body: 'Outfit',
      links: 'Outfit',
      lists: 'Outfit',
      formInputs: 'Outfit',
      formLabels: 'Outfit'
    },
    customLayout: {
      maxWidth: '1200px',
      containerPadding: '1.75rem',
      gridGap: '1rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true
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
      lightFooterStrip: '#2c1f14'
    },
    customFonts: {
      heading: 'Cormorant Garamond',
      body: 'Jost',
      links: 'Jost',
      lists: 'Jost',
      formInputs: 'Jost',
      formLabels: 'Jost'
    },
    customLayout: {
      maxWidth: '960px',
      containerPadding: '2rem',
      gridGap: '1rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true
  }
];

// For mongosh (MongoDB Shell)
if (typeof db !== 'undefined') {
  const collection = db.getCollection('themes');
  const now = new Date();
  
  print('Seeding built-in themes...');
  
  BUILT_IN_THEMES.forEach(theme => {
    const existing = collection.findOne({ baseTemplate: theme.baseTemplate, isBuiltIn: true });
    if (!existing) {
      collection.insertOne({
        ...theme,
        createdAt: now,
        updatedAt: now
      });
      print(`  ✓ Created theme: ${theme.name}`);
    } else {
      print(`  - Theme already exists: ${theme.name} (skipping)`);
    }
  });
  
  print('✅ Theme seeding completed');
} else {
  // For Node.js with mongodb driver
  const { MongoClient } = require('mongodb');
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/openshutter';
  
  async function seedThemes() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
      await client.connect();
      console.log('Connected to MongoDB');
      
      const db = client.db();
      const collection = db.collection('themes');
      const now = new Date();
      
      console.log('Seeding built-in themes...');
      
      for (const theme of BUILT_IN_THEMES) {
        const existing = await collection.findOne({ 
          baseTemplate: theme.baseTemplate, 
          isBuiltIn: true 
        });
        
        if (!existing) {
          await collection.insertOne({
            ...theme,
            createdAt: now,
            updatedAt: now
          });
          console.log(`  ✓ Created theme: ${theme.name}`);
        } else {
          console.log(`  - Theme already exists: ${theme.name} (skipping)`);
        }
      }
      
      console.log('✅ Theme seeding completed');
    } catch (error) {
      console.error('❌ Error seeding themes:', error);
      process.exit(1);
    } finally {
      await client.close();
    }
  }
  
  seedThemes();
}
