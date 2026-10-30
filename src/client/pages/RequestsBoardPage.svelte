<script lang="ts">
  import {
    ChevronLeft,
    ChevronRight,
    HandHelping,
    PlusCircle,
    Search,
    SlidersHorizontal,
    Sparkles,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import RequestCard from '../lib/components/RequestCard.svelte';
  import RightSidebar from '../lib/components/RightSidebar.svelte';

  let items = $state<any[]>([]);
  let categories = $state<any[]>([]);
  let regions = $state<any[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let loading = $state(true);

  let searchInput = $state('');
  let debouncedQuery = $state('');
  let activeStatus = $state<'open' | 'mine' | 'all'>('open');
  let activeCategoryId = $state<number>(0);
  let activeRegionId = $state<number>(0);
  let activeWorkMode = $state<'' | 'onsite' | 'remote' | 'dropoff'>('');
  let showFilters = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleSearchInput(val: string) {
    searchInput = val;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQuery = val.trim();
      page = 1;
    }, 250);
  }

  function clearFilters() {
    searchInput = '';
    debouncedQuery = '';
    activeStatus = 'open';
    activeCategoryId = 0;
    activeRegionId = 0;
    activeWorkMode = '';
    page = 1;
  }

  async function loadMetadata() {
    const [catRes, regRes] = await Promise.all([
      apiFetch('/api/categories'),
      apiFetch('/api/regions')
    ]);
    if (catRes.ok && catRes.data?.items) categories = catRes.data.items;
    if (regRes.ok && regRes.data?.items) regions = regRes.data.items;
  }

  async function loadRequests() {
    loading = true;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');
    params.set('status', activeStatus);
    if (activeCategoryId > 0) params.set('categoryId', String(activeCategoryId));
    if (activeRegionId > 0) params.set('regionId', String(activeRegionId));
    if (activeWorkMode) params.set('workMode', activeWorkMode);
    if (debouncedQuery.length >= 2) params.set('q', debouncedQuery);

    const res = await apiFetch(`/api/requests?${params.toString()}`);
    if (res.ok && res.data) {
      items = res.data.items || [];
      total = res.data.total || 0;
      totalPages = res.data.totalPages || 1;
    }
    loading = false;
  }

  $effect(() => {
    loadMetadata();
  });

  $effect(() => {
    void activeStatus;
    void activeCategoryId;
    void activeRegionId;
    void activeWorkMode;
    void debouncedQuery;
    void page;
    loadRequests();
  });
</script>

<div class="flex gap-6 items-start justify-center">
  <!-- Center Column -->
  <div class="flex-1 min-w-0 max-w-2xl w-full">
    <!-- Header Banner -->
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-[#34A853] flex items-center justify-center shrink-0">
            <HandHelping class="w-5 h-5" />
          </div>
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-[#34A853]">
              Papan Permintaan Warga & UMKM
            </span>
            <h1 class="text-xl font-black text-gray-900 leading-snug">Papan Butuh Bantuan</h1>
            <p class="text-xs text-gray-500 mt-0.5">
              Warga dan UMKM memposting kebutuhan proyek, siswa SMK mengajukan diri.
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={() => {
            if (!auth.user) {
              navigate('/masuk');
            } else {
              navigate('/butuh-bantuan/buat');
            }
          }}
          class="h-10 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 inline-flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
        >
          <PlusCircle class="w-4 h-4" />
          <span>Posting Kebutuhan</span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="mt-4 flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchInput}
            oninput={(e) => handleSearchInput((e.currentTarget as HTMLInputElement).value)}
            placeholder="Cari kebutuhan: servis motor, bikin logo, instalasi..."
            class="w-full h-10 pl-10 pr-9 rounded-xl border-2 border-gray-300 bg-gray-50 focus:bg-white focus:border-[#4285F4] focus:outline-none text-xs text-gray-900 placeholder:text-gray-400 shadow-[0_2px_0_#d1d5db] transition"
          />
          {#if searchInput}
            <button
              type="button"
              onclick={() => handleSearchInput('')}
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          {/if}
        </div>

        <button
          type="button"
          onclick={() => (showFilters = !showFilters)}
          class="h-10 px-3 rounded-xl border-2 border-gray-300 font-bold text-xs inline-flex items-center gap-1.5 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 cursor-pointer {showFilters
            ? 'bg-blue-50 border-[#4285F4] text-[#4285F4]'
            : 'bg-white text-gray-700'}"
        >
          <SlidersHorizontal class="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>
      </div>

      <!-- Quick Status Tabs -->
      <div class="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1">
        {#each [
          { id: 'open', label: 'Mencari Siswa' },
          { id: 'mine', label: 'Permintaan Saya' },
          { id: 'all', label: 'Semua Riwayat' }
        ] as tab}
          <button
            type="button"
            onclick={() => {
              if (tab.id === 'mine' && !auth.user) {
                navigate('/masuk');
                return;
              }
              activeStatus = tab.id as any;
              page = 1;
            }}
            class="h-8 px-3 rounded-lg text-xs font-bold transition active:translate-y-0.5 cursor-pointer {activeStatus ===
            tab.id
              ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34]'
              : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'}"
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <!-- Expanded Filters -->
      {#if showFilters}
        <div class="mt-3.5 pt-3.5 border-t-2 border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select
            bind:value={activeWorkMode}
            onchange={() => (page = 1)}
            class="p-2 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          >
            <option value="">Semua Mode Pengerjaan</option>
            <option value="remote">Kerja Jarak Jauh (Online)</option>
            <option value="onsite">Datang ke Lokasi</option>
            <option value="dropoff">Antar / Titip Barang</option>
          </select>

          <select
            bind:value={activeCategoryId}
            onchange={() => (page = 1)}
            class="p-2 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          >
            <option value={0}>Semua Kategori</option>
            {#each categories as c (c.id)}
              <option value={c.id}>{c.name}</option>
            {/each}
          </select>

          <select
            bind:value={activeRegionId}
            onchange={() => (page = 1)}
            class="p-2 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          >
            <option value={0}>Semua Wilayah</option>
            {#each regions as r (r.id)}
              <option value={r.id}>{r.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <!-- Active Filter indicator -->
    {#if debouncedQuery || activeStatus !== 'open' || activeCategoryId > 0 || activeRegionId > 0 || activeWorkMode}
      <div class="flex items-center justify-between gap-2 px-1 mb-3 text-xs font-semibold">
        <span class="text-gray-500">Menampilkan {total} permintaan</span>
        <button
          type="button"
          onclick={clearFilters}
          class="font-bold text-[#4285F4] hover:underline cursor-pointer"
        >
          Atur Ulang Filter
        </button>
      </div>
    {/if}

    <!-- Content Feed -->
    {#if loading}
      <div class="space-y-4">
        {#each [1, 2, 3] as sk (sk)}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 h-48 animate-pulse shadow-[0_5px_0_#d1d5db]"></div>
        {/each}
      </div>
    {:else if items.length === 0}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-[#34A853] flex items-center justify-center mx-auto mb-3">
          <Sparkles class="w-6 h-6" />
        </div>
        <h2 class="text-base font-bold text-gray-900">Belum Ada Permintaan yang Cocok</h2>
        <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Jadilah yang pertama memposting kebutuhan bantuan atau ubah filter pencarian Anda.
        </p>
        <button
          type="button"
          onclick={() => navigate('/butuh-bantuan/buat')}
          class="mt-4 h-9 px-4 rounded-xl bg-[#34A853] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] cursor-pointer"
        >
          Posting Kebutuhan Sekarang
        </button>
      </div>
    {:else}
      <div class="space-y-4">
        {#each items as req (req.id)}
          <RequestCard request={req} />
        {/each}
      </div>

      {#if totalPages > 1}
        <div class="mt-5 mb-8 flex items-center justify-center gap-3">
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

  <!-- Right Sidebar -->
  <div class="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-5 self-start">
    <RightSidebar />
  </div>
</div>

