<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	export let imageUrl: string;
	export let onCrop: (crop: { x: number; y: number; width: number; height: number }) => Promise<void>;
	export let onCancel: () => void;

	let canvas: HTMLCanvasElement;
	let image: HTMLImageElement | null = null;
	let container: HTMLDivElement;
	let canvasWrapper: HTMLDivElement;
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
	let fitScale = 1;
	let offsetX = 0;
	let offsetY = 0;
	let cropping = false;
	let resizeMode: 'none' | 'nw' | 'ne' | 'sw' | 'se' | 'move' | 'pan' = 'none';
	let hoverMode: 'none' | 'nw' | 'ne' | 'sw' | 'se' | 'move' | 'pan' = 'none';

	function getCanvasArea(): { width: number; height: number } {
		// Canvas is sized to fit its flex wrapper; the controls bar lives below
		// the wrapper, so this is always the actual drawable area regardless of
		// how tall the controls are at the current viewport / language.
		if (!canvasWrapper) return { width: 0, height: 0 };
		return { width: canvasWrapper.clientWidth, height: canvasWrapper.clientHeight };
	}

	function fitImageToCanvas() {
		const { width: cw, height: ch } = getCanvasArea();
		if (!cw || !ch || !imageWidth || !imageHeight) return;
		canvas.width = cw;
		canvas.height = ch;
		const availableWidth = cw - 40;
		const availableHeight = ch - 40;
		const scaleX = availableWidth / imageWidth;
		const scaleY = availableHeight / imageHeight;
		fitScale = Math.min(scaleX, scaleY, 1);
		scale = fitScale;
		const scaledWidth = imageWidth * scale;
		const scaledHeight = imageHeight * scale;
		offsetX = (cw - scaledWidth) / 2;
		offsetY = (ch - scaledHeight) / 2;
		cropX = offsetX;
		cropY = offsetY;
		cropWidth = scaledWidth;
		cropHeight = scaledHeight;
	}

	function loadImage() {
		if (!browser || !imageUrl) return;

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			image = img;
			imageWidth = img.width;
			imageHeight = img.height;
			if (canvasWrapper && canvas) {
				fitImageToCanvas();
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
		if (resizeMode === 'none') return;
		isDragging = true;
		startX = pos.x;
		startY = pos.y;
		cropping = true;
	}

	function getResizeMode(pos: { x: number; y: number }): 'none' | 'nw' | 'ne' | 'sw' | 'se' | 'move' | 'pan' {
		const handleSize = 20;
		const isNearNW = Math.abs(pos.x - cropX) < handleSize && Math.abs(pos.y - cropY) < handleSize;
		const isNearNE = Math.abs(pos.x - (cropX + cropWidth)) < handleSize && Math.abs(pos.y - cropY) < handleSize;
		const isNearSW = Math.abs(pos.x - cropX) < handleSize && Math.abs(pos.y - (cropY + cropHeight)) < handleSize;
		const isNearSE = Math.abs(pos.x - (cropX + cropWidth)) < handleSize && Math.abs(pos.y - (cropY + cropHeight)) < handleSize;
		const isInCropArea = pos.x >= cropX && pos.x <= cropX + cropWidth && pos.y >= cropY && pos.y <= cropY + cropHeight;
		const isInCanvas = pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height;

		if (isNearNW) return 'nw';
		if (isNearNE) return 'ne';
		if (isNearSW) return 'sw';
		if (isNearSE) return 'se';
		if (isInCropArea) return 'move';
		if (isInCanvas) return 'pan';
		return 'none';
	}

	function cursorFor(mode: 'none' | 'nw' | 'ne' | 'sw' | 'se' | 'move' | 'pan', active: boolean): string {
		switch (mode) {
			case 'nw':
			case 'se':
				return 'nwse-resize';
			case 'ne':
			case 'sw':
				return 'nesw-resize';
			case 'move':
				return 'move';
			case 'pan':
				return active ? 'grabbing' : 'grab';
			default:
				return 'default';
		}
	}

	function handleHover(e: MouseEvent) {
		if (isDragging || !image) return;
		hoverMode = getResizeMode(getMousePos(e));
	}

	function handleMove(e: MouseEvent | TouchEvent) {
		if (!isDragging || !image) {
			if (e instanceof MouseEvent) handleHover(e);
			return;
		}
		e.preventDefault();
		const pos = getMousePos(e);
		const dx = pos.x - startX;
		const dy = pos.y - startY;

		if (resizeMode === 'pan') {
			// Pan the image. Move the crop rectangle with it so the crop stays
			// anchored over the same image pixels (no surprise re-framing).
			offsetX += dx;
			offsetY += dy;
			cropX += dx;
			cropY += dy;
		} else if (resizeMode === 'move') {
			const newX = Math.max(offsetX, Math.min(offsetX + imageWidth * scale - cropWidth, cropX + dx));
			const newY = Math.max(offsetY, Math.min(offsetY + imageHeight * scale - cropHeight, cropY + dy));
			cropX = newX;
			cropY = newY;
		} else if (resizeMode === 'nw') {
			cropX = Math.max(offsetX, cropX + dx);
			cropY = Math.max(offsetY, cropY + dy);
			cropWidth = Math.max(50, cropWidth - dx);
			cropHeight = Math.max(50, cropHeight - dy);
		} else if (resizeMode === 'ne') {
			cropY = Math.max(offsetY, cropY + dy);
			cropWidth = Math.max(50, cropWidth + dx);
			cropHeight = Math.max(50, cropHeight - dy);
		} else if (resizeMode === 'sw') {
			cropX = Math.max(offsetX, cropX + dx);
			cropWidth = Math.max(50, cropWidth - dx);
			cropHeight = Math.max(50, cropHeight + dy);
		} else if (resizeMode === 'se') {
			cropWidth = Math.max(50, cropWidth + dx);
			cropHeight = Math.max(50, cropHeight + dy);
		}

		if (resizeMode !== 'pan') {
			// Constrain crop to image bounds (pan keeps the crop anchored to the image
			// so we skip these snap-to-bounds rules — otherwise zooming-in then panning
			// would yank the crop back into the viewport).
			cropX = Math.max(offsetX, Math.min(offsetX + imageWidth * scale - cropWidth, cropX));
			cropY = Math.max(offsetY, Math.min(offsetY + imageHeight * scale - cropHeight, cropY));
			cropWidth = Math.max(50, Math.min(imageWidth * scale - (cropX - offsetX), cropWidth));
			cropHeight = Math.max(50, Math.min(imageHeight * scale - (cropY - offsetY), cropHeight));
		}

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
		const maxScale = Math.max(2, fitScale * 8);
		const minScale = Math.max(0.1, fitScale * 0.5);
		const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));
		if (newScale === scale) return;

		// Zoom around the cursor: keep the image pixel under the mouse stationary,
		// and keep the crop rectangle anchored over the same image pixels.
		const pos = getMousePos(e);
		const scaleChange = newScale / scale;
		offsetX = pos.x - (pos.x - offsetX) * scaleChange;
		offsetY = pos.y - (pos.y - offsetY) * scaleChange;
		cropX = pos.x - (pos.x - cropX) * scaleChange;
		cropY = pos.y - (pos.y - cropY) * scaleChange;
		cropWidth *= scaleChange;
		cropHeight *= scaleChange;
		scale = newScale;
		draw();
	}

	async function applyCrop() {
		if (!image) return;
		// Convert canvas coords to image coords; clamp to image bounds at the end.
		const imageX = (cropX - offsetX) / scale;
		const imageY = (cropY - offsetY) / scale;
		const imageCropWidth = cropWidth / scale;
		const imageCropHeight = cropHeight / scale;

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
		fitImageToCanvas();
		draw();
	}

	onMount(() => {
		if (browser && canvasWrapper && canvas) {
			const updateCanvasSize = () => {
				if (!canvasWrapper || !canvas) return;
				const { width: cw, height: ch } = getCanvasArea();
				if (!cw || !ch) return;
				canvas.width = cw;
				canvas.height = ch;
				if (image) {
					// Window/modal resize: refit the image so it stays visible. This
					// resets pan/zoom, which is fine because the user expects a clean
					// frame after resizing the modal.
					fitImageToCanvas();
					draw();
				}
			};

			updateCanvasSize();
			loadImage();

			const resizeObserver = new ResizeObserver(updateCanvasSize);
			resizeObserver.observe(canvasWrapper);

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
	<div class="cropper-canvas-wrapper" bind:this={canvasWrapper}>
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
			style="cursor: {cursorFor(isDragging ? resizeMode : hoverMode, isDragging)}"
		></canvas>
	</div>

	<div class="cropper-controls">
		<div class="cropper-info">
			<p class="text-sm text-gray-600">
				Drag the crop rectangle or its corners. Drag outside it to pan. Scroll to zoom.
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
					Crop: {cropInfo.width} × {cropInfo.height}px (from {cropInfo.x}, {cropInfo.y}) | Image: {imageWidth} × {imageHeight}px | Zoom: {Math.round((scale / (fitScale || 1)) * 100)}%
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
		height: min(75vh, 720px);
		min-height: 320px;
		background: #2d2d2d;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.cropper-canvas-wrapper {
		flex: 1 1 auto;
		min-height: 0;
		overflow: hidden;
		display: block;
		position: relative;
	}

	.cropper-canvas {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
		background: transparent;
	}

	.cropper-controls {
		flex: 0 0 auto;
		background: white;
		padding: 16px;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.cropper-info {
		flex: 1 1 auto;
		min-width: 0;
	}

	.cropper-buttons {
		display: flex;
		gap: 8px;
		flex: 0 0 auto;
	}

	@media (max-width: 640px) {
		.cropper-controls {
			flex-direction: column;
			align-items: stretch;
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
