<script lang="ts">
	import type { User, Group } from '../types';
	import { ROLE_LABELS } from '$lib/constants/roles';
	import { displayGroupAlias } from '$lib/utils/owner-groups';
	import { isPlatformSystemAccountUsername } from '$lib/initial-admin';
	import { t } from '$stores/i18n';

	let {
		users = [],
		groups = [],
		onEdit = () => {},
		onDelete = () => {}
	}: {
		users?: User[];
		groups?: Group[];
		onEdit?: (user: User) => void;
		onDelete?: (user: User) => void;
	} = $props();

	function getUserName(user: User): string {
		const nameField = typeof user.name === 'string' ? user.name : user.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || user.username || '(No name)';
	}

	function getGroupName(group: Group): string {
		const nameField = typeof group.name === 'string' ? group.name : group.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || displayGroupAlias(group.alias);
	}

	function isPlatformUser(user: User): boolean {
		return isPlatformSystemAccountUsername(user.username);
	}

	function roleBadgeClass(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-100';
			case 'owner':
				return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-100';
			case 'guest':
				return 'bg-sky-100 text-sky-900 dark:bg-sky-900/35 dark:text-sky-100';
			default:
				return 'bg-(--color-surface-100-900) text-(--color-surface-900-100)';
		}
	}

	function formatLastLogin(iso: string | undefined): string {
		if (!iso) return $t('admin.usersLastLoginNever');
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return $t('admin.usersLastLoginNever');
		return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>

<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-surface-200-800">
		<thead class="bg-(--color-surface-50-950)">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
					User
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
					Role
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
					Groups
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
					Status
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
					{$t('admin.usersLastLogin')}
				</th>
				<th class="px-6 py-3 text-right text-xs font-medium text-(--color-surface-600-400) uppercase tracking-wider">
					Actions
				</th>
			</tr>
		</thead>
		<tbody class="bg-(--color-surface-50-950) divide-y divide-surface-200-800">
			{#each users as user}
				{@const platform = isPlatformUser(user)}
				<tr
					class="hover:bg-(--color-surface-100-900) {platform
						? 'bg-[color-mix(in_oklab,var(--color-surface-500)_6%,transparent)] text-(--color-surface-600-400)'
						: ''}"
				>
					<td class="px-6 py-4 whitespace-nowrap">
						<div>
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-medium {platform ? 'text-(--color-surface-600-400)' : 'text-(--color-surface-950-50)'}">
									{getUserName(user)}
								</span>
								{#if platform}
									<span
										class="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border border-surface-300-700 text-(--color-surface-500-500) bg-(--color-surface-50-950)"
									>
										{$t('admin.usersPlatformSystemAccount')}
									</span>
								{/if}
							</div>
							<div class="text-sm {platform ? 'text-(--color-surface-500-500)' : 'text-(--color-surface-600-400)'}">{user.username}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span class="inline-flex px-2 py-1 text-xs font-medium rounded {roleBadgeClass(user.role)}">
							{ROLE_LABELS[user.role] ?? user.role}
						</span>
					</td>
					<td class="px-6 py-4">
						<div class="flex flex-wrap gap-1">
							{#if user.groupAliases && user.groupAliases.length > 0}
								{#each user.groupAliases as alias}
									{@const group = groups.find((g) => g.alias === alias)}
									<span class="px-2 py-1 text-xs bg-(--color-surface-100-900) text-(--color-surface-800-200) rounded">
										{group ? getGroupName(group) : displayGroupAlias(alias)}
									</span>
								{/each}
							{:else}
								<span class="text-xs text-(--color-surface-400-600)">None</span>
							{/if}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						{#if user.blocked}
							<span class="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
								Blocked
							</span>
						{:else}
							<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
								Active
							</span>
						{/if}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-(--color-surface-700-300)" title={user.lastLoginAt ? user.lastLoginAt : undefined}>
						{formatLastLogin(user.lastLoginAt)}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
						<div class="inline-flex flex-wrap items-center justify-end gap-2">
							<button
								type="button"
								onclick={() => onEdit(user)}
								class="text-(--color-primary-600) hover:text-(--color-primary-900)"
							>
								Edit
							</button>
							{#if user.forcePasswordChange}
								<button
									type="button"
									class="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-100 hover:opacity-90"
									title={$t('admin.usersChangePasswordRequired')}
									onclick={() => onEdit(user)}
								>
									{$t('admin.usersChangePasswordRequired')}
								</button>
							{/if}
							{#if platform}
								<button
									type="button"
									disabled
									class="text-(--color-surface-400-600) cursor-not-allowed opacity-60"
									title={$t('admin.usersDeletePlatformDisabled')}
								>
									Delete
								</button>
							{:else}
								<button type="button" onclick={() => onDelete(user)} class="text-red-600 hover:text-red-900">
									Delete
								</button>
							{/if}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
