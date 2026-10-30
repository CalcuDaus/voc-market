<script lang="ts">
  import { ArrowRight, ClipboardList, Link2, ShoppingBag } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId, getSavedGuestOrders, type SavedGuestOrder } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';

  interface OrderListItem {
    orderCode: string;
    trackPath: string;
    postName: string;
    sellerName: string;
    formattedPrice: string;
    statusLabel?: string;
    createdAt: string;
  }

  let loading = $state(true);
  let ordersList = $state<OrderListItem[]>([]);
  let pastedLink = $state('');

  async function loadBuyerOrders() {
    loading = true;
    const localItems: SavedGuestOrder[] = getSavedGuestOrders();
    const mergedMap = new Map<string, OrderListItem>();

    for (const item of localItems) {
      mergedMap.set(item.orderCode, { ...item });
    }

    if (auth.user) {
      const res = await apiFetch<{ profile?: { myBuyerOrders?: any[] } }>(
        `/api/profile/${encodeURIComponent(auth.user.username)}`
      );
      const remoteOrders = res.data?.profile?.myBuyerOrders ?? [];
      for (const ro of remoteOrders) {
        mergedMap.set(ro.orderCode, {
          orderCode: ro.orderCode,
          trackPath: ro.trackPath,
          postName: ro.postName,
          sellerName: ro.sellerName,
          formattedPrice: ro.formattedAgreedPrice,
          statusLabel: ro.statusLabel,
          createdAt: ro.createdAt
        });
      }
    }

    ordersList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    loading = false;
  }

  $effect(() => {
    // Re-run whenever auth becomes ready or user changes
    if (auth.ready) {
      loadBuyerOrders();
    } else {
      loadBuyerOrders();
    }
  });

  function handleOpenPastedLink(e: SubmitEvent) {
    e.preventDefault();
    const raw = pastedLink.trim();
    if (!raw) return;

    try {
      const url = raw.startsWith('http')
        ? new URL(raw)
        : new URL(raw.startsWith('/') ? raw : `/${raw}`, window.location.origin);

      if (!url.pathname.startsWith('/pesanan/')) {
        toast.error('Masukkan tautan pesanan resmi yang berawalan /pesanan/VOC-ORD-...');
        return;
      }

      navigate(url.pathname + url.search);
    } catch {
      toast.error('Format tautan pesanan tidak dikenali.');
    }
  }
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
  <div class="mb-6">
    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">Pesanan Saya</h1>
    <p class="text-base text-slate-600 mt-1">
      Pantau status pengerjaan karya siswa SMK dan berikan ulasan setelah pesanan selesai.
    </p>
  </div>

  <!-- Paste WhatsApp Tracking Link Helper -->
  <section class="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-xs">
    <form onsubmit={handleOpenPastedLink} class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Link2 class="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          bind:value={pastedLink}
          placeholder="Tempel tautan pelacakan pesanan dari WhatsApp di sini..."
          class="h-12 w-full pl-11 pr-4 rounded-xl border border-slate-300 text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        class="h-12 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shrink-0 transition"
      >
        Buka Pesanan
      </button>
    </form>
  </section>

  {#if loading}
    <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <div class="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-base text-slate-600 mt-3">Memuat daftar pesanan Anda...</p>
    </div>
  {:else if ordersList.length === 0}
    <div class="bg-white border border-slate-200 rounded-2xl p-10 text-center">
      <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
        <ClipboardList class="w-7 h-7" />
      </div>
      <h2 class="text-xl font-bold text-slate-900">Belum Ada Riwayat Pesanan di Perangkat Ini</h2>
      <p class="text-base text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
        Saat Anda memesan barang atau jasa siswa SMK, tautan pelacakan pesanan akan otomatis tersimpan di halaman ini.
      </p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-6 h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base inline-flex items-center gap-2 transition"
      >
        <ShoppingBag class="w-5 h-5" />
        <span>Jelajahi Katalog Karya Siswa</span>
      </button>
    </div>
  {:else}
    <div class="space-y-3.5">
      {#each ordersList as item (item.orderCode)}
        <button
          type="button"
          onclick={() => navigate(item.trackPath)}
          class="w-full bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-left shadow-xs hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                {item.orderCode}
              </span>
              {#if item.statusLabel}
                <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {item.statusLabel}
                </span>
              {/if}
              <span class="text-xs text-slate-500">{formatDateId(item.createdAt)}</span>
            </div>

            <h3 class="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
              {item.postName}
            </h3>
            <p class="text-sm text-slate-600 mt-0.5">
              Dikerjakan oleh <span class="font-semibold text-slate-800">{item.sellerName}</span>
            </p>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <span class="text-base sm:text-lg font-extrabold text-slate-900">
              {item.formattedPrice}
            </span>
            <span class="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600">
              <span>Lihat Status</span>
              <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

