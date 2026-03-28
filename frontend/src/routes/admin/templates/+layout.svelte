<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { clearAdminPreviewTemplate } from '$stores/template';

	beforeNavigate(({ from, to }) => {
		if (!browser || !to) return;
		const fromPath = from?.url.pathname ?? '';
		const toPath = to.url.pathname;
		const wasInTemplates = fromPath.startsWith('/admin/templates');
		const stillInTemplates = toPath.startsWith('/admin/templates');
		if (wasInTemplates && !stillInTemplates) {
			clearAdminPreviewTemplate();
		}
	});
</script>

<slot />
