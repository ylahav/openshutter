<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { filterExifByDisplayFields } from '$lib/constants/exif-fields';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';

	const dispatch = createEventDispatcher();

	export interface LightboxPhoto {
		_id?: string;
		url?: string;
		thumbnailUrl?: string;
		title?: string | any; // Can be string or multi-language object
		description?: string | any; // Can be string or multi-language HTML object
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
	let selectedFaceIndex = $state<number | null>(null);
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
	let imageLoading = $state(true);

	// Update current when index changes
	$effect(() => {
		actualIndex = startIndex ?? initialIndex ?? 0;
		current = actualIndex;
	});

	// Show loading when photo index changes (user switched to another photo)
	$effect(() => {
		if (isOpen && photos.length > 0) {
			// React to current index change
			const _ = current;
			imageLoading = true;
		}
	});

	// Fetch face data when photo changes
	$effect(() => {
		if (!isOpen || !photos.length) return;

		selectedFaceIndex = null;

		const idx = typeof current === 'number' && current >= 0 ? current : 0;
		const photo = photos[idx];
		const sourceFaces = photo?.faceRecognition?.faces;
		const hasFacesFromPhoto = sourceFaces && Array.isArray(sourceFaces) && sourceFaces.length > 0;

		const buildFaceDataWithNames = async (faces: Array<{ box: { x: number; y: number; width: number; height: number }; matchedPersonId?: string; confidence?: number }>) => {
			const facesWithNames = await Promise.all(
				faces.map(async (face: { box: { x: number; y: number; width: number; height: number }; matchedPersonId?: string; confidence?: number }) => {
					const pid = face.matchedPersonId != null ? String(face.matchedPersonId) : undefined;
					const baseFace = {
						box: face.box,
						matchedPersonId: pid,
						confidence: face.confidence
					};
					if (pid) {
						const personName = await fetchPersonName(pid);
						return { ...baseFace, personName: personName ?? undefined };
					}
					return baseFace;
				})
			);
			faceData = {
				faces: facesWithNames,
				imageSize: { width: 0, height: 0 }
			};
		};

		if (hasFacesFromPhoto) {
			// Use face data from the photo we already have (e.g. from album)
			buildFaceDataWithNames(sourceFaces);
			return;
		}

		if (!photo?._id) {
			faceData = null;
			return;
		}

		// Fetch full photo to get faceRecognition if not on photo
		const fetchFaceData = async () => {
			try {
				const response = await fetch(`/api/photos/${photo._id}`, { credentials: 'include' });
				if (response.ok) {
					const photoData = await response.json();
					const faces = photoData?.faceRecognition?.faces;
					if (faces && Array.isArray(faces) && faces.length > 0) {
						await buildFaceDataWithNames(faces);
					} else {
						faceData = null;
					}
				} else {
					faceData = null;
				}
			} catch (error) {
				logger.error('Failed to fetch face data:', error);
				faceData = null;
			}
		};

		fetchFaceData();
	});

	// Draw faces on canvas (only matched faces)
	$effect(() => {
		if (!showFaces || matchedFaces.length === 0 || !imageRef || !canvasRef) return;
		
		// React to selectedFaceIndex changes
		selectedFaceIndex;

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
			matchedFaces.forEach((face, index) => {
				const x = face.box.x * scaleX;
				const y = face.box.y * scaleY;
				const width = face.box.width * scaleX;
				const height = face.box.height * scaleY;

				// Use blue border for selected face, green for others
				const isSelected = selectedFaceIndex === index;
				ctx.strokeStyle = isSelected ? '#3b82f6' : '#10b981'; // Blue when selected, green otherwise
				ctx.lineWidth = isSelected ? 3 : 2;
				ctx.strokeRect(x, y, width, height);

				// Show person name above or below the box for every face that has a name
				const labelText = face.personName || (face.matchedPersonId ? `Person ${String(face.matchedPersonId).slice(-4)}` : null);
				if (labelText) {
					ctx.font = 'bold 14px sans-serif';
					const textMetrics = ctx.measureText(labelText);
					const padding = 6;
					const labelWidth = textMetrics.width + padding * 2;
					const labelHeight = 20;
					const labelX = Math.max(0, Math.min(x, canvas.width - labelWidth));
					// Prefer above the box; if not enough space, put below (clamp to canvas)
					const spaceAbove = y;
					const putAbove = spaceAbove >= labelHeight + 2;
					let labelY = putAbove ? y - labelHeight - 2 : y + height + 2;
					if (!putAbove && labelY + labelHeight > canvas.height) {
						labelY = canvas.height - labelHeight - 2;
					}
					labelY = Math.max(0, labelY);

					ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.9)' : 'rgba(0, 0, 0, 0.8)';
					ctx.beginPath();
					if (ctx.roundRect) {
						ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
					} else {
						ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
					}
					ctx.fill();

					ctx.fillStyle = '#ffffff';
					ctx.fillText(labelText, labelX + padding, labelY + 14);
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
		imageLoading = false;
		if (faceData && canvasRef && imageRef) {
			canvasRef.width = imageRef.offsetWidth;
			canvasRef.height = imageRef.offsetHeight;
			faceData = {
				...faceData,
				imageSize: { width: imageRef.naturalWidth, height: imageRef.naturalHeight }
			};
		}
	}

	async function fetchPersonName(personId: string): Promise<string | null> {
		const id = String(personId).trim();
		if (!id) return null;
		const opts = { credentials: 'include' as RequestCredentials };
		try {
			let personResponse = await fetch(`/api/people/${id}`, opts);
			if (!personResponse.ok) {
				personResponse = await fetch(`/api/admin/people/${id}`, opts);
			}
			if (personResponse.ok) {
				const personData = await personResponse.json();
				let person = personData.success ? personData.data : personData;
				if (Array.isArray(person) && person.length > 0) {
					person = person.find((p: any) => String(p._id || '') === id) || person[0];
				}
				const extractName = (nameObj: any): string | null => {
					if (!nameObj) return null;
					if (typeof nameObj === 'string') return nameObj.trim() || null;
					if (typeof nameObj === 'object') {
						return nameObj.en || nameObj.he || (Object.values(nameObj).find((v: any) => typeof v === 'string' && (v as string).trim() !== '') as string) || null;
					}
					return null;
				};
				const name = extractName(person?.fullName) || extractName(person?.firstName);
				return name || null;
			}
		} catch (err) {
			logger.debug('Could not fetch person name:', err);
		}
		return null;
	}

	async function handleCanvasClick(e: MouseEvent) {
		if (!canvasRef || !imageRef || !faceData || matchedFaces.length === 0) return;

		const canvas = canvasRef;
		const img = imageRef;
		const rect = canvas.getBoundingClientRect();
		
		// Get click coordinates relative to canvas
		const clickX = e.clientX - rect.left;
		const clickY = e.clientY - rect.top;

		// Calculate scale factors
		const imgNaturalWidth = img.naturalWidth || faceData.imageSize.width;
		const imgNaturalHeight = img.naturalHeight || faceData.imageSize.height;
		if (!imgNaturalWidth || !imgNaturalHeight) return;

		const displayedWidth = img.offsetWidth;
		const displayedHeight = img.offsetHeight;
		const scaleX = displayedWidth / imgNaturalWidth;
		const scaleY = displayedHeight / imgNaturalHeight;

		// Convert click coordinates to natural image coordinates
		const naturalX = clickX / scaleX;
		const naturalY = clickY / scaleY;

		// Check if click is on any face (check in reverse order to get topmost face)
		for (let i = matchedFaces.length - 1; i >= 0; i--) {
			const face = matchedFaces[i];
			const box = face.box;
			if (
				naturalX >= box.x &&
				naturalX <= box.x + box.width &&
				naturalY >= box.y &&
				naturalY <= box.y + box.height
			) {
				// If face has matchedPersonId but no personName, fetch it
				if (face.matchedPersonId && !face.personName && faceData) {
					const personName = await fetchPersonName(face.matchedPersonId);
					if (personName) {
						// Find the corresponding face in faceData.faces by matching box coordinates
						const updatedFaces = faceData.faces.map((f) => {
							// Match by box coordinates (within small tolerance) or matchedPersonId
							const boxMatch = Math.abs(f.box.x - box.x) < 1 && 
							                 Math.abs(f.box.y - box.y) < 1 &&
							                 Math.abs(f.box.width - box.width) < 1 &&
							                 Math.abs(f.box.height - box.height) < 1;
							const idMatch = f.matchedPersonId === face.matchedPersonId;
							
							if ((boxMatch || idMatch) && f.matchedPersonId === face.matchedPersonId) {
								return { ...f, personName };
							}
							return f;
						});
						faceData = {
							...faceData,
							faces: updatedFaces
						};
					}
				}
				
				// Toggle selection: if same face clicked, deselect; otherwise select new face
				selectedFaceIndex = selectedFaceIndex === i ? null : i;
				// The $effect will automatically redraw when selectedFaceIndex changes
				return;
			}
		}

		// Click was not on any face, deselect
		selectedFaceIndex = null;
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
	let photoDescription = $derived(
		photo?.description
			? typeof photo.description === 'string'
				? photo.description
				: MultiLangUtils.getHTMLValue(photo.description, $currentLanguage) || ''
			: ''
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
				<div class="relative shrink-0">
					<!-- Loading indicator when switching photos -->
					{#if imageLoading}
						<div
							class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 min-w-[200px] min-h-[200px] rounded-lg"
							aria-live="polite"
							aria-busy="true"
						>
							<div class="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white mb-3"></div>
							<span class="text-white/90 text-sm">Loading photo…</span>
						</div>
					{/if}
					<img
						bind:this={imageRef}
						src={photoUrl}
						alt={photoTitle}
						class="object-contain max-h-[85vh] max-w-[92vw] transition-opacity duration-200 {imageLoading ? 'opacity-30' : 'opacity-100'}"
						draggable="false"
						onload={handleImageLoad}
						onerror={() => (imageLoading = false)}
					/>
					{#if showFaces && matchedFaces.length > 0}
						<canvas
							bind:this={canvasRef}
							class="absolute top-0 left-0 cursor-pointer"
							style="max-width: 100%; max-height: 100%;"
							onclick={handleCanvasClick}
						/>
					{/if}
				</div>

				<!-- Info Overlay -->
				{#if showInfo}
					<div
						class="ml-4 bg-black/90 text-white p-4 rounded-lg max-w-[400px] max-h-[85vh] overflow-y-auto z-10 shrink-0"
					>
						<div class="space-y-3">
							<!-- Photo Title -->
							{#if photoTitle}
								<div class="text-lg font-semibold border-b border-white/20 pb-2">{photoTitle}</div>
							{/if}

							<!-- Photo Description -->
							{#if photoDescription}
								<div class="text-sm text-white/90 prose prose-invert prose-sm max-w-none" style="--tw-prose-body: rgba(255, 255, 255, 0.9);">
									{@html photoDescription}
								</div>
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

							<!-- EXIF Data (filtered by site config displayFields when set) -->
							{#if showExifData && photo.exif}
								{@const displayExif = filterExifByDisplayFields(photo.exif, $siteConfigData?.exifMetadata?.displayFields)}
								{#if displayExif}
								<div class="space-y-3 border-t border-white/20 pt-2">
									<div class="text-sm font-semibold opacity-80">EXIF Data</div>

									<!-- Camera Information -->
									{#if displayExif.make || displayExif.model || displayExif.serialNumber}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Camera</div>
											{#if displayExif.make}
												<div class="text-sm"><span class="opacity-60">Make:</span> {displayExif.make}</div>
											{/if}
											{#if displayExif.model}
												<div class="text-sm"><span class="opacity-60">Model:</span> {displayExif.model}</div>
											{/if}
											{#if displayExif.serialNumber}
												<div class="text-sm">
													<span class="opacity-60">Serial:</span> {displayExif.serialNumber}
												</div>
											{/if}
										</div>
									{/if}

									<!-- Lens Information -->
									{#if displayExif.lensModel || displayExif.lensInfo || displayExif.lensSerialNumber}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Lens</div>
											{#if displayExif.lensModel}
												<div class="text-sm">
													<span class="opacity-60">Model:</span> {displayExif.lensModel}
												</div>
											{/if}
											{#if displayExif.lensInfo}
												<div class="text-sm"><span class="opacity-60">Info:</span> {displayExif.lensInfo}</div>
											{/if}
											{#if displayExif.lensSerialNumber}
												<div class="text-sm">
													<span class="opacity-60">Serial:</span> {displayExif.lensSerialNumber}
												</div>
											{/if}
										</div>
									{/if}

									<!-- Exposure Settings -->
									{#if displayExif.fNumber ||
										displayExif.exposureTime ||
										displayExif.iso ||
										displayExif.focalLength ||
										displayExif.exposureProgram ||
										displayExif.exposureMode}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Exposure</div>
											<div class="grid grid-cols-2 gap-2 text-sm">
												{#if displayExif.fNumber}
													<div><span class="opacity-60">f/</span>{displayExif.fNumber}</div>
												{/if}
												{#if displayExif.exposureTime}
													<div><span class="opacity-60">1/</span>{displayExif.exposureTime}</div>
												{/if}
												{#if displayExif.iso}
													<div><span class="opacity-60">ISO</span> {displayExif.iso}</div>
												{/if}
												{#if displayExif.focalLength}
													<div><span class="opacity-60">{displayExif.focalLength}mm</span></div>
												{/if}
											</div>
											{#if displayExif.exposureProgram}
												<div class="text-sm">
													<span class="opacity-60">Program:</span> {displayExif.exposureProgram}
												</div>
											{/if}
											{#if displayExif.exposureMode}
												<div class="text-sm">
													<span class="opacity-60">Mode:</span> {displayExif.exposureMode}
												</div>
											{/if}
											{#if displayExif.exposureBiasValue}
												<div class="text-sm">
													<span class="opacity-60">Bias:</span> {displayExif.exposureBiasValue} EV
												</div>
											{/if}
										</div>
									{/if}

									<!-- Image Quality Settings -->
									{#if displayExif.whiteBalance ||
										displayExif.meteringMode ||
										displayExif.flash ||
										displayExif.colorSpace}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Image Quality</div>
											{#if displayExif.whiteBalance}
												<div class="text-sm">
													<span class="opacity-60">White Balance:</span> {displayExif.whiteBalance}
												</div>
											{/if}
											{#if displayExif.meteringMode}
												<div class="text-sm">
													<span class="opacity-60">Metering:</span> {displayExif.meteringMode}
												</div>
											{/if}
											{#if displayExif.flash}
												<div class="text-sm">
													<span class="opacity-60">Flash:</span> {displayExif.flash}
												</div>
											{/if}
											{#if displayExif.colorSpace}
												<div class="text-sm">
													<span class="opacity-60">Color Space:</span> {displayExif.colorSpace}
												</div>
											{/if}
											{#if displayExif.sceneCaptureType}
												<div class="text-sm">
													<span class="opacity-60">Scene:</span> {displayExif.sceneCaptureType}
												</div>
											{/if}
										</div>
									{/if}

									<!-- GPS Location -->
									{#if (displayExif.gps && typeof displayExif.gps === 'object' && (displayExif.gps as { latitude?: number; longitude?: number }).latitude != null && (displayExif.gps as { longitude?: number }).longitude != null) ||
										(displayExif.gpsLatitude != null && displayExif.gpsLongitude != null)}
										{@const gps = displayExif.gps as { latitude?: number; longitude?: number; altitude?: number } | undefined}
										<div class="space-y-1">
											<div class="text-xs font-medium opacity-70">Location</div>
											<div class="text-sm">
												<span class="opacity-60">📍 GPS:</span>
												{#if gps?.latitude != null && gps?.longitude != null}
													{gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
												{:else}
													{Number(displayExif.gpsLatitude).toFixed(6)}, {Number(displayExif.gpsLongitude).toFixed(6)}
												{/if}
												{#if gps?.altitude != null}
													({gps.altitude}m)
												{/if}
											</div>
										</div>
									{/if}
								</div>
								{/if}
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
