<!--
	Reusable list editor for menu items (link / login / logout, with showWhen, roles, external).

	Used by:
	- /admin/site-config Menus tab (each named menu in `template.menuInstances`)
	- /admin/site-config legacy default menu (`template.headerConfig.menu` fallback)

	Items are passed in via `items` and changes are surfaced via `onChange` — the parent owns the array.
	`idPrefix` ensures form ids stay unique when multiple editors share a page.
-->
<script lang="ts">
	import { t } from '$stores/i18n';
	import { ROLE_OPTIONS } from '$lib/constants/roles';
	import {
		adminBtnPrimarySm,
		adminInputSmClass,
		adminSelectSmClass,
	} from '$lib/admin/admin-cerberus';
	import type { MenuEditorItem, MenuItemType, MenuItemShowWhen } from '$lib/types/menu-instance';

	interface Props {
		items: MenuEditorItem[];
		onChange: (items: MenuEditorItem[]) => void;
		idPrefix?: string;
		onClearAll?: () => void;
	}

	let { items, onChange, idPrefix = 'menu', onClearAll }: Props = $props();

	function update(next: MenuEditorItem[]) {
		onChange(next);
	}

	function patchItem(index: number, patch: Partial<MenuEditorItem>) {
		const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
		update(next);
	}

	function moveItem(index: number, delta: -1 | 1) {
		const target = index + delta;
		if (target < 0 || target >= items.length) return;
		const next = [...items];
		[next[index], next[target]] = [next[target], next[index]];
		update(next);
	}

	function removeItem(index: number) {
		update(items.filter((_, i) => i !== index));
	}

	function addLink() {
		update([...items, { href: '', label: '' }]);
	}

	function addLogin() {
		update([
			...items,
			{ type: 'login', labelKey: 'auth.signIn', href: '/login', showWhen: 'loggedOut' },
		]);
	}

	function addLogout() {
		update([
			...items,
			{ type: 'logout', labelKey: 'header.logout', href: '#', showWhen: 'loggedIn' },
		]);
	}
</script>

{#if items.length > 0}
	<div class="space-y-3">
		{#each items as item, index}
			<div class="border border-surface-200-800 rounded-lg p-4 bg-(--color-surface-50-950)">
				<div class="flex items-start justify-between mb-3">
					<span class="text-sm font-medium text-(--color-surface-800-200)">
						{$t('admin.navigationMenuItemLabel', 'Menu Item')} #{index + 1}
					</span>
					<div class="flex gap-2">
						{#if index > 0}
							<button
								type="button"
								onclick={() => moveItem(index, -1)}
								class="text-(--color-surface-600-400) hover:text-(--color-surface-950-50) text-sm"
								title={$t('admin.navigationMoveUp')}
							>
								↑
							</button>
						{/if}
						{#if index < items.length - 1}
							<button
								type="button"
								onclick={() => moveItem(index, 1)}
								class="text-(--color-surface-600-400) hover:text-(--color-surface-950-50) text-sm"
								title={$t('admin.navigationMoveDown')}
							>
								↓
							</button>
						{/if}
						<button
							type="button"
							onclick={() => removeItem(index)}
							class="text-red-600 hover:text-red-800 text-sm font-medium"
						>
							{$t('admin.remove')}
						</button>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label
							for="{idPrefix}-labelKey-{index}"
							class="block text-sm font-medium text-(--color-surface-800-200) mb-1"
						>
							{$t('admin.navigationTranslationKeyOptional')}
						</label>
						<input
							id="{idPrefix}-labelKey-{index}"
							type="text"
							value={item.labelKey || ''}
							oninput={(e) =>
								patchItem(index, { labelKey: e.currentTarget.value || undefined })}
							placeholder="navigation.home"
							class={adminInputSmClass}
						/>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							{$t('admin.navigationTranslationKeyHelp')}
						</p>
					</div>

					<div>
						<label
							for="{idPrefix}-label-{index}"
							class="block text-sm font-medium text-(--color-surface-800-200) mb-1"
						>
							{$t('admin.navigationDirectLabelOptional')}
						</label>
						<input
							id="{idPrefix}-label-{index}"
							type="text"
							value={item.label || ''}
							oninput={(e) => patchItem(index, { label: e.currentTarget.value || undefined })}
							placeholder="About"
							class={adminInputSmClass}
						/>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							{$t('admin.navigationDirectLabelHelp')}
						</p>
					</div>

					<div>
						<label
							for="{idPrefix}-type-{index}"
							class="block text-sm font-medium text-(--color-surface-800-200) mb-1"
						>
							{$t('admin.navigationType')}
						</label>
						<select
							id="{idPrefix}-type-{index}"
							value={item.type ?? 'link'}
							onchange={(e) => {
								const v = e.currentTarget.value as MenuItemType;
								patchItem(index, {
									type: v,
									href:
										v === 'login'
											? '/login'
											: v === 'logout'
												? '#'
												: item.href || '',
									showWhen:
										v === 'login'
											? 'loggedOut'
											: v === 'logout'
												? 'loggedIn'
												: (item.showWhen ?? 'always'),
								});
							}}
							class={adminSelectSmClass}
						>
							<option value="link">{$t('admin.navigationTypeLink')}</option>
							<option value="login">{$t('admin.navigationTypeLogin')}</option>
							<option value="logout">{$t('admin.navigationTypeLogout')}</option>
						</select>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							{$t('admin.navigationTypeHelp')}
						</p>
					</div>

					<div>
						<label
							for="{idPrefix}-showWhen-{index}"
							class="block text-sm font-medium text-(--color-surface-800-200) mb-1"
						>
							{$t('admin.navigationShowWhen')}
						</label>
						<select
							id="{idPrefix}-showWhen-{index}"
							value={item.showWhen ?? 'always'}
							onchange={(e) =>
								patchItem(index, {
									showWhen: e.currentTarget.value as MenuItemShowWhen,
								})}
							class={adminSelectSmClass}
						>
							<option value="always">{$t('admin.navigationShowWhenAlways')}</option>
							<option value="loggedIn">{$t('admin.navigationShowWhenLoggedIn')}</option>
							<option value="loggedOut">{$t('admin.navigationShowWhenLoggedOut')}</option>
						</select>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							{$t('admin.navigationShowWhenHelp')}
						</p>
					</div>

					<div>
						<label
							for="{idPrefix}-href-{index}"
							class="block text-sm font-medium text-(--color-surface-800-200) mb-1"
						>
							{$t('admin.navigationLinkUrl')}
							<span class="text-red-500">*</span>
						</label>
						<input
							id="{idPrefix}-href-{index}"
							type="text"
							value={item.href}
							disabled={item.type === 'logout'}
							oninput={(e) => patchItem(index, { href: e.currentTarget.value })}
							placeholder={item.type === 'login'
								? '/login'
								: item.type === 'logout'
									? '—'
									: '/about'}
							required={item.type !== 'logout'}
							class={`${adminInputSmClass} disabled:bg-(--color-surface-100-900) disabled:text-(--color-surface-600-400)`}
						/>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							{item.type === 'logout'
								? $t('admin.navigationIgnoredForLogout')
								: $t('admin.navigationLinkUrlHelp')}
						</p>
					</div>

					<fieldset class="space-y-2">
						<legend class="block text-sm font-medium text-(--color-surface-800-200) mb-1">
							{$t('admin.navigationVisibleToRolesOptional')}
						</legend>
						<div class="flex flex-wrap gap-2">
							{#each ROLE_OPTIONS as roleOpt}
								{@const isSelected = item.roles?.includes(roleOpt.value) || false}
								<label
									class="flex items-center space-x-1 cursor-pointer"
									title={roleOpt.description}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onchange={(e) => {
											const currentRoles = item.roles || [];
											const newRoles = e.currentTarget.checked
												? [...currentRoles, roleOpt.value]
												: currentRoles.filter((r: string) => r !== roleOpt.value);
											patchItem(index, {
												roles: newRoles.length > 0 ? newRoles : undefined,
											});
										}}
										class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
									/>
									<span class="text-sm text-(--color-surface-800-200)">{roleOpt.label}</span>
								</label>
							{/each}
						</div>
						<p class="mt-1 text-xs text-(--color-surface-600-400)">
							{$t('admin.navigationRolesHelp')}
						</p>
					</fieldset>

					<div class="flex items-end">
						<label class="flex items-center space-x-2 cursor-pointer">
							<input
								type="checkbox"
								checked={item.external || false}
								onchange={(e) =>
									patchItem(index, {
										external: e.currentTarget.checked || undefined,
									})}
								class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
							/>
							<span class="text-sm text-(--color-surface-800-200)">
								{$t('admin.navigationOpenInNewTab')}
							</span>
						</label>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center py-8 border border-surface-200-800 rounded-lg bg-(--color-surface-50-950)">
		<p class="text-(--color-surface-600-400) mb-4">{$t('admin.navigationNoItems')}</p>
		<p class="text-sm text-(--color-surface-400-600) mb-4">{$t('admin.navigationNoItemsHelp')}</p>
	</div>
{/if}

<div
	class="flex flex-wrap justify-between items-center gap-2 pt-4 mt-4 border-t border-surface-200-800"
>
	<div class="flex flex-wrap gap-2">
		<button type="button" onclick={addLink} class={adminBtnPrimarySm}>
			+ {$t('admin.navigationAddMenuItem')}
		</button>
		<button type="button" onclick={addLogin} class={adminBtnPrimarySm}>
			+ {$t('admin.navigationAddLogin')}
		</button>
		<button type="button" onclick={addLogout} class={adminBtnPrimarySm}>
			+ {$t('admin.navigationAddLogout')}
		</button>
	</div>

	{#if items.length > 0 && onClearAll}
		<button type="button" onclick={onClearAll} class="btn preset-tonal text-sm">
			{$t('admin.navigationClearAll')}
		</button>
	{/if}
</div>
