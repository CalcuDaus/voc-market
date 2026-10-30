<script lang="ts">
  import { ArrowLeft, Printer } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId, formatRupiah } from '../lib/format';
  import { navigate, router } from '../lib/router.svelte';

  let loading = $state(true);
  let errorMsg = $state('');
  let report = $state<{
    period: string;
    student: {
      name: string;
      nisn: string | null;
      schoolName: string | null;
      major: string | null;
      verifierName: string | null;
    };
    summary: {
      grossRevenue: number;
      totalHppCost: number;
      netProfit: number;
      avgMarginPercent: number;
      completedOrdersCount: number;
    };
    transactions: Array<{
      orderCode: string;
      completedAt: string;
      title: string;
      customerName: string;
      quantity: number;
      agreedPrice: number;
      unitCost: number;
      netProfit: number;
    }>;
  } | null>(null);

  const periodParam = $derived.by(() => {
    const search = new URLSearchParams(router.search);
    return search.get('period') || '30d';
  });

  async function loadPrintData() {
    loading = true;
    errorMsg = '';
    const res = await apiFetch<{
      dashboard: any;
      error?: string;
    }>(`/api/seller/dashboard?period=${periodParam}`);

    if (!res.ok || !res.data?.dashboard) {
      errorMsg = res.data?.error || 'Gagal memuat data laporan.';
      loading = false;
      return;
    }

    const d = res.data.dashboard;
    report = {
      period: d.period === '7d' ? '7 Hari Terakhir' : d.period === 'all' ? 'Seluruh Waktu' : '30 Hari Terakhir',
      student: {
        name: auth.user?.name || 'Siswa SMK',
        nisn: auth.user?.nisn || '-',
        schoolName: auth.user?.schoolName || 'SMK Negeri',
        major: auth.user?.major || 'Kejuruan Vokasi',
        verifierName: 'Guru Pembimbing PKK'
      },
      summary: d.summary,
      transactions: (d.transactions || []).map((t: any) => ({
        orderCode: t.orderCode,
        completedAt: t.completedAt,
        title: t.postName || 'Pekerjaan Siswa',
        customerName: t.buyerName,
        quantity: t.quantity || 1,
        agreedPrice: t.agreedPrice,
        unitCost: t.unitCostSnapshot || 0,
        netProfit: t.agreedPrice - (t.unitCostSnapshot || 0)
      }))
    };
    loading = false;
  }

  $effect(() => {
    loadPrintData();
  });

  function handlePrint() {
    window.print();
  }
</script>

<div class="max-w-4xl mx-auto px-4 py-4 print:p-0 print:max-w-none text-slate-800">
  <!-- Toolbar (Hidden on Print) -->
  <div class="flex items-center justify-between gap-3 mb-6 print:hidden">
    <button
      type="button"
      onclick={() => navigate('/dashboard-penjual')}
      class="h-9 px-3.5 rounded-xl bg-white border-2 border-slate-300 shadow-[0_2px_0_#d1d5db] hover:bg-slate-50 text-xs font-bold text-slate-700 active:translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Kembali ke Dashboard</span>
    </button>

    <button
      type="button"
      onclick={handlePrint}
      class="h-10 px-5 rounded-xl border-2 border-slate-900 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-[0_3px_0_#1e3a8a] active:translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
    >
      <Printer class="w-4 h-4" />
      <span>Cetak Dokumen A4 / Simpan PDF</span>
    </button>
  </div>

  {#if loading}
    <div class="p-12 text-center bg-white border rounded-2xl">
      <p class="text-xs font-bold text-slate-500">Mempersiapkan lembar laporan A4...</p>
    </div>
  {:else if errorMsg || !report}
    <div class="p-8 text-center bg-white border rounded-2xl">
      <p class="text-xs font-bold text-red-600">{errorMsg}</p>
    </div>
  {:else}
    <!-- Printable Sheet Canvas -->
    <div class="bg-white p-8 sm:p-12 border-2 border-slate-300 rounded-3xl shadow-[0_4px_0_#d1d5db] print:border-none print:shadow-none print:p-0">
      <!-- Kop Dokumen -->
      <div class="text-center pb-6 border-b-2 border-slate-800 mb-6">
        <h2 class="text-lg font-black uppercase tracking-wider text-slate-900">
          {report.student.schoolName}
        </h2>
        <h1 class="text-base sm:text-lg font-black uppercase text-blue-900 mt-1">
          Laporan Praktik Kewirausahaan Siswa (PKK)
        </h1>
        <p class="text-xs text-slate-600 font-semibold mt-1">
          Buku Kas Omzet &amp; Rekapitulasi Efisiensi HPP • Platform VOC-Market ({report.period})
        </p>
      </div>

      <!-- Identitas Siswa -->
      <div class="grid grid-cols-2 gap-4 text-xs font-medium bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
        <div>
          <p><span class="font-bold text-slate-500">Nama Siswa:</span> <strong class="text-slate-900">{report.student.name}</strong></p>
          <p class="mt-1"><span class="font-bold text-slate-500">NISN:</span> {report.student.nisn}</p>
        </div>
        <div>
          <p><span class="font-bold text-slate-500">Kompetensi Keahlian:</span> {report.student.major}</p>
          <p class="mt-1"><span class="font-bold text-slate-500">Tanggal Cetak:</span> {formatDateId(new Date().toISOString())}</p>
        </div>
      </div>

      <!-- Ringkasan Finansial Usaha -->
      <div class="mb-6">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
          I. Ringkasan Keuangan Praktik Wirausaha
        </h3>
        <table class="w-full text-xs border border-slate-300 border-collapse">
          <tbody>
            <tr class="border-b border-slate-200">
              <td class="p-2.5 bg-slate-100 font-bold w-1/2">Total Omzet Penjualan (Gross Revenue)</td>
              <td class="p-2.5 font-black text-right">{formatRupiah(report.summary.grossRevenue)}</td>
            </tr>
            <tr class="border-b border-slate-200">
              <td class="p-2.5 bg-slate-100 font-bold">Total Beban Pokok Produksi (HPP)</td>
              <td class="p-2.5 font-bold text-right text-rose-700">{formatRupiah(report.summary.totalHppCost)}</td>
            </tr>
            <tr class="border-b border-slate-200">
              <td class="p-2.5 bg-slate-100 font-bold">Laba Bersih Usaha (Net Profit)</td>
              <td class="p-2.5 font-black text-right text-emerald-700">{formatRupiah(report.summary.netProfit)}</td>
            </tr>
            <tr class="border-b border-slate-200">
              <td class="p-2.5 bg-slate-100 font-bold">Rata-Rata Margin Keuntungan</td>
              <td class="p-2.5 font-black text-right">{report.summary.avgMarginPercent}%</td>
            </tr>
            <tr>
              <td class="p-2.5 bg-slate-100 font-bold">Total Transaksi Selesai</td>
              <td class="p-2.5 font-black text-right">{report.summary.completedOrdersCount} Pesanan</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail Transaksi Selesai -->
      <div class="mb-10">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
          II. Rincian Transaksi Selesai
        </h3>
        <table class="w-full text-left text-xs border border-slate-300 border-collapse">
          <thead>
            <tr class="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black uppercase">
              <th class="p-2 border-r border-slate-300">No. Pesanan</th>
              <th class="p-2 border-r border-slate-300">Tanggal</th>
              <th class="p-2 border-r border-slate-300">Karya / Jasa</th>
              <th class="p-2 border-r border-slate-300">Pelanggan</th>
              <th class="p-2 border-r border-slate-300 text-right">Harga</th>
              <th class="p-2 border-r border-slate-300 text-right">HPP</th>
              <th class="p-2 text-right">Laba</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {#if report.transactions.length === 0}
              <tr>
                <td colspan="7" class="p-4 text-center text-slate-500 font-medium italic">
                  Belum ada transaksi selesai pada periode ini.
                </td>
              </tr>
            {:else}
              {#each report.transactions as t}
                <tr>
                  <td class="p-2 font-mono text-[11px] border-r border-slate-200">{t.orderCode}</td>
                  <td class="p-2 text-[11px] border-r border-slate-200">{formatDateId(t.completedAt)}</td>
                  <td class="p-2 font-bold border-r border-slate-200">{t.title}</td>
                  <td class="p-2 border-r border-slate-200">{t.customerName}</td>
                  <td class="p-2 text-right font-black border-r border-slate-200">{formatRupiah(t.agreedPrice)}</td>
                  <td class="p-2 text-right text-slate-600 border-r border-slate-200">{formatRupiah(t.unitCost)}</td>
                  <td class="p-2 text-right font-black text-emerald-700">{formatRupiah(t.netProfit)}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Tanda Tangan Pengesahan -->
      <div class="grid grid-cols-2 gap-8 text-xs text-center pt-8 border-t border-slate-200">
        <div>
          <p class="font-bold text-slate-600">Siswa Pelaksana Wirausaha,</p>
          <div class="h-20"></div>
          <p class="font-black text-slate-900 underline">{report.student.name}</p>
          <p class="text-[11px] text-slate-500 mt-0.5">NISN: {report.student.nisn}</p>
        </div>

        <div>
          <p class="font-bold text-slate-600">Mengetahui,<br/>Guru Pembimbing PKK,</p>
          <div class="h-16"></div>
          <p class="font-black text-slate-900 underline">__________________________</p>
          <p class="text-[11px] text-slate-500 mt-0.5">NIP: .......................................</p>
        </div>
      </div>
    </div>
  {/if}
</div>

