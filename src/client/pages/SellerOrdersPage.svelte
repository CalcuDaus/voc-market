<script lang="ts">
  import {
    CheckCircle2,
    ClipboardList,
    Clock,
    ExternalLink,
    FileBadge,
    Image as ImageIcon,
    MessageCircle,
    Play,
    Star,
    Upload,
    Wallet,
    Wrench,
    XCircle
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import ConfirmModal from '../lib/components/ConfirmModal.svelte';

  let loading = $state(true);
  let errorMsg = $state('');
  let summary = $state({
    requestedCount: 0,
    activeCount: 0,
    completedCount: 0,
    totalRevenue: 0,
    formattedTotalRevenue: 'Rp 0'
  });
  let items = $state<any[]>([]);
  let activeTab = $state<'all' | 'requested' | 'active' | 'completed'>('all');

  // Per-order editable draft fields
  let priceDrafts = $state<Record<number, number>>({});
  let noteDrafts = $state<Record<number, string>>({});
  let proofFiles = $state<Record<number, File | null>>({});
  let processingOrderId = $state<number | null>(null);

  // Cancel confirmation modal
  let cancelTargetId = $state<number | null>(null);

  let filteredItems = $derived.by(() => {
    if (activeTab === 'requested') return items.filter((i) => i.status === 'requested');
    if (activeTab === 'active') {
      return items.filter((i) => i.status === 'accepted' || i.status === 'in_progress');
    }
    if (activeTab === 'completed') return items.filter((i) => i.status === 'completed');
    return items;
  });

  async function loadSellerOrders() {
    loading = true;
    errorMsg = '';
    const res = await apiFetch<{ summary?: any; items?: any[]; error?: string }>(
      '/api/seller/orders'
    );

    if (!res.ok || !res.data?.items) {
      errorMsg = res.data?.error || 'Gagal memuat daftar pesanan masuk.';
      loading = false;
      return;
    }

    summary = res.data.summary;
    items = res.data.items;

    const nextPrices: Record<number, number> = {};
    const nextNotes: Record<number, string> = {};
    for (const item of res.data.items) {
      nextPrices[item.id] = item.agreedPrice;
      nextNotes[item.id] = item.progressNote ?? '';
    }
    priceDrafts = nextPrices;
    noteDrafts = nextNotes;
    loading = false;
  }

  $effect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      navigate('/masuk');
      return;
    }
    loadSellerOrders();
  });

  function handleProofChange(orderId: number, e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    proofFiles = { ...proofFiles, [orderId]: file };
  }

  async function updateOrderStatus(
    orderId: number,
    nextStatus: 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  ) {
    processingOrderId = orderId;

    const fd = new FormData();
    fd.append('status', nextStatus);
    if (priceDrafts[orderId] !== undefined) {
      fd.append('agreedPrice', String(priceDrafts[orderId]));
    }
    if (noteDrafts[orderId] !== undefined) {
      fd.append('progressNote', noteDrafts[orderId]);
    }
    const proof = proofFiles[orderId];
    if (proof) {
      fd.append('proofImage', proof);
    }

    const res = await apiFetch<{
      success?: boolean;
      statusLabel?: string;
      error?: string;
    }>(`/api/seller/orders/${orderId}/status`, {
      method: 'PATCH',
      body: fd
    });

    processingOrderId = null;
    cancelTargetId = null;

    if (!res.ok || !res.data?.success) {
      toast.error(res.data?.error || 'Gagal memperbarui status pesanan.');
      return;
    }

    if (nextStatus === 'completed') {
      toast.success(
        'Pesanan selesai! Pengalaman kerja otomatis tercatat di Paspor Kerja Anda.'
      );
    } else {
      toast.success(`Status pesanan diperbarui menjadi: ${res.data.statusLabel}`);
    }

    proofFiles = { ...proofFiles, [orderId]: null };
    await Promise.all([loadSellerOrders(), auth.refresh()]);
  }

  function statusBadgeClass(status: string): string {
    switch (status) {
      case 'requested':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  }
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">Pesanan Masuk</h1>
      <p class="text-base text-slate-600 mt-1">
        Kelola pesanan pelanggan dengan rapi. Setiap pesanan selesai otomatis memperkaya Paspor Kerja Anda.
      </p>
    </div>

    {#if auth.user}
      <button
        type="button"
        onclick={() => navigate(`/paspor-kerja/${auth.user!.username}`)}
        class="h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm inline-flex items-center gap-2 shrink-0 transition"
      >
        <FileBadge class="w-4 h-4 text-blue-600" />
        <span>Lihat Paspor Kerja Saya</span>
      </button>
    {/if}
  </div>

  {#if errorMsg}
    <div class="bg-white border border-rose-200 rounded-2xl p-8 text-center">
      <p class="text-base font-semibold text-rose-700">{errorMsg}</p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-4 h-11 px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm"
      >
        Kembali ke Beranda
      </button>
    </div>
  {:else}
    <!-- 4 Summary Metric Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div class="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wide">
          <Clock class="w-4 h-4" />
          <span>Pesanan Baru</span>
        </div>
        <p class="text-2xl font-extrabold text-slate-900 mt-2">{summary.requestedCount}</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div class="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wide">
          <Wrench class="w-4 h-4" />
          <span>Sedang Dikerjakan</span>
        </div>
        <p class="text-2xl font-extrabold text-slate-900 mt-2">{summary.activeCount}</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div class="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wide">
          <CheckCircle2 class="w-4 h-4" />
          <span>Pesanan Selesai</span>
        </div>
        <p class="text-2xl font-extrabold text-slate-900 mt-2">{summary.completedCount}</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div class="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wide">
          <Wallet class="w-4 h-4" />
          <span>Total Nilai Proyek</span>
        </div>
        <p class="text-xl sm:text-2xl font-extrabold text-blue-700 mt-2 truncate">
          {summary.formattedTotalRevenue}
        </p>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button
        type="button"
        onclick={() => (activeTab = 'all')}
        class="h-10 px-4 rounded-xl text-sm font-semibold transition {activeTab === 'all'
          ? 'bg-slate-900 text-white'
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}"
      >
        Semua ({items.length})
      </button>
      <button
        type="button"
        onclick={() => (activeTab = 'requested')}
        class="h-10 px-4 rounded-xl text-sm font-semibold transition {activeTab === 'requested'
          ? 'bg-amber-600 text-white'
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}"
      >
        Menunggu Konfirmasi ({summary.requestedCount})
      </button>
      <button
        type="button"
        onclick={() => (activeTab = 'active')}
        class="h-10 px-4 rounded-xl text-sm font-semibold transition {activeTab === 'active'
          ? 'bg-blue-600 text-white'
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}"
      >
        Sedang Dikerjakan ({summary.activeCount})
      </button>
      <button
        type="button"
        onclick={() => (activeTab = 'completed')}
        class="h-10 px-4 rounded-xl text-sm font-semibold transition {activeTab === 'completed'
          ? 'bg-emerald-600 text-white'
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}"
      >
        Selesai ({summary.completedCount})
      </button>
    </div>

    {#if loading}
      <div class="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <div class="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-base text-slate-600 mt-3">Memuat pesanan pelanggan...</p>
      </div>
    {:else if filteredItems.length === 0}
      <div class="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <ClipboardList class="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 class="text-lg font-bold text-slate-900">Belum Ada Pesanan pada Kategori Ini</h2>
        <p class="text-base text-slate-600 mt-1 max-w-md mx-auto">
          Bagikan tautan karya Anda ke WhatsApp keluarga, guru, atau UMKM sekitar untuk mendapatkan pelanggan pertama!
        </p>
      </div>
    {:else}
      <div class="space-y-5">
        {#each filteredItems as item (item.id)}
          {@const isBusy = processingOrderId === item.id}
          <article class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <!-- Order Top Bar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div class="flex flex-wrap items-center gap-2.5">
                <span class="font-extrabold text-base text-slate-900">{item.orderCode}</span>
                <span class="px-3 py-1 rounded-full text-xs font-bold border {statusBadgeClass(item.status)}">
                  {item.statusLabel}
                </span>
                <span class="text-xs text-slate-500">{formatDateId(item.createdAt)}</span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onclick={() => navigate(item.trackPath)}
                  class="h-10 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  Halaman Pelanggan
                </button>
                <a
                  href={item.whatsappToBuyerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition"
                >
                  <MessageCircle class="w-4 h-4" />
                  <span>
                    {item.status === 'completed' && !item.review
                      ? 'Minta Ulasan via WA'
                      : 'Hubungi Pembeli (WA)'}
                  </span>
                  <ExternalLink class="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>

            <!-- Buyer & Product Summary -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div class="flex items-start gap-3.5">
                {#if item.product?.imageUrl}
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    class="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                  />
                {/if}
                <div>
                  <span class="text-xs font-bold text-blue-700">
                    {item.product?.typeLabel || 'Proyek Siswa'}
                  </span>
                  <h3 class="text-base font-bold text-slate-900">
                    {item.product?.name || 'Pekerjaan Siswa'}
                  </h3>
                  <p class="text-sm text-slate-600 mt-0.5">
                    Jumlah: <span class="font-semibold text-slate-900">{item.quantity}</span> • Nilai:
                    <span class="font-extrabold text-blue-700">{item.formattedAgreedPrice}</span>
                  </p>
                </div>
              </div>

              <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-sm space-y-1">
                <p class="font-bold text-slate-900">
                  Pemesan: {item.buyerName}
                  <span class="font-normal text-slate-500">({item.buyerPhone})</span>
                </p>
                {#if item.buyerAddress}
                  <p class="text-slate-700">
                    <span class="text-slate-500">Alamat:</span> {item.buyerAddress}
                  </p>
                {/if}
                {#if item.buyerNotes}
                  <p class="text-slate-700">
                    <span class="text-slate-500">Catatan:</span> "{item.buyerNotes}"
                  </p>
                {/if}
              </div>
            </div>

            <!-- Existing Proof Thumbnail -->
            {#if item.proofImageUrl}
              <div class="mb-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3">
                <img
                  src={item.proofImageUrl}
                  alt="Bukti hasil pengerjaan"
                  class="w-14 h-14 rounded-lg object-cover border border-emerald-200 shrink-0"
                />
                <div class="text-sm">
                  <p class="font-bold text-emerald-900 flex items-center gap-1.5">
                    <ImageIcon class="w-4 h-4 text-emerald-600" />
                    <span>Foto Bukti Hasil Karya Telah Diunggah</span>
                  </p>
                  {#if item.progressNote}
                    <p class="text-emerald-800 text-xs mt-0.5">"{item.progressNote}"</p>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Customer Review Display (if reviewed) -->
            {#if item.review}
              <div class="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div class="flex items-center gap-1.5 mb-1.5">
                  {#each [1, 2, 3, 4, 5] as star}
                    <Star
                      class="w-4 h-4 {star <= item.review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'}"
                    />
                  {/each}
                  <span class="text-xs font-bold text-amber-800 ml-1">
                    Ulasan Pelanggan ({item.review.rating}/5)
                  </span>
                </div>
                {#if item.review.endorsementTags?.length > 0}
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    {#each item.review.endorsementTags as tag}
                      <span class="px-2.5 py-0.5 rounded-full bg-white border border-amber-200 text-amber-900 text-xs font-semibold">
                        {tag}
                      </span>
                    {/each}
                  </div>
                {/if}
                <p class="text-sm text-slate-800 italic">"{item.review.comment}"</p>
              </div>
            {/if}

            <!-- Interactive Status Transition Controls for Active / Requested Orders -->
            {#if item.status !== 'completed' && item.status !== 'cancelled'}
              <div class="mt-3 pt-4 border-t border-slate-200 space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      for="agreed-price-{item.id}"
                      class="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Harga Kesepakatan Akhir (Rp)
                    </label>
                    <input
                      id="agreed-price-{item.id}"
                      type="number"
                      min="0"
                      bind:value={priceDrafts[item.id]}
                      class="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      for="progress-note-{item.id}"
                      class="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Catatan Pengerjaan untuk Pembeli
                    </label>
                    <input
                      id="progress-note-{item.id}"
                      type="text"
                      bind:value={noteDrafts[item.id]}
                      placeholder="Contoh: Pesanan sedang dirakit & siap besok sore"
                      class="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {#if item.status === 'accepted' || item.status === 'in_progress'}
                  <div class="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-300">
                    <label
                      for="proof-upload-{item.id}"
                      class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                    >
                      <div class="flex items-center gap-2.5">
                        <Upload class="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <span class="text-sm font-bold text-slate-800 block">
                            Unggah Foto Bukti Hasil Karya (Opsional, Sangat Disarankan)
                          </span>
                          <span class="text-xs text-slate-500">
                            {proofFiles[item.id]
                              ? `File dipilih: ${proofFiles[item.id]!.name}`
                              : 'Foto ini akan tampil di halaman pesanan pelanggan dan Paspor Kerja Anda.'}
                          </span>
                        </div>
                      </div>
                      <input
                        id="proof-upload-{item.id}"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onchange={(e) => handleProofChange(item.id, e)}
                        class="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </label>
                  </div>
                {/if}

                <!-- Action Buttons -->
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-2.5">
                    {#if item.status === 'requested'}
                      <button
                        type="button"
                        disabled={isBusy}
                        onclick={() => updateOrderStatus(item.id, 'accepted')}
                        class="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm inline-flex items-center gap-2 transition"
                      >
                        <CheckCircle2 class="w-4 h-4" />
                        <span>{isBusy ? 'Memproses...' : '1. Terima Pesanan'}</span>
                      </button>
                    {:else if item.status === 'accepted'}
                      <button
                        type="button"
                        disabled={isBusy}
                        onclick={() => updateOrderStatus(item.id, 'in_progress')}
                        class="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm inline-flex items-center gap-2 transition"
                      >
                        <Play class="w-4 h-4" />
                        <span>{isBusy ? 'Memproses...' : '2. Mulai Kerjakan'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onclick={() => updateOrderStatus(item.id, 'completed')}
                        class="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm inline-flex items-center gap-2 transition"
                      >
                        <CheckCircle2 class="w-4 h-4" />
                        <span>Tandai Selesai</span>
                      </button>
                    {:else if item.status === 'in_progress'}
                      <button
                        type="button"
                        disabled={isBusy}
                        onclick={() => updateOrderStatus(item.id, 'completed')}
                        class="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm inline-flex items-center gap-2 transition"
                      >
                        <CheckCircle2 class="w-4 h-4" />
                        <span>{isBusy ? 'Menyimpan...' : '3. Simpan Bukti & Tandai Selesai'}</span>
                      </button>
                    {/if}
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onclick={() => (cancelTargetId = item.id)}
                    class="h-10 px-3.5 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition"
                  >
                    <XCircle class="w-4 h-4" />
                    <span>Batalkan Pesanan</span>
                  </button>
                </div>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<ConfirmModal
  open={cancelTargetId !== null}
  title="Batalkan Pesanan Ini?"
  message="Pastikan Anda sudah mengabari pemesan melalui WhatsApp sebelum membatalkan pesanan."
  confirmLabel="Ya, Batalkan Pesanan"
  cancelLabel="Kembali"
  danger={true}
  loading={processingOrderId !== null}
  onConfirm={() => {
    if (cancelTargetId !== null) {
      updateOrderStatus(cancelTargetId, 'cancelled');
    }
  }}
  onCancel={() => (cancelTargetId = null)}
/>

