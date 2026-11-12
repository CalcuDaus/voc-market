<script lang="ts">
  import {
    Box,
    ExternalLink,
    Film,
    Globe,
    Image as ImageIcon,
    Play
  } from 'lucide-svelte';
  import ModelViewer from './ModelViewer.svelte';

  export interface MediaItem {
    id: number;
    kind: 'image' | 'video' | 'model3d' | 'lottie' | 'embed' | 'pdf';
    url: string;
    posterUrl?: string | null;
    title?: string | null;
    caption?: string | null;
  }

  interface Props {
    coverImage: string;
    modelUrl?: string | null;
    demoUrl?: string | null;
    mediaList?: MediaItem[];
    postTitle: string;
  }

  let {
    coverImage,
    modelUrl = null,
    demoUrl = null,
    mediaList = [],
    postTitle
  }: Props = $props();

  // Combine cover image, modelUrl, and mediaList into unified list
  let allMedia = $derived.by<MediaItem[]>(() => {
    const list: MediaItem[] = [];

    // Prioritize 3D model first if exists
    if (modelUrl) {
      list.push({
        id: -1,
        kind: 'model3d',
        url: modelUrl,
        posterUrl: coverImage,
        title: 'Model 3D Interaktif'
      });
    }

    for (const m of mediaList) {
      // Don't duplicate if already added via modelUrl
      if (m.url !== modelUrl) {
        list.push(m);
      }
    }

    // Always include cover image if not in media list
    if (!list.some((m) => m.url === coverImage)) {
      list.push({
        id: -99,
        kind: 'image',
        url: coverImage,
        title: 'Gambar Sampul'
      });
    }

    if (demoUrl) {
      list.push({
        id: -2,
        kind: 'embed',
        url: demoUrl,
        title: 'Demo Aplikasi Web'
      });
    }

    return list;
  });

  let selectedIndex = $state(0);
  let activeMedia = $derived(allMedia[selectedIndex] || allMedia[0]);

  function getEmbedSrc(url: string): string {
    // YouTube convert
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
    }
    // Figma embed
    if (url.includes('figma.com/file/') || url.includes('figma.com/design/')) {
      return `https://www.figma.com/embed?embed_host=skillhub&url=${encodeURIComponent(url)}`;
    }
    return url;
  }
</script>

<div class="space-y-3">
  <!-- Main Active Media Stage -->
  <div class="w-full">
    {#if activeMedia}
      {#if activeMedia.kind === 'model3d'}
        <ModelViewer
          src={activeMedia.url}
          poster={activeMedia.posterUrl || coverImage}
          alt={activeMedia.title || postTitle}
        />
      {:else if activeMedia.kind === 'video'}
        <div class="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl">
          <!-- svelte-ignore a11y_media_has_caption -->
          <video
            src={activeMedia.url}
            poster={activeMedia.posterUrl || coverImage}
            controls
            playsinline
            class="w-full h-full object-contain"
          ></video>
        </div>
      {:else if activeMedia.kind === 'embed'}
        <div class="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl">
          <iframe
            src={getEmbedSrc(activeMedia.url)}
            title={activeMedia.title || postTitle}
            class="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            loading="lazy"
          ></iframe>
        </div>
      {:else}
        <!-- Default: Image -->
        <div class="relative w-full aspect-video sm:aspect-16/10 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm flex items-center justify-center">
          <img
            src={activeMedia.url}
            alt={activeMedia.title || postTitle}
            class="w-full h-full object-contain bg-slate-950"
          />
        </div>
      {/if}
    {/if}
  </div>

  <!-- Media Selector Tabs / Thumbnails (if multiple media) -->
  {#if allMedia.length > 1}
    <div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
      {#each allMedia as media, idx}
        <button
          type="button"
          onclick={() => (selectedIndex = idx)}
          class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition shrink-0 cursor-pointer {selectedIndex === idx
            ? 'bg-blue-50 border-[#4285F4] text-[#4285F4] shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}"
        >
          {#if media.kind === 'model3d'}
            <Box class="w-4 h-4 text-cyan-600" />
            <span>3D Model</span>
          {:else if media.kind === 'video'}
            <Film class="w-4 h-4 text-rose-600" />
            <span>Video</span>
          {:else if media.kind === 'embed'}
            <Globe class="w-4 h-4 text-indigo-600" />
            <span>Demo Web</span>
          {:else}
            <ImageIcon class="w-4 h-4 text-emerald-600" />
            <span>{media.title || `Foto ${idx + 1}`}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
