/** Aspect ratio width/height for justified photo rows. */
export function photoAspectRatio(photo: {
	width?: number;
	height?: number;
	metadata?: { width?: number; height?: number };
}): number {
	const w = Number(photo?.metadata?.width ?? photo?.width ?? 0);
	const h = Number(photo?.metadata?.height ?? photo?.height ?? 0);
	if (w > 0 && h > 0) return w / h;
	return 1;
}

export type JustifiedCell<T> = { item: T; widthPx: number; heightPx: number };

/**
 * Pack photos into rows of roughly `targetRowHeight`, scaling each row to fill `containerWidth`.
 */
export function layoutJustifiedRows<T extends { aspect: number }>(
	items: T[],
	containerWidth: number,
	targetRowHeight: number,
	gap: number
): JustifiedCell<T>[][] {
	if (items.length === 0 || containerWidth <= 0) return [];

	const rows: T[][] = [];
	let row: T[] = [];

	const rowRawWidth = (r: T[]) =>
		r.reduce((s, p) => s + p.aspect * targetRowHeight, 0) + gap * Math.max(0, r.length - 1);

	for (const item of items) {
		const next = [...row, item];
		if (row.length > 0 && rowRawWidth(next) > containerWidth) {
			rows.push(row);
			row = [item];
		} else {
			row = next;
		}
	}
	if (row.length) rows.push(row);

	return rows.map((r) => {
		const rawSum = r.reduce((s, p) => s + p.aspect * targetRowHeight, 0);
		const available = containerWidth - gap * (r.length - 1);
		const scale = available / rawSum;
		const heightPx = targetRowHeight * scale;
		return r.map((item) => ({
			item,
			widthPx: item.aspect * heightPx,
			heightPx,
		}));
	});
}
