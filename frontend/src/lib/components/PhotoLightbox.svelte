<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export interface LightboxPhoto {
		_id?: string;
		url?: string;
		thumbnailUrl?: string;
		title?: string | any; // Can be string or multi-language object
		takenAt?: string | Date;
		storage?: {
			url?: string;
			thumbnailPath?: string;
		};
		faceRecognition?: {
			faces?: Array<{
				box: { x: number; y: number; width: number; height: number };
				matchedPersonId?: string;
				confidence?: number;
			}>;
		};
		exif?: {
			make?: string;
			model?: string;
			serialNumber?: string;
			dateTime?: string | Date;
			dateTimeOriginal?: string | Date;
			dateTimeDigitized?: string | Date;
			offsetTime?: string;
			offsetTimeOriginal?: string;
			offsetTimeDigitized?: string;
			exposureTime?: string;
			fNumber?: number;
			iso?: number;
			focalLength?: number;
			exposureProgram?: string;
			exposureMode?: string;
			exposureBiasValue?: number;
			maxApertureValue?: number;
			shutterSpeedValue?: string;
			apertureValue?: string;
			whiteBalance?: string;
			meteringMode?: string;
			flash?: string;
			colorSpace?: string;
			customRendered?: string;
			sceneCaptureType?: string;
			xResolution?: number;
			yResolution?: number;
			resolutionUnit?: string;
			focalPlaneXResolution?: number;
			focalPlaneYResolution?: number;
			focalPlaneResolutionUnit?: string;
			lensInfo?: string;
			lensModel?: string;
			lensSerialNumber?: string;
			software?: string;
			copyright?: string;
			exifVersion?: string;
			gps?: {
				latitude?: number;
				longitude?: number;
				altitude?: number;
			};
			recommendedExposureIndex?: number;
			subsecTimeOriginal?: string;
			subsecTimeDigitized?: string;
			gpsLatitude?: number;
			gpsLongitude?: number;
		};
		metadata?: {
			width?: number;
			height?: number;
			fileSize?: number;
			format?: string;
		};
	}

	interface Props {
		photos: LightboxPhoto[];
		initialIndex?: number;
		startIndex?: number;
		isOpen?: boolean;
		autoPlay?: boolean;
		intervalMs?: number;
		onClose?: () => void;
		showExifData?: boolean; // Whether to show EXIF data (defaults to true if not specified)
	}

	let {
		photos,
		initialIndex,
		startIndex,
		isOpen = true,
		autoPlay = false,
		intervalMs = 4000,
		onClose,
		showExifData = true // Default to showing EXIF data if not specified
	}: Props = $props();

	// Support both initialIndex and startIndex for backward compatibility
	let actualIndex = startIndex ?? initialIndex ?? 0;

	let current = $state(initialIndex);
	let playing = $state(autoPlay);
	let showInfo = $state(false);
	let showFaces = $state(false);
	let faceData = $state<{
		faces: Array<{
			box: { x: number; y: number; width: number; height: number };
			matchedPersonId?: string;
			confidence?: number;
			personName?: string;
		}>;
		imageSize: { width: number; height: number };
	} | null>(null);

	let touchStart = $state<number | null>(null);
	let touchEnd = $state<number | null>(null);
	let timerRef: ReturnType<typeof setInterval> | null = null;
	let containerRef: HTMLDivElement;
	let imageRef: HTMLImageElement;
	let canvasRef: HTMLCanvasElement;

	// Update current when index changes
	$effect(() => {
		actualIndex = startIndex ?? initialIndex ?? 0;
		current = actualIndex;
	});

	// Fetch face data when photo changes
	$effect(() => {
		if (!isOpen) return;

		const photo = photos[current];
		if (!photo?._id) {
			const faces = photo?.faceRecognition?.faces;
			if (faces && Array.isArray(faces) && faces.length > 0) {
				faceData = {
					faces: faces.map((face: any) => ({
						box: face.box,
						matchedPersonId: face.matchedPersonId?.toString(),
						confidence: face.confidence
					})),
					imageSize: { width: 0, height: 0 }
				};
				return;
			}
			faceData = null;
			return;
		}

		const fetchFaceData = async () => {
			try {
				const response = await fetch(`/api/photos/${photo._id}`);
				if (response.ok) {
					const photoData = await response.json();
					if (photoData?.faceRecognition?.faces?.length > 0) {
						const facesWithNames = await Promise.all(
							photoData.faceRecognition.faces.map(async (face: any) => {
								if (face.matchedPersonId) {
									try {
										const personResponse = await fetch(`/api/people/${face.matchedPersonId}`);
										if (personResponse.ok) {
											const personData = await personResponse.json();
											const person = personData.success ? personData.data : personData;
											const name =
												person.fullName?.en ||
												person.fullName?.he ||
												person.firstName?.en ||
												person.firstName?.he ||
												'Unknown';
											return { ...face, personName: name };
										}
									} catch (err) {
										console.debug('Could not fetch person name:', err);
									}
								}
								return face;
							})
						);
						faceData = {
							faces: facesWithNames,
							imageSize: { width: 0, height: 0 }
						};
					} else {
						faceData = null;
					}
				}
			} catch (error) {
				console.error('Failed to fetch face data:', error);
				faceData = null;
			}
		};

		fetchFaceData();
	});

	// Draw faces on canvas (only matched faces)
	$effect(() => {
		if (!showFaces || matchedFaces.length === 0 || !imageRef || !canvasRef) return;

		const img = imageRef;
		const canvas = canvasRef;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const drawFaces = () => {
			if (!ctx || !img || !faceData) return;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const imgNaturalWidth = img.naturalWidth || faceData.imageSize.width;
			const imgNaturalHeight = img.naturalHeight || faceData.imageSize.height;

			if (!imgNaturalWidth || !imgNaturalHeight) return;

			const displayedWidth = img.offsetWidth;
			const displayedHeight = img.offsetHeight;
			const scaleX = displayedWidth / imgNaturalWidth;
			const scaleY = displayedHeight / imgNaturalHeight;

			// Only draw matched faces
			matchedFaces.forEach((face) => {
				const x = face.box.x * scaleX;
				const y = face.box.y * scaleY;
				const width = face.box.width * scaleX;
				const height = face.box.height * scaleY;

				ctx.strokeStyle = '#10b981'; // Green for matched faces
				ctx.lineWidth = 2;
				ctx.strokeRect(x, y, width, height);

				if (face.personName) {
					ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
					const labelText = face.personName;
					ctx.font = '14px sans-serif';
					const textMetrics = ctx.measureText(labelText);
					const labelWidth = textMetrics.width + 8;
					const labelHeight = 20;
					ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

					ctx.fillStyle = '#ffffff';
					ctx.fillText(labelText, x + 4, y - 6);
				}
			});
		};

		if (!img.complete) {
			img.onload = () => {
				canvas.width = img.offsetWidth;
				canvas.height = img.offsetHeight;
				drawFaces();
			};
		} else {
			canvas.width = img.offsetWidth;
			canvas.height = img.offsetHeight;
			drawFaces();
		}

		const handleResize = () => {
			if (img.complete) {
				canvas.width = img.offsetWidth;
				canvas.height = img.offsetHeight;
				drawFaces();
			}
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	// Keyboard handlers
	$effect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (onClose) onClose();
				dispatch('close');
			}
			if (e.key === 'ArrowRight') next();
			if (e.key === 'ArrowLeft') prev();
			if (e.key === ' ') {
				e.preventDefault();
				playing = !playing;
			}
			if (e.key.toLowerCase() === 'f') toggleFullscreen();
			if (e.key.toLowerCase() === 'i') showInfo = !showInfo;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	// Auto-play timer
	$effect(() => {
		if (!isOpen) return;
		if (playing) {
			if (timerRef) clearInterval(timerRef);
			timerRef = setInterval(() => {
				next();
			}, intervalMs);
		} else if (timerRef) {
			clearInterval(timerRef);
			timerRef = null;
		}
		return () => {
			if (timerRef) clearInterval(timerRef);
		};
	});

	function next() {
		current = (current + 1) % photos.length;
	}

	function prev() {
		current = (current - 1 + photos.length) % photos.length;
	}

	function handleTouchStart(e: TouchEvent) {
		touchEnd = null;
		touchStart = e.touches[0].clientX;
	}

	function handleTouchMove(e: TouchEvent) {
		touchEnd = e.touches[0].clientX;
	}

	function handleTouchEnd() {
		if (!touchStart || !touchEnd) return;

		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > 50;
		const isRightSwipe = distance < -50;

		if (isLeftSwipe) {
			next();
		} else if (isRightSwipe) {
			prev();
		}
	}

	async function toggleFullscreen() {
		if (!containerRef) return;
		const doc: any = document;
		const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
		try {
			if (!isFs) {
				await (containerRef.requestFullscreen?.() || (containerRef as any).webkitRequestFullscreen?.());
			} else {
				await (document.exitFullscreen?.() || (doc as any).webkitExitFullscreen?.());
			}
		} catch {}
	}

	function handleImageLoad() {
		if (faceData && canvasRef && imageRef) {
			canvasRef.width = imageRef.offsetWidth;
			canvasRef.height = imageRef.offsetHeight;
			faceData = {
				...faceData,
				imageSize: { width: imageRef.naturalWidth, height: imageRef.naturalHeight }
			};
		}
	}

	function formatDate(date: string | Date | undefined): string {
		if (!date) return 'Unknown';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	let photo = $derived(photos[current]);
	let photoUrl = $derived(photo?.url || photo?.storage?.url || photo?.storage?.thumbnailPath || '');
	let photoTitle = $derived(
		typeof photo?.title === 'string' 
			? photo.title 
			: photo?.title?.en || photo?.title?.he || ''
	);
	
	// Only show faces that are matched to a person (have matchedPersonId or personName)
	let matchedFaces = $derived(
		faceData && faceData.faces && Array.isArray(faceData.faces)
			? faceData.faces.filter((face: any) => face.matchedPersonId || face.personName)
			: []
	);
</script>

{#if isOpen}
	<div
		bind:this={containerRef}
		class="fixed inset-0 z-1000 bg-black/95 text-white flex flex-col"
		role="dialog"
		aria-modal="true"
	>
		<!-- Top bar -->
		<div class="flex items-center justify-between px-4 py-2 text-sm">
			<div class="opacity-80">{current + 1} / {photos.length}</div>
			<div class="flex items-center gap-2">
				{#if matchedFaces.length > 0}
					<button
						onclick={() => (showFaces = !showFaces)}
						class="px-2 py-1 rounded hover:bg-white/10"
						aria-label="Toggle Face Detection"
						title="{showFaces ? 'Hide' : 'Show'} detected people"
					>
						{showFaces ? '👤' : '👥'}
					</button>
				{/if}
				<button
					onclick={toggleFullscreen}
					class="px-2 py-1 rounded hover:bg-white/10"
					aria-label="Toggle Fullscreen"
				>
					⛶
				</button>
				<button
					onclick={() => (playing = !playing)}
					class="px-2 py-1 rounded hover:bg-white/10"
					aria-label="Play/Pause"
				>
					{playing ? 'Pause' : 'Play'}
				</button>
				<button
					onclick={() => (showInfo = !showInfo)}
					class="px-2 py-1 rounded hover:bg-white/10"
					aria-label="Toggle Info"
				>
					{showInfo ? '📋' : 'ℹ️'}
				</button>
				<button
					onclick={() => {
						if (onClose) onClose();
						dispatch('close');
					}}
					class="px-2 py-1 rounded hover:bg-white/10"
					aria-label="Close"
				>
					✕
				</button>
			</div>
		</div>

		<!-- Content -->
		<div
			class="flex-1 flex items-center justify-center select-none"
			ontouchstart={handleTouchStart}
			ontouchmove={handleTouchMove}
			ontouchend={handleTouchEnd}
		>
			<button
				onclick={prev}
				class="px-6 py-4 mx-4 rounded-lg hover:bg-white/20 transition-all duration-200 text-4xl font-bold"
				aria-label="Previous"
			>
				‹
			</button>
			<div class="max-h-[85vh] max-w-[92vw] relative flex items-center">
				<div class="relative flex-shrink-0">
					<img
						bind:this={imageRef}
						src={photoUrl}
						alt={photoTitle}
						class="object-contain max-h-[85vh] max-w-[92vw]"
						draggable="false"
						onload={handleImageLoad}
					/>
					{#if showFaces && matchedFaces.length > 0}
						<canvas
							bind:this={canvasRef}
							class="absolute top-0 left-0 pointer-events-none"
							style="max-width: 100%; max-height: 100%;"
						/>
					{/if}
				</div>

				<!-- Info Overlay -->
				{#if showInfo}
					<div
						class="ml-4 bg-black/90 text-white p-4 rounded-lg max-w-[400px] max-h-[85vh] overflow-y-auto z-10 flex-shrink-0"
					>
						<div class="space-y-3">
							<!-- Photo Title -->
							{#if photoTitle}
								<div class="text-lg font-semibold border-b border-white/20 pb-2">{photoTitle}</div>
							{/if}

							<!-- Basic Info -->
							<div class="grid grid-cols-2 gap-2 text-sm">
								<div class="opacity-60">Photo {current + 1} of {photos.length}</div>
								{#if photo.metadata?.width && photo.metadata?.height}
									<div class="opacity-60">
										{photo.metadata.width} × {photo.metadata.height}
									</div>
								{/if}
							</div>

							<!-- Date/Time -->
							{#if photo.takenAt || photo.exif?.dateTime || photo.exif?.dateTimeOriginal}
								<div class="text-sm">
									<span class="opacity-60">📅 Taken:</span>
									{formatDate(photo.takenAt || photo.exif?.dateTime || photo.exif?.dateTimeOriginal)}
								</div>
							{/if}

							<!-- EXIF Data -->
							{#if showExifData && photo.exif}
								<div class="space-y-3 border-t border-white/20 pt-2">
									<div class="text-sm font-semibold opacity-80">EXIF Data</div>

									<!-- Camera Information -->
									{#if photo.exif.make || photo.exif.model || photo.exif.serialNumber}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Camera</div>
											{#if photo.exif.make}
												<div class="text-sm"><span class="opacity-60">Make:</span> {photo.exif.make}</div>
											{/if}
											{#if photo.exif.model}
												<div class="text-sm"><span class="opacity-60">Model:</span> {photo.exif.model}</div>
											{/if}
											{#if photo.exif.serialNumber}
												<div class="text-sm">
													<span class="opacity-60">Serial:</span> {photo.exif.serialNumber}
												</div>
											{/if}
										</div>
									{/if}

									<!-- Lens Information -->
									{#if photo.exif.lensModel || photo.exif.lensInfo || photo.exif.lensSerialNumber}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Lens</div>
											{#if photo.exif.lensModel}
												<div class="text-sm">
													<span class="opacity-60">Model:</span> {photo.exif.lensModel}
												</div>
											{/if}
											{#if photo.exif.lensInfo}
												<div class="text-sm"><span class="opacity-60">Info:</span> {photo.exif.lensInfo}</div>
											{/if}
											{#if photo.exif.lensSerialNumber}
												<div class="text-sm">
													<span class="opacity-60">Serial:</span> {photo.exif.lensSerialNumber}
												</div>
											{/if}
										</div>
									{/if}

									<!-- Exposure Settings -->
									{#if photo.exif.fNumber ||
										photo.exif.exposureTime ||
										photo.exif.iso ||
										photo.exif.focalLength ||
										photo.exif.exposureProgram ||
										photo.exif.exposureMode}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Exposure</div>
											<div class="grid grid-cols-2 gap-2 text-sm">
												{#if photo.exif.fNumber}
													<div><span class="opacity-60">f/</span>{photo.exif.fNumber}</div>
												{/if}
												{#if photo.exif.exposureTime}
													<div><span class="opacity-60">1/</span>{photo.exif.exposureTime}</div>
												{/if}
												{#if photo.exif.iso}
													<div><span class="opacity-60">ISO</span> {photo.exif.iso}</div>
												{/if}
												{#if photo.exif.focalLength}
													<div><span class="opacity-60">{photo.exif.focalLength}mm</span></div>
												{/if}
											</div>
											{#if photo.exif.exposureProgram}
												<div class="text-sm">
													<span class="opacity-60">Program:</span> {photo.exif.exposureProgram}
												</div>
											{/if}
											{#if photo.exif.exposureMode}
												<div class="text-sm">
													<span class="opacity-60">Mode:</span> {photo.exif.exposureMode}
												</div>
											{/if}
											{#if photo.exif.exposureBiasValue}
												<div class="text-sm">
													<span class="opacity-60">Bias:</span> {photo.exif.exposureBiasValue} EV
												</div>
											{/if}
										</div>
									{/if}

									<!-- Image Quality Settings -->
									{#if photo.exif.whiteBalance ||
										photo.exif.meteringMode ||
										photo.exif.flash ||
										photo.exif.colorSpace}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Image Quality</div>
											{#if photo.exif.whiteBalance}
												<div class="text-sm">
													<span class="opacity-60">White Balance:</span> {photo.exif.whiteBalance}
												</div>
											{/if}
											{#if photo.exif.meteringMode}
												<div class="text-sm">
													<span class="opacity-60">Metering:</span> {photo.exif.meteringMode}
												</div>
											{/if}
											{#if photo.exif.flash}
												<div class="text-sm">
													<span class="opacity-60">Flash:</span> {photo.exif.flash}
												</div>
											{/if}
											{#if photo.exif.colorSpace}
												<div class="text-sm">
													<span class="opacity-60">Color Space:</span> {photo.exif.colorSpace}
												</div>
											{/if}
											{#if photo.exif.sceneCaptureType}
												<div class="text-sm">
													<span class="opacity-60">Scene:</span> {photo.exif.sceneCaptureType}
												</div>
											{/if}
										</div>
									{/if}

									<!-- GPS Location -->
									{#if (photo.exif.gps?.latitude && photo.exif.gps?.longitude) ||
										(photo.exif.gpsLatitude && photo.exif.gpsLongitude)}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Location</div>
											<div class="text-sm">
												<span class="opacity-60">📍 GPS:</span>
												{#if photo.exif.gps?.latitude && photo.exif.gps?.longitude}
													{photo.exif.gps.latitude.toFixed(6)}, {photo.exif.gps.longitude.toFixed(6)}
												{:else}
													{photo.exif.gpsLatitude?.toFixed(6)}, {photo.exif.gpsLongitude?.toFixed(6)}
												{/if}
												{#if photo.exif.gps?.altitude}
													({photo.exif.gps.altitude}m)
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Face Recognition (only show matched people) -->
							{#if matchedFaces.length > 0}
								<div class="space-y-1 border-t border-white/20 pt-2">
									<div class="text-xs font-medium opacity-70">Detected People</div>
									<div class="space-y-1">
										{#each matchedFaces as face, idx}
											<div class="text-sm">
												{#if face.personName}
													<span class="text-green-400">✓ {face.personName}</span>
												{:else if face.matchedPersonId}
													<span class="text-green-400">✓ Person (ID: {face.matchedPersonId})</span>
												{:else}
													<span class="opacity-60">Matched Person {idx + 1}</span>
												{/if}
												{#if face.confidence && face.confidence < 1.0}
													<span class="opacity-60 ml-2">
														({(face.confidence * 100).toFixed(0)}%)
													</span>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- File Info -->
							{#if photo.metadata}
								<div class="space-y-1 border-t border-white/20 pt-2 text-xs opacity-60">
									{#if photo.metadata.format}
										<div>Format: {photo.metadata.format.toUpperCase()}</div>
									{/if}
									{#if photo.metadata.fileSize}
										<div>Size: {(photo.metadata.fileSize / 1024 / 1024).toFixed(1)} MB</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
			<button
				onclick={next}
				class="px-6 py-4 mx-4 rounded-lg hover:bg-white/20 transition-all duration-200 text-4xl font-bold"
				aria-label="Next"
			>
				›
			</button>
		</div>

		<!-- Hints -->
		<div class="px-4 py-2 text-xs text-white/60">
			Arrow keys to navigate • Space to play/pause • F for fullscreen • I for info • Esc to close • Swipe
			left/right on mobile
		</div>
	</div>
{/if}
