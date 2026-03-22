<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, loadSession } from '$stores/auth';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';

	export let albumId: string;
	export let albumCreatorId: string;

	interface CommentRow {
		_id: string;
		body: string;
		hidden?: boolean;
		createdAt: string;
		author: { id: string; username: string; displayName: string };
	}

	let comments: CommentRow[] = [];
	let loading = true;
	let loadError = '';
	let draft = '';
	let posting = false;
	let postError = '';

	$: canModerate =
		$auth.authenticated &&
		$auth.user &&
		($auth.user.role === 'admin' || $auth.user.id === albumCreatorId);

	onMount(async () => {
		await loadSession();
		await refreshComments();
	});

	async function refreshComments() {
		loading = true;
		loadError = '';
		try {
			const q = canModerate ? '?includeHidden=true' : '';
			const res = await fetch(`/api/comments/album/${encodeURIComponent(albumId)}${q}`, {
				credentials: 'include',
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				loadError = data?.message || data?.error || $t('albums.commentsLoadError');
				comments = [];
				return;
			}
			comments = data.comments || [];
		} catch (e) {
			logger.error('Album comments load:', e);
			loadError = $t('albums.commentsLoadError');
			comments = [];
		} finally {
			loading = false;
		}
	}

	async function submitComment() {
		const text = draft.trim();
		if (!text || posting) return;
		posting = true;
		postError = '';
		try {
			const res = await fetch(`/api/comments/album/${encodeURIComponent(albumId)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ body: text }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				postError = data?.message || data?.error || 'Failed to post';
				return;
			}
			draft = '';
			comments = [data, ...comments];
		} catch (e) {
			logger.error('Album comment post:', e);
			postError = 'Failed to post';
		} finally {
			posting = false;
		}
	}

	async function setHidden(comment: CommentRow, hidden: boolean) {
		try {
			const res = await fetch(`/api/comments/${encodeURIComponent(comment._id)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ hidden }),
			});
			if (!res.ok) return;
			comments = comments.map((c) => (c._id === comment._id ? { ...c, hidden } : c));
		} catch (e) {
			logger.error('Album comment hide:', e);
		}
	}
</script>

<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="album-comments-heading">
	<h2 id="album-comments-heading" class="text-lg font-semibold text-gray-900">{$t('albums.commentsTitle')}</h2>

	{#if loading}
		<p class="mt-4 text-sm text-gray-500">{$t('loading.loading')}</p>
	{:else if loadError}
		<p class="mt-4 text-sm text-red-600">{loadError}</p>
	{:else if comments.length === 0}
		<p class="mt-4 text-sm text-gray-600">{$t('albums.commentsEmpty')}</p>
	{:else}
		<ul class="mt-4 space-y-4">
			{#each comments as c}
				<li class="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<p class="text-sm font-medium text-gray-900">{c.author.displayName || c.author.username}</p>
						<time class="text-xs text-gray-500" datetime={c.createdAt}>
							{new Date(c.createdAt).toLocaleString()}
						</time>
					</div>
					{#if c.hidden}
						<p class="mt-1 text-xs text-amber-700">{$t('albums.commentsHidden')}</p>
					{/if}
					<p class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
					{#if canModerate}
						<div class="mt-2">
							<button
								type="button"
								class="text-xs text-primary-600 hover:underline"
								on:click={() => setHidden(c, !c.hidden)}
							>
								{c.hidden ? $t('albums.commentsShow') : $t('albums.commentsHide')}
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if $auth.authenticated}
		<div class="mt-6 border-t border-gray-100 pt-6">
			{#if postError}
				<p class="mb-2 text-sm text-red-600">{postError}</p>
			{/if}
			<label for="album-comment-draft" class="sr-only">{$t('albums.commentsPlaceholder')}</label>
			<textarea
				id="album-comment-draft"
				bind:value={draft}
				rows="3"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
				placeholder={$t('albums.commentsPlaceholder')}
				maxlength="4000"
			/>
			<button
				type="button"
				disabled={posting || !draft.trim()}
				class="mt-2 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
				on:click={submitComment}
			>
				{posting ? $t('albums.commentsPosting') : $t('albums.commentsPost')}
			</button>
		</div>
	{:else}
		<p class="mt-6 text-sm text-gray-600">
			<a href="/login?redirect={encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}" class="text-primary-600 hover:underline">
				{$t('albums.commentsSignIn')}
			</a>
		</p>
	{/if}

	{#if canModerate}
		<p class="mt-3 text-xs text-gray-500">{$t('albums.commentsModeratorHint')}</p>
	{/if}
</section>
