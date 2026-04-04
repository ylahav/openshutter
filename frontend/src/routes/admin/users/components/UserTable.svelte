<script lang="ts">
	import type { User, Group } from '../types';
	import { ROLE_LABELS } from '$lib/constants/roles';

	export let users: User[] = [];
	export let groups: Group[] = [];
	export let onEdit: (user: User) => void = () => {};
	export let onDelete: (user: User) => void = () => {};

	function getUserName(user: User): string {
		const nameField = typeof user.name === 'string' ? user.name : user.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || user.username || '(No name)';
	}

	function getGroupName(group: Group): string {
		const nameField = typeof group.name === 'string' ? group.name : group.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || group.alias;
	}
</script>

<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-surface-200-800">
		<thead class="bg-[var(--color-surface-50-950)]">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-600-400)] uppercase tracking-wider">
					User
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-600-400)] uppercase tracking-wider">
					Role
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-600-400)] uppercase tracking-wider">
					Groups
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-600-400)] uppercase tracking-wider">
					Status
				</th>
				<th class="px-6 py-3 text-right text-xs font-medium text-[var(--color-surface-600-400)] uppercase tracking-wider">
					Actions
				</th>
			</tr>
		</thead>
		<tbody class="bg-[var(--color-surface-50-950)] divide-y divide-surface-200-800">
			{#each users as user}
				<tr class="hover:bg-[var(--color-surface-50-950)]">
					<td class="px-6 py-4 whitespace-nowrap">
						<div>
							<div class="text-sm font-medium text-[var(--color-surface-950-50)]">{getUserName(user)}</div>
							<div class="text-sm text-[var(--color-surface-600-400)]">{user.username}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-wrap items-center gap-1">
							<span
								class="px-2 py-1 text-xs font-medium rounded {user.role === 'admin'
									? 'bg-purple-100 text-purple-800'
									: user.role === 'owner'
										? 'bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] text-[var(--color-primary-800)]'
										: 'bg-[var(--color-surface-100-900)] text-[var(--color-surface-900-100)]'}"
							>
								{ROLE_LABELS[user.role] ?? user.role}
							</span>
							{#if user.forcePasswordChange}
								<span class="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800" title="Must change password on next login">Change password</span>
							{/if}
						</div>
					</td>
					<td class="px-6 py-4">
						<div class="flex flex-wrap gap-1">
							{#if user.groupAliases && user.groupAliases.length > 0}
								{#each user.groupAliases as alias}
									{@const group = groups.find((g) => g.alias === alias)}
									<span class="px-2 py-1 text-xs bg-[var(--color-surface-100-900)] text-[var(--color-surface-800-200)] rounded">
										{group ? getGroupName(group) : alias}
									</span>
								{/each}
							{:else}
								<span class="text-xs text-[var(--color-surface-400-600)]">None</span>
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
					<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
						<button
							type="button"
							on:click={() => onEdit(user)}
							class="text-[var(--color-primary-600)] hover:text-[var(--color-primary-900)] mr-4"
						>
							Edit
						</button>
						<button
							type="button"
							on:click={() => onDelete(user)}
							class="text-red-600 hover:text-red-900"
						>
							Delete
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
