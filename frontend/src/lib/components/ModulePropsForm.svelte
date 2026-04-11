<!-- ModulePropsForm.svelte - Dynamic form for module props based on module config -->
<script lang="ts">
	import MultiLangInput from './MultiLangInput.svelte';
	import MultiLangHTMLEditor from './MultiLangHTMLEditor.svelte';
	import { heroConfig } from '$lib/page-builder/modules/Hero/config';
	import { richTextConfig } from '$lib/page-builder/modules/RichText/config';
	import { featureGridConfig } from '$lib/page-builder/modules/FeatureGrid/config';
	import { albumGalleryConfig } from '$lib/page-builder/modules/AlbumGallery/config';
	import { ctaConfig } from '$lib/page-builder/modules/Cta/config';
	import { logoConfig } from '$lib/page-builder/modules/Logo/config';
	import { siteTitleConfig } from '$lib/page-builder/modules/SiteTitle/config';
	import { menuConfig } from '$lib/page-builder/modules/Menu/config';
	import { languageSelectorConfig } from '$lib/page-builder/modules/LanguageSelector/config';
	import { themeToggleConfig } from '$lib/page-builder/modules/ThemeToggle/config';
	import { themeSelectConfig } from '$lib/page-builder/modules/ThemeSelect/config';
	import { userGreetingConfig } from '$lib/page-builder/modules/UserGreeting/config';
	import { authButtonsConfig } from '$lib/page-builder/modules/AuthButtons/config';
	import { socialMediaConfig } from '$lib/page-builder/modules/SocialMedia/config';
	import type { ModulePlacement, ModulePlacementAxis } from '$lib/page-builder/module-cell-placement';
	import { normalizePlacement } from '$lib/page-builder/module-cell-placement';

	export let moduleType: string = '';
	export let props: Record<string, any> = {};
	export let onChange: ((props: Record<string, any>) => void) | undefined = undefined;

	// Map module types to their configs
	const moduleConfigMap: Record<string, any> = {
		hero: heroConfig,
		richText: richTextConfig,
		featureGrid: featureGridConfig,
		albumsGrid: albumGalleryConfig,
		albumView: albumGalleryConfig,
		albumGallery: albumGalleryConfig, // Legacy alias
		cta: ctaConfig,
		logo: logoConfig,
		siteTitle: siteTitleConfig,
		menu: menuConfig,
		languageSelector: languageSelectorConfig,
		themeToggle: themeToggleConfig,
		themeSelect: themeSelectConfig,
		userGreeting: userGreetingConfig,
		authButtons: authButtonsConfig,
		socialMedia: socialMediaConfig
	};

	$: config = moduleConfigMap[moduleType] || null;
	$: fields = config?.fields || [];

	// Initialize props with defaults when module type changes
	$: if (moduleType && config) {
		const defaults: Record<string, any> = {};
		fields.forEach((field: any) => {
			if (field.default !== undefined && !(field.key in props)) {
				defaults[field.key] = field.default;
			}
		});
		if (Object.keys(defaults).length > 0) {
			const updated = { ...props, ...defaults };
			props = updated;
			if (onChange) onChange(updated);
		}
	}

	function updateProp(key: string, value: any) {
		const updated = { ...props, [key]: value };
		props = updated;
		if (onChange) onChange(updated);
	}

	function updateNestedProp(parentKey: string, childKey: string, value: any) {
		const updated = {
			...props,
			[parentKey]: {
				...(props[parentKey] || {}),
				[childKey]: value
			}
		};
		props = updated;
		if (onChange) onChange(updated);
	}

	function shouldShowField(field: any): boolean {
		if (!field.visibleWhen) return true;
		const condition = field.visibleWhen;
		const key = Object.keys(condition)[0];
		return props[key] === condition[key];
	}

	const placementAxisOptions: ModulePlacementAxis[] = ['default', 'start', 'center', 'end', 'stretch'];

	function placementAxisLabel(axis: 'horizontal' | 'vertical', value: ModulePlacementAxis): string {
		if (axis === 'horizontal') {
			if (value === 'start') return 'Start (left)';
			if (value === 'end') return 'End (right)';
		} else {
			if (value === 'start') return 'Top';
			if (value === 'center') return 'Middle';
			if (value === 'end') return 'Bottom';
			if (value === 'stretch') return 'Stretch (fill)';
		}
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	function setPlacementAxis(axis: 'horizontal' | 'vertical', value: ModulePlacementAxis) {
		const nextRaw: ModulePlacement = { ...(props.placement as ModulePlacement | undefined), [axis]: value };
		const normalized = normalizePlacement(nextRaw);
		const updated = { ...props };
		if (normalized) updated.placement = normalized;
		else delete updated.placement;
		props = updated;
		if (onChange) onChange(updated);
	}

	$: placeH = (props.placement as ModulePlacement | undefined)?.horizontal ?? 'default';
	$: placeV = (props.placement as ModulePlacement | undefined)?.vertical ?? 'default';
</script>

{#if config}
	<div class="space-y-4">
		{#if config.description}
			<p class="text-sm text-gray-600 mb-3">{config.description}</p>
		{/if}

		{#each fields.filter(shouldShowField) as field}
			<div>
				{#if field.type === 'multilangText'}
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<MultiLangInput
						value={props[field.key] || {}}
						onChange={(value) => updateProp(field.key, value)}
						placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
					/>
				{:else if field.type === 'multilangHTML'}
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<MultiLangHTMLEditor
						value={props[field.key] || {}}
						onChange={(value) => updateProp(field.key, value)}
						placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
					/>
				{:else if field.type === 'string'}
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<input
						type="text"
						value={props[field.key] || ''}
						on:input={(e) => updateProp(field.key, e.currentTarget.value)}
						placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
					/>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1">{field.description}</p>
					{/if}
				{:else if field.type === 'select'}
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<select
						value={props[field.key] || field.default || ''}
						on:change={(e) => updateProp(field.key, e.currentTarget.value)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
					>
						{#if !field.required}
							<option value="">-- Select --</option>
						{/if}
						{#each (field.options || []) as option}
							<option value={option}>{option}</option>
						{/each}
					</select>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1">{field.description}</p>
					{/if}
				{:else if field.type === 'boolean'}
					<label class="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={props[field.key] ?? field.default ?? false}
							on:change={(e) => updateProp(field.key, e.currentTarget.checked)}
							class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
						/>
						<span class="text-sm font-medium text-gray-700">
							{field.label}
							{#if field.required}
								<span class="text-red-500">*</span>
							{/if}
						</span>
					</label>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1 ml-6">{field.description}</p>
					{/if}
				{:else if field.type === 'object' && field.fields}
					<!-- Nested object fields (e.g., socialMedia with facebook, instagram, etc.) -->
					<label class="block text-sm font-medium text-gray-700 mb-2">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					{#if field.description}
						<p class="text-xs text-gray-500 mb-2">{field.description}</p>
					{/if}
					<div class="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-3">
						{#each field.fields as nestedField}
							<div>
								<label class="block text-xs font-medium text-gray-600 mb-1">
									{nestedField.label}
									{#if nestedField.required}
										<span class="text-red-500">*</span>
									{/if}
								</label>
								<input
									type="text"
									value={(props[field.key] || {})[nestedField.key] || ''}
									on:input={(e) => updateNestedProp(field.key, nestedField.key, e.currentTarget.value)}
									placeholder={nestedField.placeholder || `Enter ${nestedField.label.toLowerCase()}`}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
								/>
							</div>
						{/each}
					</div>
				{:else if field.type === 'image'}
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<input
						type="text"
						value={props[field.key] || ''}
						on:input={(e) => updateProp(field.key, e.currentTarget.value)}
						placeholder={field.placeholder || 'Enter image URL'}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
					/>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1">{field.description}</p>
					{/if}
				{:else if field.type === 'featureList' || field.type === 'albumPicker'}
					<!-- Complex types that would need custom components - show placeholder for now -->
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
						<p class="text-sm text-yellow-800">
							{field.type === 'featureList' 
								? 'Feature list editing will be available in module edit mode after creation.'
								: 'Album picker will be available in module edit mode after creation.'}
						</p>
					</div>
				{/if}
			</div>
		{/each}

		{#if fields.length === 0}
			<p class="text-sm text-gray-500 italic">This module type has no configurable properties.</p>
		{/if}

		<div class="space-y-3 border-t border-gray-200 pt-4 mt-4">
			<h3 class="text-sm font-semibold text-gray-800">Placement in grid cell</h3>
			<p class="text-xs text-gray-500">
				Optional. Used in layout shells and page builder grids (horizontal / vertical alignment in the cell).
			</p>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1" for="mpf-place-h">Horizontal</label>
					<select
						id="mpf-place-h"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
						value={placeH}
						on:change={(e) =>
							setPlacementAxis('horizontal', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
					>
						{#each placementAxisOptions as opt}
							<option value={opt}>{placementAxisLabel('horizontal', opt)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1" for="mpf-place-v">Vertical</label>
					<select
						id="mpf-place-v"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
						value={placeV}
						on:change={(e) =>
							setPlacementAxis('vertical', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
					>
						{#each placementAxisOptions as opt}
							<option value={opt}>{placementAxisLabel('vertical', opt)}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	</div>
{:else if moduleType}
	<div class="space-y-4">
		<div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
			<p class="text-sm text-yellow-800">
				Module type "{moduleType}" configuration not found. You can configure properties manually after creation.
			</p>
		</div>
		<div class="space-y-3 border-t border-gray-200 pt-4">
			<h3 class="text-sm font-semibold text-gray-800">Placement in grid cell</h3>
			<p class="text-xs text-gray-500">
				Optional. Used in layout shells and page builder grids (horizontal / vertical alignment in the cell).
			</p>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1" for="mpf-place-h2">Horizontal</label>
					<select
						id="mpf-place-h2"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
						value={placeH}
						on:change={(e) =>
							setPlacementAxis('horizontal', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
					>
						{#each placementAxisOptions as opt}
							<option value={opt}>{placementAxisLabel('horizontal', opt)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1" for="mpf-place-v2">Vertical</label>
					<select
						id="mpf-place-v2"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
						value={placeV}
						on:change={(e) =>
							setPlacementAxis('vertical', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
					>
						{#each placementAxisOptions as opt}
							<option value={opt}>{placementAxisLabel('vertical', opt)}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	</div>
{:else}
	<p class="text-sm text-gray-500">Select a module type to configure its properties.</p>
{/if}
