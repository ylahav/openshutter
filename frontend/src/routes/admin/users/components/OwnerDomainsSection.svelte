<script lang="ts">
	import type { OwnerDomain } from '../types';
	import { ROLE_LABELS } from '$lib/constants/roles';
	import { t } from '$stores/i18n';

	export let role: string;
	export let ownerDomains: OwnerDomain[] = [];
	export let loadingOwnerDomains = false;
	export let ownerDomainsError = '';
	export let newOwnerDomainHostname = '';
	export let onAddDomain: () => void = () => {};
	export let onUpdateDomain: (domain: OwnerDomain, changes: Partial<OwnerDomain>) => void = () => {};
	export let onDeleteDomain: (domain: OwnerDomain) => void = () => {};
</script>

{#if role !== 'owner'}
	<p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
		{$t('admin.ownerDomainsRequiresOwnerRole').replace(/\{roleLabel\}/g, ROLE_LABELS.owner)}
	</p>
{:else}
	<p class="text-xs text-gray-500 mb-2">
		{$t('admin.ownerDomainsIntro')}
	</p>
	<details class="mb-3 text-xs text-gray-600 border border-gray-200 rounded-md bg-gray-50 px-3 py-2">
		<summary class="cursor-pointer font-medium text-gray-700 select-none">
			{$t('admin.ownerDomainsDnsHelpTitle')}
		</summary>
		<ul class="list-disc pl-5 mt-2 space-y-1">
			<li>{$t('admin.ownerDomainsDnsPoint1')}</li>
			<li>{$t('admin.ownerDomainsDnsPoint2')}</li>
			<li>{$t('admin.ownerDomainsDnsPoint3')}</li>
			<li>{$t('admin.ownerDomainsDnsPoint4')}</li>
		</ul>
	</details>
	<div class="border border-gray-300 rounded-md p-3 space-y-3">
		{#if ownerDomainsError}
			<div class="p-2 bg-red-50 text-red-700 text-xs rounded">{ownerDomainsError}</div>
		{/if}
		<div class="{ownerDomains.length === 0 ? 'bg-gray-50 border border-dashed border-gray-300 rounded-md p-3' : ''}">
			<label for="owner-domain-hostname" class="block text-sm font-medium text-gray-700 mb-1"
				>{$t('admin.ownerDomainsAddLabel')}</label
			>
			<div class="flex gap-2 items-center">
				<input
					id="owner-domain-hostname"
					type="text"
					placeholder={$t('admin.ownerDomainsAddPlaceholder')}
					class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
					bind:value={newOwnerDomainHostname}
				/>
				<button
					type="button"
					on:click={() => onAddDomain()}
					class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loadingOwnerDomains || !newOwnerDomainHostname.trim()}
				>
					{$t('admin.ownerDomainsAddButton')}
				</button>
			</div>
			{#if ownerDomains.length === 0}
				<p class="text-xs text-gray-500 mt-1">{$t('admin.ownerDomainsEmptyHint')}</p>
			{/if}
		</div>
		{#if loadingOwnerDomains}
			<p class="text-sm text-gray-500">{$t('admin.ownerDomainsLoading')}</p>
		{:else if ownerDomains.length > 0}
			<ul class="space-y-2">
				{#each ownerDomains as domain}
					<li class="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 text-sm">
						<div class="flex flex-col">
							<span class="font-medium">{domain.hostname}</span>
							<div class="flex items-center gap-3 text-xs text-gray-500 mt-1">
								<label class="inline-flex items-center gap-1">
									<input
										type="checkbox"
										checked={domain.active}
										on:change={(e) =>
											onUpdateDomain(domain, { active: (e.currentTarget as HTMLInputElement).checked })}
									/>
									<span>{$t('admin.ownerDomainsActive')}</span>
								</label>
								<label class="inline-flex items-center gap-1">
									<input
										type="checkbox"
										checked={domain.isPrimary}
										on:change={(e) =>
											onUpdateDomain(domain, { isPrimary: (e.currentTarget as HTMLInputElement).checked })}
									/>
									<span>{$t('admin.ownerDomainsPrimary')}</span>
								</label>
							</div>
						</div>
						<button
							type="button"
							class="text-xs text-red-600 hover:text-red-800"
							on:click={() => onDeleteDomain(domain)}
						>
							{$t('admin.ownerDomainsRemove')}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
