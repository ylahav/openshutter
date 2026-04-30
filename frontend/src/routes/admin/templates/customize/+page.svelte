<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
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
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let message: string | null = null;
	$: hasUnsavedChanges = raw !== originalRaw;

	let notification = {
		isOpen: false,
		type: 'info' as 'success' | 'error' | 'info' | 'warning',
		title: '',
		message: ''
	};

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
			loading = true;
			error = null;
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
			error = 'Failed to load templates';
			showNotification('error', 'Error', 'Failed to load templates');
		} finally {
			loading = false;
		}
	}

	async function loadTemplateConfig() {
		if (!selected) return;
		try {
			error = null;
			raw = '';
			const res = await fetch(`/api/admin/templates/${selected}/config`, { cache: 'no-store' });
			const json = await res.json();
			if (json?.success && json.data) {
				const pretty = JSON.stringify(json.data, null, 2);
				raw = pretty;
				originalRaw = pretty;
			} else {
				error = json?.error || 'Failed to load template config';
				showNotification('error', 'Error', error || 'Failed to load template config');
			}
		} catch (e) {
			error = 'Failed to load template config';
			showNotification('error', 'Error', error);
		}
	}

	$: currentTemplate = templates.find((t) => t.templateName === selected);

	$: if (selected) {
		loadTemplateConfig();
	}

	async function save() {
		try {
			saving = true;
			error = null;
			message = null;
			let parsed: any;
			try {
				parsed = JSON.parse(raw);
			} catch {
				error = 'Invalid JSON';
				showNotification('error', 'Invalid JSON', 'Please check your JSON syntax');
				return;
			}
			if (parsed.templateName !== selected) {
				error = 'templateName must match the selected template';
				showNotification('error', 'Validation Error', error);
				return;
			}
			const res = await fetch(`/api/admin/templates/${selected}/config`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed)
			});
			const j = await res.json();
			if (!j?.success) {
				error = j?.error || 'Failed to save';
				showNotification('error', 'Save Failed', error || 'Failed to save');
				return;
			}
			message = 'Saved successfully';
			showNotification('success', 'Success', message);
			// Keep original in sync after successful save
			originalRaw = JSON.stringify(parsed, null, 2);
			// Refresh list cache
			await fetch('/api/admin/templates', { cache: 'no-store' });
		} catch (e) {
			error = 'Failed to save';
			showNotification('error', 'Save Failed', error);
		} finally {
			saving = false;
			setTimeout(() => {
				message = null;
			}, 2000);
		}
	}

	function showNotification(type: 'success' | 'error' | 'info' | 'warning', title: string, msg: string) {
		notification = {
			isOpen: true,
			type,
			title,
			message: msg
		};
	}

	function closeNotification() {
		notification.isOpen = false;
	}

	function cancel() {
		if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard them?')) {
			return;
		}
		raw = originalRaw;
		goto('/admin/templates');
	}
</script>

<svelte:head>
	<title>Template Customization - Admin</title>
</svelte:head>

{#if loading}
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
					on:click={() => goto('/admin/templates')}
					class="inline-flex items-center px-4 py-2 border border-surface-300-700 rounded-md shadow-sm text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) hover:bg-(--color-surface-50-950)"
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
					<span class="text-xs px-2 py-1 rounded bg-green-600 text-white">Active</span>
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

			{#if error}
				<div class="p-3 rounded bg-red-100 text-red-800 border border-red-200">{error}</div>
			{/if}
			{#if message}
				<div class="p-3 rounded bg-green-100 text-green-800 border border-green-200">{message}</div>
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
							class="px-4 py-2 rounded-md bg-(--color-primary-600) text-white disabled:opacity-50 hover:bg-(--color-primary-700)"
						>
							{saving ? 'Saving...' : 'Save'}
						</button>
						<button
							on:click={cancel}
							disabled={saving || raw === originalRaw}
							class="px-4 py-2 rounded-md bg-(--color-surface-200-800) text-(--color-surface-800-200) disabled:opacity-50 hover:bg-(--color-surface-300-700)"
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

<NotificationDialog
	isOpen={notification.isOpen}
	onClose={closeNotification}
	type={notification.type}
	title={notification.title}
	message={notification.message}
/>
