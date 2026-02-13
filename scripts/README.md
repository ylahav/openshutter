# Scripts Directory

This directory contains utility scripts for OpenShutter.

## Theme Seeding

### Quick Start

**MongoDB Shell (mongosh):**
```bash
mongosh mongodb://localhost:27017/openshutter scripts/seed-themes.mongodb.js
```

**Node.js:**
```bash
MONGODB_URI=mongodb://localhost:27017/openshutter node scripts/seed-themes.js
```

See [THEME_SEEDING.md](../docs/THEME_SEEDING.md) for detailed documentation.

## Available Scripts

- `seed-themes.js` - Node.js script to seed built-in themes (Modern, Elegant, Minimal)
- `seed-themes.mongodb.js` - MongoDB shell script for the same purpose
