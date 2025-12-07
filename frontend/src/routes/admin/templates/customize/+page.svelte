<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

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

	let notification = {
		isOpen: false,
		type: 'info' as 'success' | 'error' | 'info' | 'warning',
		title: '',
		message: ''
	};

	onMount(async () => {
		await loadTemplates();
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
			const current = cfgJson?.data?.template?.activeTemplate || 'default';
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
				showNotification('error', 'Error', error);
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
				showNotification('error', 'Save Failed', error);
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
		raw = originalRaw;
		goto('/admin/templates');
	}
</script>

<svelte:head>
	<title>Template Customization - Admin</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-6xl mx-auto px-4">
			<p>Loading...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-6xl mx-auto px-4 space-y-6">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-semibold text-gray-900">Template Customization</h1>
				<button
					on:click={() => goto('/admin/templates')}
					class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
				>
					Back to Templates
				</button>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<label class="text-sm font-medium text-gray-700">Select template:</label>
				<select
					bind:value={selected}
					class="border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 text-sm"
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
				<div class="text-sm text-gray-600">
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
					<label class="text-sm font-medium text-gray-700">template.config.json</label>
					<textarea
						bind:value={raw}
						class="w-full h-[500px] border border-gray-300 rounded-md p-3 font-mono text-sm bg-white text-gray-900"
						placeholder="Loading template config..."
					></textarea>
					<div class="flex gap-2">
						<button
							on:click={save}
							disabled={saving}
							class="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
						>
							{saving ? 'Saving...' : 'Save'}
						</button>
						<button
							on:click={cancel}
							disabled={saving || raw === originalRaw}
							class="px-4 py-2 rounded-md bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-gray-300"
						>
							Cancel
						</button>
					</div>
				</div>

				<!-- Help -->
				<div>
					<!-- spacer to align with editor label -->
					<div class="text-sm font-medium invisible mb-2">template.config.json</div>
					<div class="rounded border border-gray-200 p-4 bg-gray-50">
						<h2 class="font-semibold mb-2 text-gray-900">template.config.json quick help</h2>
						<ul class="text-sm leading-6 list-disc pl-5 text-gray-700 space-y-1">
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
