<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, loadSession } from '$stores/auth';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';
	import AlbumComments from './AlbumComments.svelte';

	export let albumId: string;
	export let albumCreatorId: string;
	export let albumAlias: string;
	/** Visibility for current viewer (admin already applies session). */
	export let showActivity = true;
	export let showTasks = true;
	export let showComments = true;

	let activityOpen = false;
	let events: Array<{ _id: string; type: string; actorUserId: string; payload: unknown; createdAt: string }> = [];
	let tasks: Array<{
		_id: string;
		title: string;
		status: string;
		approvalStatus?: string;
		createdBy: string;
	}> = [];
	let loadingAct = false;
	let loadingTasks = false;
	let taskTitle = '';
	let needsApproval = false;
	let creatingTask = false;

	$: canModerate =
		$auth.authenticated &&
		$auth.user &&
		($auth.user.role === 'admin' || $auth.user.id === albumCreatorId);

	onMount(async () => {
		await loadSession();
		if (showActivity) loadActivity();
		if (showTasks) loadTasks();
	});

	async function loadActivity() {
		loadingAct = true;
		try {
			const res = await fetch(`/api/collaboration/album/${encodeURIComponent(albumId)}/activity`, {
				credentials: 'include',
			});
			const data = await res.json().catch(() => ({}));
			events = data.events || [];
		} catch (e) {
			logger.error('Activity load:', e);
			events = [];
		} finally {
			loadingAct = false;
		}
	}

	async function loadTasks() {
		loadingTasks = true;
		try {
			const res = await fetch(`/api/collaboration/album/${encodeURIComponent(albumId)}/tasks`, {
				credentials: 'include',
			});
			const data = await res.json().catch(() => ({}));
			tasks = data.tasks || [];
		} catch (e) {
			logger.error('Tasks load:', e);
			tasks = [];
		} finally {
			loadingTasks = false;
		}
	}

	async function createTask() {
		const title = taskTitle.trim();
		if (!title || creatingTask || !$auth.authenticated) return;
		creatingTask = true;
		try {
			const res = await fetch(`/api/collaboration/album/${encodeURIComponent(albumId)}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					title,
					approvalStatus: needsApproval ? 'pending' : 'none',
				}),
			});
			if (res.ok) {
				taskTitle = '';
				needsApproval = false;
				await loadTasks();
				await loadActivity();
			}
		} catch (e) {
			logger.error('Task create:', e);
		} finally {
			creatingTask = false;
		}
	}

	async function patchTask(
		id: string,
		body: Partial<{ status: 'open' | 'done'; approvalStatus: 'none' | 'pending' | 'approved' | 'rejected' }>,
	) {
		try {
			const res = await fetch(`/api/collaboration/tasks/${encodeURIComponent(id)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(body),
			});
			if (res.ok) {
				await loadTasks();
				await loadActivity();
			}
		} catch (e) {
			logger.error('Task patch:', e);
		}
	}

	function activityLabel(type: string): string {
		switch (type) {
			case 'comment_added':
				return $t('albums.collabActComment');
			case 'comment_reply':
				return $t('albums.collabActReply');
			case 'task_created':
				return $t('albums.collabActTaskCreated');
			case 'task_completed':
				return $t('albums.collabActTaskDone');
			case 'approval_updated':
				return $t('albums.collabActApproval');
			default:
				return type;
		}
	}

	function approvalLabel(status: string | undefined): string {
		switch (status) {
			case 'pending':
				return $t('albums.collabApprovalPending');
			case 'approved':
				return $t('albums.collabApprovalApproved');
			case 'rejected':
				return $t('albums.collabApprovalRejected');
			default:
				return status || '';
		}
	}
</script>

<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
	{#if showActivity}
	<details class="rounded-lg border border-gray-200 bg-white shadow-sm" bind:open={activityOpen}>
		<summary class="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900">
			{$t('albums.collabActivity')}
		</summary>
		<div class="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
			{#if loadingAct}
				<p>{$t('loading.loading')}</p>
			{:else if events.length === 0}
				<p>{$t('albums.collabActivityEmpty')}</p>
			{:else}
				<ul class="space-y-2">
					{#each events as ev}
						<li class="flex flex-wrap gap-2 border-b border-gray-50 pb-2 last:border-0">
							<span class="font-medium text-gray-800">{activityLabel(ev.type)}</span>
							<time class="text-xs text-gray-400" datetime={ev.createdAt}>
								{new Date(ev.createdAt).toLocaleString()}
							</time>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</details>
	{/if}

	{#if showTasks}
	<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="text-lg font-semibold text-gray-900">{$t('albums.collabTasks')}</h2>
		{#if loadingTasks}
			<p class="mt-2 text-sm text-gray-500">{$t('loading.loading')}</p>
		{:else if tasks.length === 0}
			<p class="mt-2 text-sm text-gray-600">{$t('albums.collabTasksEmpty')}</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each tasks as task}
					<li class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
						<div>
							<p class="font-medium text-gray-900">{task.title}</p>
							<p class="text-xs text-gray-500">
								{task.status === 'done' ? $t('albums.collabTaskStatusDone') : $t('albums.collabTaskStatusOpen')}
								{#if task.approvalStatus && task.approvalStatus !== 'none'}
									· {approvalLabel(task.approvalStatus)}
								{/if}
							</p>
						</div>
						<div class="flex flex-wrap gap-2">
							{#if task.status === 'open'}
								<button
									type="button"
									class="text-xs text-primary-600 hover:underline"
									on:click={() => patchTask(task._id, { status: 'done' })}
								>
									{$t('albums.collabMarkDone')}
								</button>
							{:else}
								<button
									type="button"
									class="text-xs text-primary-600 hover:underline"
									on:click={() => patchTask(task._id, { status: 'open' })}
								>
									{$t('albums.collabReopen')}
								</button>
							{/if}
							{#if canModerate && task.approvalStatus === 'pending'}
								<button
									type="button"
									class="text-xs text-green-700 hover:underline"
									on:click={() => patchTask(task._id, { approvalStatus: 'approved' })}
								>
									{$t('albums.collabApprove')}
								</button>
								<button
									type="button"
									class="text-xs text-red-600 hover:underline"
									on:click={() => patchTask(task._id, { approvalStatus: 'rejected' })}
								>
									{$t('albums.collabReject')}
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if $auth.authenticated}
			<div class="mt-6 border-t border-gray-100 pt-4">
				<p class="text-sm font-medium text-gray-800">{$t('albums.collabTaskNew')}</p>
				<input
					type="text"
					bind:value={taskTitle}
					class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					placeholder={$t('albums.collabTaskTitlePlaceholder')}
				/>
				<label class="mt-2 flex items-center gap-2 text-sm text-gray-600">
					<input type="checkbox" bind:checked={needsApproval} />
					{$t('albums.collabTaskNeedsApproval')}
				</label>
				<button
					type="button"
					disabled={creatingTask || !taskTitle.trim()}
					class="mt-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
					on:click={createTask}
				>
					{$t('albums.collabTaskAdd')}
				</button>
			</div>
		{/if}
	</section>
	{/if}

	{#if showComments}
		<AlbumComments {albumId} {albumCreatorId} {albumAlias} />
	{/if}
</div>
