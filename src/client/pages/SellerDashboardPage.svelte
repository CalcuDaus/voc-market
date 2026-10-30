<script lang="ts">
  import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Download,
    Eye,
    FileSpreadsheet,
    HelpCircle,
    Layers,
    Lightbulb,
    Printer,
    RefreshCw,
    Share2,
    ShoppingBag,
    TrendingUp,
    Wallet,
    Zap
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatRupiah } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import CreatorLevelCard from '../lib/components/CreatorLevelCard.svelte';
  import BadgeGrid from '../lib/components/BadgeGrid.svelte';

  type PeriodOption = '7d' | '30d' | 'all';

  let selectedPeriod = $state<PeriodOption>('30d');
  let loading = $state(true);
  let errorMsg = $state('');
  let data = $state<{
    period: PeriodOption;
    summary: {
      grossRevenue: number;
      totalHppCost: number;
      netProfit: number;
      avgMarginPercent: number;
      completedOrdersCount: number;
      activeOrdersCount: number;
      totalViews: number;
      totalShares: number;
      conversionRatePercent: number;
    };
    dailySeries: Array<{
      date: string;
      views: number;
      shares: number;
      orders: number;
    }>;
    smartTips: string[];
    worksPerformance: Array<{
      id: number;
      name: string;
      type: string;
      views: number;
      shares: number;
      ordersCount: number;
      price: number;
      costPrice: number;
      unitProfit: number;
      conversionRate: number;
    }>;
    levelProgress: {
      currentLevel: number;
      currentTitle: string;
      unlockedBadges: any[];
      nextLevel: any;
    };
  } | null>(null);

  async function loadDashboard(period: PeriodOption) {
    loading = true;
    errorMsg = '';
    const res = await apiFetch<{
      dashboard: typeof data;
      error?: string;
    }>(`/api/seller/dashboard?period=${period}`);

    if (!res.ok || !res.data?.dashboard) {
      errorMsg = res.data?.error || 'Gagal memuat ringkasan toko Anda.';
      data = null;
      loading = false;
      return;
    }

    data = res.data.dashboard;
    loading = false;
  }

  $effect(() => {
    loadDashboard(selectedPeriod);
  });

  function downloadCsv() {
    window.open(`/api/seller/report/csv?period=${selectedPeriod}`, '_blank');
  }

  function printPkkReport() {
    navigate(`/dashboard-penjual/cetak?period=${selectedPeriod}`);
  }

  // Helper for rendering SVG sparkline chart
  const chartMetrics = $derived.by(() => {
    if (!data?.dailySeries || data.dailySeries.length === 0) {
      return { pathViews: '', pathOrders: '', maxVal: 10 };
    }
    const series = data.dailySeries;
    const maxVal = Math.max(
      10,
      ...series.map((s) => Math.max(s.views, s.orders * 5))
    );

    const width = 600;
    const height = 140;
    const stepX = width / Math.max(1, series.length - 1);

    const viewsPoints = series.map((s, idx) => {
      const x = idx * stepX;
      const y = height - (s.views / maxVal) * (height - 20) - 10;
      return `${x},${y}`;
    });

    const ordersPoints = series.map((s, idx) => {
      const x = idx * stepX;
      const y = height - ((s.orders * 5) / maxVal) * (height - 20) - 10;
      return `${x},${y}`;
    });

    return {
      pathViews: `M ${viewsPoints.join(' L ')}`,
      pathOrders: `M ${ordersPoints.join(' L ')}`,
      maxVal
    };
  });
</script>

<div class="max-w-5xl mx-auto px-2 sm:px-4 py-3">
  <!-- Top Navigation & Title Bar -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={() => navigate('/')}
        class="h-9 px-3 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 flex items-center justify-center text-gray-700 active:translate-y-0.5 cursor-pointer"
        aria-label="Kembali"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <div>
        <h1 class="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
          Dashboard Penjual &amp; Buku Kas PKK
        </h1>
        <p class="text-xs font-semibold text-gray-500">
          Pantau omzet, laba bersih, efisiensi HPP, dan konversi karya vokasi Anda
        </p>
      </div>
    </div>

    <!-- Actions & Period Filter -->
    <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
      <!-- Period selector -->
      <div class="inline-flex p-1 rounded-xl bg-gray-100 border-2 border-gray-300 shadow-[0_2px_0_#d1d5db]">
        {#each [
          { id: '7d', label: '7 Hari' },
          { id: '30d', label: '30 Hari' },
          { id: 'all', label: 'Semua' }
        ] as opt}
          <button
            type="button"
            onclick={() => (selectedPeriod = opt.id as PeriodOption)}
            class="px-3 py-1 text-xs font-black rounded-lg transition-colors cursor-pointer {selectedPeriod === opt.id
              ? 'bg-[#4285F4] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'}"
          >
            {opt.label}
          </button>
        {/each}
      </div>

      <!-- Action Buttons -->
      <button
        type="button"
        onclick={downloadCsv}
        class="h-9 px-3.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-[0_2px_0_#0f172a] active:translate-y-0.5 inline-flex items-center gap-1.5 cursor-pointer"
        title="Unduh laporan format CSV Excel dengan UTF-8 BOM"
      >
        <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-600" />
        <span class="hidden sm:inline">Unduh Excel</span>
      </button>

      <button
        type="button"
        onclick={printPkkReport}
        class="h-9 px-3.5 rounded-xl border-2 border-slate-900 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-[0_2px_0_#1e3a8a] active:translate-y-0.5 inline-flex items-center gap-1.5 cursor-pointer"
        title="Buka laporan format cetak A4 untuk mata pelajaran PKK"
      >
        <Printer class="w-3.5 h-3.5" />
        <span>Cetak Laporan PKK</span>
      </button>
    </div>
  </div>

  {#if loading}
    <div class="p-12 text-center bg-white border-2 border-gray-300 rounded-3xl shadow-[0_5px_0_#d1d5db] animate-pulse">
      <div class="w-10 h-10 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-bold text-gray-500">Mengkalkulasi buku kas dan statistik penjualan Anda...</p>
    </div>
  {:else if errorMsg || !data}
    <div class="p-8 text-center bg-white border-2 border-gray-300 rounded-3xl shadow-[0_5px_0_#d1d5db]">
      <p class="text-sm font-bold text-red-600">{errorMsg}</p>
      <button
        type="button"
        onclick={() => loadDashboard(selectedPeriod)}
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
      >
        Coba Lagi
      </button>
    </div>
  {:else}
    <!-- 4 Main Financial KPI Cards (Tactile 3D Google Colors) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- 1. Omzet Penjualan (Google Blue) -->
      <div class="p-5 rounded-2xl border-2 border-blue-800 bg-blue-50/70 shadow-[0_4px_0_#1e40af]">
        <div class="flex items-center justify-between text-blue-900 mb-2">
          <span class="text-xs font-black uppercase tracking-wider">Omzet Penjualan</span>
          <div class="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <Wallet class="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl font-black text-blue-950">
          {formatRupiah(data.summary.grossRevenue)}
        </p>
        <p class="text-[11px] font-semibold text-blue-800 mt-1">
          {data.summary.completedOrdersCount} transaksi selesai ({data.summary.activeOrdersCount} aktif)
        </p>
      </div>

      <!-- 2. Modal Pokok HPP (Google Red) -->
      <div class="p-5 rounded-2xl border-2 border-rose-800 bg-rose-50/70 shadow-[0_4px_0_#9f1239]">
        <div class="flex items-center justify-between text-rose-900 mb-2">
          <span class="text-xs font-black uppercase tracking-wider">Total Modal HPP</span>
          <div class="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <Layers class="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl font-black text-rose-950">
          {formatRupiah(data.summary.totalHppCost)}
        </p>
        <p class="text-[11px] font-semibold text-rose-800 mt-1">
          Bahan, kemasan, overhead &amp; alat
        </p>
      </div>

      <!-- 3. Laba Bersih (Google Green) -->
      <div class="p-5 rounded-2xl border-2 border-emerald-800 bg-emerald-50/70 shadow-[0_4px_0_#065f46]">
        <div class="flex items-center justify-between text-emerald-900 mb-2">
          <span class="text-xs font-black uppercase tracking-wider">Laba Bersih Usaha</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <TrendingUp class="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl font-black text-emerald-950">
          {formatRupiah(data.summary.netProfit)}
        </p>
        <p class="text-[11px] font-semibold text-emerald-800 mt-1">
          Margin rata-rata: <strong>{data.summary.avgMarginPercent}%</strong>
        </p>
      </div>

      <!-- 4. Konversi & Tayangan (Google Yellow/Amber) -->
      <div class="p-5 rounded-2xl border-2 border-amber-800 bg-amber-50/70 shadow-[0_4px_0_#92400e]">
        <div class="flex items-center justify-between text-amber-900 mb-2">
          <span class="text-xs font-black uppercase tracking-wider">Rasio Konversi</span>
          <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <CheckCircle2 class="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl font-black text-amber-950">
          {data.summary.conversionRatePercent}%
        </p>
        <p class="text-[11px] font-semibold text-amber-800 mt-1">
          {data.summary.totalViews} tayangan • {data.summary.totalShares} dibagikan
        </p>
      </div>
    </div>

    <!-- Smart Tips from PKK Business Advisor -->
    {#if data.smartTips && data.smartTips.length > 0}
      <div class="p-4 sm:p-5 rounded-2xl border-2 border-violet-800 bg-violet-50/70 shadow-[0_4px_0_#5b21b6] mb-6">
        <div class="flex items-center gap-2.5 mb-2.5">
          <span class="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-sm">
            <Lightbulb class="w-4 h-4" />
          </span>
          <h3 class="text-sm font-black text-violet-950">
            Saran Praktik Kewirausahaan Siswa (PKK Smart Tips)
          </h3>
        </div>
        <ul class="space-y-1.5 text-xs text-violet-900 font-semibold pl-2">
          {#each data.smartTips as tip}
            <li class="flex items-start gap-2">
              <span class="text-violet-600 font-bold">•</span>
              <span>{tip}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Daily Trend Chart (SVG Sparkline / Line Series) -->
    <div class="p-5 rounded-3xl border-2 border-slate-900 bg-white shadow-[0_5px_0_#0f172a] mb-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 class="text-sm font-black text-slate-900">Grafik Aktivitas Harian</h3>
          <p class="text-xs font-semibold text-slate-500">Tayangan karya vs Pesanan riil masuk</p>
        </div>
        <div class="flex items-center gap-4 text-xs font-bold">
          <span class="flex items-center gap-1.5 text-blue-600">
            <span class="w-3 h-3 rounded-full bg-blue-500"></span> Tayangan (Views)
          </span>
          <span class="flex items-center gap-1.5 text-emerald-600">
            <span class="w-3 h-3 rounded-full bg-emerald-500"></span> Pesanan (Orders)
          </span>
        </div>
      </div>

      <div class="mt-4 overflow-x-auto">
        <div class="min-w-[500px]">
          <svg viewBox="0 0 600 150" class="w-full h-36">
            <!-- Grid Lines -->
            <line x1="0" y1="20" x2="600" y2="20" stroke="#f1f5f9" stroke-width="1" />
            <line x1="0" y1="70" x2="600" y2="70" stroke="#f1f5f9" stroke-width="1" />
            <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" stroke-width="1" />

            <!-- Views Line (Blue) -->
            <path
              d={chartMetrics.pathViews}
              fill="none"
              stroke="#3b82f6"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Orders Line (Emerald) -->
            <path
              d={chartMetrics.pathOrders}
              fill="none"
              stroke="#10b981"
              stroke-width="3"
              stroke-dasharray="4,4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div class="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
            <span>{data.dailySeries[0]?.date || ''}</span>
            <span>Tren Aktivitas</span>
            <span>{data.dailySeries[data.dailySeries.length - 1]?.date || ''}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Works Performance Table -->
    <div class="p-5 rounded-3xl border-2 border-slate-900 bg-white shadow-[0_5px_0_#0f172a] mb-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div>
          <h3 class="text-sm font-black text-slate-900">Performa Per Karya &amp; Jasa</h3>
          <p class="text-xs font-semibold text-slate-500">Evaluasi efisiensi harga dan daya tarik portofolio</p>
        </div>
        <span class="text-xs font-bold text-slate-500">
          {data.worksPerformance.length} Karya Terdaftar
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b-2 border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
              <th class="py-2.5 px-3">Judul Karya</th>
              <th class="py-2.5 px-2">Tipe</th>
              <th class="py-2.5 px-2 text-right">Harga</th>
              <th class="py-2.5 px-2 text-right">HPP Pokok</th>
              <th class="py-2.5 px-2 text-right">Laba/Unit</th>
              <th class="py-2.5 px-2 text-center">Dilihat</th>
              <th class="py-2.5 px-2 text-center">Dibagikan</th>
              <th class="py-2.5 px-2 text-center">Pesanan</th>
              <th class="py-2.5 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each data.worksPerformance as wp (wp.id)}
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 px-3 font-bold text-slate-900 max-w-xs truncate">
                  <a href="/karya/{wp.id}" class="hover:text-blue-600 hover:underline">
                    {wp.name}
                  </a>
                </td>
                <td class="py-3 px-2">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase {wp.type === 'product' ? 'bg-emerald-100 text-emerald-800' : wp.type === 'service' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                    {wp.type}
                  </span>
                </td>
                <td class="py-3 px-2 text-right font-black text-slate-900">
                  {formatRupiah(wp.price)}
                </td>
                <td class="py-3 px-2 text-right font-semibold text-slate-600">
                  {wp.costPrice > 0 ? formatRupiah(wp.costPrice) : '-'}
                </td>
                <td class="py-3 px-2 text-right font-black {wp.unitProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}">
                  {wp.costPrice > 0 ? formatRupiah(wp.unitProfit) : '-'}
                </td>
                <td class="py-3 px-2 text-center font-bold text-slate-700">
                  {wp.views}
                </td>
                <td class="py-3 px-2 text-center font-bold text-slate-700">
                  {wp.shares}
                </td>
                <td class="py-3 px-2 text-center font-black text-emerald-700">
                  {wp.ordersCount}
                </td>
                <td class="py-3 px-3 text-right">
                  <a
                    href="/karya/{wp.id}"
                    class="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors inline-block"
                  >
                    Detail
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Creator Level Progression & Badges (#11) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CreatorLevelCard
        level={data.levelProgress.currentLevel}
        title={data.levelProgress.currentTitle}
        nextLevelRequirements={data.levelProgress.nextLevel?.requirements || []}
      />
      <BadgeGrid badges={data.levelProgress.unlockedBadges || []} />
    </div>
  {/if}
</div>

