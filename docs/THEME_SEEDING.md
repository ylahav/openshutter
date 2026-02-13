# Theme Seeding Guide

This guide explains how to seed the built-in themes (Modern, Elegant, Minimal) into a new OpenShutter installation.

## Overview

OpenShutter includes three built-in themes that are automatically seeded when the application starts via `DatabaseInitService`. However, you can also seed them manually using the provided scripts.

## Automatic Seeding

Themes are automatically seeded when the backend starts if they don't already exist. This happens in `backend/src/database/database-init.service.ts` via the `initializeDefaultThemes()` method.

## Manual Seeding

### Option 1: MongoDB Shell (mongosh)

```bash
# Connect to your MongoDB instance and database
mongosh mongodb://localhost:27017/openshutter scripts/seed-themes.mongodb.js
```

Or if already connected to mongosh:

```javascript
load('scripts/seed-themes.mongodb.js')
```

### Option 2: Node.js Script

```bash
# Set MongoDB connection string (if different from default)
export MONGODB_URI="mongodb://localhost:27017/openshutter"

# Run the script
node scripts/seed-themes.js
```

Or with inline environment variable:

```bash
MONGODB_URI=mongodb://localhost:27017/openshutter node scripts/seed-themes.js
```

### Option 3: Direct MongoDB Commands

You can also insert themes directly using mongosh:

```javascript
use openshutter

db.themes.insertMany([
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
    customFonts: { heading: 'Inter', body: 'Inter' },
    customLayout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date()
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
    customFonts: { heading: 'Playfair Display', body: 'Inter' },
    customLayout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date()
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
    customFonts: { heading: 'Inter', body: 'Inter' },
    customLayout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

## Theme Structure

Each theme includes:

- **name**: Display name (Modern, Elegant, Minimal)
- **description**: Short description
- **baseTemplate**: Template identifier ('modern', 'elegant', 'minimal')
- **basePalette**: Palette preset (null for built-in themes)
- **customColors**: Color tokens (primary, secondary, accent, background, text, muted)
- **customFonts**: Font settings (heading, body)
- **customLayout**: Layout settings (maxWidth, containerPadding, gridGap)
- **componentVisibility**: Component visibility overrides (empty object)
- **headerConfig**: Header configuration (empty object)
- **pageModules**: Per-page module configuration (empty object, can be configured later)
- **pageLayout**: Per-page grid layout (empty object, can be configured later)
- **isPublished**: Whether theme is published (true)
- **isBuiltIn**: Whether theme is built-in (true)
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

## Verification

After seeding, verify themes exist:

```javascript
// In mongosh
use openshutter
db.themes.find({ isBuiltIn: true }).pretty()
```

Or via API:

```bash
curl http://localhost:5000/api/admin/themes
```

## Notes

- Themes are idempotent: running the seed script multiple times won't create duplicates
- Built-in themes are identified by `isBuiltIn: true` and `baseTemplate` combination
- Themes can be customized after seeding, but `isBuiltIn: true` prevents deletion
- The `pageModules` and `pageLayout` fields are empty by default and can be configured via the Theme Builder UI
