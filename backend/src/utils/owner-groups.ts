export const OWNER_GROUP_PREFIX = 'owner-';

/** Build the canonical group alias for an owner user. */
export function getOwnerGroupAlias(ownerId: string): string {
  return `${OWNER_GROUP_PREFIX}${ownerId}`;
}

/** Return true if the alias belongs to an owner group (owner-{ownerId}). */
export function isOwnerGroupAlias(alias: string | null | undefined): boolean {
  return typeof alias === 'string' && alias.startsWith(OWNER_GROUP_PREFIX);
}

/** Extract ownerId from an owner group alias (owner-{ownerId}). Returns null if not owner alias. */
export function getOwnerIdFromOwnerGroupAlias(alias: string | null | undefined): string | null {
  if (!isOwnerGroupAlias(alias)) return null;
  return alias!.slice(OWNER_GROUP_PREFIX.length) || null;
}

