<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import TextAlign from '@tiptap/extension-text-align';
	import Underline from '@tiptap/extension-underline';
	import { TextStyle } from '@tiptap/extension-text-style';
	import Color from '@tiptap/extension-color';
	import Link from '@tiptap/extension-link';
	import { logger } from '$lib/utils/logger';

	export let value = '';
	export let onChange: (value: string) => void;
	export let placeholder = 'Start typing...';
	export let height = 200;
	export let isRTL = false;
	export let className = '';

	let editor: Editor | null = null;
	let editorElement: HTMLDivElement | null = null;
	let editorDiv: HTMLDivElement | null = null; // Fallback contenteditable
	let isInternalUpdate = false;
	let useFallback = false;
	let lastEmittedValue = value;
	let lastExternalValue = value;

	function normalizeTrailingSpace(currentEditor: Editor, html: string) {
		const textContent = currentEditor.state.doc.textBetween(
			0,
			currentEditor.state.doc.content.size,
			'\n',
			'\n'
		);

		if (!textContent.endsWith(' ') || !html.endsWith('</p>')) {
			return html;
		}

		// Preserve a trailing space at the end of the last paragraph.
		return html.replace(/<\/p>\s*$/, '&nbsp;</p>');
	}

	onMount(() => {
		if (!editorElement) return;

		try {
			editor = new Editor({
				element: editorElement,
				extensions: [
					StarterKit.configure({
						heading: false,
						bold: true,
						italic: true,
						strike: true,
						code: false,
						bulletList: true,
						orderedList: true,
						listItem: true,
						hardBreak: false,
						horizontalRule: false,
						link: false,
						underline: false
					}),
					Underline,
					TextStyle,
					Color,
					TextAlign.configure({
						types: ['heading', 'paragraph'],
						alignments: ['left', 'center', 'right']
					}),
					Link.configure({
						openOnClick: false,
						HTMLAttributes: {
							class: 'text-blue-600 underline cursor-pointer hover:text-blue-800'
						}
					})
				],
				content: value || '',
				onUpdate: ({ editor }) => {
					if (!isInternalUpdate) {
						const rawHtml = editor.getHTML();
						const normalizedHtml = normalizeTrailingSpace(editor, rawHtml);
						if (normalizedHtml !== lastEmittedValue) {
							lastEmittedValue = normalizedHtml;
							onChange(normalizedHtml);
						}
					}
				},
				editorProps: {
					attributes: {
						class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${isRTL
							? 'rtl'
							: 'ltr'} text-gray-900 bg-white`,
						dir: isRTL ? 'rtl' : 'ltr',
						style: `min-height: ${height}px; padding: 0.75rem;`,
						'data-placeholder': placeholder
					}
				}
			});
		} catch (error) {
			logger.error('Failed to initialize Tiptap editor:', error);
			useFallback = true;
			// Fallback to contenteditable if Tiptap fails
			if (editorDiv && value) {
				editorDiv.innerHTML = value;
			}
		}
	});

	onDestroy(() => {
		editor?.destroy();
	});

	// Update editor content when value prop changes externally
	$: if (editor && value !== undefined && !isInternalUpdate && value !== lastExternalValue) {
		const nextValue = value || '';
		isInternalUpdate = true;
		editor.commands.setContent(nextValue, { emitUpdate: false });
		setTimeout(() => {
			isInternalUpdate = false;
		}, 10);
		lastExternalValue = value;
		lastEmittedValue = nextValue;
	}
	
	// Keep fallback editor in sync with value
	$: if (useFallback && editorDiv && value !== undefined && !isInternalUpdate) {
		if (editorDiv.innerHTML !== value) {
			editorDiv.innerHTML = value || '';
		}
	}

	// Update direction when isRTL changes
	$: if (editor && editorElement) {
		editorElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
	}

	function execCommand(command: string, value?: string) {
		if (editor && !useFallback) {
			switch (command) {
				case 'bold':
					editor.chain().focus().toggleBold().run();
					break;
				case 'italic':
					editor.chain().focus().toggleItalic().run();
					break;
				case 'underline':
					editor.chain().focus().toggleUnderline().run();
					break;
				case 'strikeThrough':
					editor.chain().focus().toggleStrike().run();
					break;
				case 'insertUnorderedList':
					editor.chain().focus().toggleBulletList().run();
					break;
				case 'insertOrderedList':
					editor.chain().focus().toggleOrderedList().run();
					break;
				case 'justifyLeft':
					editor.chain().focus().setTextAlign('left').run();
					break;
				case 'justifyCenter':
					editor.chain().focus().setTextAlign('center').run();
					break;
				case 'justifyRight':
					editor.chain().focus().setTextAlign('right').run();
					break;
				case 'formatBlock':
					if (value === 'p') {
						editor.chain().focus().setParagraph().run();
					} else if (value?.startsWith('h')) {
						const level = parseInt(value.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
						editor.chain().focus().toggleHeading({ level }).run();
					}
					break;
			}
		} else if (editorDiv && useFallback) {
			// Fallback to document.execCommand
			document.execCommand(command, false, value);
			editorDiv?.focus();
			handleInput();
		}
	}

	function handleInput() {
		if (editorDiv && !isInternalUpdate) {
			isInternalUpdate = true;
			onChange(editorDiv.innerHTML);
			setTimeout(() => {
				isInternalUpdate = false;
			}, 0);
		}
	}

	function insertLink() {
		if (editor && !useFallback) {
			const url = window.prompt('Enter URL:');
			if (url) {
				editor.chain().focus().setLink({ href: url }).run();
			}
		} else if (editorDiv && useFallback) {
			const url = window.prompt('Enter URL:');
			if (url) {
				execCommand('createLink', url);
			}
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
	{#if useFallback}
		<!-- Fallback to contenteditable if Tiptap fails to initialize -->
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
	{:else}
		<div bind:this={editorElement} class="overflow-y-auto"></div>
	{/if}
</div>

<style>
	:global([data-placeholder]:empty:before) {
		content: attr(data-placeholder);
		color: #9ca3af;
		pointer-events: none;
	}

	div[contenteditable='true']:focus {
		outline: none;
	}
</style>
