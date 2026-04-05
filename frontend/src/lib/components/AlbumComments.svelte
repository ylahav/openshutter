<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { auth, loadSession } from '$stores/auth';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';
	import { linkifyCommentBody } from '$lib/utils/linkifyCommentBody';

	export let albumId: string;
	export let albumCreatorId: string;
	export let albumAlias = '';
	/** When set, only comments for this photo (or thread on this photo). */
	export let photoId: string | undefined = undefined;
	export let variant: 'light' | 'dark' = 'light';
	export let compact = false;

	interface CommentRow {
		_id: string;
		body: string;
		hidden?: boolean;
		createdAt: string;
		parentCommentId?: string | null;
		photoId?: string | null;
		author: { id: string; username: string; displayName: string };
		reportCount?: number;
		hasReportedByViewer?: boolean;
	}

	let comments: CommentRow[] = [];
	let loading = true;
	let loadError = '';
	let draft = '';
	let posting = false;
	let postError = '';
	let replyingTo: CommentRow | null = null;
	let mounted = false;

	$: canModerate =
		$auth.authenticated &&
		$auth.user &&
		($auth.user.role === 'admin' || $auth.user.id === albumCreatorId);

	function buildTree(flat: CommentRow[]) {
		const roots = flat.filter((c) => !c.parentCommentId);
		const byParent = new Map<string, CommentRow[]>();
		for (const c of flat) {
			if (c.parentCommentId) {
				const k = c.parentCommentId;
				if (!byParent.has(k)) byParent.set(k, []);
				byParent.get(k)!.push(c);
			}
		}
		for (const arr of byParent.values()) {
			arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		}
		roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		return { roots, byParent };
	}

	$: tree = buildTree(comments);

	onMount(async () => {
		await loadSession();
		mounted = true;
	});

	$: if (browser && mounted && albumId) {
		photoId;
		canModerate;
		void refreshComments();
	}

	async function refreshComments() {
		loading = true;
		loadError = '';
		try {
			const params = new URLSearchParams();
			if (canModerate) params.set('includeHidden', 'true');
			if (photoId) params.set('photoId', photoId);
			const q = params.toString();
			const res = await fetch(`/api/comments/album/${encodeURIComponent(albumId)}${q ? `?${q}` : ''}`, {
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
				body: JSON.stringify({
					body: text,
					parentCommentId: replyingTo?._id ?? null,
					photoId: photoId ?? null,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				postError = data?.message || data?.error || 'Failed to post';
				return;
			}
			draft = '';
			replyingTo = null;
			await refreshComments();
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
			await refreshComments();
		} catch (e) {
			logger.error('Album comment hide:', e);
		}
	}

	async function report(comment: CommentRow) {
		try {
			const res = await fetch(`/api/comments/${encodeURIComponent(comment._id)}/report`, {
				method: 'POST',
				credentials: 'include',
			});
			if (!res.ok) return;
			await refreshComments();
		} catch (e) {
			logger.error('Album comment report:', e);
		}
	}

	$: wrapClass =
		variant === 'dark'
			? 'rounded-lg border border-white/20 bg-black/50 p-4 text-white shadow-none'
			: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm';

	$: titleClass = variant === 'dark' ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-900';
	$: metaClass = variant === 'dark' ? 'text-xs text-white/60' : 'text-xs text-gray-500';
	$: bodyClass = variant === 'dark' ? 'text-sm text-white/90 whitespace-pre-wrap' : 'text-sm text-gray-700 whitespace-pre-wrap';
	$: inputClass =
		variant === 'dark'
			? 'w-full rounded-md border border-white/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/50'
			: 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
</script>

<section
	id="comments"
	class={compact ? `${wrapClass} max-h-[min(50vh,420px)] flex flex-col overflow-hidden` : wrapClass}
	aria-labelledby="album-comments-heading"
>
	<h2 id="album-comments-heading" class={compact ? `${titleClass} shrink-0 text-base` : titleClass}>
		{$t('albums.commentsTitle')}
		{#if photoId}
			<span class={metaClass}> · {$t('albums.commentsOnPhoto')}</span>
		{/if}
	</h2>

	<div class={compact ? 'mt-3 flex-1 min-h-0 overflow-y-auto pr-1' : ''}>
		{#if loading}
			<p class="mt-4 text-sm opacity-70">{$t('loading.loading')}</p>
		{:else if loadError}
			<p class="mt-4 text-sm text-red-400">{loadError}</p>
		{:else if comments.length === 0}
			<p class="mt-4 text-sm opacity-80">{$t('albums.commentsEmpty')}</p>
		{:else}
			<ul class="mt-4 space-y-6">
				{#each tree.roots as c}
					<li class="border-b border-current border-opacity-10 pb-4 last:border-0">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<p class="text-sm font-medium opacity-95">{c.author.displayName || c.author.username}</p>
							<time class={metaClass} datetime={c.createdAt}>
								{new Date(c.createdAt).toLocaleString()}
							</time>
						</div>
						{#if c.hidden}
							<p class="mt-1 text-xs text-amber-300">{$t('albums.commentsHidden')}</p>
						{/if}
						<!-- svelte-ignore a11y-no-html -->
						<p class={`${bodyClass} [&_a]:underline`}>
							{@html linkifyCommentBody(c.body)}
						</p>
						{#if canModerate && (c.reportCount ?? 0) > 0}
							<p class="mt-1 text-xs opacity-60">
								{$t('albums.commentsReportsModerator')} ({c.reportCount})
							</p>
						{/if}
						<div class="mt-2 flex flex-wrap gap-3 text-xs">
							{#if $auth.authenticated && !c.parentCommentId}
								<button
									type="button"
									class={variant === 'dark' ? 'text-sky-400 hover:underline' : 'text-primary-600 hover:underline'}
									on:click={() => (replyingTo = replyingTo?._id === c._id ? null : c)}
								>
									{$t('albums.commentsReply')}
								</button>
							{/if}
							{#if $auth.authenticated && c.author.id !== $auth.user?.id && !c.hasReportedByViewer}
								<button
									type="button"
									class={variant === 'dark' ? 'text-sky-400 hover:underline' : 'text-primary-600 hover:underline'}
									on:click={() => report(c)}
								>
									{$t('albums.commentsReport')}
								</button>
							{/if}
							{#if canModerate}
								<button
									type="button"
									class={variant === 'dark' ? 'text-sky-400 hover:underline' : 'text-primary-600 hover:underline'}
									on:click={() => setHidden(c, !c.hidden)}
								>
									{c.hidden ? $t('albums.commentsShow') : $t('albums.commentsHide')}
								</button>
							{/if}
						</div>
						{#if tree.byParent.get(c._id)?.length}
							<ul class="mt-3 ml-4 space-y-3 border-l border-current border-opacity-15 pl-3">
								{#each tree.byParent.get(c._id) || [] as r}
									<li>
										<div class="flex flex-wrap items-baseline justify-between gap-2">
											<p class="text-sm font-medium opacity-90">{r.author.displayName || r.author.username}</p>
											<time class={metaClass} datetime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time>
										</div>
										{#if r.hidden}
											<p class="mt-1 text-xs text-amber-300">{$t('albums.commentsHidden')}</p>
										{/if}
										<!-- svelte-ignore a11y-no-html -->
										<p class={`${bodyClass} [&_a]:underline`}>
											{@html linkifyCommentBody(r.body)}
										</p>
										<div class="mt-2 flex flex-wrap gap-3 text-xs">
											{#if $auth.authenticated && r.author.id !== $auth.user?.id && !r.hasReportedByViewer}
												<button
													type="button"
													class={variant === 'dark' ? 'text-sky-400 hover:underline' : 'text-primary-600 hover:underline'}
													on:click={() => report(r)}
												>
													{$t('albums.commentsReport')}
												</button>
											{/if}
											{#if canModerate}
												<button
													type="button"
													class={variant === 'dark' ? 'text-sky-400 hover:underline' : 'text-primary-600 hover:underline'}
													on:click={() => setHidden(r, !r.hidden)}
												>
													{r.hidden ? $t('albums.commentsShow') : $t('albums.commentsHide')}
												</button>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if $auth.authenticated}
		<div
			class={compact ? 'mt-3 shrink-0 border-t border-white/10 pt-3' : 'mt-6 border-t border-gray-100 pt-6'}
		>
			{#if replyingTo}
				<p class="mb-2 text-xs opacity-80">
					{$t('albums.commentsReplyingTo')}
					{replyingTo.author.displayName || replyingTo.author.username}
					<button type="button" class="ml-2 underline" on:click={() => (replyingTo = null)}>
						{$t('albums.commentsCancelReply')}
					</button>
				</p>
			{/if}
			{#if postError}
				<p class="mb-2 text-sm text-red-400">{postError}</p>
			{/if}
			<label for="album-comment-draft" class="sr-only">{$t('albums.commentsPlaceholder')}</label>
			<textarea
				id="album-comment-draft"
				bind:value={draft}
				rows={compact ? 2 : 3}
				class={inputClass}
				placeholder={$t('albums.commentsPlaceholder')}
				maxlength="4000"
			></textarea>
			<p class="mt-1 text-xs opacity-60">{$t('albums.commentsMentionHint')}</p>
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
		<p class="mt-6 text-sm opacity-80">
			<a
				href="/login?redirect={encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search + (albumAlias ? '#comments' : '') : '/')}"
				class={variant === 'dark' ? 'text-sky-400 hover:underline' : 'text-primary-600 hover:underline'}
			>
				{$t('albums.commentsSignIn')}
			</a>
		</p>
	{/if}

	{#if canModerate}
		<p class="mt-3 text-xs opacity-60">{$t('albums.commentsModeratorHint')}</p>
	{/if}
</section>
