<script lang="ts">
  import {
    Box,
    Maximize2,
    Minimize2,
    RotateCcw,
    Smartphone,
    Play,
    Pause
  } from 'lucide-svelte';

  interface Props {
    src: string;
    poster?: string | null;
    alt?: string;
    autoRotate?: boolean;
    heightClass?: string;
  }

  let {
    src,
    poster = null,
    alt = 'Model 3D Interaktif Siswa SMK',
    autoRotate = true,
    heightClass = 'h-[360px] sm:h-[460px] md:h-[520px]'
  }: Props = $props();

  let viewerEl = $state<HTMLElement | null>(null);
  let isAutoRotate = $state(true);
  let isFullscreen = $state(false);
  let loadProgress = $state(0);
  let isLoading = $state(true);

  function toggleAutoRotate() {
    isAutoRotate = !isAutoRotate;
    if (viewerEl) {
      if (isAutoRotate) {
        viewerEl.setAttribute('auto-rotate', '');
      } else {
        viewerEl.removeAttribute('auto-rotate');
      }
    }
  }

  function resetCamera() {
    if (viewerEl && (viewerEl as any).resetTurntableRotation) {
      (viewerEl as any).resetTurntableRotation();
    }
  }

  function toggleFullscreen() {
    if (!viewerEl) return;
    if (!document.fullscreenElement) {
      viewerEl.requestFullscreen().then(() => {
        isFullscreen = true;
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        isFullscreen = false;
      }).catch(() => {});
    }
  }
</script>

<div class="relative w-full {heightClass} bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl group">
  <!-- 3D Model Viewer Web Component -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <model-viewer
    bind:this={viewerEl}
    {src}
    poster={poster || ''}
    {alt}
    camera-controls
    auto-rotate={isAutoRotate ? '' : undefined}
    auto-rotate-delay="1000"
    rotation-per-second="24deg"
    shadow-intensity="1.2"
    shadow-softness="0.8"
    exposure="1.0"
    ar
    ar-modes="webxr scene-viewer quick-look"
    class="w-full h-full cursor-grab active:cursor-grabbing outline-none"
    loading="lazy"
  >
    <!-- Slot: Progress Bar -->
    <div slot="progress-bar" class="absolute inset-x-0 bottom-0 h-1 bg-blue-500/20">
      <div class="h-full bg-blue-500 transition-all duration-200" style="width: 100%;"></div>
    </div>
  </model-viewer>

  <!-- Top Badges Overlay -->
  <div class="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-xs font-black shadow-lg">
      <Box class="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
      <span>3D Interaktif</span>
    </span>
    <span class="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-slate-300 text-[11px] font-medium border border-white/10">
      Klik & seret untuk memutar
    </span>
  </div>

  <!-- Bottom Floating Control Bar -->
  <div class="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-2xl">
    <!-- Auto-Rotate Toggle -->
    <button
      type="button"
      onclick={toggleAutoRotate}
      title={isAutoRotate ? 'Jeda Putar Otomatis' : 'Mulai Putar Otomatis'}
      class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
    >
      {#if isAutoRotate}
        <Pause class="w-4 h-4 text-cyan-400" />
      {:else}
        <Play class="w-4 h-4" />
      {/if}
    </button>

    <!-- Reset Camera -->
    <button
      type="button"
      onclick={resetCamera}
      title="Reset Sudut Pandang"
      class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
    >
      <RotateCcw class="w-4 h-4" />
    </button>

    <!-- Fullscreen Toggle -->
    <button
      type="button"
      onclick={toggleFullscreen}
      title="Layar Penuh"
      class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
    >
      {#if isFullscreen}
        <Minimize2 class="w-4 h-4 text-amber-400" />
      {:else}
        <Maximize2 class="w-4 h-4" />
      {/if}
    </button>
  </div>
</div>
