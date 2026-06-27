<!-- ModulePropsForm.svelte - Dynamic form for module props based on module config -->
<script lang="ts">
	import MultiLangInput from './MultiLangInput.svelte';
	import MultiLangHTMLEditor from './MultiLangHTMLEditor.svelte';
	import ImageUrlWithUpload from './ImageUrlWithUpload.svelte';
	import IconSelector from './IconSelector.svelte';
	import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';
	import { heroConfig } from '$lib/page-builder/modules/Hero/config';
	import { photoConfig } from '$lib/page-builder/modules/Photo/config';
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
	import { contactFormConfig } from '$lib/page-builder/modules/ContactForm/config';
	import { searchBarConfig } from '$lib/page-builder/modules/SearchBar/config';
	import { searchFilterConfig } from '$lib/page-builder/modules/SearchFilter/config';
	import { searchFormConfig } from '$lib/page-builder/modules/SearchForm/config';
	import { searchResultsConfig } from '$lib/page-builder/modules/SearchResults/config';
	import { loginFormConfig } from '$lib/page-builder/modules/LoginForm/config';
	import { parseLinksJson } from '$lib/page-builder/modules/SocialMedia/resolveLinks';
	import type { ModulePlacement, ModulePlacementAxis } from '$lib/page-builder/module-cell-placement';
	import { normalizePlacement } from '$lib/page-builder/module-cell-placement';
	import { siteConfigData } from '$stores/siteConfig';

	export let moduleType: string = '';
	export let props: Record<string, any> = {};
	export let onChange: ((props: Record<string, any>) => void) | undefined = undefined;
	/** When false, omit the “Placement in grid cell” block (e.g. template overrides already use ModuleCellPlacementControls). */
	export let showPlacementInGrid: boolean = true;

	// Map module types to their configs
	const moduleConfigMap: Record<string, any> = {
		hero: heroConfig,
		photo: photoConfig,
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
		socialMedia: socialMediaConfig,
		contactForm: contactFormConfig,
		searchBar: searchBarConfig,
		searchFilter: searchFilterConfig,
		searchForm: searchFormConfig,
		searchResults: searchResultsConfig,
		loginForm: loginFormConfig
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

	type FeatureItem = { icon: string; title: MultiLangText; description: MultiLangHTML };

	/** Normalize a stored feature into the editor shape, tolerating legacy plain-string title/description. */
	function asFeatureItem(raw: unknown): FeatureItem {
		const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
		const titleRaw = r.title;
		const descRaw = r.description;
		return {
			icon: typeof r.icon === 'string' ? r.icon : '',
			title:
				typeof titleRaw === 'string'
					? ({ en: titleRaw, he: '' } as MultiLangText)
					: ((titleRaw as MultiLangText) ?? ({ en: '', he: '' } as MultiLangText)),
			description:
				typeof descRaw === 'string'
					? ({ en: descRaw, he: '' } as MultiLangHTML)
					: ((descRaw as MultiLangHTML) ?? ({ en: '', he: '' } as MultiLangHTML))
		};
	}

	function getFeatures(key: string): FeatureItem[] {
		const raw = props[key];
		return Array.isArray(raw) ? raw.map(asFeatureItem) : [];
	}

	function addFeature(key: string) {
		const list = getFeatures(key);
		updateProp(key, [
			...list,
			{ icon: '', title: { en: '', he: '' }, description: { en: '', he: '' } } as FeatureItem
		]);
	}

	function removeFeature(key: string, index: number) {
		const list = getFeatures(key);
		updateProp(
			key,
			list.filter((_, i) => i !== index)
		);
	}

	function moveFeature(key: string, index: number, direction: -1 | 1) {
		const list = getFeatures(key);
		const j = index + direction;
		if (j < 0 || j >= list.length) return;
		const next = [...list];
		const tmp = next[index];
		next[index] = next[j];
		next[j] = tmp;
		updateProp(key, next);
	}

	function patchFeature(key: string, index: number, patch: Partial<FeatureItem>) {
		const list = getFeatures(key);
		if (!list[index]) return;
		const next = list.map((item, i) => (i === index ? { ...item, ...patch } : item));
		updateProp(key, next);
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
		const expected = condition[key];
		let actual = props[key];
		if ((actual === undefined || actual === '') && fields?.length) {
			const def = fields.find((f: any) => f.key === key);
			if (def?.default !== undefined) actual = def.default;
		}
		return actual === expected;
	}

	const SOCIAL_PLATFORM_PRESETS = [
		{ value: 'instagram', label: 'Instagram' },
		{ value: 'flickr', label: 'Flickr' },
		{ value: 'facebook', label: 'Facebook' },
		{ value: 'twitter', label: 'Twitter / X' },
		{ value: 'linkedin', label: 'LinkedIn' },
		{ value: 'youtube', label: 'YouTube' },
		{ value: 'github', label: 'GitHub' },
		{ value: '_custom', label: 'Custom…' },
	] as const;

	const SOCIAL_KNOWN_SLUGS = new Set<string>(
		SOCIAL_PLATFORM_PRESETS.filter((p) => p.value !== '_custom').map((p) => p.value)
	);

	type SocialEditRow = { platformPreset: string; platformCustom: string; url: string };

	function socialRowsFromProps(p: Record<string, any>): SocialEditRow[] {
		const raw: { platform: string; url: string }[] = [];
		if (Array.isArray(p.links)) {
			for (const item of p.links) {
				if (!item || typeof item !== 'object') continue;
				const pl =
					typeof (item as any).platform === 'string'
						? (item as any).platform
						: typeof (item as any).key === 'string'
							? (item as any).key
							: '';
				const url =
					typeof (item as any).url === 'string'
						? (item as any).url
						: typeof (item as any).href === 'string'
							? (item as any).href
							: '';
				raw.push({ platform: pl, url });
			}
		}
		if (!raw.length && typeof p.linksJson === 'string' && p.linksJson.trim()) {
			const parsed = parseLinksJson(p.linksJson);
			if (parsed?.length) {
				for (const x of parsed) raw.push({ platform: x.key, url: x.url });
			}
		}
		return raw.map((r) => {
			const pl = (r.platform || '').trim().toLowerCase();
			const preset = SOCIAL_KNOWN_SLUGS.has(pl) ? pl : '_custom';
			return {
				platformPreset: preset,
				platformCustom: preset === '_custom' ? r.platform.trim() : '',
				url: r.url,
			};
		});
	}

	function commitSocialEditRows(rows: SocialEditRow[]) {
		const mapped = rows.map((r) => {
			const platform =
				r.platformPreset === '_custom'
					? (r.platformCustom || '').trim().toLowerCase()
					: r.platformPreset;
			const url = (r.url || '').trim();
			return { platform: platform || 'link', url };
		});
		const updated = { ...props };
		delete updated.linksJson;
		if (mapped.length === 0) {
			delete updated.links;
		} else {
			updated.links = mapped;
		}
		props = updated;
		if (onChange) onChange(updated);
	}

	function addSocialRow() {
		const rows = socialRowsFromProps(props);
		commitSocialEditRows([
			...rows,
			{ platformPreset: 'instagram', platformCustom: '', url: '' },
		]);
	}

	function removeSocialRow(index: number) {
		const rows = socialRowsFromProps(props);
		commitSocialEditRows(rows.filter((_, i) => i !== index));
	}

	function patchSocialRow(index: number, patch: Partial<SocialEditRow>) {
		const rows = socialRowsFromProps(props);
		const next = [...rows];
		next[index] = { ...next[index], ...patch };
		commitSocialEditRows(next);
	}

	$: socialEditRows = socialRowsFromProps(props);

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

	$: menuInstanceNames = Object.keys(
		(($siteConfigData?.template?.menuInstances ?? {}) as Record<string, unknown>)
	).sort((a, b) => a.localeCompare(b));
</script>

{#if config}
	<div class="space-y-4">
		{#if config.description}
			<p class="text-sm text-gray-600 mb-3">{config.description}</p>
		{/if}

		{#each fields.filter(shouldShowField) as field}
			<div>
				{#if field.type === 'multilangText'}
					<!-- svelte-ignore a11y_label_has_associated_control -->
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
					<!-- svelte-ignore a11y_label_has_associated_control -->
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
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<input
						type="text"
						value={props[field.key] || ''}
						oninput={(e) => updateProp(field.key, e.currentTarget.value)}
						placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
					/>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1">{field.description}</p>
					{/if}
				{:else if field.type === 'textarea'}
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<textarea
						rows={field.rows ?? 4}
						value={props[field.key] || ''}
						oninput={(e) => updateProp(field.key, e.currentTarget.value)}
						placeholder={field.placeholder || ''}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
					></textarea>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1">{field.description}</p>
					{/if}
				{:else if field.type === 'select'}
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<select
						value={props[field.key] ?? field.default ?? ''}
						onchange={(e) => updateProp(field.key, e.currentTarget.value)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
					>
						{#if !field.required}
							<option value="">-- Select --</option>
						{/if}
						{#each (field.options || []) as option}
							{@const optVal =
								typeof option === 'object' && option !== null && 'value' in option
									? String((option as { value: string }).value)
									: String(option)}
							{@const optLabel =
								typeof option === 'object' && option !== null && 'label' in option
									? String((option as { label: string }).label)
									: String(option)}
							<option value={optVal}>{optLabel}</option>
						{/each}
					</select>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1">{field.description}</p>
					{/if}
				{:else if field.type === 'menuInstance'}
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<select
						value={(props[field.key] as string | undefined) ?? ''}
						onchange={(e) => {
							const v = e.currentTarget.value;
							const next = { ...props };
							if (v) next[field.key] = v;
							else delete next[field.key];
							props = next;
							if (onChange) onChange(next);
						}}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
					>
						<option value="">— Use default menu (fallback) —</option>
						{#each menuInstanceNames as name}
							<option value={name}>{name}</option>
						{/each}
					</select>
					{#if field.description}
						<p class="text-xs text-gray-500 mt-1">{field.description}</p>
					{/if}
					{#if menuInstanceNames.length === 0}
						<p class="text-xs text-amber-700 mt-1">
							No named menus yet — add one in Site config → Navigation.
						</p>
					{/if}
				{:else if field.type === 'boolean'}
					<label class="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={props[field.key] ?? field.default ?? false}
							onchange={(e) => updateProp(field.key, e.currentTarget.checked)}
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
					<!-- svelte-ignore a11y_label_has_associated_control -->
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
								<!-- svelte-ignore a11y_label_has_associated_control -->
								<label class="block text-xs font-medium text-gray-600 mb-1">
									{nestedField.label}
									{#if nestedField.required}
										<span class="text-red-500">*</span>
									{/if}
								</label>
								<input
									type="text"
									value={(props[field.key] || {})[nestedField.key] || ''}
									oninput={(e) => updateNestedProp(field.key, nestedField.key, e.currentTarget.value)}
									placeholder={nestedField.placeholder || `Enter ${nestedField.label.toLowerCase()}`}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
								/>
							</div>
						{/each}
					</div>
				{:else if field.type === 'image'}
					{#if field.uploadSiteAsset}
						<div>
							<ImageUrlWithUpload
								id={`mod-prop-${field.key}`}
								label={field.label + (field.required ? ' *' : '')}
								placeholder={field.placeholder || 'Enter image URL or upload'}
								helpText={field.description || ''}
								value={props[field.key] || ''}
								onValueInput={(v) => updateProp(field.key, v)}
							/>
						</div>
					{:else}
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium text-gray-700 mb-1">
							{field.label}
							{#if field.required}
								<span class="text-red-500">*</span>
							{/if}
						</label>
						<input
							type="text"
							value={props[field.key] || ''}
							oninput={(e) => updateProp(field.key, e.currentTarget.value)}
							placeholder={field.placeholder || 'Enter image URL'}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
						/>
						{#if field.description}
							<p class="text-xs text-gray-500 mt-1">{field.description}</p>
						{/if}
					{/if}
				{:else if field.type === 'socialLinks'}
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					{#if field.description}
						<p class="text-xs text-gray-500 mb-2">{field.description}</p>
					{/if}
					{#if socialEditRows.length === 0}
						<p class="text-sm text-gray-600 mb-2">No custom links — site contact URLs will be used.</p>
					{:else}
						<div class="space-y-2 mb-2">
							{#each socialEditRows as row, i (i)}
								<div class="flex flex-wrap items-end gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
									<div class="flex-1 min-w-[140px]">
										<label class="block text-xs font-medium text-gray-600 mb-0.5" for={`soc-pl-${i}`}>Platform</label>
										<select
											id={`soc-pl-${i}`}
											class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
											value={row.platformPreset}
											onchange={(e) =>
												patchSocialRow(i, {
													platformPreset: (e.currentTarget as HTMLSelectElement).value,
												})}
										>
											{#each SOCIAL_PLATFORM_PRESETS as p}
												<option value={p.value}>{p.label}</option>
											{/each}
										</select>
									</div>
									{#if row.platformPreset === '_custom'}
										<div class="flex-1 min-w-[120px]">
											<label class="block text-xs font-medium text-gray-600 mb-0.5" for={`soc-cust-${i}`}
												>Custom id</label
											>
											<input
												id={`soc-cust-${i}`}
												type="text"
												value={row.platformCustom}
												placeholder="e.g. mastodon"
												class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
												oninput={(e) =>
													patchSocialRow(i, { platformCustom: e.currentTarget.value })}
											/>
										</div>
									{/if}
									<div class="flex-[2] min-w-[180px]">
										<label class="block text-xs font-medium text-gray-600 mb-0.5" for={`soc-url-${i}`}
											>URL</label
										>
										<input
											id={`soc-url-${i}`}
											type="url"
											value={row.url}
											placeholder="https://…"
											class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
											oninput={(e) => patchSocialRow(i, { url: e.currentTarget.value })}
										/>
									</div>
									<button
										type="button"
										class="text-sm text-red-600 hover:text-red-800 px-2 py-1"
										onclick={() => removeSocialRow(i)}
									>
										Remove
									</button>
								</div>
							{/each}
						</div>
					{/if}
					<button
						type="button"
						class="text-sm px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
						onclick={addSocialRow}
					>
						Add link
					</button>
				{:else if field.type === 'featureList'}
					{@const featureKey = field.key}
					{@const featureItems = getFeatures(featureKey)}
					<div class="border-t border-gray-200 pt-4">
						<div class="flex items-center justify-between mb-3">
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium text-gray-700">
								{field.label}
								{#if field.required}
									<span class="text-red-500">*</span>
								{/if}
							</label>
							<button
								type="button"
								class="text-sm px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
								onclick={() => addFeature(featureKey)}
							>
								+ Add feature
							</button>
						</div>
						{#if field.description}
							<p class="text-xs text-gray-500 mb-3">{field.description}</p>
						{/if}
						{#if featureItems.length === 0}
							<p class="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-300 rounded">
								No features yet. Click "Add feature" to add one.
							</p>
						{:else}
							<div class="space-y-3">
								{#each featureItems as item, index (index)}
									<div class="border border-gray-300 rounded-lg p-3 bg-white">
										<div class="flex items-center justify-between mb-2">
											<span class="text-sm font-medium text-gray-700">Feature {index + 1}</span>
											<div class="flex items-center gap-1">
												<button
													type="button"
													class="px-1.5 py-0.5 text-[11px] rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40"
													title="Move up"
													aria-label="Move feature up"
													disabled={index === 0}
													onclick={() => moveFeature(featureKey, index, -1)}
												>
													↑
												</button>
												<button
													type="button"
													class="px-1.5 py-0.5 text-[11px] rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40"
													title="Move down"
													aria-label="Move feature down"
													disabled={index === featureItems.length - 1}
													onclick={() => moveFeature(featureKey, index, 1)}
												>
													↓
												</button>
												<button
													type="button"
													class="text-xs text-red-600 hover:text-red-800 ml-2"
													onclick={() => removeFeature(featureKey, index)}
												>
													Remove
												</button>
											</div>
										</div>
										<div class="space-y-3">
											<div>
												<span class="block text-xs font-medium text-gray-600 mb-1">Icon</span>
												<IconSelector
													value={item.icon}
													placeholder="Select an icon…"
													onchange={(e) =>
														patchFeature(featureKey, index, {
															icon: String((e as CustomEvent<{ value?: unknown }>).detail?.value ?? '')
														})}
												/>
											</div>
											<div>
												<!-- svelte-ignore a11y_label_has_associated_control -->
												<label class="block text-xs font-medium text-gray-600 mb-1">Title</label>
												<MultiLangInput
													value={item.title}
													onChange={(value) => patchFeature(featureKey, index, { title: value as MultiLangText })}
												/>
											</div>
											<div>
												<!-- svelte-ignore a11y_label_has_associated_control -->
												<label class="block text-xs font-medium text-gray-600 mb-1">
													Description (Rich Text)
												</label>
												<MultiLangHTMLEditor
													value={item.description}
													onChange={(value) =>
														patchFeature(featureKey, index, { description: value as MultiLangHTML })}
												/>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if field.type === 'albumPicker'}
					<!-- Album picker still needs a dedicated component; placeholder for now. -->
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{field.label}
						{#if field.required}
							<span class="text-red-500">*</span>
						{/if}
					</label>
					<div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
						<p class="text-sm text-yellow-800">
							Album picker is only available in the page-builder module editor. Configure
							<code class="text-xs">selectedAlbums</code> there.
						</p>
					</div>
				{/if}
			</div>
		{/each}

		{#if fields.length === 0}
			<p class="text-sm text-gray-500 italic">This module type has no configurable properties.</p>
		{/if}

		{#if showPlacementInGrid}
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
							onchange={(e) =>
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
							onchange={(e) =>
								setPlacementAxis('vertical', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
						>
							{#each placementAxisOptions as opt}
								<option value={opt}>{placementAxisLabel('vertical', opt)}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else if moduleType}
	<div class="space-y-4">
		<div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
			<p class="text-sm text-yellow-800">
				Module type "{moduleType}" configuration not found. You can configure properties manually after creation.
			</p>
		</div>
		{#if showPlacementInGrid}
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
							onchange={(e) =>
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
							onchange={(e) =>
								setPlacementAxis('vertical', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
						>
							{#each placementAxisOptions as opt}
								<option value={opt}>{placementAxisLabel('vertical', opt)}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<p class="text-sm text-gray-500">Select a module type to configure its properties.</p>
{/if}
