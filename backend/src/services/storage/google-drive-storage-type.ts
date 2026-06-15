export type GoogleDriveStorageType = 'appdata' | 'visible';

function normalizeOne(value: unknown): GoogleDriveStorageType | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'visible' || raw === 'drive' || raw === 'mydrive') return 'visible';
  if (raw === 'appdata' || raw === 'hidden') return 'appdata';
  return null;
}

/** Walk entire config/doc tree and collect every storageType value (legacy nested duplicates). */
function collectStorageTypesDeep(
  value: unknown,
  out: unknown[],
  depth = 0,
  seen = new Set<object>(),
): void {
  if (depth > 12 || value == null || typeof value !== 'object') return;
  if (seen.has(value as object)) return;
  seen.add(value as object);

  const obj = value as Record<string, unknown>;
  if ('storageType' in obj) out.push(obj.storageType);

  for (const key of Object.keys(obj)) {
    if (key === 'isEnabled') continue;
    collectStorageTypesDeep(obj[key], out, depth + 1, seen);
  }
}

/** Prefer visible when any duplicate field says visible (flatten used to keep stale appdata). */
export function resolveGoogleDriveStorageType(sources: {
  config?: Record<string, unknown> | null;
  root?: Record<string, unknown> | null;
}): GoogleDriveStorageType {
  const candidates: unknown[] = [];
  if (sources.config) collectStorageTypesDeep(sources.config, candidates);
  if (sources.root) collectStorageTypesDeep(sources.root, candidates);

  for (const value of candidates) {
    if (normalizeOne(value) === 'visible') return 'visible';
  }
  for (const value of candidates) {
    const normalized = normalizeOne(value);
    if (normalized) return normalized;
  }
  return 'appdata';
}

/** When flattening nested config.config, never let stale appdata overwrite visible. */
export function mergeGoogleDriveStorageTypeFields(
  existing: unknown,
  incoming: unknown,
): GoogleDriveStorageType {
  return resolveGoogleDriveStorageType({
    config: { storageType: existing, config: { storageType: incoming } },
  });
}
