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
