<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { FaceRecognitionService, type FaceDetection } from '../../services/face-recognition';
	import { logger } from '$lib/utils/logger';
	import { handleError } from '$lib/utils/errorHandler';
	import { getPhotoRotationStyle } from '$lib/utils/photoUrl';

	export let imageUrl: string;
	export let photoId: string;
	/** Display-only rotation: 90, -90, or 180. Applied via CSS transform. */
	export let rotation: number | undefined = undefined;
	export let detectedFaces: Array<{
		box: { x: number; y: number; width: number; height: number };
		landmarks?: {
			leftEye: { x: number; y: number };
			rightEye: { x: number; y: number };
			nose: { x: number; y: number };
			mouth: { x: number; y: number };
		};
		matchedPersonId?: string;
		confidence?: number;
	}> = [];
	export let onFaceDetected: ((faces: FaceDetection[]) => void) | undefined = undefined;
	export let onFaceClick: ((faceIndex: number) => void) | undefined = undefined;
	export let onError: ((error: string) => void) | undefined = undefined;
	export let onSuccess: ((message: string) => void) | undefined = undefined;
	/** Optional: return display name for a face (e.g. assigned person name). If not provided, labels show "Face 1", "Face 2", ... */
	export let getFaceLabel: ((faceIndex: number, matchedPersonId?: string) => string) | undefined = undefined;
	/** People list for manual selection: draw a rectangle then assign a person. Optional. */
	export let people: Array<{ _id: string; fullName?: unknown; firstName?: unknown }> = [];
	/** Optional: get display name for a person ID (used in manual-assign dropdown). */
	export let getPersonName: ((personId: string) => string) | undefined = undefined;

	let isDetecting = false;
	let addingManual = false;
	let faces: FaceDetection[] = [];
	let modelsLoaded = false;
	let isManualMode = false;
	let isDrawing = false;
	let drawStart: { x: number; y: number } | null = null;
	let currentRect: { x: number; y: number; width: number; height: number } | null = null;
	let selectedFaceIndex: number | null = null;
	let faceDescriptors = new Map<number, number[]>();
	let manualFaces = new Set<number>();
	/** After user draws a rectangle in manual mode, we show person picker. Box in image coords. */
	let pendingManualBox: { x: number; y: number; width: number; height: number } | null = null;
	let canvas: HTMLCanvasElement;
	let image: HTMLImageElement;
	/** Track previous rotation to trigger re-detect when rotation changes. */
	let prevRotation: number | undefined = undefined;
	/** One-time: re-detect when photo has rotation + existing faces so boxes use rotated coords. */
	let didRedetectForRotation = false;

	/**
	 * Create an offscreen canvas with the image drawn at the given display rotation.
	 * Face detection runs on this so box coordinates match the displayed orientation.
	 */
	function createRotatedCanvas(
		img: HTMLImageElement,
		rot: number
	): HTMLCanvasElement {
		const w = img.naturalWidth;
		const h = img.naturalHeight;
		const is90 = rot === 90 || rot === -90;
		const c = document.createElement('canvas');
		c.width = is90 ? h : w;
		c.height = is90 ? w : h;
		const ctx = c.getContext('2d');
		if (!ctx) return c;
		ctx.save();
		if (rot === 90) {
			ctx.translate(c.width, 0);
			ctx.rotate((90 * Math.PI) / 180);
			ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
		} else if (rot === -90) {
			ctx.translate(0, c.height);
			ctx.rotate((-90 * Math.PI) / 180);
			ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
		} else if (rot === 180) {
			ctx.translate(c.width, c.height);
			ctx.rotate(Math.PI);
			ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
		}
		ctx.restore();
		return c;
	}

	onMount(async () => {
		if (typeof window === 'undefined') return;
		
		try {
			await FaceRecognitionService.loadModels();
			modelsLoaded = true;
		} catch (error) {
			logger.error('Failed to load face detection models:', error);
		}
	});

	$: if (detectedFaces.length > 0) {
		const newFaces = detectedFaces.map((face) => ({
			descriptor: [] as number[],
			box: face.box,
			landmarks: face.landmarks,
		}));
		faces = newFaces;
		manualFaces = new Set();
		if (selectedFaceIndex !== null && selectedFaceIndex >= newFaces.length) {
			selectedFaceIndex = null;
		}
	}

	function drawFaces() {
		if (!canvas || !image || !image.complete) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Get the displayed size of the image
		const rect = image.getBoundingClientRect();
		const displayWidth = rect.width;
		const displayHeight = rect.height;
		
		// Set canvas to match displayed size
		canvas.width = displayWidth;
		canvas.height = displayHeight;
		
		// Face boxes are in "source" coords: rotated canvas when rotation is set, else natural image
		const hasRotation = rotation === 90 || rotation === -90 || rotation === 180;
		const sourceWidth = hasRotation && (rotation === 90 || rotation === -90)
			? image.naturalHeight
			: image.naturalWidth;
		const sourceHeight = hasRotation && (rotation === 90 || rotation === -90)
			? image.naturalWidth
			: image.naturalHeight;
		const scaleX = displayWidth / sourceWidth;
		const scaleY = displayHeight / sourceHeight;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		faces.forEach((face, index) => {
			const { box } = face;
			const isSelected = selectedFaceIndex === index;
			const isManual = manualFaces.has(index);

			let strokeColor = '#00ff00';
			if (isSelected) {
				strokeColor = '#ffff00';
			} else if (isManual) {
				strokeColor = '#ff8800';
			}

			// Scale box coordinates to match displayed image
			const scaledBox = {
				x: box.x * scaleX,
				y: box.y * scaleY,
				width: box.width * scaleX,
				height: box.height * scaleY,
			};

			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = isSelected ? 3 : 2;
			ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);

			if (face.landmarks) {
				ctx.fillStyle = '#ff0000';
				const landmarks = [
					face.landmarks.leftEye,
					face.landmarks.rightEye,
					face.landmarks.nose,
					face.landmarks.mouth,
				];

				landmarks.forEach((landmark) => {
					ctx.beginPath();
					ctx.arc(landmark.x * scaleX, landmark.y * scaleY, 3, 0, 2 * Math.PI);
					ctx.fill();
				});
			}

			ctx.fillStyle = strokeColor;
			ctx.font = `${Math.max(12, 16 * scaleX)}px Arial`;
			const baseLabel = getFaceLabel
				? getFaceLabel(index, detectedFaces[index]?.matchedPersonId)
				: `Face ${index + 1}`;
			const label = baseLabel + (isManual ? ' (Manual)' : '');
			ctx.fillText(label, scaledBox.x, scaledBox.y - 5);
		});

		// Draw current rectangle while user is dragging (manual mode)
		if (currentRect && isManualMode) {
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = '#ff8800';
			ctx.lineWidth = 2;
			ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
			ctx.setLineDash([]);
		}
	}

	$: if ((faces.length > 0 || currentRect) && image?.complete) {
		drawFaces();
	}

	// When rotation changes and we have existing faces, recalculate face detection so boxes match the new orientation
	$: if (prevRotation !== undefined && rotation !== prevRotation && (faces.length > 0 || detectedFaces.length > 0)) {
		prevRotation = rotation;
		didRedetectForRotation = true;
		handleDetectFaces();
	} else if (prevRotation === undefined) {
		prevRotation = rotation;
	}
	// One-time: photo already has rotation + faces from server; re-detect so boxes are in rotated coords
	$: if (
		!didRedetectForRotation &&
		(rotation === 90 || rotation === -90 || rotation === 180) &&
		detectedFaces.length > 0 &&
		image?.complete &&
		modelsLoaded
	) {
		didRedetectForRotation = true;
		handleDetectFaces();
	}

	async function handleDetectFaces() {
		if (!image || !modelsLoaded) {
			onError?.('Image not loaded or models not ready');
			return;
		}

		isDetecting = true;
		try {
			// When rotation is set, run detection on a rotated canvas so box coords match display
			const hasRotation = rotation === 90 || rotation === -90 || rotation === 180;
			const input: HTMLImageElement | HTMLCanvasElement = hasRotation
				? createRotatedCanvas(image, rotation!)
				: image;
			let detections = await FaceRecognitionService.detectFaces(input);
			if (detections.length === 0) {
				const lowThresholdDetections = await FaceRecognitionService.detectFaces(input, {
					scoreThreshold: 0.1,
				});
				if (lowThresholdDetections.length > 0) {
					detections = lowThresholdDetections;
				}
			}

			if (detections.length === 0) {
				onError?.('No faces detected in this image');
				return;
			}

			faces = detections;
			detections.forEach((detection, index) => {
				faceDescriptors.set(index, Array.from(detection.descriptor));
			});

			// Save to backend
			const response = await fetch('/api/admin/face-recognition/detect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					photoId,
					faces: detections.map((d) => ({
						descriptor: Array.from(d.descriptor),
						box: d.box,
						landmarks: d.landmarks,
					})),
				}),
			});

			if (response.ok) {
				onSuccess?.('Faces detected successfully');
				onFaceDetected?.(detections);
			} else {
				const error = await response.json();
				onError?.(error.error || 'Failed to save face detection');
			}
		} catch (error) {
			logger.error('Face detection failed:', error);
			onError?.(handleError(error, 'Face detection failed'));
		} finally {
			isDetecting = false;
		}
	}

	function handleCanvasMouseDown(e: MouseEvent) {
		if (!canvas || !image || !isManualMode) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		drawStart = { x, y };
		currentRect = { x, y, width: 0, height: 0 };
		isDrawing = true;
	}

	function handleCanvasMouseMove(e: MouseEvent) {
		if (!canvas || !isDrawing || !drawStart) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const minX = Math.min(drawStart.x, x);
		const minY = Math.min(drawStart.y, y);
		const width = Math.abs(x - drawStart.x);
		const height = Math.abs(y - drawStart.y);
		currentRect = { x: minX, y: minY, width, height };
		drawFaces();
	}

	function handleCanvasMouseUp(e: MouseEvent) {
		if (!canvas || !image || !isDrawing || !drawStart) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const minX = Math.min(drawStart.x, x);
		const minY = Math.min(drawStart.y, y);
		const width = Math.abs(x - drawStart.x);
		const height = Math.abs(y - drawStart.y);
		isDrawing = false;
		drawStart = null;
		currentRect = null;
		// Minimum size to avoid accidental tiny clicks
		if (width < 10 || height < 10) return;
		const scaleX = image.naturalWidth / rect.width;
		const scaleY = image.naturalHeight / rect.height;
		pendingManualBox = {
			x: minX * scaleX,
			y: minY * scaleY,
			width: width * scaleX,
			height: height * scaleY,
		};
		drawFaces();
	}

	function handleCanvasClick(e: MouseEvent) {
		if (!canvas || !image || isManualMode) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = image.naturalWidth / rect.width;
		const scaleY = image.naturalHeight / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		for (let i = faces.length - 1; i >= 0; i--) {
			const face = faces[i];
			if (
				x >= face.box.x &&
				x <= face.box.x + face.box.width &&
				y >= face.box.y &&
				y <= face.box.y + face.box.height
			) {
				selectedFaceIndex = i;
				onFaceClick?.(i);
				drawFaces();
				return;
			}
		}

		selectedFaceIndex = null;
		drawFaces();
	}

	async function addManualFaceAndReload(personId: string | null) {
		if (!pendingManualBox) return;
		const box = pendingManualBox;
		pendingManualBox = null;
		addingManual = true;
		try {
			// Optionally try to get a descriptor from the region (for future matching)
			let descriptor: number[] | undefined;
			if (modelsLoaded && image) {
				const detection = await FaceRecognitionService.detectFaceInRegion(image, box);
				if (detection?.descriptor) descriptor = Array.from(detection.descriptor);
			}
			const response = await fetch('/api/admin/face-recognition/add-manual-face', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					photoId,
					box,
					matchedPersonId: personId || undefined,
					descriptor,
				}),
			});
			if (response.ok) {
				onSuccess?.('Manual face added');
				onFaceDetected?.([]);
			} else {
				const err = await response.json();
				onError?.(err.error || 'Failed to add manual face');
			}
		} catch (error) {
			logger.error('Add manual face failed:', error);
			onError?.(handleError(error, 'Failed to add manual face'));
		} finally {
			addingManual = false;
		}
	}

	function cancelManualSelection() {
		pendingManualBox = null;
		drawFaces();
	}

	function handleImageLoad() {
		if (canvas && image) {
			drawFaces();
		}
	}
</script>

<div class="border rounded-lg p-4 bg-white">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold">Face Detection</h3>
		<div class="flex gap-2 flex-wrap">
			<button
				type="button"
				on:click={handleDetectFaces}
				disabled={isDetecting || !modelsLoaded}
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isDetecting ? 'Detecting...' : 'Detect Faces'}
			</button>
			<button
				type="button"
				on:click={() => { isManualMode = !isManualMode; pendingManualBox = null; drawFaces(); }}
				class="px-4 py-2 rounded border {isManualMode ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}"
			>
				{isManualMode ? 'Cancel manual' : 'Manual selection'}
			</button>
		</div>
	</div>
	{#if isManualMode}
		<p class="text-sm text-gray-600 mb-2">Draw a rectangle around a face, then choose a person to assign (or add without assigning).</p>
	{/if}

	{#if !modelsLoaded}
		<div class="text-sm text-gray-500 mb-4">Loading face recognition models...</div>
	{/if}

	<div class="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100" style="max-width: 100%;">
		<div class="relative inline-block max-w-full">
			<img
				bind:this={image}
				src={imageUrl}
				alt="Photo"
				class="max-w-full h-auto block"
				style="max-height: 80vh; {getPhotoRotationStyle({ rotation })}"
				on:load={handleImageLoad}
			/>
			<canvas
				bind:this={canvas}
				class="absolute top-0 left-0 {isManualMode ? 'cursor-crosshair' : 'cursor-pointer'}"
				style="pointer-events: auto;"
				on:mousedown={handleCanvasMouseDown}
				on:mousemove={handleCanvasMouseMove}
				on:mouseup={handleCanvasMouseUp}
				on:mouseleave={() => { if (isDrawing) { isDrawing = false; drawStart = null; currentRect = null; drawFaces(); } }}
				on:click={handleCanvasClick}
			></canvas>
		</div>
	</div>

	{#if faces.length > 0}
		<div class="mt-4 text-sm text-gray-600">
			Detected {faces.length} face{faces.length !== 1 ? 's' : ''}
		</div>
	{/if}

	{#if pendingManualBox}
		<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
			<p class="text-sm font-medium text-amber-900 mb-2">Assign this area to a person</p>
			<div class="flex flex-wrap items-center gap-2">
				<select
					class="rounded border border-gray-300 px-3 py-1.5 text-sm bg-white"
					on:change={(e) => {
						const id = (e.currentTarget as HTMLSelectElement).value;
						if (id) addManualFaceAndReload(id);
					}}
					disabled={addingManual}
				>
					<option value="">— Select person —</option>
					{#each people as person}
						<option value={person._id}>
							{getPersonName ? getPersonName(person._id) : (person.fullName || person.firstName || person._id)}
						</option>
					{/each}
				</select>
				<button
					type="button"
					on:click={() => addManualFaceAndReload(null)}
					disabled={addingManual}
					class="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50"
				>
					{addingManual ? 'Adding...' : 'Add without person'}
				</button>
				<button
					type="button"
					on:click={cancelManualSelection}
					disabled={addingManual}
					class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</div>
