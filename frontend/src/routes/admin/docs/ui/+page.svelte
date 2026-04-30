<script lang="ts">
	import { marked } from 'marked';
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';
	import uiIndex from '$lib/page-builder/primitives/README.md?raw';
	import menuReadme from '$lib/page-builder/primitives/menu/README.md?raw';
	import languageSelectorReadme from '$lib/page-builder/primitives/language-selector/README.md?raw';
	import themeToggleReadme from '$lib/page-builder/primitives/theme-toggle/README.md?raw';
	import templateSelectorReadme from '$lib/page-builder/primitives/template-selector/README.md?raw';
	import pbModulesIndex from '$lib/page-builder/modules/README.md?raw';
	import visitorUiLayers from './_visitor-ui-layers.md?raw';

	const pbModuleReadmes = import.meta.glob<string>('$lib/page-builder/modules/*/README.md', {
		eager: true,
		query: '?raw',
		import: 'default',
	});

	type DocGroup = 'intro' | 'shared' | 'page-builder';

	type DocEntry = {
		id: string;
		title: string;
		body: string;
		group: DocGroup;
	};

	function pbSlugFromPath(path: string): string {
		const normalized = path.replace(/\\/g, '/');
		const m = normalized.match(/modules\/([^/]+)\/README\.md$/i);
		return m?.[1] ?? normalized;
	}

	function formatPbModuleTitle(slug: string): string {
		const label = slug.replace(/([a-z])([A-Z])/g, '$1 $2');
		return `${label}`;
	}

	const introDocs: DocEntry[] = [
		{
			id: 'concepts',
			group: 'intro',
			title: 'Start here — two layers',
			body: visitorUiLayers,
		},
	];

	const sharedDocs: DocEntry[] = [
		{ id: 'ui-overview', group: 'shared', title: 'Overview (primitives)', body: uiIndex },
		{ id: 'ui-menu', group: 'shared', title: 'Menu component', body: menuReadme },
		{
			id: 'ui-language-selector',
			group: 'shared',
			title: 'Language selector component',
			body: languageSelectorReadme,
		},
		{ id: 'ui-theme-toggle', group: 'shared', title: 'Theme toggle component', body: themeToggleReadme },
		{
			id: 'ui-template-selector',
			group: 'shared',
			title: 'Template selector component',
			body: templateSelectorReadme,
		},
	];

	const pbOverview: DocEntry = {
		id: 'pb-overview',
		group: 'page-builder',
		title: 'All module types (index)',
		body: pbModulesIndex,
	};

	const pbModuleDocs: DocEntry[] = Object.entries(pbModuleReadmes)
		.map(([path, body]) => {
			const slug = pbSlugFromPath(path);
			return {
				id: `pb-mod-${slug}`,
				group: 'page-builder' as const,
				title: formatPbModuleTitle(slug),
				body: body as string,
			};
		})
		.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

	const docs: DocEntry[] = [...introDocs, ...sharedDocs, pbOverview, ...pbModuleDocs];

	let selectedId = 'concepts';

	$: active = docs.find((d) => d.id === selectedId) ?? docs[0];
	$: renderedBody = marked(active.body, { async: false }) as string;
</script>

<svelte:head>
	<title>{$t('admin.uiDocsPageTitle')} - {$productName}</title>
</svelte:head>

<div class="py-6">
	<div class="max-w-6xl mx-auto px-4">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-(--color-surface-950-50)">{$t('admin.uiDocsPageHeading')}</h1>
			<div
				class="text-(--color-surface-600-400) mt-2 text-sm leading-relaxed [&_strong]:font-semibold [&_strong]:text-(--color-surface-800-200) [&_em]:italic [&_code]:font-mono [&_code]:text-xs [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-(--color-surface-800-200) [&_code]:bg-[color-mix(in_oklab,var(--color-surface-950)_8%,transparent)] dark:[&_code]:bg-[color-mix(in_oklab,var(--color-surface-50)_12%,transparent)]"
			>
				{@html $t('admin.uiDocsPageIntro')}
			</div>
		</div>

		<div class="flex flex-col lg:flex-row gap-6 min-h-[50vh]">
			<nav
				class="shrink-0 lg:w-56 border border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] rounded-lg p-2 bg-(--color-surface-50-950)"
				aria-label={$t('admin.uiDocsNavAria')}
			>
				<div class="flex flex-col gap-3">
					<div>
						<p class="px-2 pt-1 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-(--color-surface-500-500)">
							{$t('admin.uiDocsGroupIntro')}
						</p>
						<ul class="flex flex-row flex-wrap lg:flex-col gap-1">
							{#each introDocs as d}
								<li class="lg:w-full">
									<button
										type="button"
										class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors
											{selectedId === d.id
											? 'bg-(--color-primary-500) text-white'
											: 'hover:bg-[color:color-mix(in_oklab,var(--color-surface-950)_6%,transparent)] dark:hover:bg-[color:color-mix(in_oklab,var(--color-surface-50)_10%,transparent)] text-(--color-surface-800-200)'}"
										on:click={() => (selectedId = d.id)}
									>
										{d.title}
									</button>
								</li>
							{/each}
						</ul>
					</div>
					<div>
						<p class="px-2 pt-1 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-(--color-surface-500-500)">
							{$t('admin.uiDocsGroupShared')}
						</p>
						<ul class="flex flex-row flex-wrap lg:flex-col gap-1">
							{#each sharedDocs as d}
								<li class="lg:w-full">
									<button
										type="button"
										class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors
											{selectedId === d.id
											? 'bg-(--color-primary-500) text-white'
											: 'hover:bg-[color:color-mix(in_oklab,var(--color-surface-950)_6%,transparent)] dark:hover:bg-[color:color-mix(in_oklab,var(--color-surface-50)_10%,transparent)] text-(--color-surface-800-200)'}"
										on:click={() => (selectedId = d.id)}
									>
										{d.title}
									</button>
								</li>
							{/each}
						</ul>
					</div>
					<div>
						<p class="px-2 pt-1 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-(--color-surface-500-500)">
							{$t('admin.uiDocsGroupPageBuilder')}
						</p>
						<ul class="flex flex-row flex-wrap lg:flex-col gap-1 max-h-[55vh] lg:max-h-[65vh] overflow-y-auto">
							{#each [pbOverview, ...pbModuleDocs] as d}
								<li class="lg:w-full">
									<button
										type="button"
										class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors
											{selectedId === d.id
											? 'bg-(--color-primary-500) text-white'
											: 'hover:bg-[color:color-mix(in_oklab,var(--color-surface-950)_6%,transparent)] dark:hover:bg-[color:color-mix(in_oklab,var(--color-surface-50)_10%,transparent)] text-(--color-surface-800-200)'}"
										on:click={() => (selectedId = d.id)}
									>
										{d.title}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</nav>

			<section
				class="flex-1 min-w-0 border border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] rounded-lg bg-(--color-surface-50-950)"
				aria-live="polite"
			>
				<header class="px-4 py-3 border-b border-[color:color-mix(in_oklab,var(--color-surface-950)_10%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_12%,transparent)]">
					<h2 class="text-lg font-semibold text-(--color-surface-950-50)">{active.title}</h2>
				</header>
				<div
					class="ui-docs-prose p-4 text-sm text-(--color-surface-800-200) max-h-[70vh] overflow-y-auto overflow-x-auto"
				>
					{@html renderedBody}
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.ui-docs-prose :global(h1) {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.75rem;
		color: var(--color-surface-950-50);
	}
	.ui-docs-prose :global(h2) {
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
		color: var(--color-surface-950-50);
	}
	.ui-docs-prose :global(h3) {
		font-size: 1rem;
		font-weight: 600;
		margin: 1rem 0 0.35rem;
	}
	.ui-docs-prose :global(p) {
		margin: 0 0 0.75rem;
		line-height: 1.6;
	}
	.ui-docs-prose :global(ul),
	.ui-docs-prose :global(ol) {
		margin: 0 0 0.75rem;
		padding-inline-start: 1.25rem;
	}
	.ui-docs-prose :global(li) {
		margin-bottom: 0.25rem;
	}
	.ui-docs-prose :global(a) {
		color: var(--color-primary-500);
		text-decoration: underline;
	}
	.ui-docs-prose :global(code) {
		font-family: ui-monospace, monospace;
		font-size: 0.8125em;
		padding: 0.1em 0.35em;
		border-radius: 0.25rem;
		background: color-mix(in oklab, var(--color-surface-950) 8%, transparent);
	}
	:global([data-theme='dark']) .ui-docs-prose :global(code) {
		background: color-mix(in oklab, var(--color-surface-50) 12%, transparent);
	}
	.ui-docs-prose :global(pre) {
		font-family: ui-monospace, monospace;
		font-size: 0.8125rem;
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		overflow-x: auto;
		margin: 0 0 0.75rem;
		background: color-mix(in oklab, var(--color-surface-950) 6%, transparent);
		border: 1px solid color-mix(in oklab, var(--color-surface-950) 12%, transparent);
	}
	:global([data-theme='dark']) .ui-docs-prose :global(pre) {
		background: color-mix(in oklab, var(--color-surface-50) 8%, transparent);
		border-color: color-mix(in oklab, var(--color-surface-50) 14%, transparent);
	}
	.ui-docs-prose :global(pre code) {
		padding: 0;
		background: none;
		font-size: inherit;
	}
	.ui-docs-prose :global(hr) {
		margin: 1rem 0;
		border: 0;
		border-top: 1px solid color-mix(in oklab, var(--color-surface-950) 12%, transparent);
	}
	:global([data-theme='dark']) .ui-docs-prose :global(hr) {
		border-top-color: color-mix(in oklab, var(--color-surface-50) 14%, transparent);
	}
	.ui-docs-prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		margin: 0 0 0.75rem;
	}
	.ui-docs-prose :global(th),
	.ui-docs-prose :global(td) {
		border: 1px solid color-mix(in oklab, var(--color-surface-950) 12%, transparent);
		padding: 0.35rem 0.5rem;
		text-align: start;
	}
	:global([data-theme='dark']) .ui-docs-prose :global(th),
	:global([data-theme='dark']) .ui-docs-prose :global(td) {
		border-color: color-mix(in oklab, var(--color-surface-50) 14%, transparent);
	}
</style>
