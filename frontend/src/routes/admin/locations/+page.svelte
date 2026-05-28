<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { useCrudLoader } from '$lib/composables/useCrudLoader';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
	import { useDialogManager } from '$lib/composables/useDialogManager';
	import { normalizeMultiLangText } from '$lib/utils/multiLangHelpers';
	import { handleError } from '$lib/utils/errorHandler';
	import {
		adminPostJson,
		applyTemplateVars,
		downloadJson,
		fetchAdminPaginatedList,
		parseImportItems
	} from '$lib/utils/collectionImportExport';
	import CollectionImportExportButtons from '$lib/components/admin/CollectionImportExportButtons.svelte';
	import { t } from '$stores/i18n';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import type { PageData } from './$types';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

	// Safe translation function for script usage (avoid calling before $t is ready).
	let translate: (key: string, fallback?: string) => string = (key, fallback) => fallback || key;
	$: translate = $t;

	interface Location {
		_id: string;
		name: { en?: string; he?: string } | string;
		description?: { en?: string; he?: string } | string;
		address?: string;
		city?: string;
		state?: string;
		country?: string;
		postalCode?: string;
		coordinates?: {
			latitude: number | string;
			longitude: number | string;
		};
		/** Stored kind; omitted on legacy documents (inferred in UI). */
		locationKind?: 'place' | 'area';
		/** Viewport box from geocoding for area thumbnails (OSM bbox). */
		areaBounds?: { south: number; north: number; west: number; east: number };
		placeId?: string;
		category?: string;
		isActive?: boolean;
		usageCount?: number;
	}

	const LOCATION_CATEGORIES = [
		{ value: 'city', labelKey: 'admin.locationCategoryCity' },
		{ value: 'colony', labelKey: 'admin.locationCategoryColony' },
		{ value: 'village', labelKey: 'admin.locationCategoryVillage' },
		{ value: 'kibbutz', labelKey: 'admin.locationCategoryKibbutz' },
		{ value: 'landmark', labelKey: 'admin.locationCategoryLandmark' },
		{ value: 'venue', labelKey: 'admin.locationCategoryVenue' },
		{ value: 'outdoor', labelKey: 'admin.locationCategoryOutdoor' },
		{ value: 'indoor', labelKey: 'admin.locationCategoryIndoor' },
		{ value: 'travel', labelKey: 'admin.locationCategoryTravel' },
		{ value: 'home', labelKey: 'admin.locationCategoryHome' },
		{ value: 'work', labelKey: 'admin.locationCategoryWork' },
		{ value: 'custom', labelKey: 'admin.locationCategoryCustom' }
	];

	/** Title-case Latin location names (parity with admin tags). */
	function normalizeLocationLabelLatin(raw: string): string {
		const s = raw.trim();
		if (!s) return s;
		if (/[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/.test(s)) {
			return s;
		}
		return s
			.split(/(\s+)/)
			.map((part) => {
				if (/^\s+$/.test(part) || part === '') return part;
				return part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase();
			})
			.join('');
	}

	function isValidClientAreaBounds(b: {
		south: number;
		north: number;
		west: number;
		east: number;
	}): boolean {
		return (
			[b.south, b.north, b.west, b.east].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
			b.south >= -90 &&
			b.north <= 90 &&
			b.west >= -180 &&
			b.east <= 180 &&
			b.south < b.north &&
			b.west < b.east
		);
	}

	// Use CRUD composables
	const { items, loading, error: listLoadError, loadItems } = useCrudLoader<Location>(
		'/api/admin/locations',
		{
			searchParam: 'search',
			searchValue: () => searchTerm,
			filterParams: {
				category: () => categoryFilter
			},
			initialItems: data.initialItems,
			initialLoadError: data.listLoadError,
		},
	);
	/** Coordinates may come from form as string; we normalize to number. */
	type LocationFormData = Partial<Omit<Location, '_id'>> & {
		coordinates?: { latitude?: number | string; longitude?: number | string };
		locationKind?: 'place' | 'area';
		areaBounds?: { south: number; north: number; west: number; east: number } | null;
	};

	const crudOps = useCrudOperations<Location>('/api/admin/locations', {
		createSuccessMessage: $t('admin.locationCreatedSuccessfully'),
		updateSuccessMessage: $t('admin.locationUpdatedSuccessfully'),
		deleteSuccessMessage: $t('admin.locationDeletedSuccessfully'),
		transformPayload: (data: LocationFormData): Partial<Location> => {
			const { coordinates: _coords, name: rawName, ...rest } = data;
			const payload: Partial<Location> = { ...rest };
			const kind: 'place' | 'area' = data.locationKind === 'area' ? 'area' : 'place';
			payload.locationKind = kind;
			if (kind === 'area') {
				delete (payload as { coordinates?: unknown }).coordinates;
				delete (payload as { address?: unknown }).address;
				delete (payload as { state?: unknown }).state;
				delete (payload as { postalCode?: unknown }).postalCode;
				const ab = data.areaBounds;
				if (ab && isValidClientAreaBounds(ab)) {
					(payload as { areaBounds: typeof ab }).areaBounds = {
						south: Number(ab.south),
						north: Number(ab.north),
						west: Number(ab.west),
						east: Number(ab.east)
					};
				} else {
					delete (payload as { areaBounds?: unknown }).areaBounds;
				}
			} else {
				delete (payload as { areaBounds?: unknown }).areaBounds;
			}
			if (rawName && typeof rawName === 'object') {
				const rec = { ...(rawName as Record<string, string>) };
				for (const k of Object.keys(rec)) {
					if (typeof rec[k] === 'string' && rec[k].trim()) {
						rec[k] = normalizeLocationLabelLatin(rec[k]);
					}
				}
				payload.name = MultiLangUtils.clean(rec as { en?: string; he?: string });
			} else if (typeof rawName === 'string' && rawName.trim()) {
				payload.name = { en: normalizeLocationLabelLatin(rawName) };
			}
			const coords = data.coordinates;
			const parseCoordinate = (value: number | string | undefined): number | null => {
				if (value == null) return null;
				if (typeof value === 'number') return Number.isFinite(value) ? value : null;
				const trimmed = String(value).trim();
				if (!trimmed) return null;
				const parsed = Number(trimmed);
				return Number.isFinite(parsed) ? parsed : null;
			};
			const latitude = parseCoordinate(coords?.latitude);
			const longitude = parseCoordinate(coords?.longitude);
			if (kind === 'place' && latitude != null && longitude != null) {
				payload.coordinates = { latitude, longitude };
			} else if (kind === 'place') {
				delete payload.coordinates;
			}
			return payload;
		},
		onCreateSuccess: (newLocation) => {
			items.update((list) => [...list, newLocation]);
			dialogs.closeAll();
			resetForm();
		},
		onUpdateSuccess: (updatedLocation) => {
			const currentEditingLocation = editingLocation;
			if (currentEditingLocation) {
				items.update((list) =>
					list.map((l) => (l._id === currentEditingLocation._id ? updatedLocation : l)),
				);
			}
			dialogs.closeAll();
			editingLocation = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentLocationToDelete = locationToDelete;
			if (currentLocationToDelete) {
				items.update((list) => list.filter((l) => l._id !== currentLocationToDelete._id));
			}
			dialogs.closeAll();
			locationToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	let saving = false;
	let error = '';
	let searchTerm = '';
	let categoryFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingLocation: Location | null = null;
	let locationToDelete: Location | null = null;
	let importExportBusy = false;
	let geocodeBusy = false;
	let geocodeFlash = '';

	crudOps.saving.subscribe(value => saving = value);
	crudOps.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.message.subscribe((value) => {
		if (!value) return;
		adminToast.success({ title: value });
	});
	dialogs.showCreate.subscribe(value => showCreateDialog = value);
	dialogs.showEdit.subscribe(value => showEditDialog = value);
	dialogs.showDelete.subscribe(value => showDeleteDialog = value);

	// Form state
	let formData = {
		name: { en: '', he: '' } as { en: string; he: string },
		description: { en: '', he: '' } as { en: string; he: string },
		address: '',
		city: '',
		state: '',
		country: '',
		postalCode: '',
		coordinates: { latitude: '', longitude: '' },
		placeId: '',
		category: 'custom',
		isActive: true,
		locationKind: 'place' as 'place' | 'area',
		areaBounds: null as { south: number; north: number; west: number; east: number } | null
	};

	onMount(async () => {
		if (data.listLoadError) return;
		await loadItems(data.initialItems !== undefined ? { background: true } : undefined);
	});

	function resetForm() {
		formData = {
			name: { en: '', he: '' },
			description: { en: '', he: '' },
			address: '',
			city: '',
			state: '',
			country: '',
			postalCode: '',
			coordinates: { latitude: '', longitude: '' },
			placeId: '',
			category: 'custom',
			isActive: true,
			locationKind: 'place',
			areaBounds: null
		};
		geocodeFlash = '';
	}

	function effectiveLocationKind(loc: Location): 'place' | 'area' {
		if (loc.locationKind === 'area') return 'area';
		if (loc.locationKind === 'place') return 'place';
		const la = Number(loc.coordinates?.latitude);
		const lo = Number(loc.coordinates?.longitude);
		const ok =
			Number.isFinite(la) &&
			Number.isFinite(lo) &&
			la >= -90 &&
			la <= 90 &&
			lo >= -180 &&
			lo <= 180;
		return ok ? 'place' : 'area';
	}

	function setFormKind(k: 'place' | 'area') {
		if (formData.locationKind === k) return;
		formData.locationKind = k;
		if (k === 'area') {
			formData.coordinates = { latitude: '', longitude: '' };
			formData.address = '';
			formData.state = '';
			formData.postalCode = '';
		} else {
			formData.areaBounds = null;
		}
	}

	function formatCityCountryLine(loc: Location): string {
		const c = loc.city?.trim() || '';
		const co = loc.country?.trim() || '';
		if (c && co) return `${normalizeLocationLabelLatin(c)}, ${normalizeLocationLabelLatin(co)}`;
		if (c) return normalizeLocationLabelLatin(c);
		if (co) return normalizeLocationLabelLatin(co);
		return '';
	}

	function hasAreaMapThumbnail(loc: Location): boolean {
		return !!(loc.areaBounds && isValidClientAreaBounds(loc.areaBounds));
	}

	function areaBoundsStaticMapUrl(b: { south: number; north: number; west: number; east: number }): string {
		const { west, south, east, north } = b;
		return `https://staticmap.openstreetmap.de/staticmap.php?bbox=${west},${south},${east},${north}&size=280x128&maptype=mapnik`;
	}

	function openCreateDialog() {
		resetForm();
		geocodeFlash = '';
		dialogs.openCreate();
		crudOps.error.set('');
	}

	function openEditDialog(location: Location) {
		editingLocation = location;
		formData = {
			name: normalizeMultiLangText(location.name),
			description: normalizeMultiLangText(location.description),
			address: location.address || '',
			city: location.city || '',
			state: location.state || '',
			country: location.country || '',
			postalCode: location.postalCode || '',
			coordinates: {
				latitude: location.coordinates?.latitude?.toString() || '',
				longitude: location.coordinates?.longitude?.toString() || ''
			},
			placeId: location.placeId || '',
			category: location.category || 'custom',
			isActive: location.isActive !== undefined ? location.isActive : true,
			locationKind: effectiveLocationKind(location),
			areaBounds: location.areaBounds && isValidClientAreaBounds(location.areaBounds) ? { ...location.areaBounds } : null
		};
		dialogs.openEdit();
		geocodeFlash = '';
		crudOps.error.set('');
	}

	function openDeleteDialog(location: Location) {
		locationToDelete = location;
		dialogs.openDelete();
		crudOps.error.set('');
	}

	function getLocationName(location: Location): string {
		const nameField = location.name;
		const raw =
			typeof nameField === 'string'
				? nameField
				: MultiLangUtils.getTextValue(nameField as Record<string, string>, $currentLanguage);
		if (!raw?.trim()) return translate('admin.unnamedLocation');
		return normalizeLocationLabelLatin(raw);
	}

	/** OSM static map from city/country or display name (no coordinates; free, no API key). */
	function areaQueryStaticMapUrl(loc: Location): string | null {
		const line = formatCityCountryLine(loc).trim();
		const name = getLocationName(loc);
		const center = line || (name !== translate('admin.unnamedLocation') ? name : '');
		const q = center.trim();
		if (!q) return null;
		return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(q)}&zoom=12&size=280x128&maptype=mapnik`;
	}

	function hasValidMapCoords(location: Location): boolean {
		const la = Number(location.coordinates?.latitude);
		const lo = Number(location.coordinates?.longitude);
		return (
			Number.isFinite(la) &&
			Number.isFinite(lo) &&
			la >= -90 &&
			la <= 90 &&
			lo >= -180 &&
			lo <= 180
		);
	}

	function locationStaticMapUrl(location: Location): string {
		const la = Number(location.coordinates!.latitude);
		const lo = Number(location.coordinates!.longitude);
		return `https://staticmap.openstreetmap.de/staticmap.php?center=${la},${lo}&zoom=14&size=280x128&markers=${la},${lo},red-pushpin`;
	}

	function isLocationUnused(location: Location): boolean {
		return (location.usageCount ?? 0) === 0;
	}

	async function findOnMap() {
		geocodeFlash = '';
		crudOps.error.set('');
		const parts =
			formData.locationKind === 'area'
				? [formData.city, formData.country]
						.map((s) => (typeof s === 'string' ? s.trim() : ''))
						.filter(Boolean)
				: [formData.address, formData.city, formData.state, formData.postalCode, formData.country]
						.map((s) => (typeof s === 'string' ? s.trim() : ''))
						.filter(Boolean);
		if (!parts.length && !formData.placeId?.trim()) {
			crudOps.error.set(translate('admin.locationGeocodeFailed'));
			return;
		}
		geocodeBusy = true;
		try {
			const res = await fetch('/api/admin/locations/geocode', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					address: formData.locationKind === 'area' ? undefined : formData.address,
					city: formData.city,
					state: formData.locationKind === 'area' ? undefined : formData.state,
					country: formData.country,
					postalCode: formData.locationKind === 'area' ? undefined : formData.postalCode,
					placeId: formData.placeId || undefined
				})
			});
			const j = (await res.json()) as { success?: boolean; data?: Record<string, unknown>; error?: string };
			if (!res.ok || j.success === false) {
				throw new Error(j.error || translate('admin.locationGeocodeFailed'));
			}
			const d = j.data ?? {};
			const pick = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
			if (formData.locationKind === 'area') {
				const raw = d.areaBounds as Record<string, unknown> | undefined;
				if (raw && typeof raw === 'object') {
					const b = {
						south: Number(raw.south),
						north: Number(raw.north),
						west: Number(raw.west),
						east: Number(raw.east)
					};
					if (isValidClientAreaBounds(b)) {
						formData.areaBounds = b;
					}
				}
				if (pick(d.city) && !formData.city.trim()) formData.city = pick(d.city)!;
				if (pick(d.country) && !formData.country.trim()) formData.country = pick(d.country)!;
			} else {
				const lat = d.latitude;
				const lng = d.longitude;
				if (typeof lat !== 'number' || typeof lng !== 'number') {
					throw new Error(translate('admin.locationGeocodeFailed'));
				}
				formData.coordinates.latitude = String(lat);
				formData.coordinates.longitude = String(lng);
				if (pick(d.city) && !formData.city.trim()) formData.city = pick(d.city)!;
				if (pick(d.state) && !formData.state.trim()) formData.state = pick(d.state)!;
				if (pick(d.country) && !formData.country.trim()) formData.country = pick(d.country)!;
				if (pick(d.postalCode) && !formData.postalCode.trim()) formData.postalCode = pick(d.postalCode)!;
				if (pick(d.address) && !formData.address.trim()) formData.address = pick(d.address)!;
			}
			geocodeFlash = translate('admin.locationGeocodeSuccess');
			setTimeout(() => {
				geocodeFlash = '';
			}, 5000);
		} catch (e) {
			crudOps.error.set(handleError(e, translate('admin.locationGeocodeFailed')));
		} finally {
			geocodeBusy = false;
		}
	}

	async function handleCreate() {
		const newLocation = await crudOps.create(formData);
		if (newLocation) {
			// Success handled by onCreateSuccess callback
		}
	}

	async function handleEdit() {
		if (!editingLocation) return;
		const currentEditingLocation = editingLocation;
		const updatedLocation = await crudOps.update(currentEditingLocation._id, formData);
		if (updatedLocation) {
			// Success handled by onUpdateSuccess callback
		}
	}

	async function handleDelete() {
		if (!locationToDelete) return;
		const currentLocationToDelete = locationToDelete;
		const success = await crudOps.remove(currentLocationToDelete._id);
		if (success) {
			// Success handled by onDeleteSuccess callback
		}
	}

	function importFileErrorMessage(err: unknown): string {
		if (err instanceof Error && err.message === 'INVALID_JSON') {
			return translate('admin.collectionImportInvalidJson');
		}
		if (err instanceof Error && err.message === 'INVALID_SHAPE') {
			return translate('admin.collectionImportInvalidEnvelope');
		}
		return handleError(err, translate('admin.collectionImportReadError'));
	}

	function setImportSummaryMessage(created: number, failed: number) {
		const template = translate('admin.collectionImportResult');
		crudOps.message.set(applyTemplateVars(template, { created, failed }));
	}

	async function handleLocationsExport() {
		importExportBusy = true;
		crudOps.error.set('');
		try {
			const rows = await fetchAdminPaginatedList('/api/admin/locations');
			const items = rows.map((raw) => {
				const row = raw as Record<string, unknown>;
				const { _id, usageCount, createdBy, createdAt, updatedAt, ...rest } = row;
				void _id;
				void usageCount;
				void createdBy;
				void createdAt;
				void updatedAt;
				return rest;
			});
			downloadJson(`openshutter-locations-${new Date().toISOString().slice(0, 10)}.json`, {
				schema: 'openshutter.admin.locations/v1',
				exportedAt: new Date().toISOString(),
				items
			});
		} catch (err) {
			crudOps.error.set(handleError(err, translate('admin.collectionExportFailed')));
		} finally {
			importExportBusy = false;
		}
	}

	async function handleLocationsImport(file: File) {
		importExportBusy = true;
		crudOps.error.set('');
		let created = 0;
		let failed = 0;
		const failureLines: string[] = [];
		try {
			const list = parseImportItems(await file.text());
			for (let i = 0; i < list.length; i++) {
				const raw = list[i];
				if (!raw || typeof raw !== 'object') {
					failed++;
					continue;
				}
				const o = raw as Record<string, unknown>;
				const payload: Record<string, unknown> = {
					name: o.name,
					description: o.description,
					address: o.address,
					city: o.city,
					state: o.state,
					country: o.country,
					postalCode: o.postalCode,
					coordinates: o.coordinates,
					placeId: o.placeId,
					category: o.category,
					locationKind: o.locationKind === 'area' ? 'area' : 'place',
					areaBounds: o.areaBounds,
					isActive: o.isActive !== false
				};
				const name = o.name;
				const hasName =
					typeof name === 'string'
						? !!(name as string).trim()
						: name &&
								typeof name === 'object' &&
								Object.values(name as Record<string, unknown>).some(
									(v) => typeof v === 'string' && (v as string).trim()
								);
				if (!hasName) {
					failed++;
					failureLines.push(`#${i + 1}: name required`);
					continue;
				}
				try {
					await adminPostJson('/api/admin/locations', payload);
					created++;
				} catch (e) {
					failed++;
					failureLines.push(`#${i + 1}: ${handleError(e, 'Error')}`);
				}
			}
			await loadItems();
			setImportSummaryMessage(created, failed);
			if (failureLines.length) {
				crudOps.error.set(failureLines.slice(0, 8).join(' · '));
			}
		} catch (err) {
			crudOps.error.set(importFileErrorMessage(err));
		} finally {
			importExportBusy = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.locationsManagement')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.locationsManagement')}</h1>
				<p class="text-(--color-surface-600-400) mt-2">{$t('admin.manageLocationsStructuredData')}</p>
			</div>

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Filters -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center space-x-4">
					<div class="relative">
						<input
							type="text"
							placeholder={$t('admin.searchLocationsPlaceholder')}
							bind:value={searchTerm}
							on:input={() => loadItems()}
							class="pl-10 pr-4 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) w-64"
						/>
						<svg
							class="absolute left-3 top-1/2 transform -translate-y-1/2 text-(--color-surface-400-600) h-4 w-4"
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
						bind:value={categoryFilter}
						on:change={() => loadItems()}
						class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					>
						<option value="all">{$t('admin.allCategories')}</option>
						{#each LOCATION_CATEGORIES as cat}
							<option value={cat.value}>{$t(cat.labelKey)}</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<CollectionImportExportButtons
						exportLabel={$t('admin.collectionExportJson')}
						importLabel={$t('admin.collectionImportJson')}
						busy={importExportBusy}
						onExport={handleLocationsExport}
						onImportFile={handleLocationsImport}
					/>
					<button
						type="button"
						on:click={openCreateDialog}
						class="{adminBtnPrimarySm} {adminRingPrimary} flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						{$t('admin.addLocation')}
					</button>
				</div>
			</div>

			<!-- Locations List -->
			{#if $loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-(--color-primary-600)"></div>
					<p class="mt-2 text-(--color-surface-600-400)">{$t('admin.loadingLocations')}</p>
				</div>
			{:else if $items.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-(--color-surface-400-600) mx-auto mb-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-(--color-surface-950-50) mb-2">{$t('admin.noLocationsFound')}</h3>
					<p class="text-(--color-surface-600-400)">{$t('admin.startByAddingFirstLocation')}</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each $items as location}
						{@const kind = effectiveLocationKind(location)}
						{@const areaLine = formatCityCountryLine(location)}
						{@const areaOsmUrl = kind === 'area' ? areaQueryStaticMapUrl(location) : null}
						<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4 flex gap-3">
							<div class="shrink-0 w-24 sm:w-28">
								{#if kind === 'place' && hasValidMapCoords(location)}
									<div class="relative rounded-lg overflow-hidden ring-1 ring-surface-200-800 bg-(--color-surface-100-900)">
										<img
											src={locationStaticMapUrl(location)}
											alt=""
											class="h-24 w-full object-cover"
											loading="lazy"
											referrerpolicy="no-referrer"
										/>
										<p class="px-1 py-0.5 text-[9px] leading-tight text-(--color-surface-600-400) bg-(--color-surface-50-950)/90">
											{$t('admin.locationMapAttribution')}
										</p>
									</div>
								{:else if kind === 'area' && hasAreaMapThumbnail(location) && location.areaBounds}
									<div class="relative rounded-lg overflow-hidden ring-1 ring-surface-200-800 bg-(--color-surface-100-900)">
										<img
											src={areaBoundsStaticMapUrl(location.areaBounds)}
											alt=""
											class="h-24 w-full object-cover"
											loading="lazy"
											referrerpolicy="no-referrer"
										/>
										<p class="px-1 py-0.5 text-[9px] leading-tight text-(--color-surface-600-400) bg-(--color-surface-50-950)/90">
											{$t('admin.locationMapAttribution')}
										</p>
									</div>
								{:else if kind === 'area' && areaOsmUrl}
									<div class="relative rounded-lg overflow-hidden ring-1 ring-surface-200-800 bg-(--color-surface-100-900)">
										<img
											src={areaOsmUrl}
											alt=""
											class="h-24 w-full object-cover"
											loading="lazy"
											referrerpolicy="no-referrer"
										/>
										<p class="px-1 py-0.5 text-[9px] leading-tight text-(--color-surface-600-400) bg-(--color-surface-50-950)/90">
											{$t('admin.locationMapAttribution')}
										</p>
									</div>
								{:else if kind === 'area'}
									<div
										class="h-24 w-full rounded-lg ring-1 ring-surface-200-800 bg-(--color-surface-100-900) flex flex-col items-center justify-center text-(--color-surface-600-400) gap-1.5 px-1"
										aria-hidden="true"
									>
										<svg class="h-9 w-9 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="1.5"
												d="M9 20.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5h4.5m7.5 0h4.5a2.25 2.25 0 012.25 2.25v11.25a2.25 2.25 0 01-2.25 2.25H15m-9-9h.008v.008H6V11.25zm3 0h.008v.008H9V11.25zm0 3h.008v.008H9V14.25zm3-3h.008v.008H12V11.25zm0 3h.008v.008H12V14.25zm3-3h.008v.008H15V11.25zm0 3h.008v.008H15V14.25zM6 20.25v-2.25h12v2.25"
											/>
										</svg>
										<span class="text-[11px] font-medium text-center leading-snug wrap-break-word text-(--color-surface-800-200)">
											{areaLine || getLocationName(location)}
										</span>
									</div>
								{:else}
									<div
										class="h-24 w-full rounded-lg ring-1 ring-surface-200-800 bg-(--color-surface-100-900) flex flex-col items-center justify-center text-(--color-surface-500-400) gap-1"
										aria-hidden="true"
									>
										<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="1.5"
												d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="1.5"
												d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
										<span class="text-[10px] px-1 text-center leading-tight">{$t('admin.locationNoMapYet')}</span>
									</div>
								{/if}
							</div>
							<div class="flex-1 min-w-0 flex flex-col pr-1">
								<div class="flex items-start justify-between gap-2 mb-2">
									<div class="min-w-0 flex-1">
										{#if kind === 'area'}
											<h3 class="font-semibold text-(--color-surface-950-50) mb-1 wrap-break-word leading-snug">
												{areaLine || getLocationName(location)}
											</h3>
											{#if areaLine && getLocationName(location) !== areaLine}
												<p class="text-sm text-(--color-surface-600-400) wrap-break-word leading-snug">
													{getLocationName(location)}
												</p>
											{/if}
										{:else}
											<h3 class="font-semibold text-(--color-surface-950-50) mb-1 wrap-break-word leading-snug">
												{getLocationName(location)}
											</h3>
											{#if location.city || location.country}
												<p class="text-sm text-(--color-surface-600-400) wrap-break-word leading-snug">
													{#if location.city}{location.city}{/if}
													{#if location.city && location.country}, {/if}
													{#if location.country}{location.country}{/if}
												</p>
											{/if}
										{/if}
									</div>
									<div class="flex shrink-0 space-x-1">
										<button
											type="button"
											on:click={() => openEditDialog(location)}
											class="p-1 text-(--color-surface-600-400) hover:text-(--color-primary-600) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] rounded"
											aria-label={$t('admin.editLocationAria')}
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
												/>
											</svg>
										</button>
										<button
											type="button"
											on:click={() => openDeleteDialog(location)}
											class="p-1 text-(--color-surface-600-400) hover:text-red-600 hover:bg-red-50 rounded"
											aria-label={$t('admin.deleteLocationAria')}
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
										</button>
									</div>
								</div>

								{#if kind === 'place' && location.address}
									<p class="text-sm text-(--color-surface-600-400) mb-2 line-clamp-2">{location.address}</p>
								{/if}

								<div class="flex items-center justify-end mt-auto pt-2 gap-2">
									{#if location.usageCount !== undefined}
										<span
											class="text-xs text-right {isLocationUnused(location)
												? 'font-medium text-amber-800 dark:text-amber-200'
												: 'text-(--color-surface-600-400)'}"
										>
											{#if isLocationUnused(location)}
												<span class="mr-1.5 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
													{$t('admin.tagsUnusedBadge')}
												</span>
											{/if}
											{kind === 'place' ? $t('admin.locationKindPlaceShort') : $t('admin.locationKindAreaShort')}
											{' · '}
											{$t('admin.locationUsage').replace('{count}', String(location.usageCount))}
										</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.locationAddNewTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationKindSectionLabel')}
					</span>
					<div class="inline-flex flex-wrap rounded-lg border border-surface-300-700 p-0.5 gap-0.5 bg-(--color-surface-100-900)">
						<button
							type="button"
							on:click={() => setFormKind('place')}
							class="px-3 py-2 text-sm rounded-md transition-colors {formData.locationKind === 'place'
								? 'bg-(--color-primary-600) text-white shadow-sm'
								: 'text-(--color-surface-700-300) hover:bg-(--color-surface-200-800)'}"
						>
							{$t('admin.locationKindPlaceLabel')}
						</button>
						<button
							type="button"
							on:click={() => setFormKind('area')}
							class="px-3 py-2 text-sm rounded-md transition-colors {formData.locationKind === 'area'
								? 'bg-(--color-primary-600) text-white shadow-sm'
								: 'text-(--color-surface-700-300) hover:bg-(--color-surface-200-800)'}"
						>
							{$t('admin.locationKindAreaLabel')}
						</button>
					</div>
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationNameLabel')}
					</span>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationDescriptionLabel')}
					</span>
					<MultiLangHTMLEditor bind:value={formData.description} />
				</div>

				{#if formData.locationKind === 'place'}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="address-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationAddressLabel')}
						</label>
						<input
							type="text"
							id="address-create"
							bind:value={formData.address}
							placeholder={$t('admin.locationStreetAddressPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="city-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCityLabel')}
						</label>
						<input
							type="text"
							id="city-create"
							bind:value={formData.city}
							placeholder={$t('admin.locationCityPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="state-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationStateProvinceLabel')}
						</label>
						<input
							type="text"
							id="state-create"
							bind:value={formData.state}
							placeholder={$t('admin.locationStatePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="country-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCountryLabel')}
						</label>
						<input
							type="text"
							id="country-create"
							bind:value={formData.country}
							placeholder={$t('admin.locationCountryPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="postal-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationPostalCodeLabel')}
						</label>
						<input
							type="text"
							id="postal-create"
							bind:value={formData.postalCode}
							placeholder={$t('admin.locationPostalCodePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						on:click={findOnMap}
						disabled={geocodeBusy || saving}
						class="px-3 py-2 text-sm font-medium rounded-md border border-(--color-primary-600) text-(--color-primary-700) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_12%,transparent)] disabled:opacity-50"
					>
						{geocodeBusy ? $t('admin.locationGeocoding') : $t('admin.locationFindOnMap')}
					</button>
					{#if geocodeFlash}
						<p class="text-sm text-green-700 dark:text-green-400">{geocodeFlash}</p>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="lat-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationLatitudeLabel')}
						</label>
						<input
							type="number"
							id="lat-create"
							step="any"
							bind:value={formData.coordinates.latitude}
							placeholder={$t('admin.locationLatitudePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="lng-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationLongitudeLabel')}
						</label>
						<input
							type="number"
							id="lng-create"
							step="any"
							bind:value={formData.coordinates.longitude}
							placeholder={$t('admin.locationLongitudePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="place-id-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationPlaceIdLabel')}
					</label>
					<input
						type="text"
						id="place-id-create"
						bind:value={formData.placeId}
						placeholder={$t('admin.locationPlaceIdPlaceholder')}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="text-xs text-(--color-surface-600-400) mt-1">{$t('admin.locationPlaceIdGeocodeHint')}</p>
				</div>
				{:else}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="city-area-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCityLabel')}
						</label>
						<input
							type="text"
							id="city-area-create"
							bind:value={formData.city}
							placeholder={$t('admin.locationCityPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
					<div>
						<label for="country-area-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCountryLabel')}
						</label>
						<input
							type="text"
							id="country-area-create"
							bind:value={formData.country}
							placeholder={$t('admin.locationCountryPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="place-id-area-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationPlaceIdLabel')}
					</label>
					<input
						type="text"
						id="place-id-area-create"
						bind:value={formData.placeId}
						placeholder={$t('admin.locationPlaceIdPlaceholder')}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="text-xs text-(--color-surface-600-400) mt-1">{$t('admin.locationAreaPlaceIdHint')}</p>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						on:click={findOnMap}
						disabled={geocodeBusy || saving}
						class="px-3 py-2 text-sm font-medium rounded-md border border-(--color-primary-600) text-(--color-primary-700) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_12%,transparent)] disabled:opacity-50"
					>
						{geocodeBusy ? $t('admin.locationGeocoding') : $t('admin.locationFindOnMap')}
					</button>
					{#if geocodeFlash}
						<p class="text-sm text-green-700 dark:text-green-400">{geocodeFlash}</p>
					{/if}
				</div>
				{#if formData.areaBounds && isValidClientAreaBounds(formData.areaBounds)}
					<p class="text-xs text-(--color-surface-600-400)">{$t('admin.locationAreaBoundsReady')}</p>
				{/if}
				{/if}

				<div>
					<label for="category-create" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationCategoryLabel')}
					</label>
					<select
						id="category-create"
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					>
						{#each LOCATION_CATEGORIES as cat}
							<option value={cat.value}>{$t(cat.labelKey)}</option>
						{/each}
					</select>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.locationCancelButton')}
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{#if saving}
							{$t('admin.locationCreatingButton')}
						{:else}
							{$t('admin.locationCreateButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingLocation}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.locationEditTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationKindSectionLabel')}
					</span>
					<div class="inline-flex flex-wrap rounded-lg border border-surface-300-700 p-0.5 gap-0.5 bg-(--color-surface-100-900)">
						<button
							type="button"
							on:click={() => setFormKind('place')}
							class="px-3 py-2 text-sm rounded-md transition-colors {formData.locationKind === 'place'
								? 'bg-(--color-primary-600) text-white shadow-sm'
								: 'text-(--color-surface-700-300) hover:bg-(--color-surface-200-800)'}"
						>
							{$t('admin.locationKindPlaceLabel')}
						</button>
						<button
							type="button"
							on:click={() => setFormKind('area')}
							class="px-3 py-2 text-sm rounded-md transition-colors {formData.locationKind === 'area'
								? 'bg-(--color-primary-600) text-white shadow-sm'
								: 'text-(--color-surface-700-300) hover:bg-(--color-surface-200-800)'}"
						>
							{$t('admin.locationKindAreaLabel')}
						</button>
					</div>
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationNameLabel')}
					</span>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div>
					<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationDescriptionLabel')}
					</span>
					<MultiLangHTMLEditor bind:value={formData.description} />
				</div>

				{#if formData.locationKind === 'place'}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="address-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationAddressLabel')}
						</label>
						<input
							type="text"
							id="address-edit"
							bind:value={formData.address}
							placeholder={$t('admin.locationStreetAddressPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="city-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCityLabel')}
						</label>
						<input
							type="text"
							id="city-edit"
							bind:value={formData.city}
							placeholder={$t('admin.locationCityPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="state-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationStateProvinceLabel')}
						</label>
						<input
							type="text"
							id="state-edit"
							bind:value={formData.state}
							placeholder={$t('admin.locationStatePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="country-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCountryLabel')}
						</label>
						<input
							type="text"
							id="country-edit"
							bind:value={formData.country}
							placeholder={$t('admin.locationCountryPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="postal-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationPostalCodeLabel')}
						</label>
						<input
							type="text"
							id="postal-edit"
							bind:value={formData.postalCode}
							placeholder={$t('admin.locationPostalCodePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						on:click={findOnMap}
						disabled={geocodeBusy || saving}
						class="px-3 py-2 text-sm font-medium rounded-md border border-(--color-primary-600) text-(--color-primary-700) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_12%,transparent)] disabled:opacity-50"
					>
						{geocodeBusy ? $t('admin.locationGeocoding') : $t('admin.locationFindOnMap')}
					</button>
					{#if geocodeFlash}
						<p class="text-sm text-green-700 dark:text-green-400">{geocodeFlash}</p>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="lat-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationLatitudeLabel')}
						</label>
						<input
							type="number"
							id="lat-edit"
							step="any"
							bind:value={formData.coordinates.latitude}
							placeholder={$t('admin.locationLatitudePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>

					<div>
						<label for="lng-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationLongitudeLabel')}
						</label>
						<input
							type="number"
							id="lng-edit"
							step="any"
							bind:value={formData.coordinates.longitude}
							placeholder={$t('admin.locationLongitudePlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="place-id-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationPlaceIdLabel')}
					</label>
					<input
						type="text"
						id="place-id-edit"
						bind:value={formData.placeId}
						placeholder={$t('admin.locationPlaceIdPlaceholder')}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="text-xs text-(--color-surface-600-400) mt-1">{$t('admin.locationPlaceIdGeocodeHint')}</p>
				</div>
				{:else}
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="city-area-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCityLabel')}
						</label>
						<input
							type="text"
							id="city-area-edit"
							bind:value={formData.city}
							placeholder={$t('admin.locationCityPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
					<div>
						<label for="country-area-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.locationCountryLabel')}
						</label>
						<input
							type="text"
							id="country-area-edit"
							bind:value={formData.country}
							placeholder={$t('admin.locationCountryPlaceholder')}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
						/>
					</div>
				</div>

				<div>
					<label for="place-id-area-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationPlaceIdLabel')}
					</label>
					<input
						type="text"
						id="place-id-area-edit"
						bind:value={formData.placeId}
						placeholder={$t('admin.locationPlaceIdPlaceholder')}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					/>
					<p class="text-xs text-(--color-surface-600-400) mt-1">{$t('admin.locationAreaPlaceIdHint')}</p>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						on:click={findOnMap}
						disabled={geocodeBusy || saving}
						class="px-3 py-2 text-sm font-medium rounded-md border border-(--color-primary-600) text-(--color-primary-700) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_12%,transparent)] disabled:opacity-50"
					>
						{geocodeBusy ? $t('admin.locationGeocoding') : $t('admin.locationFindOnMap')}
					</button>
					{#if geocodeFlash}
						<p class="text-sm text-green-700 dark:text-green-400">{geocodeFlash}</p>
					{/if}
				</div>
				{#if formData.areaBounds && isValidClientAreaBounds(formData.areaBounds)}
					<p class="text-xs text-(--color-surface-600-400)">{$t('admin.locationAreaBoundsReady')}</p>
				{/if}
				{/if}

				<div>
					<label for="category-edit" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.locationCategoryLabel')}
					</label>
					<select
						id="category-edit"
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
					>
						{#each LOCATION_CATEGORIES as cat}
							<option value={cat.value}>{$t(cat.labelKey)}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.isActive}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-(--color-surface-200-800) peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-(--color-surface-50-950) after:border-surface-300-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--color-primary-600)"
						></div>
						<span class="ml-3 text-sm font-medium text-(--color-surface-800-200)">
							{$t('admin.locationActiveLabel')}
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							editingLocation = null;
							resetForm();
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.locationCancelButton')}
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving}
						class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
					>
						{#if saving}
							{$t('admin.locationUpdatingButton')}
						{:else}
							{$t('admin.locationUpdateButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && locationToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{$t('admin.locationDeleteTitle')}</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-(--color-surface-600-400)">
					{$t('admin.locationDeleteConfirmPrefix')}
					<strong>{getLocationName(locationToDelete)}</strong>
					{$t('admin.locationDeleteConfirmSuffix')}
				</p>
				{#if locationToDelete.usageCount && locationToDelete.usageCount > 0}
					<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
						<p class="text-sm text-yellow-800">
							{$t('admin.locationDeleteUsedWarningPrefix')} {locationToDelete.usageCount}{' '}
							{locationToDelete.usageCount === 1 ? $t('admin.tagsPhotoSingular') : $t('admin.tagsPhotoPlural')}
							{$t('admin.locationDeleteUsedWarningSuffix')}
						</p>
					</div>
				{/if}
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							dialogs.closeAll();
							locationToDelete = null;
						}}
						class="px-4 py-2 bg-(--color-surface-200-800) text-(--color-surface-800-200) rounded-md hover:bg-(--color-surface-300-700) text-sm font-medium"
					>
						{$t('admin.locationCancelButton')}
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={saving}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							{$t('admin.locationDeletingButton')}
						{:else}
							{$t('admin.locationDeleteButton')}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
