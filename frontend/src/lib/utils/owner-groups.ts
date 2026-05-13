/** Matches backend `OWNER_GROUP_PREFIX` — system owner group aliases are `owner-{mongoObjectId}`. */
export const OWNER_GROUP_PREFIX = 'owner-';

const MONGO_OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Human-readable alias for UI. Hides MongoDB owner id in `owner-{id}` as plain `owner`.
 * Other aliases (e.g. `family`, `owner-team`) are returned unchanged.
 */
export function displayGroupAlias(alias: string | null | undefined): string {
	if (alias == null || typeof alias !== 'string') return '';
	if (!alias.startsWith(OWNER_GROUP_PREFIX)) return alias;
	const suffix = alias.slice(OWNER_GROUP_PREFIX.length);
	if (MONGO_OBJECT_ID.test(suffix)) return 'owner';
	return alias;
}
