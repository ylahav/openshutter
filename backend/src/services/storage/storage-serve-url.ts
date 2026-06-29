/**
 * Helpers for internal `/api/storage/serve/{provider}/{path}` URLs (including ?storageOwnerId= for dedicated storage).
 */

/** Path segment from a serve URL; strips query string from the path segment. */
export function extractStorageServePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('/api/storage/serve/')) {
    const match = url.match(/\/serve\/[^/]+\/([^?]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }
  return url
}

/** Append `storageOwnerId` for dedicated owner serve URLs. */
export function appendStorageOwnerQuery(url: string, ownerUserId?: string): string {
  if (!ownerUserId) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}storageOwnerId=${encodeURIComponent(ownerUserId)}`
}

/** If the value is a serve URL, return the decoded path; otherwise return the string (raw storage path). */
export function coerceStorageServePathOrRaw(pathOrUrl: string | undefined | null): string | undefined {
  if (pathOrUrl == null || pathOrUrl === '') return undefined
  const s = String(pathOrUrl)
  if (s.startsWith('/api/storage/serve/')) {
    return extractStorageServePath(s) ?? s
  }
  return s
}

/**
 * Build the public URL for a stored object. When `publicBaseUrl` is set on the
 * provider config, emits `${publicBaseUrl}/${key}` (path segments encoded,
 * slashes preserved) + optional `?v=<hash>` for cache-busting. When empty,
 * falls back to the existing `/api/storage/serve/{provider}/{key}` proxy URL
 * (with `?storageOwnerId=` for owner-dedicated storage). This is the single
 * source of truth for upload-time URL emission.
 */
export function buildPublicUrl(args: {
  providerId: string
  key: string
  publicBaseUrl?: string
  hash?: string
  ownerUserId?: string
}): string {
  const { providerId, key, publicBaseUrl, hash, ownerUserId } = args

  if (publicBaseUrl && publicBaseUrl.trim()) {
    // Tolerate operator entering the host without a scheme (e.g. "cdn.yairl.com"
    // instead of "https://cdn.yairl.com"); a scheme-less URL stored in
    // Photo.storage.url breaks the frontend helper that detects absolute URLs by
    // the `http` prefix and would otherwise re-wrap it in `/api/storage/serve/…`.
    let base = publicBaseUrl.trim().replace(/\/+$/, '')
    if (!/^https?:\/\//i.test(base)) {
      base = `https://${base}`
    }
    const encodedKey = key.split('/').map(encodeURIComponent).join('/')
    const url = `${base}/${encodedKey}`
    if (hash) {
      const v = hash.slice(0, 8)
      return `${url}?v=${v}`
    }
    return url
  }

  const proxyUrl = `/api/storage/serve/${providerId}/${encodeURIComponent(key)}`
  return appendStorageOwnerQuery(proxyUrl, ownerUserId)
}
