<script lang="ts">
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import { t } from '$stores/i18n';
	import type { UserFormData } from '../types';
	import type { Group } from '../types';

	export let formData: UserFormData;
	export let showPassword = false;
	export let mode: 'create' | 'edit' = 'create';
	export let groups: Group[] = [];
	export let loadingGroups = false;
	export let roles: Array<{ value: string; label: string; description?: string }> = [];
	export let supportedLanguages: Array<{ code: string; name: string; nativeName?: string }> = [];
	export let storageProviders: Array<{ id: string; name: string }> = [];
	export let onToggleGroup: (alias: string) => void = () => {};
	export let onToggleStorageProvider: (id: string) => void = () => {};
	export let onRoleChange: ((role: string) => void) | undefined = undefined;

	function getGroupName(group: Group): string {
		const nameField = typeof group.name === 'string' ? group.name : group.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || group.alias;
	}
</script>

<div class="space-y-4">
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
		<MultiLangInput bind:value={formData.name} />
	</div>

	<div>
		<label for="user-form-username" class="block text-sm font-medium text-gray-700 mb-2">
			Username {mode === 'create' ? '*' : ''}
		</label>
		{#if mode === 'edit'}
			<input
				id="user-form-username"
				type="text"
				value={formData.username}
				disabled
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600"
			/>
			<p class="mt-1 text-xs text-gray-500">Username cannot be changed</p>
		{:else}
			<input
				id="user-form-username"
				type="text"
				bind:value={formData.username}
				placeholder="username@example.com"
				required
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
		{/if}
	</div>

	<div>
		<label for="user-form-password" class="block text-sm font-medium text-gray-700 mb-2">
			{mode === 'create' ? 'Password (optional)' : 'New Password (leave blank to keep current)'}
		</label>
		<div class="relative">
			<input
				id="user-form-password"
				type={showPassword ? 'text' : 'password'}
				bind:value={formData.password}
				placeholder={mode === 'create'
					? 'Leave blank to auto-generate (sent by welcome email if configured)'
					: 'Leave blank to keep current password'}
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
			{#if mode === 'create'}
				<p class="mt-1 text-xs text-gray-500">If blank, the system generates a secure password and sends it via welcome email. User will be required to change it on first login.</p>
			{/if}
			<button
				type="button"
				on:click={() => (showPassword = !showPassword)}
				class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{#if showPassword}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<div>
		<label for="user-form-role" class="block text-sm font-medium text-gray-700 mb-2">Role *</label>
		<select
			id="user-form-role"
			bind:value={formData.role}
			on:change={() => onRoleChange?.(formData.role)}
			class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
		>
			{#each roles as role}
				<option value={role.value} title={role.description}>{role.label} – {role.description}</option>
			{/each}
		</select>
	</div>

	<slot name="extra" />

	<div>
		<label for="user-form-language" class="block text-sm font-medium text-gray-700 mb-2">Preferred language</label>
		<select
			id="user-form-language"
			bind:value={formData.preferredLanguage}
			class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
		>
			{#each supportedLanguages as lang}
				<option value={lang.code}>{lang.name} ({lang.nativeName ?? lang.code})</option>
			{/each}
		</select>
	</div>

	<fieldset class="space-y-2">
		<legend class="block text-sm font-medium text-gray-700 mb-2">Groups</legend>
		<div class="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
			{#if loadingGroups}
				<p class="text-sm text-gray-500">Loading groups...</p>
			{:else if groups.length === 0}
				<p class="text-sm text-gray-500">No groups available</p>
			{:else}
				<div class="space-y-2">
					{#each groups as group}
						<label class="flex items-center">
							<input
								type="checkbox"
								checked={formData.groupAliases.includes(group.alias)}
								on:change={() => onToggleGroup(group.alias)}
								class="mr-2"
							/>
							<span class="text-sm text-gray-700">{getGroupName(group)}</span>
							<span class="ml-2 text-xs text-gray-500">({group.alias})</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	</fieldset>

	{#if formData.role === 'owner'}
		<fieldset class="space-y-2">
			<legend class="block text-sm font-medium text-gray-700 mb-2">{$t('admin.dedicatedStorageLegend')}</legend>
			<div class="border border-gray-300 rounded-md p-3">
				<label class="flex items-start cursor-pointer gap-2">
					<input
						type="checkbox"
						bind:checked={formData.useDedicatedStorage}
						class="mt-1"
						data-testid="user-form-use-dedicated-storage"
					/>
					<span>
						<span class="text-sm font-medium text-gray-800">{$t('admin.dedicatedStorageCheckboxLabel')}</span>
						<span class="block text-xs text-gray-500 mt-1">
							{$t('admin.dedicatedStorageCheckboxHelp')}
						</span>
					</span>
				</label>
			</div>
		</fieldset>
	{/if}

	<fieldset class="space-y-2">
		<legend class="block text-sm font-medium text-gray-700 mb-2">Allowed Storage Providers</legend>
		<div class="border border-gray-300 rounded-md p-3">
			<div class="space-y-2">
				{#each storageProviders as provider}
					<label class="flex items-center">
						<input
							type="checkbox"
							checked={formData.allowedStorageProviders.includes(provider.id)}
							on:change={() => onToggleStorageProvider(provider.id)}
							class="mr-2"
						/>
						<span class="text-sm text-gray-700">{provider.name}</span>
					</label>
				{/each}
			</div>
		</div>
	</fieldset>

	{#if formData.role === 'owner' && formData.allowedStorageProviders.includes('google-drive') && !formData.useDedicatedStorage}
		<fieldset class="space-y-2">
			<legend class="block text-sm font-medium text-gray-700 mb-2">Storage connection (Google Drive)</legend>
			<p class="text-xs text-gray-500 mb-2">
				Choose whether this owner uses the main domain's connection or their own. Connection and folder details are configured by the owner on their setup screen only (not here).
			</p>
			<div class="border border-gray-300 rounded-md p-3">
				<label class="flex items-center cursor-pointer">
					<input type="checkbox" bind:checked={formData.storageUseAdminConfig} class="mr-2" />
					<span class="text-sm font-medium text-gray-700">Use main domain connection</span>
				</label>
				{#if !formData.storageUseAdminConfig}
					<p class="text-xs text-gray-500 mt-2 pl-4 border-l-2 border-gray-200">
						Owner configures credentials and folder on their own setup page.
					</p>
				{/if}
			</div>
		</fieldset>
	{/if}

	<div class="flex items-center">
		<label class="relative inline-flex items-center cursor-pointer">
			<input type="checkbox" bind:checked={formData.blocked} class="sr-only peer" />
			<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
			<span class="ml-3 text-sm font-medium text-gray-700">Blocked</span>
		</label>
	</div>

	<div class="flex items-center">
		<label class="relative inline-flex items-center cursor-pointer">
			<input type="checkbox" bind:checked={formData.forcePasswordChange} class="sr-only peer" />
			<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
			<span class="ml-3 text-sm font-medium text-gray-700">Force password change on next login</span>
		</label>
	</div>
</div>
