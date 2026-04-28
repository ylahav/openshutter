<script lang="ts">
  import { onMount } from 'svelte';

  type ContactSubmission = {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    pageAlias?: string;
    sourceUrl?: string;
    createdAt: string;
  };

  let loading = true;
  let error = '';
  let items: ContactSubmission[] = [];
  let page = 1;
  let limit = 20;
  let total = 0;
  let pages = 1;
  let search = '';

  async function load() {
    loading = true;
    error = '';
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (search.trim()) qs.set('search', search.trim());

      const res = await fetch(`/api/contact-submissions?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to load contact submissions');
      }
      items = Array.isArray(json?.data) ? json.data : [];
      total = Number(json?.pagination?.total || 0);
      pages = Math.max(1, Number(json?.pagination?.pages || 1));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load contact submissions';
    } finally {
      loading = false;
    }
  }

  function formatDate(v?: string) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString();
  }

  function truncateMessage(v?: string, max = 180) {
    const text = String(v || '');
    if (text.length <= max) return text;
    return `${text.slice(0, max)}...`;
  }

  async function handleSearchSubmit(event: SubmitEvent) {
    event.preventDefault();
    page = 1;
    await load();
  }

  onMount(load);
</script>

<svelte:head>
  <title>Contact Submissions - Admin</title>
</svelte:head>

<div class="py-8">
  <div class="max-w-7xl mx-auto px-4 space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-bold text-(--color-surface-950-50)">Contact Submissions</h1>
        <p class="text-(--color-surface-600-400) mt-2">Messages sent from the contact form.</p>
      </div>
      <a
        href="/admin"
        class="px-4 py-2 border border-surface-300-700 rounded-md text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) hover:bg-(--color-surface-100-900)"
      >
        Back to Admin
      </a>
    </div>

    <form on:submit={handleSearchSubmit} class="flex items-center gap-2">
      <input
        type="text"
        bind:value={search}
        placeholder="Search name, email, message..."
        class="w-full max-w-md px-3 py-2 border border-surface-300-700 rounded-md text-(--color-surface-950-50) bg-(--color-surface-50-950)"
      />
      <button
        type="submit"
        class="px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700)"
      >
        Search
      </button>
    </form>

    {#if error}
      <div class="p-3 rounded-md border border-red-300 bg-red-50 text-red-700">{error}</div>
    {/if}

    <div class="card preset-outlined-surface-200-800 bg-surface-50-950 overflow-hidden">
      {#if loading}
        <div class="p-6 text-(--color-surface-600-400)">Loading...</div>
      {:else if items.length === 0}
        <div class="p-6 text-(--color-surface-600-400)">No contact submissions found.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-surface-200-800">
            <thead class="bg-(--color-surface-100-900)">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)">When</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)">Email / Phone</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)">Page</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-surface-600-400)">Message</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200-800">
              {#each items as row}
                <tr>
                  <td class="px-4 py-3 text-sm text-(--color-surface-600-400) whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td class="px-4 py-3 text-sm text-(--color-surface-950-50)">{row.name}</td>
                  <td class="px-4 py-3 text-sm text-(--color-surface-800-200)">
                    <div>{row.email}</div>
                    {#if row.phone}
                      <div class="text-xs text-(--color-surface-600-400)">{row.phone}</div>
                    {/if}
                  </td>
                  <td class="px-4 py-3 text-sm text-(--color-surface-800-200)">{row.pageAlias || '-'}</td>
                  <td class="px-4 py-3 text-sm text-(--color-surface-800-200)">{truncateMessage(row.message)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <div class="flex items-center justify-between">
      <p class="text-sm text-(--color-surface-600-400)">Total: {total}</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          on:click={async () => {
            if (page <= 1) return;
            page -= 1;
            await load();
          }}
          class="px-3 py-2 border border-surface-300-700 rounded-md text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <span class="text-sm text-(--color-surface-800-200)">Page {page} / {pages}</span>
        <button
          type="button"
          disabled={page >= pages || loading}
          on:click={async () => {
            if (page >= pages) return;
            page += 1;
            await load();
          }}
          class="px-3 py-2 border border-surface-300-700 rounded-md text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</div>
