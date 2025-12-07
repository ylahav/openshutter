<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

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
		fullName?: any;
		firstName?: any;
		profileImage?: {
			url: string;
		};
	}

	let isMatching = false;
	let assigningFaceIndex: number | null = null;
	let people: Person[] = [];

	onMount(() => {
		fetchPeople();
	});

	async function fetchPeople() {
		try {
			const response = await fetch('/api/admin/people?limit=1000');
			if (response.ok) {
				const result = await response.json();
				// Backend returns { data: [...], pagination: {...} }
				if (result.data && Array.isArray(result.data)) {
					// Serialize ObjectIds to strings
					people = result.data.map((person: any) => ({
						_id: person._id?.toString() || person._id,
						fullName: person.fullName,
						firstName: person.firstName,
						profileImage: person.profileImage,
					}));
				} else {
					console.error('Unexpected response format:', result);
				}
			} else {
				const error = await response.json();
				console.error('Failed to fetch people:', error);
			}
		} catch (error) {
			console.error('Failed to fetch people:', error);
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

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					onMatchComplete?.();
				}
			}
		} catch (error) {
			console.error('Face matching failed:', error);
		} finally {
			isMatching = false;
		}
	}

	async function handleAssignFace(faceIndex: number, personId: string | null) {
		assigningFaceIndex = faceIndex;
		try {
			const response = await fetch('/api/admin/face-recognition/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					photoId,
					faceIndex,
					personId,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success || result.data) {
					// Call onMatchComplete to notify parent to reload photo
					onMatchComplete?.();
				}
			} else {
				const error = await response.json();
				console.error('Face assignment failed:', error);
			}
		} catch (error) {
			console.error('Face assignment failed:', error);
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
		const person = people.find((p) => p._id === personId);
		if (!person) return 'Unknown';
		return getPersonName(person);
	}
</script>

<div class="border rounded-lg p-4 bg-white">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold">Face Matching</h3>
		<button
			type="button"
			on:click={handleMatchFaces}
			disabled={isMatching || faces.length === 0}
			class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isMatching ? 'Matching...' : 'Auto Match Faces'}
		</button>
	</div>

	{#if faces.length === 0}
		<p class="text-gray-500 text-sm">No faces detected. Please detect faces first.</p>
	{:else}
		<div class="space-y-3">
			<h4 class="font-medium text-sm text-gray-700">Detected Faces:</h4>
			{#each faces as face, index}
				{@const matchedPersonId = face.matchedPersonId}
				{@const isAssigning = assigningFaceIndex === index}
				<div
					class="p-3 rounded border {matchedPersonId
						? 'bg-green-50 border-green-200'
						: 'bg-gray-50 border-gray-200'}"
				>
					<div class="flex items-center justify-between gap-4">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<span class="font-medium">Face {index + 1}</span>
								{#if onFaceClick}
									<button
										type="button"
										on:click={() => onFaceClick?.(index)}
										class="text-xs text-blue-600 hover:text-blue-800 underline"
									>
										(click to highlight)
									</button>
								{/if}
							</div>
							{#if matchedPersonId}
								<div class="text-sm">
									<span class="text-green-700 font-medium">
										{getPersonNameById(matchedPersonId)}
									</span>
									{#if face.confidence !== undefined && face.confidence < 1.0}
										<span class="text-gray-600 ml-2">
											({(face.confidence * 100).toFixed(1)}% confidence)
										</span>
									{:else if face.confidence === 1.0}
										<span class="text-gray-600 ml-2">(manually assigned)</span>
									{/if}
								</div>
							{:else}
								<div class="text-sm text-gray-500">Not assigned</div>
							{/if}
						</div>
						<div class="shrink-0">
							<select
								value={matchedPersonId || ''}
								on:change={(e) => {
									const selectedPersonId = e.currentTarget.value;
									handleAssignFace(index, selectedPersonId || null);
								}}
								disabled={isAssigning}
								class="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<option value="">Select person...</option>
								{#each people as person}
									<option value={person._id}>{getPersonName(person)}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
