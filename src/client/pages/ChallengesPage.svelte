<script lang="ts">
  import {
    Award,
    ChevronLeft,
    ChevronRight,
    PlusCircle,
    Search,
    Sparkles,
    Trophy,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import ChallengeCard from '../lib/components/ChallengeCard.svelte';
  import RightSidebar from '../lib/components/RightSidebar.svelte';

  let items = $state<any[]>([]);
  let categories = $state<any[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let loading = $state(true);

  let searchInput = $state('');
  let debouncedQuery = $state('');
  let activeStatus = $state<'' | 'open' | 'judging' | 'finished' | 'mine'>('open');
  let activeCategoryId = $state<number>(0);

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
    page = 1;
  }

  async function loadCategories() {
    const res = await apiFetch<{ items?: any[] }>('/api/categories');
    if (res.ok && res.data?.items) categories = res.data.items;
  }

  async function loadChallenges() {
    loading = true;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');
    if (activeStatus === 'mine') {
      params.set('mine', '1');
    } else if (activeStatus) {
      params.set('status', activeStatus);
    }
    if (activeCategoryId > 0) params.set('categoryId', String(activeCategoryId));
    if (debouncedQuery.length >= 2) params.set('q', debouncedQuery);

    const res = await apiFetch<{ items?: any[]; total?: number; totalPages?: number }>(
      `/api/challenges?${params.toString()}`
    );

    if (res.ok && res.data) {
      items = res.data.items || [];
      total = res.data.total || 0;
      totalPages = res.data.totalPages || 1;
    }
    loading = false;
  }

  $effect(() => {
    loadCategories();
  });

  $effect(() => {
    void activeStatus;
    void activeCategoryId;
    void debouncedQuery;
    void page;
    loadChallenges();
  });
</script>

<div class="flex gap-6 items-start justify-center">
  <!-- Center Column -->
  <div class="flex-1 min-w-0 max-w-2xl w-full">
    <!-- Header Banner -->
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-amber-50 border-2 border-amber-200 text-[#b45309] flex items-center justify-center shrink-0">
            <Trophy class="w-6 h-6" />
          </div>
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-[#b45309]">
              Kompetisi Standar Industri
            </span>
            <h1 class="text-xl font-black text-gray-900 leading-snug">Tantangan Industri</h1>
            <p class="text-xs text-gray-500 mt-0.5">
              Kerjakan brief proyek nyata dari perusahaan mitra, raih sertifikat QR, uang pembinaan, dan tiket magang.
            </p>
          </div>
        </div>

        {#if auth.user?.userType === 'company' || auth.user?.isAdmin || auth.user?.userType === 'admin'}
          <button
            type="button"
            onclick={() => navigate('/tantangan/buat')}
            class="h-10 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] active:translate-y-0.5 inline-flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <PlusCircle class="w-4 h-4" />
            <span>Buat Tantangan</span>
          </button>
        {/if}
      </div>

      <!-- Search Input -->
      <div class="mt-4 relative">
        <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={searchInput}
          oninput={(e) => handleSearchInput((e.currentTarget as HTMLInputElement).value)}
          placeholder="Cari tantangan: desain logo, IoT smart farming, aplikasi kasir..."
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

      <!-- Status Tabs -->
      <div class="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1">
        {#each [
          { id: 'open', label: 'Pendaftaran Dibuka' },
          { id: 'judging', label: 'Tahap Penjurian' },
          { id: 'finished', label: 'Pemenang Diumumkan' },
          { id: '', label: 'Semua Status' }
        ] as sTab}
          <button
            type="button"
            onclick={() => {
              activeStatus = sTab.id as any;
              page = 1;
            }}
            class="h-8 px-3 rounded-lg text-xs font-bold transition active:translate-y-0.5 cursor-pointer {activeStatus ===
            sTab.id
              ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
              : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'}"
          >
            {sTab.label}
          </button>
        {/each}

        {#if auth.user?.userType === 'company'}
          <button
            type="button"
            onclick={() => {
              activeStatus = 'mine';
              page = 1;
            }}
            class="h-8 px-3 rounded-lg text-xs font-bold transition active:translate-y-0.5 cursor-pointer {activeStatus ===
            'mine'
              ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34]'
              : 'bg-emerald-50 hover:bg-emerald-100 text-[#34A853] border border-emerald-200'}"
          >
            Tantangan Saya
          </button>
        {/if}
      </div>
    </div>

    <!-- Active Filters -->
    {#if debouncedQuery || activeStatus !== 'open' || activeCategoryId > 0}
      <div class="flex items-center justify-between gap-2 px-1 mb-3 text-xs font-semibold">
        <span class="text-gray-500">Menampilkan {total} tantangan</span>
        <button
          type="button"
          onclick={clearFilters}
          class="font-bold text-[#4285F4] hover:underline cursor-pointer"
        >
          Atur Ulang Filter
        </button>
      </div>
    {/if}

    <!-- Challenges Feed -->
    {#if loading}
      <div class="space-y-4">
        {#each [1, 2] as sk (sk)}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 h-56 animate-pulse shadow-[0_5px_0_#d1d5db]"></div>
        {/each}
      </div>
    {:else if items.length === 0}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
        <Trophy class="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h2 class="text-base font-bold text-gray-900">Belum Ada Tantangan yang Sesuai</h2>
        <p class="text-xs text-gray-500 mt-1">Coba bersihkan filter atau nantikan brief proyek industri selanjutnya.</p>
        <button
          type="button"
          onclick={clearFilters}
          class="mt-4 h-9 px-4 rounded-xl bg-[#4285F4] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] cursor-pointer"
        >
          Tampilkan Semua Tantangan
        </button>
      </div>
    {:else}
      <div class="space-y-5">
        {#each items as ch (ch.id)}
          <ChallengeCard challenge={ch} />
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

