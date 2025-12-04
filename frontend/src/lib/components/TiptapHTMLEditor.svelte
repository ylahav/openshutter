<script lang="ts">
	import { onMount } from 'svelte';

	export let value = '';
	export let onChange: (value: string) => void;
	export let placeholder = 'Start typing...';
	export let height = 200;
	export let isRTL = false;
	export let className = '';

	let editorDiv: HTMLDivElement;
	let isUpdating = false;

	onMount(() => {
		if (editorDiv && value) {
			editorDiv.innerHTML = value;
		}
	});

	// Update content when value prop changes externally
	$: {
		if (editorDiv && value !== undefined && !isUpdating) {
			const currentContent = editorDiv.innerHTML;
			if (value !== currentContent && value.trim() !== currentContent.trim()) {
				editorDiv.innerHTML = value;
			}
		}
	}

	function handleInput() {
		if (editorDiv && !isUpdating) {
			isUpdating = true;
			onChange(editorDiv.innerHTML);
			setTimeout(() => {
				isUpdating = false;
			}, 0);
		}
	}

	function execCommand(command: string, value?: string) {
		document.execCommand(command, false, value);
		editorDiv?.focus();
		handleInput();
	}

	function insertLink() {
		const url = window.prompt('Enter URL:');
		if (url) {
			execCommand('createLink', url);
		}
	}

	$: editorStyle = `min-height: ${height}px; padding: 0.75rem;`;
</script>

<div class="border border-gray-300 rounded-md {className}">
	<!-- Toolbar -->
	<div class="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50 text-gray-700">
		<!-- Text Formatting -->
		<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
			<button
				type="button"
				on:click={() => execCommand('bold')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Bold"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M5 4a1 1 0 011-1h5.5a3.5 3.5 0 013.5 3.5v.5a3 3 0 01-1.5 2.6A3.5 3.5 0 0115 14.5V15a3.5 3.5 0 01-3.5 3.5H6a1 1 0 01-1-1V4zm2 1v4h4.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H7zm0 6v4h5.5a1.5 1.5 0 001.5-1.5v-.5a1.5 1.5 0 00-1.5-1.5H7z"
					/>
				</svg>
			</button>
			<button
				type="button"
				on:click={() => execCommand('italic')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Italic"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M8 3a1 1 0 000 2h1.5l-3 10H5a1 1 0 100 2h6a1 1 0 100-2h-1.5l3-10H14a1 1 0 100-2H8z"
					/>
				</svg>
			</button>
			<button
				type="button"
				on:click={() => execCommand('underline')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Underline"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
					/>
				</svg>
			</button>
			<button
				type="button"
				on:click={() => execCommand('strikeThrough')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Strikethrough"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0-4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
					/>
				</svg>
			</button>
		</div>

		<!-- Headings -->
		<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
			<select
				on:change={(e) => {
					const level = parseInt(e.currentTarget.value);
					if (level === 0) {
						execCommand('formatBlock', 'p');
					} else {
						execCommand('formatBlock', `h${level}`);
					}
				}}
				class="px-2 py-1 text-sm border border-gray-300 rounded text-gray-700 bg-white"
			>
				<option value={0}>Paragraph</option>
				<option value={1}>Heading 1</option>
				<option value={2}>Heading 2</option>
				<option value={3}>Heading 3</option>
				<option value={4}>Heading 4</option>
				<option value={5}>Heading 5</option>
				<option value={6}>Heading 6</option>
			</select>
		</div>

		<!-- Lists -->
		<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
			<button
				type="button"
				on:click={() => execCommand('insertUnorderedList')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Bullet List"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			<button
				type="button"
				on:click={() => execCommand('insertOrderedList')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Numbered List"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M3 4a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zM6 4a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zM9 4a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>

		<!-- Text Alignment -->
		<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
			<button
				type="button"
				on:click={() => execCommand('justifyLeft')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Align Left"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			<button
				type="button"
				on:click={() => execCommand('justifyCenter')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Align Center"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M3 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
			<button
				type="button"
				on:click={() => execCommand('justifyRight')}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Align Right"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>

		<!-- Link -->
		<div class="flex gap-1">
			<button
				type="button"
				on:click={insertLink}
				class="p-2 rounded hover:bg-gray-200 text-gray-700 hover:text-gray-900"
				title="Insert Link"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Editor -->
	<div
		bind:this={editorDiv}
		contenteditable="true"
		on:input={handleInput}
		on:paste={handleInput}
		class="prose prose-sm max-w-none focus:outline-none text-gray-900 bg-white overflow-y-auto {isRTL
			? 'rtl text-right'
			: 'ltr text-left'}"
		style={editorStyle}
		dir={isRTL ? 'rtl' : 'ltr'}
		data-placeholder={placeholder}
	></div>
</div>

<style>
	div[contenteditable='true']:empty:before {
		content: attr(data-placeholder);
		color: #9ca3af;
		pointer-events: none;
	}

	div[contenteditable='true']:focus {
		outline: none;
	}
</style>
