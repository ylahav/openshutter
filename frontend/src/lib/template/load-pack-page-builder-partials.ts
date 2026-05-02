/**
 * Optional per-pack SCSS for shared page-builder widgets (after main pack stylesheet):
 * theme toggle, auth buttons, hero. Only files that exist at build time are included in each glob.
 */
const themeTogglePartials = import.meta.glob('../../templates/*/styles/_themeToggle.scss');
const authButtonsPartials = import.meta.glob('../../templates/*/styles/_authButtons.scss');
const heroPartials = import.meta.glob('../../templates/*/styles/_hero.scss');

async function loadPartial(
	map: Record<string, () => Promise<unknown>>,
	packId: string,
	pathSuffix: string
): Promise<void> {
	const needle = `/templates/${packId}${pathSuffix}`;
	const hit = Object.entries(map).find(([path]) => path.replace(/\\/g, '/').includes(needle));
	if (hit) await hit[1]();
}

export async function loadPackPageBuilderPartials(packId: string): Promise<void> {
	const id = packId.trim().toLowerCase();
	if (!id) return;
	await loadPartial(themeTogglePartials, id, '/styles/_themeToggle.scss');
	await loadPartial(authButtonsPartials, id, '/styles/_authButtons.scss');
	await loadPartial(heroPartials, id, '/styles/_hero.scss');
}
