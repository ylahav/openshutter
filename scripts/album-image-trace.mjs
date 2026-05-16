/**
 * HTTP timing trace for a public album (no Playwright required).
 *
 * Usage:
 *   node scripts/album-image-trace.mjs --base https://yairl.com --alias 2018-10-04
 */

const STORAGE_URL_VERSION = 3;

function parseArgs() {
	const args = process.argv.slice(2);
	let base = 'https://yairl.com';
	let alias = '2018-10-04';
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--base' && args[i + 1]) base = args[++i].replace(/\/$/, '');
		if (args[i] === '--alias' && args[i + 1]) alias = args[++i];
	}
	return { base, alias };
}

function isThumbnailPath(path) {
	return path.includes('/medium/') || path.includes('/small/') || path.includes('/thumb/');
}

function constructStorageUrl(path, provider = 'local', storageOwnerId, siteBase) {
	const param = `v=${STORAGE_URL_VERSION}`;
	const owner =
		storageOwnerId != null && String(storageOwnerId).trim() !== ''
			? String(storageOwnerId).trim()
			: '';
	const appendOwner = (url) => {
		if (!owner) return url;
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}storageOwnerId=${encodeURIComponent(owner)}`;
	};
	if (path.startsWith('/api/storage/serve/') || path.startsWith('http')) {
		const sep = path.includes('?') ? '&' : '?';
		const withV = `${path}${sep}${param}`;
		if (path.startsWith('http')) return withV;
		return appendOwner(`${siteBase}${withV}`);
	}
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	if (!cleanPath.trim()) return '';
	const built = `${siteBase}/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}?${param}`;
	return appendOwner(built);
}

function resolveStorageOwnerId(storage) {
	return storage?.storageOwnerId ?? storage?.ownerId ?? undefined;
}

/** Mirrors getPhotoUrl (preferThumbnail: true) */
function getPhotoUrl(photo, baseUrl) {
	const construct = (path, provider, ownerId) =>
		constructStorageUrl(path, provider, ownerId, baseUrl);
	if (!photo.storage) return photo.url || '';
	const provider = photo.storage.provider || 'local';
	const storageOwnerId = resolveStorageOwnerId(photo.storage);

	const getFullImagePath = () => {
		if (photo.storage.url && !isThumbnailPath(photo.storage.url)) {
			return construct(photo.storage.url, provider, storageOwnerId);
		}
		if (photo.storage.path && !isThumbnailPath(photo.storage.path)) {
			return construct(photo.storage.path, provider, storageOwnerId);
		}
		return null;
	};

	if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
		const thumbs = photo.storage.thumbnails;
		const thumbnailUrl = thumbs.medium || thumbs.small || Object.values(thumbs)[0];
		if (thumbnailUrl) {
			const fullImagePath = getFullImagePath();
			if (fullImagePath && isThumbnailPath(thumbnailUrl)) return fullImagePath;
			return construct(thumbnailUrl, provider, storageOwnerId);
		}
	}
	if (photo.storage.thumbnailPath) {
		const fullImagePath = getFullImagePath();
		if (fullImagePath && isThumbnailPath(photo.storage.thumbnailPath)) return fullImagePath;
		return construct(photo.storage.thumbnailPath, provider, storageOwnerId);
	}
	if (photo.storage.url && !isThumbnailPath(photo.storage.url)) {
		return construct(photo.storage.url, provider, storageOwnerId);
	}
	if (photo.storage.path && !isThumbnailPath(photo.storage.path)) {
		return construct(photo.storage.path, provider, storageOwnerId);
	}
	if (photo.storage.thumbnailPath) {
		return construct(photo.storage.thumbnailPath, provider, storageOwnerId);
	}
	return photo.url || '';
}

/** Mirrors getPhotoGridUrl (small thumbs first) */
function getPhotoGridUrl(photo, baseUrl) {
	const construct = (path, provider, ownerId) =>
		constructStorageUrl(path, provider, ownerId, baseUrl);
	if (!photo.storage) return photo.url || '';
	const provider = photo.storage.provider || 'local';
	const storageOwnerId = resolveStorageOwnerId(photo.storage);

	const getFullImagePath = () => {
		if (photo.storage.url && !isThumbnailPath(photo.storage.url)) {
			return construct(photo.storage.url, provider, storageOwnerId);
		}
		if (photo.storage.path && !isThumbnailPath(photo.storage.path)) {
			return construct(photo.storage.path, provider, storageOwnerId);
		}
		return null;
	};

	if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
		const thumbs = photo.storage.thumbnails;
		const thumbnailUrl = thumbs.small || thumbs.medium || Object.values(thumbs)[0];
		if (thumbnailUrl) {
			const fullImagePath = getFullImagePath();
			if (fullImagePath && isThumbnailPath(thumbnailUrl)) return fullImagePath;
			return construct(thumbnailUrl, provider, storageOwnerId);
		}
	}
	if (photo.storage.thumbnailPath) {
		let pathValue = photo.storage.thumbnailPath;
		if (pathValue.includes('/medium/')) pathValue = pathValue.replace('/medium/', '/small/');
		const fullImagePath = getFullImagePath();
		if (fullImagePath && isThumbnailPath(pathValue)) return fullImagePath;
		return construct(pathValue, provider, storageOwnerId);
	}
	return getPhotoUrl(photo, baseUrl);
}

/** Mirrors getPhotoFullUrl */
function getPhotoFullUrl(photo, baseUrl) {
	if (!photo.storage) return photo.url || '';
	const provider = photo.storage.provider || 'local';
	const storageOwnerId = resolveStorageOwnerId(photo.storage);
	const construct = (path) => constructStorageUrl(path, provider, storageOwnerId, baseUrl);
	if (photo.storage.url) {
		const url = construct(photo.storage.url);
		if (!url.includes('/medium/') && !url.includes('/small/') && !url.includes('/thumb/')) return url;
	}
	if (photo.storage.path) {
		const url = construct(photo.storage.path);
		if (!url.includes('/medium/') && !url.includes('/small/') && !url.includes('/thumb/')) return url;
	}
	return getPhotoUrl(photo, baseUrl);
}

/** Lightbox-style: url → storage.url → thumbnailPath */
function getLightboxUrl(photo, baseUrl) {
	if (photo.url) return photo.url.startsWith('http') ? photo.url : `${baseUrl}${photo.url}`;
	if (photo.storage?.url) {
		return constructStorageUrl(
			photo.storage.url,
			photo.storage.provider || 'local',
			resolveStorageOwnerId(photo.storage),
			baseUrl
		);
	}
	if (photo.storage?.thumbnailPath) {
		return constructStorageUrl(
			photo.storage.thumbnailPath,
			photo.storage.provider || 'local',
			resolveStorageOwnerId(photo.storage),
			baseUrl
		);
	}
	return '';
}

async function timedFetch(url, method = 'GET') {
	const t0 = performance.now();
	try {
		const res = await fetch(url, { method, redirect: 'follow' });
		const buf = method === 'GET' ? await res.arrayBuffer() : null;
		const ms = Math.round(performance.now() - t0);
		const kb = buf ? Math.round((buf.byteLength / 1024) * 10) / 10 : null;
		const cl = res.headers.get('content-length');
		return {
			ok: res.ok,
			status: res.status,
			ms,
			kb: kb ?? (cl ? Math.round(Number(cl) / 102.4) / 10 : null),
			url: url.length > 100 ? `${url.slice(0, 97)}…` : url,
		};
	} catch (e) {
		return { ok: false, status: 0, ms: Math.round(performance.now() - t0), kb: null, url, error: String(e) };
	}
}

function pathKind(url) {
	const u = decodeURIComponent(url);
	if (u.includes('/small/') || u.includes('/thumb/')) return 'small/thumb';
	if (u.includes('/medium/')) return 'medium';
	return 'full/original';
}

async function main() {
	const { base, alias } = parseArgs();
	console.log(`\nAlbum image trace\n  base:  ${base}\n  alias: ${alias}\n`);

	const dataRes = await fetch(`${base}/api/albums/${encodeURIComponent(alias)}/data?limit=50`);
	if (!dataRes.ok) {
		console.error(`Album API failed: ${dataRes.status} ${dataRes.statusText}`);
		process.exit(1);
	}
	const payload = await dataRes.json();
	const photos = payload?.data?.photos ?? payload?.photos ?? [];
	if (!photos.length) {
		console.error('No photos in album data response');
		process.exit(1);
	}
	console.log(`Photos in album: ${photos.length}\n`);

	const gridRows = [];
	const fullRows = [];
	const lbRows = [];

	for (const photo of photos.slice(0, 12)) {
		const grid = getPhotoGridUrl(photo, base);
		const gridMedium = getPhotoUrl(photo, base);
		const full = getPhotoFullUrl(photo, base);
		const lb = getLightboxUrl(photo, base);

		if (grid) {
			const r = await timedFetch(grid);
			gridRows.push({ ...r, kind: pathKind(grid), role: 'grid (getPhotoGridUrl / small)' });
		}
		if (gridMedium && gridMedium !== grid) {
			const r = await timedFetch(gridMedium);
			gridRows.push({ ...r, kind: pathKind(gridMedium), role: 'grid legacy (medium)' });
		}
		if (full && full !== grid) {
			const r = await timedFetch(full);
			fullRows.push({ ...r, kind: pathKind(full), role: 'full (getPhotoFullUrl)' });
		}
		if (lb) {
			const r = await timedFetch(lb);
			const sameAsGrid = lb === grid;
			lbRows.push({
				...r,
				kind: pathKind(lb),
				role: sameAsGrid ? 'lightbox (= grid URL)' : 'lightbox (storage.url / full)',
			});
		}
	}

	const printSection = (title, rows) => {
		console.log(`--- ${title} ---`);
		rows.sort((a, b) => b.ms - a.ms);
		for (const r of rows) {
			const kb = r.kb != null ? `${r.kb} KB` : '?';
			const st = r.ok ? '' : ` FAIL ${r.status}${r.error ? ' ' + r.error : ''}`;
			console.log(`${r.ms} ms\t${kb}\t${r.kind}\t${r.role}${st}\n  ${r.url}`);
		}
		if (!rows.length) console.log('(none)');
		console.log('');
	};

	printSection('Grid URLs (getPhotoGridUrl + legacy medium)', gridRows);
	printSection('Full URLs (getPhotoFullUrl)', fullRows);
	printSection('Lightbox URLs (PhotoLightbox logic)', lbRows);

	const gridAvg = gridRows.reduce((s, r) => s + r.ms, 0) / (gridRows.length || 1);
	const lbAvg = lbRows.reduce((s, r) => s + r.ms, 0) / (lbRows.length || 1);
	const gridKb = gridRows.reduce((s, r) => s + (r.kb || 0), 0);
	const lbKb = lbRows.reduce((s, r) => s + (r.kb || 0), 0);
	console.log('--- Summary (first up to 12 photos) ---');
	console.log(`Grid: avg ${Math.round(gridAvg)} ms, total ~${Math.round(gridKb)} KB`);
	console.log(`Lightbox: avg ${Math.round(lbAvg)} ms, total ~${Math.round(lbKb)} KB`);
	if (lbKb > gridKb * 1.5) {
		console.log('→ Lightbox payloads are materially larger than grid — progressive loading likely helps.');
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
