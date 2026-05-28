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

See [TEMPLATING.md — Part II](../docs/development/TEMPLATING.md#part-ii--page-builder-and-theme-seeding) (theme seeding) for detailed documentation.

## Available Scripts

- `seed-themes.js` - Node.js script to seed built-in themes (Modern, Elegant, Minimal)
- `seed-themes.mongodb.js` - MongoDB shell script for the same purpose
- `prepare-database-backup.mjs` - Clean a raw `database-backup-*.json` into a restore-ready starting point (see below)

### Prepare database backup (post-incident / old dump)

After restoring an old JSON backup, run:

```bash
node scripts/prepare-database-backup.mjs path/to/database-backup.json path/to/database-backup-prepared.json
```

This produces `version: 1.1` with `prepared: true` and:

- One canonical `site_config` document (drops duplicates)
- Orphan photos removed (album no longer exists)
- `isPublished` defaulted on albums, missing page `slug` fixed
- Legacy `audit_logs` merged into `auditlogs`
- **Sessions and API keys cleared** (force re-login after compromise)

Then restore via **Admin → Backup → Restore database** (or `POST /api/admin/backup/restore-database` with the prepared file). Photo files on disk/S3 must still exist for paths referenced in `photos`.
