<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Image from '@tiptap/extension-image';
	import Link from '@tiptap/extension-link';
	import TextAlign from '@tiptap/extension-text-align';
	import Underline from '@tiptap/extension-underline';
	import { TextStyle } from '@tiptap/extension-text-style';
	import Color from '@tiptap/extension-color';

	export let value = '';
	export let onChange: (value: string) => void;
	export let placeholder = 'Start typing...';
	export let height = 200;
	export let isRTL = false;
	export let className = '';

	let editor: Editor | null = null;
	let editorElement: HTMLDivElement | null = null;
	let isInternalUpdate = false;

	onMount(() => {
		if (!editorElement) return;

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
				TextStyle,
				Color,
				TextAlign.configure({
					types: ['heading', 'paragraph'],
					alignments: ['left', 'center', 'right']
				}),
				Image.configure({
					HTMLAttributes: {
						class: 'max-w-full h-auto rounded-lg'
					}
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
					onChange(editor.getHTML());
				}
			},
			editorProps: {
				attributes: {
					class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${isRTL
						? 'rtl'
						: 'ltr'} text-gray-900 bg-white`,
					dir: isRTL ? 'rtl' : 'ltr',
					style: `min-height: ${height}px;`,
					'data-placeholder': placeholder
				}
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	// Update editor content when value prop changes externally
	$: if (editor && value !== undefined && !isInternalUpdate) {
		const currentContent = editor.getHTML();
		if (value !== currentContent && value.trim() !== currentContent.trim()) {
			isInternalUpdate = true;
			editor.commands.setContent(value, { emitUpdate: false });
			setTimeout(() => {
				isInternalUpdate = false;
			}, 10);
		}
	}

	// Update direction when isRTL changes
	$: if (editor && editorElement) {
		editorElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
	}

	function toggleBold() {
		editor?.chain().focus().toggleBold().run();
	}

	function toggleItalic() {
		editor?.chain().focus().toggleItalic().run();
	}

	function toggleUnderline() {
		editor?.chain().focus().toggleUnderline().run();
	}

	function toggleStrike() {
		editor?.chain().focus().toggleStrike().run();
	}

	function toggleCode() {
		editor?.chain().focus().toggleCode().run();
	}

	function setHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
		editor?.chain().focus().toggleHeading({ level }).run();
	}

	function setParagraph() {
		editor?.chain().focus().setParagraph().run();
	}

	function toggleBulletList() {
		editor?.chain().focus().toggleBulletList().run();
	}

	function toggleOrderedList() {
		editor?.chain().focus().toggleOrderedList().run();
	}

	function setTextAlign(alignment: 'left' | 'center' | 'right') {
		editor?.chain().focus().setTextAlign(alignment).run();
	}

	function insertLink() {
		const url = window.prompt('Enter URL:');
		if (url && editor) {
			editor.chain().focus().setLink({ href: url }).run();
		}
	}

	function removeLink() {
		editor?.chain().focus().unsetLink().run();
	}

	function insertImage() {
		const url = window.prompt('Enter image URL:');
		if (url && editor) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	}

	function insertHorizontalRule() {
		editor?.chain().focus().setHorizontalRule().run();
	}

	function undo() {
		editor?.chain().focus().undo().run();
	}

	function redo() {
		editor?.chain().focus().redo().run();
	}

	$: isBold = editor?.isActive('bold') || false;
	$: isItalic = editor?.isActive('italic') || false;
	$: isUnderline = editor?.isActive('underline') || false;
	$: isStrike = editor?.isActive('strike') || false;
	$: isCode = editor?.isActive('code') || false;
	$: isHeading1 = editor?.isActive('heading', { level: 1 }) || false;
	$: isHeading2 = editor?.isActive('heading', { level: 2 }) || false;
	$: isHeading3 = editor?.isActive('heading', { level: 3 }) || false;
	$: isBulletList = editor?.isActive('bulletList') || false;
	$: isOrderedList = editor?.isActive('orderedList') || false;
	$: isLink = editor?.isActive('link') || false;
	$: canUndo = editor?.can().undo() || false;
	$: canRedo = editor?.can().redo() || false;
</script>

<div class="border border-gray-300 rounded-md {className}">
	<!-- Toolbar -->
	{#if editor}
		<div class="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50 text-gray-700">
			<!-- Text Formatting -->
			<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
				<button
					type="button"
					on:click={toggleBold}
					class="p-2 rounded hover:bg-gray-200 {isBold ? 'bg-gray-300' : ''}"
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
					on:click={toggleItalic}
					class="p-2 rounded hover:bg-gray-200 {isItalic ? 'bg-gray-300' : ''}"
					title="Italic"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path d="M8 3a1 1 0 000 2h1.5l-3 10H5a1 1 0 100 2h6a1 1 0 100-2h-1.5l3-10H14a1 1 0 100-2H8z" />
					</svg>
				</button>
				<button
					type="button"
					on:click={toggleUnderline}
					class="p-2 rounded hover:bg-gray-200 {isUnderline ? 'bg-gray-300' : ''}"
					title="Underline"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
				<button
					type="button"
					on:click={toggleStrike}
					class="p-2 rounded hover:bg-gray-200 {isStrike ? 'bg-gray-300' : ''}"
					title="Strikethrough"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
				<button
					type="button"
					on:click={toggleCode}
					class="p-2 rounded hover:bg-gray-200 {isCode ? 'bg-gray-300' : ''}"
					title="Code"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
							clip-rule="evenodd"
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
							setParagraph();
						} else {
							setHeading(level as 1 | 2 | 3 | 4 | 5 | 6);
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
					on:click={toggleBulletList}
					class="p-2 rounded hover:bg-gray-200 {isBulletList ? 'bg-gray-300' : ''}"
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
					on:click={toggleOrderedList}
					class="p-2 rounded hover:bg-gray-200 {isOrderedList ? 'bg-gray-300' : ''}"
					title="Numbered List"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M3 4a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zm0 3a1 1 0 000 2h.01a1 1 0 100-2H3zM6 4a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zm0 3a1 1 0 000 2h.01a1 1 0 100-2H6zM9 4a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9zm0 3a1 1 0 000 2h.01a1 1 0 100-2H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>

			<!-- Text Alignment -->
			<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
				<button
					type="button"
					on:click={() => setTextAlign('left')}
					class="p-2 rounded hover:bg-gray-200"
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
					on:click={() => setTextAlign('center')}
					class="p-2 rounded hover:bg-gray-200"
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
					on:click={() => setTextAlign('right')}
					class="p-2 rounded hover:bg-gray-200"
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
			<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
				<button
					type="button"
					on:click={insertLink}
					class="p-2 rounded hover:bg-gray-200 {isLink ? 'bg-gray-300' : ''}"
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
				<button
					type="button"
					on:click={removeLink}
					disabled={!isLink}
					class="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
					title="Remove Link"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>

			<!-- Image & Horizontal Rule -->
			<div class="flex gap-1 border-r border-gray-300 pr-2 mr-2">
				<button
					type="button"
					on:click={insertImage}
					class="p-2 rounded hover:bg-gray-200"
					title="Insert Image"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
				<button
					type="button"
					on:click={insertHorizontalRule}
					class="p-2 rounded hover:bg-gray-200"
					title="Horizontal Rule"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>

			<!-- Undo/Redo -->
			<div class="flex gap-1">
				<button
					type="button"
					on:click={undo}
					disabled={!canUndo}
					class="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
					title="Undo"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
						/>
					</svg>
				</button>
				<button
					type="button"
					on:click={redo}
					disabled={!canRedo}
					class="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
					title="Redo"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Editor -->
		<div bind:this={editorElement} class="overflow-y-auto"></div>
	{/if}
</div>

<style>
	:global([data-placeholder]:empty:before) {
		content: attr(data-placeholder);
		color: #9ca3af;
		pointer-events: none;
	}
</style>
