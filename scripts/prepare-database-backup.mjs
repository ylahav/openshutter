#!/usr/bin/env node
/**
 * Turn a raw OpenShutter database-backup JSON into a clean restore starting point.
 *
 * Usage:
 *   node scripts/prepare-database-backup.mjs <input.json> [output.json]
 *
 * Example:
 *   node scripts/prepare-database-backup.mjs ^
 *     C:\projects\web\d\mongodump\ygallery\database-backup-2026-05-23.json ^
 *     C:\projects\web\d\mongodump\ygallery\database-backup-prepared.json
 */

import fs from 'node:fs';
import path from 'node:path';

const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

function isOid(value) {
  return typeof value === 'string' && OBJECT_ID_HEX.test(value);
}

function loadBackup(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!data?.collections || typeof data.collections !== 'object') {
    throw new Error('Invalid backup: expected { collections: { ... } }');
  }
  return data;
}

function scoreSiteConfig(doc) {
  let score = 0;
  if (doc.template?.frontendTemplate) score += 10;
  if (doc.features) score += 5;
  if (doc.whiteLabel) score += 2;
  if (doc.languages?.activeLanguages?.length) score += 3;
  if (doc.seo) score += 2;
  if (doc.mail) score += 1;
  const updated = doc.updatedAt ? Date.parse(doc.updatedAt) : 0;
  return score * 1000 + updated;
}

function pickSiteConfig(docs) {
  if (!docs?.length) return { kept: null, dropped: [] };
  if (docs.length === 1) return { kept: docs[0], dropped: [] };
  const sorted = [...docs].sort((a, b) => scoreSiteConfig(b) - scoreSiteConfig(a));
  return { kept: sorted[0], dropped: sorted.slice(1) };
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function prepareCollections(collections) {
  const report = {
    siteConfigDropped: [],
    orphanPhotosRemoved: 0,
    orphanPhotoAlbumIds: [],
    pagesSlugFixed: 0,
    albumsIsPublishedAdded: 0,
    auditLogsCopiedToAuditlogs: 0,
    clearedSessions: 0,
    clearedApiKeys: 0,
    removedEmptyLegacyCollections: [],
  };

  const out = structuredClone(collections);

  // —— site_config: single canonical document ——
  const siteConfigs = out.site_config ?? [];
  const { kept, dropped } = pickSiteConfig(siteConfigs);
  if (kept) {
    out.site_config = [kept];
    report.siteConfigDropped = dropped.map((d) => ({
      _id: d._id,
      title: typeof d.title === 'object' ? d.title?.en ?? d.title?.he : d.title,
    }));
  }

  // —— albums: default isPublished ——
  const albumIds = new Set();
  for (const album of out.albums ?? []) {
    albumIds.add(String(album._id));
    if (album.isPublished === undefined) {
      album.isPublished = true;
      report.albumsIsPublishedAdded++;
    }
  }

  // —— photos: drop orphans (album deleted) ——
  const photos = out.photos ?? [];
  const keptPhotos = [];
  const missingAlbumIds = new Set();
  for (const photo of photos) {
    const aid = photo.albumId != null ? String(photo.albumId) : '';
    if (!aid || !albumIds.has(aid)) {
      report.orphanPhotosRemoved++;
      if (aid) missingAlbumIds.add(aid);
      continue;
    }
    keptPhotos.push(photo);
  }
  out.photos = keptPhotos;
  report.orphanPhotoAlbumIds = [...missingAlbumIds];

  // —— pages: ensure slug ——
  for (const page of out.pages ?? []) {
    if (page.slug && String(page.slug).trim()) continue;
    const candidate = page.alias || page.pageRole || page.title?.en || page.title;
    if (candidate) {
      page.slug = slugify(candidate);
      report.pagesSlugFixed++;
    }
  }

  // —— page_modules: drop modules whose page is missing ——
  const pageIds = new Set((out.pages ?? []).map((p) => String(p._id)));
  const beforeModules = (out.page_modules ?? []).length;
  out.page_modules = (out.page_modules ?? []).filter((m) => pageIds.has(String(m.pageId)));
  report.pageModulesRemoved = beforeModules - out.page_modules.length;

  // —— audit: legacy audit_logs → auditlogs for current app ——
  const legacyAudit = out.audit_logs ?? [];
  if (legacyAudit.length > 0) {
    out.auditlogs = [...(out.auditlogs ?? []), ...legacyAudit];
    report.auditLogsCopiedToAuditlogs = legacyAudit.length;
  }
  delete out.audit_logs;

  // —— security: no active sessions / API keys after compromise ——
  report.clearedSessions = (out.sessions ?? []).length;
  report.clearedApiKeys = (out.apikeys ?? []).length;
  out.sessions = [];
  out.apikeys = [];

  // —— drop empty legacy collection keys ——
  for (const name of ['template_customization']) {
    if (Array.isArray(out[name]) && out[name].length === 0) {
      delete out[name];
      report.removedEmptyLegacyCollections.push(name);
    }
  }
  if (Array.isArray(out.auditlogs) && out.auditlogs.length === 0) {
    delete out.auditlogs;
    report.removedEmptyLegacyCollections.push('auditlogs');
  }

  return { collections: out, report };
}

function main() {
  const inputPath = process.argv[2];
  const outputPath =
    process.argv[3] ||
    inputPath.replace(/\.json$/i, '') + '-prepared.json';

  if (!inputPath) {
    console.error('Usage: node scripts/prepare-database-backup.mjs <input.json> [output.json]');
    process.exit(1);
  }

  const resolvedIn = path.resolve(inputPath);
  const resolvedOut = path.resolve(outputPath);

  if (!fs.existsSync(resolvedIn)) {
    console.error('Input file not found:', resolvedIn);
    process.exit(1);
  }

  console.log('Loading', resolvedIn);
  const backup = loadBackup(resolvedIn);
  const { collections, report } = prepareCollections(backup.collections);

  const prepared = {
    timestamp: new Date().toISOString(),
    version: '1.1',
    source: {
      file: path.basename(resolvedIn),
      originalTimestamp: backup.timestamp ?? null,
      originalVersion: backup.version ?? null,
    },
    prepared: true,
    report,
    collections,
  };

  fs.writeFileSync(resolvedOut, JSON.stringify(prepared, null, 2), 'utf8');

  const reportPath = resolvedOut.replace(/\.json$/i, '') + '-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\nPrepared backup written to:', resolvedOut);
  console.log('Report written to:', reportPath);
  console.log('\nSummary:');
  console.log('  site_config kept: 1, dropped:', report.siteConfigDropped.length);
  console.log('  photos:', collections.photos?.length ?? 0, '(removed orphans:', report.orphanPhotosRemoved + ')');
  console.log('  albums:', collections.albums?.length ?? 0);
  console.log('  pages slug fixed:', report.pagesSlugFixed);
  console.log('  sessions cleared:', report.clearedSessions);
  console.log('  api keys cleared:', report.clearedApiKeys);
  if (report.orphanPhotoAlbumIds.length) {
    console.log('  missing album ids (orphans):', report.orphanPhotoAlbumIds.join(', '));
  }
  console.log('\nRestore via Admin → Backup → Restore database, or POST /api/admin/backup/restore-database');
  console.log('Ensure storage files still exist on disk/S3 for photo paths.');
}

main();
