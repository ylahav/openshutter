<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	export let photoId: string;
	export let faces: Array<{
		box: { x: number; y: number; width: number; height: number };
		matchedPersonId?: string;
		confidence?: number;
	}> = [];
	export let onMatchComplete: (() => void) | undefined = undefined;
	export let onFaceClick: ((faceIndex: number) => void) | undefined = undefined;

	interface Person {
		_id: string;
		fullName?: string | { en?: string; he?: string };
		firstName?: string | { en?: string; he?: string };
		profileImage?: {
			url: string;
		};
	}

	let isMatching = false;
	let assigningFaceIndex: number | null = null;
	let people: Person[] = [];

	// Add person modal (optional faceIndex to auto-assign after create)
	let showAddPersonModal = false;
	let addPersonFaceIndex: number | null = null;
	let newPersonFirstName = '';
	let newPersonLastName = '';
	let savingNewPerson = false;
	let addPersonError = '';

	let peopleFetched = false;
	let lastPeopleCheck = '';

	// When user selects a person from dropdown, store name for immediate display (avoids "Unknown" until photo reloads)
	let selectedNameByFaceIndex: Record<number, { personId: string; name: string }> = {};
	// Cache names for persons fetched by ID (when not in people list)
	let personNameCache: Record<string, string> = {};

	onMount(() => {
		fetchPeople();
		peopleFetched = true;
	});

	async function fetchPersonById(personId: string): Promise<string | null> {
		const id = String(personId).trim();
		if (!id) return null;
		try {
			const response = await fetch(`/api/admin/people/${id}`, { credentials: 'include' });
			if (!response.ok) return null;
			const data = await response.json();
			const person = data.success ? data.data : data;
			const name = MultiLangUtils.getTextValue(person?.fullName || person?.firstName || {}, $currentLanguage);
			return name && String(name).trim() ? String(name).trim() : null;
		} catch {
			return null;
		}
	}

	// When we have matchedPersonIds not in people list: fetch each by ID (cache name) and refresh people list
	$: if (peopleFetched && faces.length > 0) {
		const matchedIds = faces
			.map((f) => f.matchedPersonId)
			.filter((id): id is string => !!id)
			.map((id) => String(id).trim());
		const uniqueIds = [...new Set(matchedIds)];
		const missing = uniqueIds.filter(
			(id) => !people.some((p) => String(p._id || '').trim() === id)
		);
		if (missing.length > 0 && uniqueIds.sort().join(',') !== lastPeopleCheck) {
			lastPeopleCheck = uniqueIds.sort().join(',');
			fetchPeople();
			missing.forEach((id) => {
				if (personNameCache[id]) return;
				fetchPersonById(id).then((name) => {
					if (name) {
						personNameCache = { ...personNameCache, [id]: name };
					}
				});
			});
		}
	}

	function openAddPerson(faceIndex?: number) {
		addPersonFaceIndex = faceIndex ?? null;
		newPersonFirstName = '';
		newPersonLastName = '';
		addPersonError = '';
		showAddPersonModal = true;
	}

	function closeAddPerson() {
		showAddPersonModal = false;
		addPersonFaceIndex = null;
		newPersonFirstName = '';
		newPersonLastName = '';
		addPersonError = '';
	}

	async function handleCreatePerson() {
		const first = newPersonFirstName.trim();
		const last = newPersonLastName.trim();
		if (!first || !last) {
			addPersonError = 'First name and last name are required.';
			return;
		}
		addPersonError = '';
		savingNewPerson = true;
		try {
			const lang = $currentLanguage || 'en';
			const response = await fetch('/api/admin/people', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: { [lang]: first },
					lastName: { [lang]: last },
				}),
			});
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				addPersonError = err.error || 'Failed to create person';
				return;
			}
			const result = await response.json();
			const newPerson = result.data || result;
			const newId = newPerson._id?.toString() || newPerson._id;
			const newPersonName = newPerson
				? (MultiLangUtils.getTextValue(newPerson.fullName || newPerson.firstName || {}, $currentLanguage) || `${newPersonFirstName.trim()} ${newPersonLastName.trim()}`.trim())
				: '';
			await fetchPeople();
			if (addPersonFaceIndex !== null && newId) {
				await handleAssignFace(addPersonFaceIndex, newId, newPersonName || undefined);
			}
			closeAddPerson();
		} catch (e) {
			addPersonError = handleError(e, 'Failed to create person');
		} finally {
			savingNewPerson = false;
		}
	}

	async function fetchPeople() {
		try {
			const response = await fetch('/api/admin/people?limit=1000');
			if (response.ok) {
				const result = await response.json();
				// Backend returns { data: [...], pagination: {...} }
				if (result.data && Array.isArray(result.data)) {
					// Serialize ObjectIds to strings
					people = result.data.map((person: Person) => ({
						_id: person._id?.toString() || person._id,
						fullName: person.fullName,
						firstName: person.firstName,
						profileImage: person.profileImage,
					}));
				} else {
					logger.error('Unexpected response format:', result);
				}
			} else {
				await handleApiErrorResponse(response);
			}
		} catch (error) {
			logger.error('Failed to fetch people:', error);
		}
	}

	async function handleMatchFaces() {
		isMatching = true;
		try {
			const response = await fetch('/api/admin/face-recognition/match', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					photoId,
					threshold: 0.6,
				}),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			if (result.success) {
				onMatchComplete?.();
			}
		} catch (error) {
			logger.error('Face matching failed:', error);
		} finally {
			isMatching = false;
		}
	}

	async function handleAssignFace(faceIndex: number, personId: string | null, selectedName?: string) {
		// Store selected name for immediate display (so we show it even before photo reload)
		if (personId && selectedName !== undefined) {
			selectedNameByFaceIndex = { ...selectedNameByFaceIndex, [faceIndex]: { personId: String(personId).trim(), name: selectedName } };
		} else if (!personId) {
			const next = { ...selectedNameByFaceIndex };
			delete next[faceIndex];
			selectedNameByFaceIndex = next;
		}

		assigningFaceIndex = faceIndex;
		try {
			const response = await fetch('/api/admin/face-recognition/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					photoId,
					faceIndex,
					personId: personId ? String(personId).trim() : null,
				}),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			if (result.success || result.data) {
				// Refresh people list first to ensure we have the latest data
				await fetchPeople();
				// Small delay to ensure backend has processed the update
				await new Promise(resolve => setTimeout(resolve, 100));
				// Call onMatchComplete to notify parent to reload photo
				onMatchComplete?.();
			}
		} catch (error) {
			logger.error('Face assignment failed:', error);
		} finally {
			assigningFaceIndex = null;
		}
	}

	function getPersonName(person: Person): string {
		return (
			MultiLangUtils.getTextValue(person.fullName || person.firstName || {}, $currentLanguage) ||
			'Unknown'
		);
	}

	function getPersonNameById(personId: string | null | undefined): string {
		if (!personId) return 'Not assigned';
		const normalizedId = String(personId).trim();
		if (!normalizedId) return 'Not assigned';

		const person = people.find((p) => String(p._id || '').trim() === normalizedId);
		if (person) {
			const name = getPersonName(person);
			return name || 'Unknown';
		}
		// Use cache from fetchPersonById when person wasn't in people list
		const cached = personNameCache[normalizedId] || personNameCache[normalizedId.toLowerCase()];
		if (cached) return cached;
		return 'Unknown';
	}

	/** Display name for a face: unassigned = "Face X"; assigned = person name (never "unknown" when set by you) */
	function getDisplayNameForFace(faceIndex: number, matchedPersonId: string | null | undefined): string {
		// Unassigned: show "Face 1", "Face 2", ...
		if (!matchedPersonId) return `Face ${faceIndex + 1}`;
		const id = String(matchedPersonId).trim();
		// Use name we stored when user selected from dropdown (same as option text)
		const selected = selectedNameByFaceIndex[faceIndex];
		if (selected && String(selected.personId).trim() === id) {
			return selected.name;
		}
		const name = getPersonNameById(matchedPersonId);
		// Assigned (set by you): show real name; if not resolved yet use "Face X" as placeholder
		if (name && name !== 'Unknown') return name;
		return `Face ${faceIndex + 1}`;
	}
</script>

<div class="border-2 border-blue-200 rounded-lg p-5 bg-blue-50/50 shadow-sm" id="face-matching-section">
	<p class="text-sm text-gray-700 mb-3">
		After detecting faces, set who each face is using the fields below.
	</p>
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-lg font-semibold text-gray-900">Set who each face is</h3>
		<button
			type="button"
			on:click={handleMatchFaces}
			disabled={isMatching || faces.length === 0}
			class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
		>
			{isMatching ? 'Matching...' : 'Auto Match Faces'}
		</button>
	</div>
	<p class="text-sm text-gray-600 mb-4">
		Assign each detected face to a person using the dropdown. For faces that were not automatically recognized, mark them below.
	</p>

	{#if faces.length === 0}
		<div class="rounded-md border border-gray-300 bg-white p-4 text-center">
			<p class="text-gray-600 text-sm font-medium">No faces detected yet.</p>
			<p class="text-gray-500 text-sm mt-1">Click &quot;Detect Faces&quot; above first, then use the dropdowns here to set who each face is.</p>
		</div>
	{:else}
		{@const unmatchedFaces = faces.map((f, i) => ({ face: f, index: i })).filter(({ face }) => !face.matchedPersonId)}
		{@const matchedFaces = faces.map((f, i) => ({ face: f, index: i })).filter(({ face }) => !!face.matchedPersonId)}

		{#if people.length === 0}
			<div class="rounded-md border-2 border-amber-300 bg-amber-50 p-4 mb-4 flex flex-wrap items-center gap-3">
				<p class="text-amber-800 font-medium">Add people to assign names to faces.</p>
				<button
					type="button"
					on:click={() => openAddPerson()}
					class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
				>
					Add person
				</button>
				<span class="text-amber-700 text-sm">or <a href="/admin/people" class="underline font-medium">manage people</a></span>
			</div>
		{/if}

		{#if unmatchedFaces.length > 0}
			<div class="mb-4">
				<h4 class="font-medium text-sm text-amber-800 mb-2 flex items-center gap-2">
					<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Unrecognized</span>
					Faces not yet recognized – mark who they are
				</h4>
				<div class="space-y-3">
					{#each unmatchedFaces as { face, index }}
						{@const isAssigning = assigningFaceIndex === index}
						<div class="p-3 rounded border border-amber-200 bg-amber-50/50">
							<div class="flex items-center justify-between gap-4 flex-wrap">
								<div class="flex items-center gap-2">
									<span class="font-medium text-gray-800">Face {index + 1}</span>
									{#if onFaceClick}
										<button
											type="button"
											on:click={() => onFaceClick?.(index)}
											class="text-xs text-blue-600 hover:text-blue-800 underline"
										>
											(highlight on image)
										</button>
									{/if}
								</div>
								<div class="flex items-center gap-2 min-w-0 flex-wrap">
									<label for="mark-face-{index}" class="text-sm text-gray-700 shrink-0">Mark as:</label>
									<select
										id="mark-face-{index}"
										value=""
										on:change={(e) => {
											const selectedPersonId = e.currentTarget.value;
											const option = e.currentTarget.selectedOptions?.[0];
											const selectedName = option?.text?.trim() || getPersonNameById(selectedPersonId);
											if (selectedPersonId) handleAssignFace(index, selectedPersonId, selectedName);
										}}
										disabled={isAssigning}
										class="flex-1 min-w-[140px] px-3 py-2 text-sm text-gray-900 border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
									>
										<option value="" class="text-gray-900">— Choose person —</option>
										{#each people as person}
											<option value={person._id} class="text-gray-900">{getPersonName(person)}</option>
										{/each}
									</select>
									<button
										type="button"
										on:click={() => openAddPerson(index)}
										class="shrink-0 px-3 py-2 text-sm border border-amber-400 text-amber-800 bg-amber-100 rounded-md hover:bg-amber-200"
									>
										Add person
									</button>
									{#if isAssigning}
										<span class="text-xs text-gray-500">Saving...</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if matchedFaces.length > 0}
			<div>
				<h4 class="font-medium text-sm text-gray-700 mb-2">Recognized faces</h4>
				<div class="space-y-3">
					{#each matchedFaces as { face, index }}
						{@const matchedPersonId = face.matchedPersonId}
						{@const isAssigning = assigningFaceIndex === index}
						<div class="p-3 rounded border bg-green-50 border-green-200">
							<div class="flex items-center justify-between gap-4 flex-wrap">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="font-medium">{getDisplayNameForFace(index, matchedPersonId)}</span>
										{#if onFaceClick}
											<button
												type="button"
												on:click={() => onFaceClick?.(index)}
												class="text-xs text-blue-600 hover:text-blue-800 underline"
											>
												(highlight on image)
											</button>
										{/if}
									</div>
									{#if face.confidence !== undefined && face.confidence < 1.0}
										<div class="text-sm text-green-800 font-medium">
											<span class="text-gray-600 font-normal">({(face.confidence * 100).toFixed(0)}% match)</span>
										</div>
									{:else if face.confidence === 1.0}
										<div class="text-sm text-gray-600 font-normal">(set by you)</div>
									{/if}
								</div>
								<div class="flex items-center gap-2 shrink-0 flex-wrap">
									<label for="set-face-{index}" class="text-sm text-gray-600 shrink-0">Set person:</label>
									<select
										id="set-face-{index}"
										value={matchedPersonId || ''}
										on:change={(e) => {
											const selectedPersonId = e.currentTarget.value;
											const option = e.currentTarget.selectedOptions?.[0];
											const selectedName = selectedPersonId ? (option?.text?.trim() || getPersonNameById(selectedPersonId)) : undefined;
											handleAssignFace(index, selectedPersonId || null, selectedName);
										}}
										disabled={isAssigning}
										class="px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 min-w-[140px]"
									>
										<option value="" class="text-gray-900">— Unassign —</option>
										{#each people as person}
											<option value={person._id} class="text-gray-900">{getPersonName(person)}</option>
										{/each}
									</select>
									<button
										type="button"
										on:click={() => openAddPerson(index)}
										class="shrink-0 px-3 py-1.5 text-sm border border-gray-400 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
									>
										Add person
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	{/if}
</div>

<!-- Add person modal -->
{#if showAddPersonModal}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-person-title"
		tabindex="-1"
		on:keydown={(e) => e.key === 'Escape' && closeAddPerson()}
	>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 mx-4">
			<h2 id="add-person-title" class="text-lg font-semibold text-gray-900 mb-3">Add person</h2>
			{#if addPersonError}
				<p class="mb-3 text-sm text-red-600">{addPersonError}</p>
			{/if}
			<div class="space-y-3">
				<div>
					<label for="add-person-first" class="block text-sm font-medium text-gray-700 mb-1">First name</label>
					<input
						id="add-person-first"
						type="text"
						bind:value={newPersonFirstName}
						placeholder="First name"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div>
					<label for="add-person-last" class="block text-sm font-medium text-gray-700 mb-1">Last name</label>
					<input
						id="add-person-last"
						type="text"
						bind:value={newPersonLastName}
						placeholder="Last name"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div class="flex justify-end gap-2 pt-2">
					<button
						type="button"
						on:click={closeAddPerson}
						class="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreatePerson}
						disabled={savingNewPerson}
						class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
					>
						{savingNewPerson ? 'Adding…' : 'Add person'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
