<script lang="ts">
  import {
    ChevronLeft,
    ChevronRight,
    MapPin,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { locationStore } from '../lib/location.svelte';
  import { router } from '../lib/router.svelte';
  import PostCard from '../lib/components/PostCard.svelte';
  import RightSidebar from '../lib/components/RightSidebar.svelte';

  let categories = $state<
    { id: number; name: string; slug: string; icon: string; postsCount: number }[]
  >([]);
  let posts = $state<any[]>([]);
  let suggestedCreators = $state<any[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let loading = $state(true);

  let searchInput = $state('');
  let debouncedQuery = $state('');
  let activeType = $state<'' | 'product' | 'service' | 'portfolio'>('');
  let activeCategoryId = $state<number>(0);
  let verifiedOnly = $state(false);
  let sortByNearest = $state(false);
  let showFilters = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleSearchChange(val: string) {
    searchInput = val;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQuery = val.trim();
      page = 1;
    }, 280);
  }

  function clearFilters() {
    searchInput = '';
    debouncedQuery = '';
    activeType = '';
    activeCategoryId = 0;
    verifiedOnly = false;
    page = 1;
  }

  async function loadCategories() {
    const res = await apiFetch('/api/categories');
    if (res.ok && res.data?.items) {
      categories = res.data.items;
    }
  }

  async function loadPosts() {
    loading = true;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');
    if (activeType) params.set('type', activeType);
    if (activeCategoryId > 0) params.set('categoryId', String(activeCategoryId));
    if (verifiedOnly) params.set('verifiedOnly', '1');
    if (debouncedQuery.length >= 2) params.set('q', debouncedQuery);

    if (locationStore.isActive) {
      if (locationStore.subdistrictId) {
        params.set('subdistrictId', String(locationStore.subdistrictId));
      }
      if (sortByNearest) {
        params.set('sort', 'nearest');
      }
      if (locationStore.lat && locationStore.lng) {
        params.set('lat', String(locationStore.lat));
        params.set('lng', String(locationStore.lng));
      }
    }

    const res = await apiFetch(`/api/posts?${params.toString()}`);
    if (res.ok && res.data) {
      posts = res.data.items || [];
      total = res.data.total || 0;
      totalPages = res.data.totalPages || 1;
      suggestedCreators = res.data.suggestedCreators || [];
    }
    loading = false;
  }

  $effect(() => {
    loadCategories();
  });

  $effect(() => {
    void activeType;
    void activeCategoryId;
    void verifiedOnly;
    void debouncedQuery;
    void page;
    void locationStore.subdistrictId;
    void sortByNearest;
    loadPosts();
  });

  $effect(() => {
    if (router.search.includes('focus=search')) {
      const el = document.getElementById('feed-search-input');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
</script>

<!-- 2-Column Inside Canvas: Center Feed + Right Sidebar (System Design Section 1 & 6.4) -->
<div class="flex gap-0 lg:gap-6 items-start justify-center">
  <!-- Center Column: Scrolling Feed of All Works & Services -->
  <div class="flex-1 min-w-0 max-w-2xl w-full">
    <!-- Top Search & Filter Bar (Card Surface 3D) -->
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 sm:p-5 shadow-[0_5px_0_#d1d5db] mb-6">
      <div class="flex items-center gap-2.5">
        <div class="relative flex-1">
          <Search class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="feed-search-input"
            type="search"
            value={searchInput}
            oninput={(e) => handleSearchChange((e.currentTarget as HTMLInputElement).value)}
            placeholder="Cari karya siswa, jasa servis, logo, atau nama SMK..."
            class="w-full h-11 pl-11 pr-10 rounded-xl border-2 border-gray-300 bg-gray-50 focus:bg-white focus:border-[#4285F4] focus:outline-none text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 shadow-[0_2px_0_#d1d5db] transition"
          />
          {#if searchInput}
            <button
              type="button"
              onclick={() => handleSearchChange('')}
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              aria-label="Bersihkan pencarian"
            >
              <X class="w-4 h-4" />
            </button>
          {/if}
        </div>

        <button
          type="button"
          onclick={() => (showFilters = !showFilters)}
          class="h-11 px-3.5 rounded-xl border-2 border-gray-300 font-bold text-xs inline-flex items-center gap-1.5 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 active:shadow-none transition cursor-pointer {showFilters
            ? 'bg-blue-50 border-[#4285F4] text-[#4285F4]'
            : 'bg-white hover:bg-gray-50 text-gray-700'}"
          title="Filter Kategori"
        >
          <SlidersHorizontal class="w-4 h-4" />
          <span class="hidden sm:inline">Filter</span>
        </button>
      </div>

      <!-- Quick Type Tabs (Google 4-Color Accents) -->
      <div class="mt-3.5 flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div class="flex items-center gap-1.5 shrink-0">
          {#each [
            { id: '', label: 'Semua' },
            { id: 'portfolio', label: 'Portofolio' },
            { id: 'service', label: 'Jasa' },
            { id: 'product', label: 'Barang' }
          ] as tab}
            <button
              type="button"
              onclick={() => {
                activeType = tab.id as any;
                page = 1;
              }}
              class="h-8 px-3 rounded-lg text-xs font-bold transition active:translate-y-0.5 cursor-pointer {activeType ===
              tab.id
                ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
                : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'}"
            >
              {tab.label}
            </button>
          {/each}
        </div>

        <button
          type="button"
          onclick={() => {
            verifiedOnly = !verifiedOnly;
            page = 1;
          }}
          class="h-8 px-3 rounded-lg text-xs font-bold border-2 shrink-0 inline-flex items-center gap-1 transition active:translate-y-0.5 cursor-pointer {verifiedOnly
            ? 'bg-emerald-50 border-emerald-300 text-[#34A853] shadow-[0_2px_0_#a7f3d0]'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}"
        >
          <ShieldCheck class="w-3.5 h-3.5 text-[#34A853]" />
          <span>Stempel TeFa</span>
        </button>

        <button
          type="button"
          onclick={() => {
            if (!locationStore.isActive) {
              void locationStore.detectGps();
            } else {
              sortByNearest = !sortByNearest;
              page = 1;
            }
          }}
          class="h-8 px-3 rounded-lg text-xs font-bold border-2 shrink-0 inline-flex items-center gap-1 transition active:translate-y-0.5 cursor-pointer {sortByNearest
            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-[0_2px_0_#d97706]'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}"
          title="Urutkan dari yang terdekat dengan lokasi Anda"
        >
          <MapPin class="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>{sortByNearest ? `Terdekat: ${locationStore.subdistrictName || 'Aktif'}` : 'Dekat Saya'}</span>
        </button>
      </div>

      <!-- Expandable Categories List -->
      {#if showFilters && categories.length > 0}
        <div class="mt-3.5 pt-3.5 border-t-2 border-gray-100 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onclick={() => {
              activeCategoryId = 0;
              page = 1;
            }}
            class="h-7 px-3 rounded-full text-xs font-bold shrink-0 border transition active:translate-y-0.5 cursor-pointer {activeCategoryId ===
            0
              ? 'bg-gray-900 text-white border-gray-900 shadow-[0_2px_0_#000000]'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
          >
            Semua Bidang
          </button>
          {#each categories as cat (cat.id)}
            <button
              type="button"
              onclick={() => {
                activeCategoryId = cat.id;
                page = 1;
              }}
              class="h-7 px-3 rounded-full text-xs font-bold shrink-0 border transition active:translate-y-0.5 cursor-pointer {activeCategoryId ===
              cat.id
                ? 'bg-gray-900 text-white border-gray-900 shadow-[0_2px_0_#000000]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
            >
              {cat.name}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Active Filter Indicator (if any) -->
    {#if debouncedQuery || activeType || activeCategoryId > 0 || verifiedOnly}
      <div class="flex items-center justify-between gap-2 px-1 mb-4 text-xs font-semibold">
        <span class="text-gray-500">
          Menampilkan {total} karya hasil filter
        </span>
        <button
          type="button"
          onclick={clearFilters}
          class="font-bold text-[#4285F4] hover:underline cursor-pointer"
        >
          Atur Ulang Filter
        </button>
      </div>
    {/if}

    <!-- Scrolling Feed of Posts -->
    {#if loading}
      <div class="space-y-6">
        {#each [1, 2, 3] as sk (sk)}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 h-96 animate-pulse flex flex-col gap-4 shadow-[0_5px_0_#d1d5db]">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-full bg-gray-200"></div>
              <div class="space-y-1.5 flex-1">
                <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                <div class="h-3 bg-gray-100 rounded w-1/4"></div>
              </div>
            </div>
            <div class="h-6 bg-gray-200 rounded w-3/4"></div>
            <div class="w-full flex-1 bg-gray-200 rounded-xl"></div>
          </div>
        {/each}
      </div>
    {:else if posts.length === 0}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
        <div class="w-14 h-14 rounded-2xl bg-blue-50 text-[#4285F4] flex items-center justify-center mx-auto mb-3">
          <Sparkles class="w-7 h-7" />
        </div>
        <h2 class="text-lg font-bold text-gray-900">Belum Ada Karya yang Sesuai</h2>
        <p class="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
          Coba gunakan kata kunci pencarian lain atau pilih kategori lain dari karya siswa SMK.
        </p>
        <button
          type="button"
          onclick={clearFilters}
          class="mt-5 h-10 px-5 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 transition cursor-pointer"
        >
          Tampilkan Semua Karya
        </button>
      </div>
    {:else}
      <div class="flex flex-col gap-1">
        {#each posts as post (post.id)}
          <PostCard {post} />
        {/each}
      </div>

      <!-- Pagination with 3D tactile buttons -->
      {#if totalPages > 1}
        <div class="mt-4 mb-8 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onclick={() => (page = Math.max(1, page - 1))}
            class="h-9 px-4 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_3px_0_#d1d5db] active:shadow-none active:translate-y-0.5 transition cursor-pointer"
          >
            <ChevronLeft class="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>

          <span class="text-xs font-bold text-gray-600">
            Halaman {page} dari {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onclick={() => (page = Math.min(totalPages, page + 1))}
            class="h-9 px-4 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_3px_0_#d1d5db] active:shadow-none active:translate-y-0.5 transition cursor-pointer"
          >
            <span>Selanjutnya</span>
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Right Column: Account Info & Kreator SMK Terpopuler -->
  <div class="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-5 self-start">
    <RightSidebar creators={suggestedCreators} />
  </div>
</div>
