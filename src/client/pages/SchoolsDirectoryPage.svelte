<script lang="ts">
  import {
    BadgeCheck,
    Building2,
    ChevronLeft,
    ChevronRight,
    MapPin,
    School,
    Search,
    ShieldCheck,
    Users,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { navigate } from '../lib/router.svelte';
  import RightSidebar from '../lib/components/RightSidebar.svelte';

  let items = $state<any[]>([]);
  let regions = $state<any[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let loading = $state(true);

  let searchInput = $state('');
  let debouncedQuery = $state('');
  let activeRegionId = $state<number>(0);
  let hasTefaOnly = $state(false);
  let verifiedOnly = $state(false);

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
    activeRegionId = 0;
    hasTefaOnly = false;
    verifiedOnly = false;
    page = 1;
  }

  async function loadRegions() {
    const res = await apiFetch<{ items: any[] }>('/api/regions');
    if (res.ok && res.data?.items) {
      regions = res.data.items;
    }
  }

  async function loadSchools() {
    loading = true;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '12');
    if (activeRegionId > 0) params.set('regionId', String(activeRegionId));
    if (hasTefaOnly) params.set('hasTefa', '1');
    if (verifiedOnly) params.set('verifiedOnly', '1');
    if (debouncedQuery.length >= 2) params.set('q', debouncedQuery);

    const res = await apiFetch<{ items: any[]; total: number; totalPages: number }>(
      `/api/schools?${params.toString()}`
    );

    if (res.ok && res.data) {
      items = res.data.items || [];
      total = res.data.total || 0;
      totalPages = res.data.totalPages || 1;
    }
    loading = false;
  }

  $effect(() => {
    loadRegions();
  });

  $effect(() => {
    void activeRegionId;
    void hasTefaOnly;
    void verifiedOnly;
    void debouncedQuery;
    void page;
    loadSchools();
  });
</script>

<div class="flex gap-6 items-start justify-center">
  <!-- Center Column -->
  <div class="flex-1 min-w-0 max-w-2xl w-full">
    <!-- Header Banner -->
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] mb-5">
      <div class="flex items-start gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-blue-50 border-2 border-blue-200 text-[#4285F4] flex items-center justify-center shrink-0">
          <School class="w-6 h-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider text-[#4285F4]">
            Direktori Nasional Vokasi
          </span>
          <h1 class="text-xl font-black text-gray-900 leading-snug">Etalase Sekolah SMK</h1>
          <p class="text-xs text-gray-500 mt-0.5">
            Jelajahi karya, inovasi Unit Produksi TeFa, dan profil talenta dari setiap SMK di Indonesia.
          </p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
        <div class="relative flex-1 w-full">
          <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchInput}
            oninput={(e) => handleSearchInput((e.currentTarget as HTMLInputElement).value)}
            placeholder="Cari SMK, NPSN, atau kota (misal: SMKN 1 Cibinong)..."
            class="w-full h-10 pl-10 pr-9 rounded-xl border-2 border-gray-300 bg-gray-50 focus:bg-white focus:border-[#4285F4] focus:outline-none text-xs text-gray-900 shadow-[0_2px_0_#d1d5db] transition"
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

        <select
          bind:value={activeRegionId}
          onchange={() => (page = 1)}
          class="w-full sm:w-auto h-10 px-3 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
        >
          <option value={0}>Semua Kota / Kabupaten</option>
          {#each regions as r (r.id)}
            <option value={r.id}>{r.name} ({r.province})</option>
          {/each}
        </select>
      </div>

      <!-- Quick Toggles -->
      <div class="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onclick={() => {
            hasTefaOnly = !hasTefaOnly;
            page = 1;
          }}
          class="h-8 px-3 rounded-lg text-xs font-bold border-2 transition active:translate-y-0.5 cursor-pointer {hasTefaOnly
            ? 'bg-emerald-50 border-emerald-300 text-[#34A853] shadow-[0_2px_0_#a7f3d0]'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}"
        >
          <Building2 class="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          <span>Memiliki Unit TeFa</span>
        </button>

        <button
          type="button"
          onclick={() => {
            verifiedOnly = !verifiedOnly;
            page = 1;
          }}
          class="h-8 px-3 rounded-lg text-xs font-bold border-2 transition active:translate-y-0.5 cursor-pointer {verifiedOnly
            ? 'bg-blue-50 border-blue-300 text-[#4285F4] shadow-[0_2px_0_#bfdbfe]'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}"
        >
          <ShieldCheck class="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          <span>Terverifikasi Resmi</span>
        </button>
      </div>
    </div>

    <!-- Active Filter summary -->
    {#if debouncedQuery || activeRegionId > 0 || hasTefaOnly || verifiedOnly}
      <div class="flex items-center justify-between gap-2 px-1 mb-3 text-xs font-semibold">
        <span class="text-gray-500">Menampilkan {total} sekolah</span>
        <button
          type="button"
          onclick={clearFilters}
          class="font-bold text-[#4285F4] hover:underline cursor-pointer"
        >
          Atur Ulang Filter
        </button>
      </div>
    {/if}

    <!-- Schools Grid -->
    {#if loading}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each [1, 2, 3, 4] as sk (sk)}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 h-44 animate-pulse shadow-[0_5px_0_#d1d5db]"></div>
        {/each}
      </div>
    {:else if items.length === 0}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
        <School class="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h2 class="text-base font-bold text-gray-900">Belum Ada SMK yang Sesuai</h2>
        <p class="text-xs text-gray-500 mt-1">Coba gunakan kata kunci lain atau pilih wilayah yang berbeda.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each items as sc (sc.id)}
          <article
            class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_5px_0_#d1d5db] hover:border-[#4285F4] transition flex flex-col justify-between gap-3"
          >
            <div>
              <div class="flex items-start gap-3">
                <img
                  src={sc.logoUrl}
                  alt={sc.name}
                  class="w-12 h-12 rounded-xl object-contain border-2 border-gray-200 p-1 bg-white shrink-0"
                />
                <div class="overflow-hidden">
                  <button
                    type="button"
                    onclick={() => navigate(`/sekolah/${sc.slug}`)}
                    class="font-extrabold text-sm text-gray-900 hover:text-[#4285F4] transition text-left line-clamp-1 cursor-pointer"
                  >
                    {sc.name}
                  </button>
                  <p class="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin class="w-3 h-3 text-[#EA4335] shrink-0" />
                    <span class="truncate">{sc.regionName || sc.address || 'Indonesia'}</span>
                  </p>
                </div>
              </div>

              <!-- Badges -->
              <div class="flex flex-wrap items-center gap-1.5 mt-3">
                {#if sc.isVerified}
                  <span class="px-2 py-0.5 rounded-full bg-blue-50 text-[#4285F4] border border-blue-200 text-[10px] font-black inline-flex items-center gap-0.5">
                    <BadgeCheck class="w-3 h-3" />
                    <span>Terverifikasi</span>
                  </span>
                {/if}
                {#if sc.hasTefa}
                  <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-[#34A853] border border-emerald-200 text-[10px] font-black inline-flex items-center gap-0.5">
                    <Building2 class="w-3 h-3" />
                    <span>Unit TeFa</span>
                  </span>
                {/if}
              </div>

              {#if sc.description}
                <p class="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                  {sc.description}
                </p>
              {/if}
            </div>

            <!-- Stats & CTA -->
            <div class="pt-3 border-t-2 border-gray-100 flex items-center justify-between text-xs">
              <span class="text-gray-500 font-semibold text-[11px]">
                {sc.worksCount} karya • {sc.studentsCount} siswa
              </span>

              <button
                type="button"
                onclick={() => navigate(`/sekolah/${sc.slug}`)}
                class="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#4285F4] border border-blue-200 font-bold text-xs active:translate-y-0.5 transition cursor-pointer"
              >
                Buka Etalase
              </button>
            </div>
          </article>
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

