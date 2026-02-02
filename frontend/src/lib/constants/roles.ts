/**
 * Display labels and descriptions for user roles.
 * Backend stores: admin, owner, guest.
 */
export type RoleCode = 'admin' | 'owner' | 'guest';

export const ROLE_LABELS: Record<RoleCode, string> = {
	admin: 'Admin',
	owner: 'Editor',
	guest: 'Viewer'
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
	admin: 'System control',
	owner: 'Album creation and blog writing',
	guest: 'Private album access'
};

/** Role options for dropdowns: value (backend), label, description */
export const ROLE_OPTIONS: { value: RoleCode; label: string; description: string }[] = [
	{ value: 'admin', label: ROLE_LABELS.admin, description: ROLE_DESCRIPTIONS.admin },
	{ value: 'owner', label: ROLE_LABELS.owner, description: ROLE_DESCRIPTIONS.owner },
	{ value: 'guest', label: ROLE_LABELS.guest, description: ROLE_DESCRIPTIONS.guest }
];

export function getRoleLabel(role: RoleCode | string): string {
	return ROLE_LABELS[role as RoleCode] ?? String(role);
}

export function getRoleDescription(role: RoleCode | string): string {
	return ROLE_DESCRIPTIONS[role as RoleCode] ?? '';
}
