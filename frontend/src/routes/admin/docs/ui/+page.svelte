<script lang="ts">
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';
	import uiIndex from '$lib/components/ui/README.md?raw';
	import menuReadme from '$lib/components/ui/menu/README.md?raw';
	import languageSelectorReadme from '$lib/components/ui/language-selector/README.md?raw';
	import themeToggleReadme from '$lib/components/ui/theme-toggle/README.md?raw';
	import templateSelectorReadme from '$lib/components/ui/template-selector/README.md?raw';

	type DocId = 'index' | 'menu' | 'language-selector' | 'theme-toggle' | 'template-selector';

	const docs: { id: DocId; title: string; body: string }[] = [
		{ id: 'index', title: 'Overview', body: uiIndex },
		{ id: 'menu', title: 'Menu', body: menuReadme },
		{ id: 'language-selector', title: 'Language selector', body: languageSelectorReadme },
		{ id: 'theme-toggle', title: 'Theme toggle', body: themeToggleReadme },
		{ id: 'template-selector', title: 'Template selector', body: templateSelectorReadme },
	];

	let selected: DocId = 'index';

	$: active = docs.find((d) => d.id === selected) ?? docs[0];
</script>

<svelte:head>
	<title>{$t('admin.uiDocsPageTitle')} - {$productName}</title>
</svelte:head>

<div class="py-6">
	<div class="max-w-6xl mx-auto px-4">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-[var(--color-surface-950-50)]">{$t('admin.uiDocsPageHeading')}</h1>
			<p class="text-[var(--color-surface-600-400)] mt-2 text-sm">{$t('admin.uiDocsPageIntro')}</p>
		</div>

		<div class="flex flex-col lg:flex-row gap-6 min-h-[50vh]">
			<nav
				class="shrink-0 lg:w-52 border border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] rounded-lg p-2 bg-[var(--color-surface-50-950)]"
				aria-label={$t('admin.uiDocsNavAria')}
			>
				<ul class="flex flex-row flex-wrap lg:flex-col gap-1">
					{#each docs as d}
						<li class="lg:w-full">
							<button
								type="button"
								class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors
									{selected === d.id
	? 'bg-[var(--color-primary-500)] text-white'
									: 'hover:bg-[color:color-mix(in_oklab,var(--color-surface-950)_6%,transparent)] dark:hover:bg-[color:color-mix(in_oklab,var(--color-surface-50)_10%,transparent)] text-[var(--color-surface-800-200)]'}"
								on:click={() => (selected = d.id)}
							>
								{d.title}
							</button>
						</li>
					{/each}
				</ul>
			</nav>

			<section
				class="flex-1 min-w-0 border border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] rounded-lg bg-[var(--color-surface-50-950)]"
	aria-live="polite"
			>
				<header class="px-4 py-3 border-b border-[color:color-mix(in_oklab,var(--color-surface-950)_10%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_12%,transparent)]">
					<h2 class="text-lg font-semibold text-[var(--color-surface-950-50)]">{active.title}</h2>
				</header>
				<pre
					class="p-4 text-sm text-[var(--color-surface-800-200)] whitespace-pre-wrap font-mono overflow-x-auto max-h-[70vh] overflow-y-auto"
				>{active.body}</pre>
			</section>
		</div>
	</div>
</div>
