<!-- Image URL text field + optional file upload (stores returned serve URL in value). -->
<script lang="ts">
	import { handleApiErrorResponse } from '$lib/utils/errorHandler';

	/** Image URL (e.g. `/api/storage/serve/...` or external https URL). */
	export let value = '';
	/** Notifies parent on every change (text input or after upload). Use with `value` for controlled updates. */
	export let onValueInput: ((v: string) => void) | undefined = undefined;
	export let id: string;
	export let label: string;
	export let placeholder = 'https://… or upload a file';
	export let helpText = '';
	/** POST endpoint: multipart field `file`. Response: `{ data?: { url }, url?, error? }`. */
	export let uploadEndpoint = '/api/admin/site-config/upload-asset';
	/** Max bytes (default matches admin site-config upload). */
	export let maxBytes = 5 * 1024 * 1024;
	export let textInputClass =
		'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm';
	export let labelClass = 'block text-sm font-medium text-gray-700';
	export let helpTextClass = 'text-xs text-gray-500';
	export let uploadButtonClass =
		'inline-flex shrink-0 cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50';
	export let thumbClass = 'h-14 w-auto max-w-[200px] rounded border border-gray-200 object-cover';

	let uploading = false;
	let uploadError = '';

	async function onFileSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		uploadError = '';
		if (file.size > maxBytes) {
			uploadError = `File must be under ${Math.round(maxBytes / (1024 * 1024))}MB.`;
			return;
		}

		uploading = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch(uploadEndpoint, { method: 'POST', body: formData });
			if (!res.ok) {
				await handleApiErrorResponse(res);
			}
			const json = await res.json();
			const url = json?.data?.url ?? json?.url;
			if (typeof url !== 'string' || !url.trim()) {
				throw new Error(json?.error || 'Upload did not return an image URL');
			}
			onValueInput?.(url.trim());
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}
</script>

<div class="space-y-2">
	<label for={id} class={labelClass}>
		{label}
	</label>
	<div class="flex flex-wrap items-start gap-2">
		<input
			{id}
			type="text"
			{value}
			on:input={(e) => onValueInput?.(e.currentTarget.value)}
			{placeholder}
			class={textInputClass}
			aria-describedby={helpText ? `${id}-help` : undefined}
		/>
		<label class={uploadButtonClass}>
			<input
				type="file"
				accept="image/jpeg,image/png,image/gif,image/webp"
				class="sr-only"
				disabled={uploading}
				on:change={onFileSelected}
			/>
			{uploading ? 'Uploading…' : 'Upload'}
		</label>
	</div>
	{#if uploadError}
		<p class="text-xs text-red-600" role="status">{uploadError}</p>
	{/if}
	{#if helpText}
		<p id="{id}-help" class={helpTextClass}>{helpText}</p>
	{/if}
	{#if value?.trim()}
		<div class="mt-1 flex items-center gap-2">
			<img src={value.trim()} alt="" class={thumbClass} />
		</div>
	{/if}
</div>
