/** Escape all regex metacharacters in a user-supplied string before embedding in $regex. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
