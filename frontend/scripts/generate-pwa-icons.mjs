/**
 * Generates PWA PNG icons from static/icon.svg (SvelteKit serves `static/` at /).
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import { createCanvas, loadImage } from 'canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = join(__dirname, '..', 'static');
const svgPath = join(staticDir, 'icon.svg');

const sizes = [192, 512];

const svg = readFileSync(svgPath);
const dataUrl = `data:image/svg+xml;base64,${svg.toString('base64')}`;
const img = await loadImage(dataUrl);

for (const size of sizes) {
	const canvas = createCanvas(size, size);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0, size, size);
	const out = join(staticDir, `icon-${size}x${size}.png`);
	writeFileSync(out, canvas.toBuffer('image/png'));
	console.log('Wrote', out);
}
