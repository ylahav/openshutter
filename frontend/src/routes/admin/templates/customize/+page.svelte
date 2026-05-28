<script lang="ts">
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { navigateAdmin } from '$lib/admin/adminNavigate';
	import { adminToast } from '$lib/admin/adminToast';
	import {
		adminBtnPrimarySm,
		adminBtnSecondary,
		adminRingPrimary
	} from '$lib/admin/admin-cerberus';
// PageData is loaded via +page.server.ts; this component does not
// currently consume it directly, so we omit the prop to avoid unused-export warnings.

	interface TemplateSummary {
		templateName: string;
		displayName: string;
		version: string;
		description?: string;
	}

	let templates: TemplateSummary[] = [];
	let activeTemplate = '';
	let selected = '';
	let raw = '';
	let originalRaw = '';
	const loading = writable(true);
	let saving = false;
	$: hasUnsavedChanges = raw !== originalRaw;

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasUnsavedChanges) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		void loadTemplates();
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	beforeNavigate((navigation) => {
		if (!hasUnsavedChanges) return;
		if (navigation.to?.url.pathname === navigation.from?.url.pathname) return;
		const leave = confirm('You have unsaved changes. Leave without saving?');
		if (!leave) {
			navigation.cancel();
		}
	});

	async function loadTemplates() {
		try {
			loading.set(true);
			const [tplRes, cfgRes] = await Promise.all([
				fetch('/api/admin/templates', { cache: 'no-store' }),
				fetch('/api/admin/site-config', { cache: 'no-store' })
			]);
			const tplJson = await tplRes.json();
			const cfgJson = await cfgRes.json();
			if (tplJson?.success && Array.isArray(tplJson.data)) {
				templates = tplJson.data;
			}
			const current = cfgJson?.data?.template?.activeTemplate || 'noir';
			activeTemplate = current;
			selected = current;
			await loadTemplateConfig();
		} catch (e) {
			adminToast.error({ title: 'Failed to load templates' });
		} finally {
			loading.set(false);
		}
	}

	async function loadTemplateConfig() {
		if (!selected) return;
		try {
			raw = '';
			const res = await fetch(`/api/admin/templates/${selected}/config`, { cache: 'no-store' });
			const json = await res.json();
			if (json?.success && json.data) {
				const pretty = JSON.stringify(json.data, null, 2);
				raw = pretty;
				originalRaw = pretty;
			} else {
				const errText = json?.error || 'Failed to load template config';
				adminToast.error({ title: 'Error', description: errText });
			}
		} catch (e) {
			adminToast.error({ title: 'Error', description: 'Failed to load template config' });
		}
	}

	$: currentTemplate = templates.find((t) => t.templateName === selected);

	$: if (selected) {
		loadTemplateConfig();
	}

	async function save() {
		try {
			saving = true;
			let parsed: any;
			try {
				parsed = JSON.parse(raw);
			} catch {
				adminToast.error({
					title: 'Invalid JSON',
					description: 'Please check your JSON syntax'
				});
				return;
			}
			if (parsed.templateName !== selected) {
				adminToast.error({
					title: 'Validation Error',
					description: 'templateName must match the selected template'
				});
				return;
			}
			const res = await fetch(`/api/admin/templates/${selected}/config`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed)
			});
			const j = await res.json();
			if (!j?.success) {
				const errText = j?.error || 'Failed to save';
				adminToast.error({ title: 'Save Failed', description: errText });
				return;
			}
			adminToast.success({ title: 'Saved successfully' });
			// Keep original in sync after successful save
			originalRaw = JSON.stringify(parsed, null, 2);
			// Refresh list cache
			await fetch('/api/admin/templates', { cache: 'no-store' });
		} catch (e) {
			adminToast.error({ title: 'Save Failed', description: 'Failed to save' });
		} finally {
			saving = false;
		}
	}

	function cancel() {
		if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard them?')) {
			return;
		}
		raw = originalRaw;
		navigateAdmin('/admin/templates');
	}
</script>

<svelte:head>
	<title>Template Customization - Admin</title>
</svelte:head>

{#if $loading}
	<div class="py-8">
		<div class="max-w-6xl mx-auto px-4">
			<p>Loading...</p>
		</div>
	</div>
{:else}
	<div class="py-8">
		<div class="max-w-6xl mx-auto px-4 space-y-6">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-semibold text-(--color-surface-950-50)">Template Customization</h1>
				<button
					on:click={() => navigateAdmin('/admin/templates')}
					class="{adminBtnSecondary} text-sm shrink-0"
				>
					Back to Templates
				</button>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<label for="template-select" class="text-sm font-medium text-(--color-surface-800-200)">Select template:</label>
				<select
					id="template-select"
					bind:value={selected}
					class="border border-surface-300-700 rounded-md px-2 py-1 bg-(--color-surface-50-950) text-(--color-surface-950-50) text-sm"
				>
					{#each templates as t}
						<option value={t.templateName}>
							{t.displayName} ({t.templateName})
						</option>
					{/each}
				</select>
				{#if selected === activeTemplate}
					<span
						class="inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] px-2 py-1 text-xs font-medium text-(--color-primary-800)"
					>
						Active
					</span>
				{/if}
			</div>

			{#if currentTemplate}
				<div class="text-sm text-(--color-surface-600-400)">
					<div><strong>Name:</strong> {currentTemplate.displayName}</div>
					<div><strong>Version:</strong> {currentTemplate.version}</div>
					{#if currentTemplate.description}
						<div><strong>Description:</strong> {currentTemplate.description}</div>
					{/if}
				</div>
			{/if}

			<!-- Side-by-side editor and help -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
				<!-- Editor -->
				<div class="space-y-2">
					<label for="template-config-editor" class="text-sm font-medium text-(--color-surface-800-200)">template.config.json</label>
					<textarea
						id="template-config-editor"
						bind:value={raw}
						class="w-full h-[500px] border border-surface-300-700 rounded-md p-3 font-mono text-sm bg-(--color-surface-50-950) text-(--color-surface-950-50)"
						placeholder="Loading template config..."
					></textarea>
					<div class="flex gap-2">
						<button
							on:click={save}
							disabled={saving}
							class="{adminBtnPrimarySm} {adminRingPrimary} disabled:opacity-50"
						>
							{saving ? 'Saving...' : 'Save'}
						</button>
						<button
							on:click={cancel}
							disabled={saving || raw === originalRaw}
							class="{adminBtnSecondary} disabled:opacity-50"
						>
							Cancel
						</button>
					</div>
				</div>

				<!-- Help -->
				<div>
					<!-- spacer to align with editor label -->
					<div class="text-sm font-medium invisible mb-2">template.config.json</div>
					<div class="rounded border border-surface-200-800 p-4 bg-(--color-surface-50-950)">
						<h2 class="font-semibold mb-2 text-(--color-surface-950-50)">template.config.json quick help</h2>
						<ul class="text-sm leading-6 list-disc pl-5 text-(--color-surface-800-200) space-y-1">
							<li><strong>templateName</strong>: folder/name id of the template.</li>
							<li><strong>displayName</strong>, <strong>version</strong>, <strong>author</strong>, <strong>description</strong>, <strong>category</strong>: metadata for Admin.</li>
							<li><strong>features</strong>: {`{ responsive, darkMode, animations, seoOptimized }`} – flags only.</li>
							<li><strong>colors</strong>: brand palette {`{ primary, secondary, accent, background, text, muted }`}.</li>
							<li><strong>fonts</strong>: {`{ heading, body }`} – used by TemplateWrapper.</li>
							<li><strong>layout</strong>: sizing {`{ maxWidth, containerPadding, gridGap }`}.</li>
							<li><strong>components</strong>: file paths for template parts (e.g. navigation → components/Header.tsx).</li>
							<li><strong>visibility</strong>: global toggles (e.g. hero, languageSelector, authButtons, footerMenu).</li>
							<li><strong>pages</strong>: entry components for routes {`{ home, gallery, album }`}.</li>
							<li><strong>assets</strong>: {`{ thumbnail }`} for Admin preview.</li>
							<li><strong>componentsConfig.header</strong>: behavior flags and menu:
								<ul class="list-disc pl-5 mt-1">
									<li><strong>showLogo</strong>, <strong>showSiteTitle</strong></li>
									<li><strong>menu</strong>: array of {`{ labelKey?, label?, href }`} (prefer labelKey for i18n)</li>
									<li><strong>enableThemeToggle</strong>, <strong>enableLanguageSelector</strong></li>
									<li><strong>showGreeting</strong>, <strong>showAuthButtons</strong></li>
								</ul>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
