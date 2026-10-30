<script lang="ts">
  import {
    AlertTriangle,
    BarChart2,
    Box,
    Calculator,
    CheckCircle2,
    Clock,
    Info,
    Layers,
    Sparkles,
    XCircle,
    Zap
  } from 'lucide-svelte';
  import { apiFetch } from '../api';
  import { formatRupiah } from '../format';

  let {
    material = $bindable(0),
    packaging = $bindable(0),
    overhead = $bindable(0),
    labor = $bindable(0),
    sellingPrice = $bindable(0),
    categoryId = null,
    postType = 'product'
  }: {
    material: number;
    packaging: number;
    overhead: number;
    labor: number;
    sellingPrice: number;
    categoryId?: number | null;
    postType?: 'product' | 'service' | 'portfolio';
  } = $props();

  let isOpen = $state(true);
  let benchmarkData = $state<{
    count: number;
    minPrice: number;
    medianPrice: number;
    p75Price: number;
    maxPrice: number;
  } | null>(null);
  let loadingBenchmark = $state(false);

  const totalHpp = $derived(
    Number(material || 0) + Number(packaging || 0) + Number(overhead || 0) + Number(labor || 0)
  );

  const profit = $derived(Number(sellingPrice || 0) - totalHpp);

  const marginPercent = $derived.by(() => {
    const sp = Number(sellingPrice || 0);
    if (sp <= 0) return 0;
    return Math.round((profit / sp) * 100);
  });

  const marginStatus = $derived.by(() => {
    const sp = Number(sellingPrice || 0);
    if (sp <= 0 || totalHpp <= 0) return 'uncalculated';
    if (profit < 0) return 'loss';
    if (marginPercent < 15) return 'thin';
    if (marginPercent <= 50) return 'healthy';
    return 'premium';
  });

  const suggestedPriceMin = $derived(
    totalHpp > 0 ? Math.ceil((totalHpp * 1.2) / 1000) * 1000 : 0
  );
  const suggestedPriceMax = $derived(
    totalHpp > 0 ? Math.ceil((totalHpp * 1.45) / 1000) * 1000 : 0
  );

  $effect(() => {
    if (categoryId && postType !== 'portfolio') {
      void fetchBenchmark(categoryId, postType);
    }
  });

  async function fetchBenchmark(catId: number, type: string) {
    loadingBenchmark = true;
    try {
      const res = await apiFetch<{
        benchmark: {
          count: number;
          minPrice: number;
          medianPrice: number;
          p75Price: number;
          maxPrice: number;
        };
      }>(`/api/pricing/benchmark?categoryId=${catId}&type=${type}`);
      if (res.ok && res.data?.benchmark) {
        benchmarkData = res.data.benchmark;
      }
    } catch {
      // quiet
    } finally {
      loadingBenchmark = false;
    }
  }

  function applySuggestedPrice(val: number) {
    sellingPrice = val;
  }
</script>

<div class="rounded-2xl border-2 border-slate-900 bg-white overflow-hidden shadow-[0_4px_0_#0f172a] mb-5">
  <!-- Accordion Toggle Header -->
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="w-full px-5 py-4 flex items-center justify-between bg-violet-50/70 border-b-2 border-slate-900/10 hover:bg-violet-100/50 transition-colors text-left"
  >
    <div class="flex items-center gap-3">
      <span class="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center text-sm font-black shadow-xs">
        <Calculator class="w-4 h-4 text-white" />
      </span>
      <div>
        <h4 class="font-black text-slate-900 text-sm">
          Asisten Harga &amp; Kalkulator HPP Siswa (PKK)
        </h4>
        <p class="text-xs text-slate-500 font-semibold">
          Belajar susun Harga Pokok Produksi, pantau margin sehat, dan benchmark pasar
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      {#if totalHpp > 0}
        <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-violet-200 text-violet-800 border border-violet-300">
          HPP: {formatRupiah(totalHpp)}
        </span>
      {/if}
      <span class="text-slate-400 font-bold text-sm">{isOpen ? '▲' : '▼'}</span>
    </div>
  </button>

  {#if isOpen}
    <div class="p-5 space-y-4">
      <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-start gap-2">
        <Info class="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span>
          <strong>Kerahasiaan Data:</strong> Rincian komponen HPP ini bersifat <em>pribadi</em> hanya untuk Anda &amp; Guru Pembimbing. Calon pembeli umum di katalog <strong>tidak dapat melihat</strong> rincian biaya ini.
        </span>
      </div>

      <!-- Cost Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- 1. Material -->
        <div class="p-3 rounded-xl border-2 border-slate-200 bg-slate-50/50">
          <label for="hpp-material" class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-slate-500" />
            <span>Bahan Baku / Material</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <input
              id="hpp-material"
              type="number"
              min="0"
              step="500"
              bind:value={material}
              class="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:border-violet-600 focus:ring-0"
              placeholder="0"
            />
          </div>
          <p class="text-[10px] text-slate-500 mt-1">Filamen 3D, kayu, kain, komponen, dsb.</p>
        </div>

        <!-- 2. Packaging -->
        <div class="p-3 rounded-xl border-2 border-slate-200 bg-slate-50/50">
          <label for="hpp-packaging" class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Box class="w-3.5 h-3.5 text-slate-500" />
            <span>Kemasan / Packaging</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <input
              id="hpp-packaging"
              type="number"
              min="0"
              step="500"
              bind:value={packaging}
              class="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:border-violet-600 focus:ring-0"
              placeholder="0"
            />
          </div>
          <p class="text-[10px] text-slate-500 mt-1">Dus, bubble wrap, plastik segel, stiker.</p>
        </div>

        <!-- 3. Overhead -->
        <div class="p-3 rounded-xl border-2 border-slate-200 bg-slate-50/50">
          <label for="hpp-overhead" class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Zap class="w-3.5 h-3.5 text-slate-500" />
            <span>Listrik &amp; Alat (Overhead)</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <input
              id="hpp-overhead"
              type="number"
              min="0"
              step="500"
              bind:value={overhead}
              class="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:border-violet-600 focus:ring-0"
              placeholder="0"
            />
          </div>
          <p class="text-[10px] text-slate-500 mt-1">Penyusutan mesin, kuota, daya listrik.</p>
        </div>

        <!-- 4. Labor -->
        <div class="p-3 rounded-xl border-2 border-slate-200 bg-slate-50/50">
          <label for="hpp-labor" class="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Clock class="w-3.5 h-3.5 text-slate-500" />
            <span>Upah Kerja Siswa (Labor)</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <input
              id="hpp-labor"
              type="number"
              min="0"
              step="500"
              bind:value={labor}
              class="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:border-violet-600 focus:ring-0"
              placeholder="0"
            />
          </div>
          <p class="text-[10px] text-slate-500 mt-1">Hargai waktu &amp; keterampilan Anda!</p>
        </div>
      </div>

      <!-- Real-time Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
        <div class="p-3.5 rounded-xl border-2 border-slate-900 bg-slate-100 shadow-[0_2px_0_#0f172a]">
          <span class="text-[11px] font-bold text-slate-500 uppercase">Total HPP (Modal Pokok)</span>
          <p class="text-base font-black text-slate-900 mt-0.5">{formatRupiah(totalHpp)}</p>
        </div>

        <div class="p-3.5 rounded-xl border-2 border-slate-900 bg-white shadow-[0_2px_0_#0f172a]">
          <span class="text-[11px] font-bold text-slate-500 uppercase">Estimasi Laba per Unit</span>
          <p class="text-base font-black {profit >= 0 ? 'text-emerald-700' : 'text-red-600'} mt-0.5">
            {formatRupiah(profit)}
          </p>
        </div>

        <div class="p-3.5 rounded-xl border-2 border-slate-900 shadow-[0_2px_0_#0f172a] {marginStatus === 'healthy' ? 'bg-emerald-50 border-emerald-800' : marginStatus === 'thin' ? 'bg-amber-50 border-amber-800' : marginStatus === 'loss' ? 'bg-red-50 border-red-800' : marginStatus === 'premium' ? 'bg-purple-50 border-purple-800' : 'bg-slate-50'}">
          <span class="text-[11px] font-bold text-slate-500 uppercase">Status Margin Usaha</span>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-base font-black {marginStatus === 'healthy' ? 'text-emerald-700' : marginStatus === 'loss' ? 'text-red-700' : 'text-slate-900'}">
              {marginPercent}%
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 {marginStatus === 'healthy' ? 'bg-emerald-200 text-emerald-900' : marginStatus === 'thin' ? 'bg-amber-200 text-amber-900' : marginStatus === 'loss' ? 'bg-red-200 text-red-900' : marginStatus === 'premium' ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-700'}">
              {#if marginStatus === 'healthy'}
                <CheckCircle2 class="w-3 h-3 text-emerald-700" />
                <span>Sehat (15–50%)</span>
              {:else if marginStatus === 'thin'}
                <AlertTriangle class="w-3 h-3 text-amber-700" />
                <span>Tipis (&lt;15%)</span>
              {:else if marginStatus === 'loss'}
                <XCircle class="w-3 h-3 text-red-700" />
                <span>Rugi (Jual &lt; Modal)</span>
              {:else if marginStatus === 'premium'}
                <Sparkles class="w-3 h-3 text-purple-700" />
                <span>Premium (&gt;50%)</span>
              {:else}
                Masukkan Biaya &amp; Harga
              {/if}
            </span>
          </div>
        </div>
      </div>

      <!-- Suggested Price Banner & Benchmark -->
      {#if totalHpp > 0}
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-violet-50 border-2 border-violet-200">
          <div>
            <span class="text-xs font-bold text-violet-900">Rekomendasi Rentang Harga Jual Ideal:</span>
            <p class="text-sm font-black text-violet-950">
              {formatRupiah(suggestedPriceMin)} – {formatRupiah(suggestedPriceMax)}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => applySuggestedPrice(suggestedPriceMin)}
              class="px-2.5 py-1 text-xs font-black rounded-lg border border-violet-300 bg-white text-violet-700 hover:bg-violet-100 transition-colors"
            >
              Gunakan Min
            </button>
            <button
              type="button"
              onclick={() => applySuggestedPrice(suggestedPriceMax)}
              class="px-2.5 py-1 text-xs font-black rounded-lg border border-violet-300 bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              Gunakan Maks
            </button>
          </div>
        </div>
      {/if}

      <!-- Market Benchmark Pill -->
      {#if benchmarkData && benchmarkData.count > 0}
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div class="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <BarChart2 class="w-3.5 h-3.5 text-slate-500" />
              <span>Benchmark Pasar ({benchmarkData.count} karya sejenis di kategori ini):</span>
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Terendah: {formatRupiah(benchmarkData.minPrice)}</span>
            <span class="font-bold text-slate-800">Median: {formatRupiah(benchmarkData.medianPrice)}</span>
            <span>Persentil 75: {formatRupiah(benchmarkData.p75Price)}</span>
            <span>Tertinggi: {formatRupiah(benchmarkData.maxPrice)}</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
