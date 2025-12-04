<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export interface LightboxPhoto {
    _id: string;
    url: string;
    thumbnailUrl?: string;
    title?: string;
    takenAt?: string | Date;
  }

  export let photos: LightboxPhoto[] = [];
  export let startIndex = 0;
  export let isOpen = false;
  export let autoPlay = false;
  export let intervalMs = 4000;
  export let onClose: () => void;

  let current = startIndex;
  let playing = autoPlay;
  let timer: ReturnType<typeof setInterval> | null = null;

  let touchStart: number | null = null;
  let touchEnd: number | null = null;

  $: if (startIndex !== current && isOpen) {
    current = startIndex;
  }

  function next() {
    if (!photos.length) return;
    current = (current + 1) % photos.length;
  }

  function prev() {
    if (!photos.length) return;
    current = (current - 1 + photos.length) % photos.length;
  }

  function togglePlay() {
    playing = !playing;
  }

  function handleKey(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
  }

  function startTimer() {
    if (timer) clearInterval(timer);
    if (isOpen && playing) {
      timer = setInterval(next, intervalMs);
    }
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  $: {
    stopTimer();
    startTimer();
  }

  function handleTouchStart(event: TouchEvent) {
    touchEnd = null;
    touchStart = event.targetTouches[0].clientX;
  }

  function handleTouchMove(event: TouchEvent) {
    touchEnd = event.targetTouches[0].clientX;
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) next();
    if (isRightSwipe) prev();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKey);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKey);
    stopTimer();
  });
</script>

{#if isOpen && photos.length > 0}
  <div
    class="fixed inset-0 z-[1000] bg-black/95 text-white flex flex-col"
    role="dialog"
    aria-modal="true"
  >
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-2 text-sm">
      <div class="opacity-80">{current + 1} / {photos.length}</div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-2 py-1 rounded hover:bg-white/10"
          on:click={togglePlay}
          aria-label="Play/Pause"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          class="px-2 py-1 rounded hover:bg-white/10"
          on:click={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Content -->
    <div
      class="flex-1 flex items-center justify-center select-none"
      on:touchstart|passive={handleTouchStart}
      on:touchmove|passive={handleTouchMove}
      on:touchend|passive={handleTouchEnd}
    >
      <button
        type="button"
        class="px-6 py-4 mx-4 rounded-lg hover:bg-white/20 transition-all duration-200 text-4xl font-bold"
        on:click={prev}
        aria-label="Previous"
      >
        ‹
      </button>

      <div class="max-h-[85vh] max-w-[92vw] relative">
        {#if photos[current]}
          <img
            src={photos[current].url}
            alt={photos[current].title || ''}
            class="object-contain max-h-[85vh] max-w-[92vw]"
            draggable={false}
          />
        {/if}
      </div>

      <button
        type="button"
        class="px-6 py-4 mx-4 rounded-lg hover:bg-white/20 transition-all duration-200 text-4xl font-bold"
        on:click={next}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  </div>
{/if}

