<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { auth } from '$lib/stores/auth';
	import { t } from '$stores/i18n';

	/** Anchor classes (theme-specific). */
	export let linkClass = 'relative text-gray-600 hover:text-gray-900';
	export let badgeClass =
		'absolute -top-1 -right-2 min-w-[1.1rem] rounded-full bg-primary-600 px-1 text-center text-[10px] font-semibold leading-tight text-white';

	let notifUnread = 0;

	async function refreshNotifUnread() {
		if (!browser || !get(auth).authenticated) {
			notifUnread = 0;
			return;
		}
		try {
			const res = await fetch('/api/notifications?limit=50', { credentials: 'include' });
			if (!res.ok) return;
			const j = await res.json();
			const data = j.data || [];
			notifUnread = data.filter((n: { read?: boolean }) => !n.read).length;
		} catch {
			notifUnread = 0;
		}
	}

	onMount(() => {
		const unsub = auth.subscribe((a) => {
			if (a.authenticated) void refreshNotifUnread();
			else notifUnread = 0;
		});
		return () => unsub();
	});
</script>

<a href="/notifications" class={linkClass} title={$t('header.notifications')}>
	{$t('header.notifications')}
	{#if notifUnread > 0}
		<span class={badgeClass}>
			{notifUnread > 99 ? '99+' : notifUnread}
		</span>
	{/if}
</a>
