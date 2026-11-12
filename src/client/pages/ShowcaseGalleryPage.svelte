<script lang="ts">
  import {
    BadgeCheck,
    Box,
    ExternalLink,
    Eye,
    Filter,
    Heart,
    Layers,
    PlusCircle,
    RotateCw,
    Search,
    Sparkles,
    Trophy
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';

  interface ShowcaseItem {
    id: number;
    name: string;
    description: string;
    coverImage: string;
    likesCount: number;
    viewsCount: number;
    isVerifiedByTeacher: boolean;
    teacherNote: string | null;
    projectLink: string | null;
    createdAt: string;
    authorName: string;
    authorUsername: string;
    authorAvatar: string;
    authorMajor: string | null;
    schoolName: string | null;
    tagline: string | null;
    major: string | null;
    role: string | null;
    tools: string[] | null;
    demoUrl: string | null;
    modelUrl: string | null;
    mediaKinds: string[];
  }

  interface MajorCount {
    name: string;
    count: number;
  }

  let items = $state<ShowcaseItem[]>([]);
  let majors = $state<MajorCount[]>([]);
  let loading = $state(true);
  let loadingMajors = $state(true);

  // Filters
  let searchQuery = $state('');
  let selectedMajor = $state('');
  let filter3dOnly = $state(false);
  let filterVerifiedOnly = $state(false);
  let selectedSort = $state<'latest' | 'popular' | 'verified'>('latest');

  let searchTimeout: any;

  async function fetchMajors() {
    try {
      loadingMajors = true;
      const res = await apiFetch<MajorCount[]>('/api/showcase/majors');
      if (res.data) {
        majors = res.data;
      }
    } catch {
      // fallback
    } finally {
      loadingMajors = false;
    }
  }

  async function fetchShowcase() {
    try {
      loading = true;
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedMajor) params.set('major', selectedMajor);
      if (filter3dOnly) params.set('hasModel3d', 'true');
      if (filterVerifiedOnly) params.set('isVerified', 'true');
      if (selectedSort) params.set('sort', selectedSort);
      params.set('limit', '24');

      const res = await apiFetch<{ items: ShowcaseItem[] }>(`/api/showcase?${params.toString()}`);
      if (res.data) {
        items = res.data.items || [];
      }
    } catch (e) {
      console.error('Error fetching showcase:', e);
    } finally {
      loading = false;
    }
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchShowcase();
    }, 350);
  }

  function selectMajor(major: string) {
    selectedMajor = selectedMajor === major ? '' : major;
    fetchShowcase();
  }

  function toggle3d() {
    filter3dOnly = !filter3dOnly;
    fetchShowcase();
  }

  function toggleVerified() {
    filterVerifiedOnly = !filterVerifiedOnly;
    fetchShowcase();
  }

  function changeSort(sort: 'latest' | 'popular' | 'verified') {
    selectedSort = sort;
    fetchShowcase();
  }

  $effect(() => {
    fetchMajors();
    fetchShowcase();
  });
</script>

<div class="space-y-6 pb-12 max-w-6xl mx-auto">
  <!-- Hero Banner: Skill-Hub -->
  <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-900/60 p-6 sm:p-10 text-white shadow-2xl">
    <div class="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
    <div class="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

    <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-3 max-w-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black uppercase tracking-wider">
          <Sparkles class="w-3.5 h-3.5 text-cyan-400" />
          <span>Skill-Hub • Pameran Karya Siswa</span>
        </div>
        <h1 class="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
          Portofolio Digital &amp; Prototipe 3D Nyata Siswa SMK
        </h1>
        <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
          Ruang pameran karya vokasi: putar model 3D, coba demo aplikasi, dan temukan talenta muda siap industri dengan rekam jejak terverifikasi guru pembimbing.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
        {#if auth.user?.userType === 'smk'}
          <button
            type="button"
            onclick={() => navigate('/jual')}
            class="h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_4px_0_#0284c7] active:shadow-none active:translate-y-1 transition cursor-pointer"
          >
            <PlusCircle class="w-5 h-5" />
            <span>Pamerkan Karyamu</span>
          </button>
        {:else if !auth.user}
          <button
            type="button"
            onclick={() => navigate('/daftar')}
            class="h-12 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition cursor-pointer"
          >
            <span>Daftar Sebagai Kreator</span>
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Search & Filter Controls -->
  <div class="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm space-y-4">
    <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
      <!-- Search Input -->
      <div class="relative w-full sm:w-96">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          bind:value={searchQuery}
          oninput={handleSearchInput}
          placeholder="Cari karya, nama siswa, atau alat (Blender, Figma)..."
          class="w-full h-11 pl-10 pr-4 rounded-xl border-2 border-slate-200 focus:border-[#4285F4] focus:outline-none text-xs font-medium placeholder:text-slate-400 transition"
        />
      </div>

      <!-- Quick Filter Toggles -->
      <div class="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        <!-- 3D Toggle -->
        <button
          type="button"
          onclick={toggle3d}
          class="h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer border-2 {filter3dOnly
            ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}"
        >
          <Box class="w-4 h-4 {filter3dOnly ? 'text-cyan-600' : 'text-slate-400'}" />
          <span>Ada 3D Model</span>
        </button>

        <!-- Verified Toggle -->
        <button
          type="button"
          onclick={toggleVerified}
          class="h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer border-2 {filterVerifiedOnly
            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}"
        >
          <BadgeCheck class="w-4 h-4 {filterVerifiedOnly ? 'text-emerald-600' : 'text-slate-400'}" />
          <span>Terverifikasi Guru</span>
        </button>

        <!-- Sort Select -->
        <select
          value={selectedSort}
          onchange={(e) => changeSort((e.target as HTMLSelectElement).value as any)}
          aria-label="Urutkan Karya"
          class="h-10 px-3 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="latest">Terbaru</option>
          <option value="popular">Terpopuler</option>
          <option value="verified">Pilihan Guru</option>
        </select>
      </div>
    </div>

    <!-- Major Chips Bar -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar pt-2 border-t border-slate-100">
      <button
        type="button"
        onclick={() => selectMajor('')}
        class="h-8 px-3 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer border {selectedMajor === ''
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}"
      >
        Semua Jurusan
      </button>

      {#each majors as m}
        <button
          type="button"
          onclick={() => selectMajor(m.name)}
          class="h-8 px-3 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer border flex items-center gap-1.5 {selectedMajor === m.name
            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}"
        >
          <span>{m.name}</span>
          {#if m.count > 0}
            <span class="text-[10px] px-1.5 py-0.2 rounded-full {selectedMajor === m.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}">
              {m.count}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Showcase Cards Grid -->
  {#if loading}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Array(6) as _}
        <div class="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm animate-pulse">
          <div class="aspect-16/10 bg-slate-200"></div>
          <div class="p-5 space-y-3">
            <div class="h-4 bg-slate-200 rounded-md w-3/4"></div>
            <div class="h-3 bg-slate-100 rounded-md w-1/2"></div>
            <div class="flex items-center gap-2 pt-3 border-t border-slate-100">
              <div class="w-8 h-8 rounded-full bg-slate-200"></div>
              <div class="h-3 bg-slate-100 rounded-md w-24"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if items.length === 0}
    <!-- Empty State -->
    <div class="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center space-y-4">
      <div class="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
        <Box class="w-8 h-8" />
      </div>
      <div class="space-y-1">
        <h3 class="text-base font-black text-slate-800">Belum Ada Karya yang Sesuai</h3>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Coba ganti filter jurusan atau kata kunci pencarian untuk melihat portofolio lainnya.
        </p>
      </div>
      <button
        type="button"
        onclick={() => {
          searchQuery = '';
          selectedMajor = '';
          filter3dOnly = false;
          filterVerifiedOnly = false;
          fetchShowcase();
        }}
        class="h-10 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
      >
        Reset Semua Filter
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each items as item}
        <div
          role="button"
          tabindex="0"
          onclick={() => navigate(`/karya/${item.id}`)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/karya/${item.id}`)}
          class="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 shadow-[0_4px_0_#e2e8f0] hover:shadow-[0_6px_0_#bfdbfe] hover:-translate-y-1 transition-all duration-150 overflow-hidden flex flex-col group cursor-pointer text-left"
        >
          <!-- Thumbnail & Media Badges -->
          <div class="relative aspect-16/10 bg-slate-950 overflow-hidden">
            <img
              src={item.coverImage}
              alt={item.name}
              class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />

            <!-- Top Left: Media Indicators -->
            <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              {#if item.mediaKinds.includes('model3d') || item.modelUrl}
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-cyan-400/60 text-cyan-300 text-[10px] font-black shadow-md">
                  <Box class="w-3 h-3 text-cyan-400" />
                  <span>3D Model</span>
                </span>
              {/if}

              {#if item.major}
                <span class="inline-flex px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                  {item.major.split('(')[1]?.replace(')', '') || item.major.slice(0, 10)}
                </span>
              {/if}
            </div>

            <!-- Top Right: Verified Badge -->
            {#if item.isVerifiedByTeacher}
              <div class="absolute top-2.5 right-2.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md">
                  <BadgeCheck class="w-3 h-3" />
                  <span>TeFa</span>
                </span>
              </div>
            {/if}
          </div>

          <!-- Content Body -->
          <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
            <div class="space-y-2">
              <h2 class="text-base font-black text-slate-900 line-clamp-1 group-hover:text-blue-600 transition">
                {item.name}
              </h2>
              <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {item.tagline || item.description}
              </p>

              <!-- Tools Badges -->
              {#if item.tools && item.tools.length > 0}
                <div class="flex items-center gap-1.5 flex-wrap pt-1">
                  {#each item.tools.slice(0, 3) as tool}
                    <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {tool}
                    </span>
                  {/each}
                  {#if item.tools.length > 3}
                    <span class="text-[10px] text-slate-400 font-bold">+{item.tools.length - 3}</span>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Author & Stats Footer -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <img
                  src={item.authorAvatar}
                  alt={item.authorName}
                  class="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-800 truncate leading-none">{item.authorName}</p>
                  <p class="text-[10px] text-slate-400 truncate mt-0.5">{item.schoolName || 'SMK'}</p>
                </div>
              </div>

              <div class="flex items-center gap-2.5 text-slate-400 text-xs shrink-0 font-medium">
                <span class="flex items-center gap-1">
                  <Eye class="w-3.5 h-3.5" />
                  <span>{item.viewsCount}</span>
                </span>
                <span class="flex items-center gap-1">
                  <Heart class="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>{item.likesCount}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
