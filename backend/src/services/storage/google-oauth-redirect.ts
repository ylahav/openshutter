/**
 * Resolve Google OAuth redirect URI for storage config (deployment-safe).
 * Uses stored value, then GOOGLE_OAUTH_CALLBACK_BASE_URL / FRONTEND_URL.
 */
export function resolveGoogleOAuthRedirectUri(configured?: string): string {
  const trimmed = typeof configured === 'string' ? configured.trim() : '';
  if (trimmed) return trimmed;

  const base =
    process.env.GOOGLE_OAUTH_CALLBACK_BASE_URL?.trim() ||
    process.env.FRONTEND_URL?.split(',')[0]?.trim() ||
    '';
  if (!base) return '';

  const origin = base.replace(/\/$/, '');
  if (origin.endsWith('/api/auth/google/callback')) return origin;
  return `${origin}/api/auth/google/callback`;
}
