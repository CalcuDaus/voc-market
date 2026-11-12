<script lang="ts">
  import {
    AlertTriangle,
    Check,
    Loader2,
    MapPin,
    Navigation,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../api';
  import { locationStore } from '../location.svelte';

  let {
    open = false,
    onclose,
    onselect
  }: {
    open: boolean;
    onclose: () => void;
    onselect?: (subdistrict: { id: number; name: string }) => void;
  } = $props();

  let searchQuery = $state('');
  let subdistricts = $state<
    Array<{
      id: number;
      name: string;
      regionId: number;
      regionName: string;
      latitude: number;
      longitude: number;
    }>
  >([]);
  let loadingList = $state(false);

  $effect(() => {
    if (open && subdistricts.length === 0) {
      void fetchSubdistricts();
    }
  });

  async function fetchSubdistricts() {
    loadingList = true;
    try {
      const res = await apiFetch<{
        subdistricts: Array<{
          id: number;
          name: string;
          regionId: number;
          regionName: string;
          latitude: number;
          longitude: number;
        }>;
      }>('/api/subdistricts');
      if (res.ok && res.data?.subdistricts) {
        subdistricts = res.data.subdistricts;
      }
    } catch {
      // quiet
    } finally {
      loadingList = false;
    }
  }

  const filteredSubdistricts = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return subdistricts.slice(0, 15);
    return subdistricts
      .filter((s) => s.name.toLowerCase().includes(q) || s.regionName.toLowerCase().includes(q))
      .slice(0, 20);
  });

  async function handleGpsDetect() {
    const ok = await locationStore.detectGps();
    if (ok) {
      if (onselect && locationStore.subdistrictId && locationStore.subdistrictName) {
        onselect({ id: locationStore.subdistrictId, name: locationStore.subdistrictName });
      }
      onclose();
    }
  }

  function handleSelect(sub: {
    id: number;
    name: string;
    regionId: number;
    regionName: string;
    latitude: number;
    longitude: number;
  }) {
    locationStore.setSubdistrict(sub);
    if (onselect) {
      onselect({ id: sub.id, name: sub.name });
    }
    onclose();
  }

  function handleClear() {
    locationStore.clear();
    onclose();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
    <div
      class="relative w-full max-w-md max-h-[85vh] flex flex-col bg-white rounded-3xl border-2 border-slate-900 shadow-[0_8px_0_#0f172a] p-6 text-slate-800"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div class="flex items-center gap-2.5">
          <span class="w-9 h-9 rounded-2xl bg-amber-100 border-2 border-amber-500 text-amber-700 flex items-center justify-center font-black">
            <MapPin class="w-4 h-4" />
          </span>
          <div>
            <h3 class="font-black text-slate-900 text-base">Atur Lokasi &amp; "Dekat Saya"</h3>
            <p class="text-xs text-slate-500 font-semibold">Temukan jasa fisik &amp; produk siswa terdekat</p>
          </div>
        </div>
        <button
          type="button"
          onclick={onclose}
          class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- GPS Detection Button -->
      <div class="pt-4">
        <button
          type="button"
          disabled={locationStore.detecting}
          onclick={handleGpsDetect}
          class="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 border-blue-600 bg-blue-50 text-blue-700 font-black text-xs shadow-[0_3px_0_#2563eb] hover:bg-blue-100 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-60 cursor-pointer"
        >
          {#if locationStore.detecting}
            <Loader2 class="w-4 h-4 animate-spin text-blue-600" />
            <span>Mendeteksi Koordinat GPS...</span>
          {:else}
            <Navigation class="w-4 h-4 text-blue-600" />
            <span>Gunakan Posisi GPS Saya Saat Ini</span>
          {/if}
        </button>

        {#if locationStore.error}
          <p class="mt-2 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-start gap-1.5">
            <AlertTriangle class="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{locationStore.error}</span>
          </p>
        {/if}
      </div>

      <div class="flex items-center gap-2 my-3">
        <div class="h-px bg-slate-200 flex-1"></div>
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Atau Pilih Kecamatan</span>
        <div class="h-px bg-slate-200 flex-1"></div>
      </div>

      <!-- Search Input -->
      <div>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Cari kecamatan (cth: Cibinong, Klojen)..."
          class="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-0 bg-slate-50/50"
        />
      </div>

      <!-- List -->
      <div class="mt-3 flex-1 overflow-y-auto max-h-56 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {#if loadingList}
          <div class="p-6 text-center text-xs font-bold text-slate-400">Memuat data kecamatan...</div>
        {:else if filteredSubdistricts.length === 0}
          <div class="p-6 text-center text-xs font-semibold text-slate-500">
            Tidak ditemukan kecamatan yang cocok dengan "{searchQuery}".
          </div>
        {:else}
          {#each filteredSubdistricts as sub (sub.id)}
            <button
              type="button"
              onclick={() => handleSelect(sub)}
              class="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors {locationStore.subdistrictId === sub.id ? 'bg-blue-50 font-black text-blue-700' : 'text-slate-800 font-medium'}"
            >
              <div>
                <span class="font-bold">Kec. {sub.name}</span>
                <span class="text-slate-400 text-[11px] ml-1.5">— {sub.regionName}</span>
              </div>
              {#if locationStore.subdistrictId === sub.id}
                <span class="inline-flex items-center gap-1 text-blue-600 text-xs font-black">
                  <Check class="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer Buttons -->
      <div class="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
        {#if locationStore.isActive}
          <button
            type="button"
            onclick={handleClear}
            class="text-xs font-bold text-red-600 hover:text-red-700 hover:underline px-2 py-1"
          >
            Hapus Filter Lokasi
          </button>
        {:else}
          <div></div>
        {/if}
        <button
          type="button"
          onclick={onclose}
          class="px-4 py-2 rounded-xl border-2 border-slate-900 bg-slate-100 text-slate-800 text-xs font-bold shadow-[0_2px_0_#0f172a] hover:bg-slate-200"
        >
          Selesai
        </button>
      </div>
    </div>
  </div>
{/if}

