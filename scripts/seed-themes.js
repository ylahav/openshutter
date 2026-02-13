/**
 * Seed built-in themes (minimal, modern, elegant) into MongoDB
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
    name: 'Modern',
    description: 'Contemporary and sleek design',
    baseTemplate: 'modern',
    basePalette: null,
    customColors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#ffffff',
      text: '#111827',
      muted: '#6b7280'
    },
    customFonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    customLayout: {
      maxWidth: '1200px',
      containerPadding: '1rem',
      gridGap: '1.5rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true
  },
  {
    name: 'Elegant',
    description: 'Elegant and sophisticated design',
    baseTemplate: 'elegant',
    basePalette: null,
    customColors: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937',
      muted: '#6b7280'
    },
    customFonts: {
      heading: 'Playfair Display',
      body: 'Inter'
    },
    customLayout: {
      maxWidth: '1200px',
      containerPadding: '1rem',
      gridGap: '1.5rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true
  },
  {
    name: 'Minimal',
    description: 'Ultra-minimal and clean design',
    baseTemplate: 'minimal',
    basePalette: null,
    customColors: {
      primary: '#000000',
      secondary: '#6b7280',
      accent: '#000000',
      background: '#ffffff',
      text: '#000000',
      muted: '#6b7280'
    },
    customFonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    customLayout: {
      maxWidth: '1200px',
      containerPadding: '1rem',
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
