<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { FaceRecognitionService, type FaceDetection } from '../../services/face-recognition';

	export let imageUrl: string;
	export let photoId: string;
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

	let isDetecting = false;
	let faces: FaceDetection[] = [];
	let modelsLoaded = false;
	let isManualMode = false;
	let isDrawing = false;
	let drawStart: { x: number; y: number } | null = null;
	let currentRect: { x: number; y: number; width: number; height: number } | null = null;
	let selectedFaceIndex: number | null = null;
	let faceDescriptors = new Map<number, number[]>();
	let manualFaces = new Set<number>();
	let canvas: HTMLCanvasElement;
	let image: HTMLImageElement;
	let overlayCanvas: HTMLCanvasElement;

	onMount(async () => {
		if (typeof window === 'undefined') return;
		
		try {
			await FaceRecognitionService.loadModels();
			modelsLoaded = true;
		} catch (error) {
			console.error('Failed to load face detection models:', error);
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

		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;

		ctx.drawImage(image, 0, 0);

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

			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = isSelected ? 3 : 2;
			ctx.strokeRect(box.x, box.y, box.width, box.height);

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
					ctx.arc(landmark.x, landmark.y, 3, 0, 2 * Math.PI);
					ctx.fill();
				});
			}

			ctx.fillStyle = strokeColor;
			ctx.font = '16px Arial';
			const label = `Face ${index + 1}${isManual ? ' (Manual)' : ''}`;
			ctx.fillText(label, box.x, box.y - 5);
		});
	}

	$: if (faces.length > 0 && image?.complete) {
		drawFaces();
	}

	async function handleDetectFaces() {
		if (!image || !modelsLoaded) {
			onError?.('Image not loaded or models not ready');
			return;
		}

		isDetecting = true;
		try {
			let detections = await FaceRecognitionService.detectFaces(image);
			if (detections.length === 0) {
				const lowThresholdDetections = await FaceRecognitionService.detectFaces(image, {
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
			const response = await fetch('/api/admin/face-detection/detect', {
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
			console.error('Face detection failed:', error);
			onError?.(error instanceof Error ? error.message : 'Face detection failed');
		} finally {
			isDetecting = false;
		}
	}

	function handleCanvasClick(e: MouseEvent) {
		if (!canvas || !image) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = image.naturalWidth / rect.width;
		const scaleY = image.naturalHeight / rect.height;

		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		// Check if clicking on a face
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

	function handleImageLoad() {
		if (canvas && image) {
			drawFaces();
		}
	}
</script>

<div class="border rounded-lg p-4 bg-white">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold">Face Detection</h3>
		<div class="flex gap-2">
			<button
				type="button"
				on:click={handleDetectFaces}
				disabled={isDetecting || !modelsLoaded}
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isDetecting ? 'Detecting...' : 'Detect Faces'}
			</button>
		</div>
	</div>

	{#if !modelsLoaded}
		<div class="text-sm text-gray-500 mb-4">Loading face recognition models...</div>
	{/if}

	<div class="relative">
		<img
			bind:this={image}
			src={imageUrl}
			alt="Photo"
			class="max-w-full"
			on:load={handleImageLoad}
		/>
		<canvas
			bind:this={canvas}
			class="absolute top-0 left-0 cursor-pointer"
			on:click={handleCanvasClick}
		></canvas>
	</div>

	{#if faces.length > 0}
		<div class="mt-4 text-sm text-gray-600">
			Detected {faces.length} face{faces.length !== 1 ? 's' : ''}
		</div>
	{/if}
</div>
