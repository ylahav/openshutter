<script lang="ts">
	/**
	 * Public `/login` is implemented by `routes/[alias]` (`LoginCmsPageBody` + `PageRenderer` + `LoginForm/Layout.svelte` via `LoginFormModule.svelte`)
	 * (`LoginForm/Layout.svelte` via `LoginFormModule`). This component exists only so `getTemplatePack().pages.Login`
	 * stays typable; it is not mounted for normal visitor navigation.
	 */
</script>

<div hidden aria-hidden="true"></div>
