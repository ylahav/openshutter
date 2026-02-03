<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	export let imageUrl: string;
	export let onCrop: (crop: { x: number; y: number; width: number; height: number }) => Promise<void>;
	export let onCancel: () => void;

	let canvas: HTMLCanvasElement;
	let image: HTMLImageElement | null = null;
	let container: HTMLDivElement;
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let cropX = 0;
	let cropY = 0;
	let cropWidth = 0;
	let cropHeight = 0;
	let imageWidth = 0;
	let imageHeight = 0;
	let scale = 1;
	let offsetX = 0;
	let offsetY = 0;
	let cropping = false;
	let resizeMode: 'none' | 'nw' | 'ne' | 'sw' | 'se' | 'move' = 'none';

	function loadImage() {
		if (!browser || !imageUrl) return;

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			image = img;
			imageWidth = img.width;
			imageHeight = img.height;
			
			// Calculate scale to fit container
			if (container && canvas) {
				// Ensure canvas matches container size
				const containerWidth = container.clientWidth;
				const containerHeight = container.clientHeight - 80; // Account for controls
				
				// Update canvas size to match container
				canvas.width = containerWidth;
				canvas.height = containerHeight;
				
				const availableWidth = containerWidth - 40; // padding
				const availableHeight = containerHeight - 40;
				const scaleX = availableWidth / imageWidth;
				const scaleY = availableHeight / imageHeight;
				scale = Math.min(scaleX, scaleY, 1); // Don't scale up
				
				// Center image
				const scaledWidth = imageWidth * scale;
				const scaledHeight = imageHeight * scale;
				offsetX = (availableWidth - scaledWidth) / 2 + 20;
				offsetY = (availableHeight - scaledHeight) / 2 + 20;
				
				// Initialize crop to full image
				cropX = offsetX;
				cropY = offsetY;
				cropWidth = scaledWidth;
				cropHeight = scaledHeight;
				
				draw();
			}
		};
		img.onerror = () => {
			console.error('Failed to load image');
		};
		img.src = imageUrl;
	}

	function draw() {
		if (!canvas || !image) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw image
		ctx.drawImage(image, offsetX, offsetY, imageWidth * scale, imageHeight * scale);

		// Draw semi-transparent overlay (dimmed area shows the full photo through)
		ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		// Clear the crop rectangle then draw the image into it so the crop area shows the photo (not transparent)
		ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
		const srcX = (cropX - offsetX) / scale;
		const srcY = (cropY - offsetY) / scale;
		const srcW = cropWidth / scale;
		const srcH = cropHeight / scale;
		ctx.drawImage(image, srcX, srcY, srcW, srcH, cropX, cropY, cropWidth, cropHeight);

		// Draw crop border
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 2;
		ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

		// Draw corner handles
		const handleSize = 10;
		ctx.fillStyle = '#fff';
		ctx.fillRect(cropX - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize);
		ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY - handleSize / 2, handleSize, handleSize);
		ctx.fillRect(cropX - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize);
		ctx.fillRect(cropX + cropWidth - handleSize / 2, cropY + cropHeight - handleSize / 2, handleSize, handleSize);
	}

	function getMousePos(e: MouseEvent | TouchEvent): { x: number; y: number } {
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		return {
			x: clientX - rect.left,
			y: clientY - rect.top
		};
	}

	function handleStart(e: MouseEvent | TouchEvent) {
		if (!image) return;
		e.preventDefault();
		const pos = getMousePos(e);
		resizeMode = getResizeMode(pos);
		if (resizeMode === 'none') return; // Don't start dragging if not on crop area
		isDragging = true;
		startX = pos.x;
		startY = pos.y;
		cropping = true;
	}

	function getResizeMode(pos: { x: number; y: number }): 'none' | 'nw' | 'ne' | 'sw' | 'se' | 'move' {
		const handleSize = 20;
		const isNearNW = Math.abs(pos.x - cropX) < handleSize && Math.abs(pos.y - cropY) < handleSize;
		const isNearNE = Math.abs(pos.x - (cropX + cropWidth)) < handleSize && Math.abs(pos.y - cropY) < handleSize;
		const isNearSW = Math.abs(pos.x - cropX) < handleSize && Math.abs(pos.y - (cropY + cropHeight)) < handleSize;
		const isNearSE = Math.abs(pos.x - (cropX + cropWidth)) < handleSize && Math.abs(pos.y - (cropY + cropHeight)) < handleSize;
		const isInCropArea = pos.x >= cropX && pos.x <= cropX + cropWidth && pos.y >= cropY && pos.y <= cropY + cropHeight;

		if (isNearNW) return 'nw';
		if (isNearNE) return 'ne';
		if (isNearSW) return 'sw';
		if (isNearSE) return 'se';
		if (isInCropArea) return 'move';
		return 'none';
	}

	function handleMove(e: MouseEvent | TouchEvent) {
		if (!isDragging || !image) return;
		e.preventDefault();
		const pos = getMousePos(e);
		const dx = pos.x - startX;
		const dy = pos.y - startY;

		if (resizeMode === 'move') {
			// Move crop area
			const newX = Math.max(offsetX, Math.min(offsetX + imageWidth * scale - cropWidth, cropX + dx));
			const newY = Math.max(offsetY, Math.min(offsetY + imageHeight * scale - cropHeight, cropY + dy));
			cropX = newX;
			cropY = newY;
		} else if (resizeMode === 'nw') {
			// Resize from northwest corner
			cropX = Math.max(offsetX, cropX + dx);
			cropY = Math.max(offsetY, cropY + dy);
			cropWidth = Math.max(50, cropWidth - dx);
			cropHeight = Math.max(50, cropHeight - dy);
		} else if (resizeMode === 'ne') {
			// Resize from northeast corner
			cropY = Math.max(offsetY, cropY + dy);
			cropWidth = Math.max(50, cropWidth + dx);
			cropHeight = Math.max(50, cropHeight - dy);
		} else if (resizeMode === 'sw') {
			// Resize from southwest corner
			cropX = Math.max(offsetX, cropX + dx);
			cropWidth = Math.max(50, cropWidth - dx);
			cropHeight = Math.max(50, cropHeight + dy);
		} else if (resizeMode === 'se') {
			// Resize from southeast corner
			cropWidth = Math.max(50, cropWidth + dx);
			cropHeight = Math.max(50, cropHeight + dy);
		}

		// Constrain crop to image bounds
		cropX = Math.max(offsetX, Math.min(offsetX + imageWidth * scale - cropWidth, cropX));
		cropY = Math.max(offsetY, Math.min(offsetY + imageHeight * scale - cropHeight, cropY));
		cropWidth = Math.max(50, Math.min(imageWidth * scale - (cropX - offsetX), cropWidth));
		cropHeight = Math.max(50, Math.min(imageHeight * scale - (cropY - offsetY), cropHeight));

		startX = pos.x;
		startY = pos.y;
		draw();
	}

	function handleEnd() {
		isDragging = false;
		cropping = false;
		resizeMode = 'none';
	}

	function handleWheel(e: WheelEvent) {
		if (!image) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		const newScale = Math.max(0.1, Math.min(2, scale * delta));
		
		// Zoom towards mouse position
		const pos = getMousePos(e);
		const scaleChange = newScale / scale;
		offsetX = pos.x - (pos.x - offsetX) * scaleChange;
		offsetY = pos.y - (pos.y - offsetY) * scaleChange;
		
		scale = newScale;
		
		// Adjust crop to stay within bounds
		cropX = Math.max(offsetX, Math.min(offsetX + imageWidth * scale - cropWidth, cropX));
		cropY = Math.max(offsetY, Math.min(offsetY + imageHeight * scale - cropHeight, cropY));
		
		draw();
	}

	async function applyCrop() {
		if (!image) return;

		// Convert canvas coordinates to image coordinates
		// Ensure crop area is within image bounds
		const minX = offsetX;
		const maxX = offsetX + imageWidth * scale;
		const minY = offsetY;
		const maxY = offsetY + imageHeight * scale;
		
		// Clamp crop coordinates to image bounds
		const clampedCropX = Math.max(minX, Math.min(maxX - cropWidth, cropX));
		const clampedCropY = Math.max(minY, Math.min(maxY - cropHeight, cropY));
		const clampedCropWidth = Math.min(cropWidth, maxX - clampedCropX);
		const clampedCropHeight = Math.min(cropHeight, maxY - clampedCropY);
		
		// Convert to image coordinates
		const imageX = Math.max(0, (clampedCropX - offsetX) / scale);
		const imageY = Math.max(0, (clampedCropY - offsetY) / scale);
		const imageCropWidth = clampedCropWidth / scale;
		const imageCropHeight = clampedCropHeight / scale;
		
		// Final validation - ensure we don't exceed actual image dimensions
		const finalX = Math.round(Math.max(0, Math.min(imageWidth - 1, imageX)));
		const finalY = Math.round(Math.max(0, Math.min(imageHeight - 1, imageY)));
		const finalWidth = Math.round(Math.max(1, Math.min(imageWidth - finalX, imageCropWidth)));
		const finalHeight = Math.round(Math.max(1, Math.min(imageHeight - finalY, imageCropHeight)));

		await onCrop({
			x: finalX,
			y: finalY,
			width: finalWidth,
			height: finalHeight
		});
	}

	function resetCrop() {
		if (!image) return;
		cropX = offsetX;
		cropY = offsetY;
		cropWidth = imageWidth * scale;
		cropHeight = imageHeight * scale;
		draw();
	}

	onMount(() => {
		if (browser && container && canvas) {
			// Set canvas size to match container
			const updateCanvasSize = () => {
				if (container && canvas) {
					canvas.width = container.clientWidth;
					canvas.height = container.clientHeight - 80; // Account for controls
					if (image) {
						// Recalculate layout if image is already loaded
						const availableWidth = container.clientWidth - 40;
						const availableHeight = canvas.height - 40;
						const scaleX = availableWidth / imageWidth;
						const scaleY = availableHeight / imageHeight;
						scale = Math.min(scaleX, scaleY, 1);
						
						const scaledWidth = imageWidth * scale;
						const scaledHeight = imageHeight * scale;
						offsetX = (availableWidth - scaledWidth) / 2 + 20;
						offsetY = (availableHeight - scaledHeight) / 2 + 20;
						
						// Adjust crop area to stay within bounds
						cropX = Math.max(offsetX, Math.min(offsetX + scaledWidth - cropWidth, cropX));
						cropY = Math.max(offsetY, Math.min(offsetY + scaledHeight - cropHeight, cropY));
						cropWidth = Math.min(cropWidth, scaledWidth);
						cropHeight = Math.min(cropHeight, scaledHeight);
						
						draw();
					}
				}
			};
			
			updateCanvasSize();
			loadImage();
			
			// Handle window resize
			const resizeObserver = new ResizeObserver(updateCanvasSize);
			resizeObserver.observe(container);
			
			return () => {
				resizeObserver.disconnect();
			};
		}
	});

	$: if (imageUrl && browser) {
		loadImage();
	}
</script>

<div class="photo-cropper" bind:this={container}>
	<canvas
		bind:this={canvas}
		class="cropper-canvas"
		on:mousedown={handleStart}
		on:mousemove={handleMove}
		on:mouseup={handleEnd}
		on:mouseleave={handleEnd}
		on:touchstart={handleStart}
		on:touchmove={handleMove}
		on:touchend={handleEnd}
		on:wheel={handleWheel}
		style="cursor: {cropping ? (resizeMode === 'move' ? 'move' : resizeMode !== 'none' ? 'nwse-resize' : 'default') : 'default'}"
	></canvas>
	
	<div class="cropper-controls">
		<div class="cropper-info">
			<p class="text-sm text-gray-600">
				Drag to move, drag corners to resize, scroll to zoom
			</p>
			{#if image}
				{@const cropInfo = (() => {
					const imageX = Math.max(0, (cropX - offsetX) / scale);
					const imageY = Math.max(0, (cropY - offsetY) / scale);
					const imageCropWidth = Math.min(cropWidth / scale, imageWidth - imageX);
					const imageCropHeight = Math.min(cropHeight / scale, imageHeight - imageY);
					return {
						x: Math.round(imageX),
						y: Math.round(imageY),
						width: Math.round(imageCropWidth),
						height: Math.round(imageCropHeight)
					};
				})()}
				<p class="text-xs text-gray-500 mt-1">
					Crop: {cropInfo.width} × {cropInfo.height}px (from {cropInfo.x}, {cropInfo.y}) | Image: {imageWidth} × {imageHeight}px
				</p>
			{/if}
		</div>
		<div class="cropper-buttons">
			<button
				type="button"
				on:click={resetCrop}
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
			>
				Reset
			</button>
			<button
				type="button"
				on:click={onCancel}
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
			>
				Cancel
			</button>
			<button
				type="button"
				on:click={applyCrop}
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
			>
				Apply Crop
			</button>
		</div>
	</div>
</div>

<style>
	.photo-cropper {
		position: relative;
		width: 100%;
		height: 600px;
		background: #2d2d2d;
		border-radius: 8px;
		overflow: hidden;
	}

	.cropper-canvas {
		display: block;
		width: 100%;
		height: calc(100% - 80px);
		touch-action: none;
		background: transparent;
	}

	.cropper-controls {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		padding: 16px;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.cropper-info {
		flex: 1;
	}

	.cropper-buttons {
		display: flex;
		gap: 8px;
	}

	@media (max-width: 640px) {
		.cropper-controls {
			flex-direction: column;
			gap: 12px;
		}

		.cropper-buttons {
			width: 100%;
			justify-content: stretch;
		}

		.cropper-buttons button {
			flex: 1;
		}
	}
</style>
