<script lang="ts">
	import type { OwnerDomain } from '../types';

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
		Custom domains are only for users with <strong>Editor</strong> role. Change the <strong>Role</strong> above to <strong>Editor</strong> to assign domains to this user.
	</p>
{:else}
	<p class="text-xs text-gray-500 mb-2">
		Assign custom domains to this editor. Visitors on these domains will see only this user's content, with admin at
		<code class="px-1 py-0.5 bg-gray-100 rounded text-[11px]">/admin</code>.
	</p>
	<div class="border border-gray-300 rounded-md p-3 space-y-3">
		{#if ownerDomainsError}
			<div class="p-2 bg-red-50 text-red-700 text-xs rounded">{ownerDomainsError}</div>
		{/if}
		<div class="{ownerDomains.length === 0 ? 'bg-gray-50 border border-dashed border-gray-300 rounded-md p-3' : ''}">
			<label for="owner-domain-hostname" class="block text-sm font-medium text-gray-700 mb-1">Add domain</label>
			<div class="flex gap-2 items-center">
				<input
					id="owner-domain-hostname"
					type="text"
					placeholder="e.g. photos.example.com"
					class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
					bind:value={newOwnerDomainHostname}
				/>
				<button
					type="button"
					on:click={() => onAddDomain()}
					class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loadingOwnerDomains || !newOwnerDomainHostname.trim()}
				>
					Add domain
				</button>
			</div>
			{#if ownerDomains.length === 0}
				<p class="text-xs text-gray-500 mt-1">Enter a hostname and click Add domain. No domains assigned yet.</p>
			{/if}
		</div>
		{#if loadingOwnerDomains}
			<p class="text-sm text-gray-500">Loading domains...</p>
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
									<span>Active</span>
								</label>
								<label class="inline-flex items-center gap-1">
									<input
										type="checkbox"
										checked={domain.isPrimary}
										on:change={(e) =>
											onUpdateDomain(domain, { isPrimary: (e.currentTarget as HTMLInputElement).checked })}
									/>
									<span>Primary</span>
								</label>
							</div>
						</div>
						<button
							type="button"
							class="text-xs text-red-600 hover:text-red-800"
							on:click={() => onDeleteDomain(domain)}
						>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
