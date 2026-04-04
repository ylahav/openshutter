<script lang="ts">
	export let searchTerm = '';
	export let roleFilter = 'all';
	export let blockedFilter = 'all';
	export let roles: Array<{ value: string; label: string; description?: string }> = [];
	export let onFilterChange: (() => void) | undefined = undefined;
	export let onAddUser: (() => void) | undefined = undefined;
</script>

<div class="flex items-center justify-between mb-6">
	<div class="flex items-center space-x-4">
		<div class="relative">
			<input
				type="text"
				placeholder="Search users..."
				bind:value={searchTerm}
				on:input={() => onFilterChange?.()}
				class="pl-10 pr-4 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] w-64"
			/>
			<svg
				class="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-surface-400-600)] h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</div>

		<select
			bind:value={roleFilter}
			on:change={() => onFilterChange?.()}
			class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
		>
			<option value="all">All Roles</option>
			{#each roles as role}
				<option value={role.value} title={role.description}>{role.label} – {role.description}</option>
			{/each}
		</select>

		<select
			bind:value={blockedFilter}
			on:change={() => onFilterChange?.()}
			class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]"
		>
			<option value="all">All Status</option>
			<option value="false">Active</option>
			<option value="true">Blocked</option>
		</select>
	</div>

	<button
		type="button"
		on:click={() => onAddUser?.()}
		class="px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-md hover:bg-[var(--color-primary-700)] text-sm font-medium flex items-center gap-2"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 4v16m8-8H4"
			/>
		</svg>
		Add User
	</button>
</div>
