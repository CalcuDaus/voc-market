<script lang="ts">
  import {
    ArrowLeft,
    BadgeCheck,
    BookmarkCheck,
    Check,
    CheckCircle2,
    Copy,
    ExternalLink,
    Image as ImageIcon,
    MessageCircle,
    Package,
    Plus,
    School,
    Star
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { formatDateId, saveGuestOrderBookmark } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import OrderStepper from '../lib/components/OrderStepper.svelte';
  import { ENDORSEMENT_TAGS } from '../../shared/constants';

  interface Props {
    orderCode: string;
    token: string;
  }

  let { orderCode, token }: Props = $props();

  let loading = $state(true);
  let errorMsg = $state('');
  let order = $state<any>(null);

  // Review form state
  let rating = $state(5);
  let selectedTags = $state<string[]>(['Rapi & Berkualitas', 'Ramah & Sopan']);
  let comment = $state('');
  let submittingReview = $state(false);

  const ratingDescriptions: Record<number, string> = {
    5: 'Sangat Memuaskan',
    4: 'Bagus & Sesuai',
    3: 'Cukup Baik',
    2: 'Kurang Sesuai',
    1: 'Perlu Perbaikan'
  };

  async function loadOrder(code: string, tk: string) {
    loading = true;
    errorMsg = '';
    const qs = tk ? `?token=${encodeURIComponent(tk)}` : '';
    const res = await apiFetch<{ order?: any; error?: string }>(
      `/api/orders/track/${encodeURIComponent(code)}${qs}`
    );

    if (!res.ok || !res.data?.order) {
      errorMsg = res.data?.error || 'Data pesanan tidak ditemukan.';
      order = null;
      loading = false;
      return;
    }

    order = res.data.order;
    loading = false;

    if (tk) {
      saveGuestOrderBookmark({
        orderCode: order.orderCode,
        trackPath: `/pesanan/${order.orderCode}?token=${tk}`,
        postName: order.product?.name || 'Karya Siswa SMK',
        sellerName: order.seller?.name || 'Siswa SMK',
        formattedPrice: order.formattedAgreedPrice,
        createdAt: order.createdAt
      });
    }
  }

  $effect(() => {
    loadOrder(orderCode, token);
  });

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter((t) => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }

  async function copyTrackingLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Tautan pelacakan pesanan berhasil disalin.');
    } catch {
      toast.info('Salin alamat halaman ini: ' + url);
    }
  }

  async function submitReview(e: SubmitEvent) {
    e.preventDefault();
    if (!order) return;

    if (comment.trim().length < 5) {
      toast.error('Mohon tulis pengalaman singkat Anda minimal 5 karakter.');
      return;
    }

    submittingReview = true;
    const res = await apiFetch<{ success?: boolean; review?: any; error?: string }>(
      `/api/orders/${encodeURIComponent(order.orderCode)}/review`,
      {
        method: 'POST',
        body: JSON.stringify({
          token,
          rating,
          comment: comment.trim(),
          endorsementTags: selectedTags
        })
      }
    );
    submittingReview = false;

    if (!res.ok || !res.data?.review) {
      toast.error(res.data?.error || 'Gagal mengirim ulasan.');
      return;
    }

    toast.success('Terima kasih! Ulasan Anda sudah tercatat di Paspor Kerja siswa.');
    await loadOrder(orderCode, token);
  }
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
  <div class="flex items-center justify-between gap-3 mb-6">
    <button
      type="button"
      onclick={() => navigate('/riwayat-pesanan')}
      class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Daftar Pesanan Saya</span>
    </button>

    {#if order}
      <button
        type="button"
        onclick={copyTrackingLink}
        class="h-10 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition"
      >
        <Copy class="w-4 h-4" />
        <span>Salin Tautan Pesanan</span>
      </button>
    {/if}
  </div>

  {#if loading}
    <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-base font-medium text-slate-600 mt-4">Memuat status pesanan Anda...</p>
    </div>
  {:else if errorMsg}
    <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
      <Package class="w-12 h-12 text-slate-400 mx-auto mb-3" />
      <h1 class="text-xl font-bold text-slate-900">Tidak Dapat Membuka Pesanan</h1>
      <p class="text-base text-slate-600 mt-2 leading-relaxed">{errorMsg}</p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-6 h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition"
      >
        Kembali ke Katalog Karya
      </button>
    </div>
  {:else if order}
    <!-- Top Header & Stepper -->
    <section class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Kode Pesanan</span>
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{order.orderCode}</h1>
          <p class="text-sm text-slate-500 mt-0.5">Dibuat pada {formatDateId(order.createdAt)}</p>
        </div>

        <a
          href={order.whatsappToSellerUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 shadow-xs transition"
        >
          <MessageCircle class="w-5 h-5" />
          <span>Chat WhatsApp dengan Siswa</span>
          <ExternalLink class="w-4 h-4 opacity-80" />
        </a>
      </div>

      <div class="mt-5">
        <OrderStepper status={order.status} />
      </div>

      <div class="mt-5 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
        <BookmarkCheck class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p class="text-sm text-blue-900 leading-relaxed">
          <span class="font-bold">Tersimpan di perangkat ini:</span> Anda dapat membuka kembali halaman ini kapan saja melalui menu <span class="font-semibold">Pesanan Saya</span> untuk memantau pengerjaan dan memberi ulasan setelah selesai.
        </p>
      </div>
    </section>

    <!-- Student Progress & Proof Image (if any) -->
    {#if order.progressNote || order.proofImageUrl}
      <section class="bg-white border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs mb-5">
        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
          <ImageIcon class="w-5 h-5 text-emerald-600" />
          <span>Catatan Pengerjaan & Bukti Hasil Karya</span>
        </h2>

        {#if order.progressNote}
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-800 leading-relaxed mb-4">
            "{order.progressNote}"
          </div>
        {/if}

        {#if order.proofImageUrl}
          <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-w-lg">
            <img
              src={order.proofImageUrl}
              alt="Bukti hasil karya pesanan {order.orderCode}"
              class="w-full h-auto object-cover"
            />
          </div>
        {/if}
      </section>
    {/if}

    <!-- Review Form or Submitted Review -->
    {#if order.review}
      <section class="bg-white border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs mb-5">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 class="w-5 h-5 text-emerald-600" />
            <span>Ulasan Pelanggan Terverifikasi</span>
          </h2>
          <span class="text-xs font-medium text-slate-500">{formatDateId(order.review.createdAt)}</span>
        </div>

        <div class="flex items-center gap-1 mb-3">
          {#each [1, 2, 3, 4, 5] as star}
            <Star
              class="w-5 h-5 {star <= order.review.rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300'}"
            />
          {/each}
          <span class="ml-2 text-sm font-bold text-slate-800">{order.review.rating} / 5</span>
        </div>

        {#if order.review.endorsementTags?.length > 0}
          <div class="flex flex-wrap gap-2 mb-3">
            {#each order.review.endorsementTags as tag}
              <span class="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {tag}
              </span>
            {/each}
          </div>
        {/if}

        <p class="text-base text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
          "{order.review.comment}"
        </p>
      </section>
    {:else if order.canReview}
      <section class="bg-white border-2 border-blue-500 rounded-2xl p-5 sm:p-6 shadow-sm mb-5">
        <div class="mb-4">
          <span class="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
            Pesanan Telah Selesai
          </span>
          <h2 class="text-xl font-extrabold text-slate-900">
            Beri Ulasan untuk Paspor Kerja {order.seller.name}
          </h2>
          <p class="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
            Penilaian jujur Anda menjadi bukti pengalaman kerja resmi siswa ini saat melamar ke dunia industri.
          </p>
        </div>

        <form onsubmit={submitReview} class="space-y-5">
          <!-- Star Rating -->
          <div>
            <span class="block text-sm font-bold text-slate-800 mb-2">
              1. Berapa nilai kepuasan Anda?
            </span>
            <div class="flex items-center gap-2 flex-wrap">
              {#each [1, 2, 3, 4, 5] as star}
                <button
                  type="button"
                  onclick={() => (rating = star)}
                  class="w-12 h-12 rounded-xl border flex items-center justify-center transition {star <=
                  rating
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}"
                  aria-label="Beri {star} bintang"
                >
                  <Star
                    class="w-7 h-7 {star <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'}"
                  />
                </button>
              {/each}
              <span class="ml-2 text-sm font-bold text-amber-700">
                {rating} Bintang — {ratingDescriptions[rating]}
              </span>
            </div>
          </div>

          <!-- Endorsement Chips -->
          <div>
            <span class="block text-sm font-bold text-slate-800 mb-2">
              2. Keunggulan siswa yang Anda rasakan (boleh pilih lebih dari satu):
            </span>
            <div class="flex flex-wrap gap-2">
              {#each ENDORSEMENT_TAGS as tag}
                {@const active = selectedTags.includes(tag)}
                <button
                  type="button"
                  onclick={() => toggleTag(tag)}
                  class="h-10 px-4 rounded-full text-sm font-semibold border transition inline-flex items-center gap-1.5 {active
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}"
                >
                  {#if active}
                    <Check class="w-3.5 h-3.5" />
                  {:else}
                    <Plus class="w-3.5 h-3.5" />
                  {/if}
                  <span>{tag}</span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Comment -->
          <div>
            <label for="review-comment" class="block text-sm font-bold text-slate-800 mb-2">
              3. Ceritakan pengalaman singkat Anda
            </label>
            <textarea
              id="review-comment"
              bind:value={comment}
              rows="3"
              required
              placeholder="Contoh: Hasil pengerjaan sangat rapi, siswa ramah saat dihubungi, dan selesai tepat waktu."
              class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={submittingReview}
            class="h-12 w-full sm:w-auto px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-base transition"
          >
            {submittingReview ? 'Mengirim Ulasan...' : 'Kirim Ulasan & Apresiasi'}
          </button>
        </form>
      </section>
    {/if}

    <!-- Order Details & Seller Card -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <section class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h2 class="text-base font-bold text-slate-900 mb-4">Rincian Karya yang Dipesan</h2>

        {#if order.product}
          <button
            type="button"
            onclick={() => navigate(`/karya/${order.product.id}`)}
            class="flex items-center gap-3.5 w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition mb-4"
          >
            <img
              src={order.product.imageUrl}
              alt={order.product.name}
              class="w-16 h-16 rounded-lg object-cover shrink-0 bg-slate-200"
            />
            <div class="overflow-hidden">
              <span class="text-xs font-bold text-blue-700">{order.product.typeLabel}</span>
              <p class="text-base font-bold text-slate-900 truncate">{order.product.name}</p>
            </div>
          </button>
        {/if}

        <dl class="space-y-2.5 text-sm">
          <div class="flex justify-between gap-2">
            <dt class="text-slate-500">Jumlah Pesanan</dt>
            <dd class="font-semibold text-slate-900">{order.quantity}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-slate-500">Nilai Kesepakatan</dt>
            <dd class="font-extrabold text-blue-700 text-base">{order.formattedAgreedPrice}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-slate-500">Nama Pemesan</dt>
            <dd class="font-semibold text-slate-900">{order.buyerName}</dd>
          </div>
          {#if order.buyerAddress}
            <div class="pt-2 border-t border-slate-100">
              <dt class="text-slate-500 mb-0.5">Alamat Pengiriman / Lokasi</dt>
              <dd class="font-medium text-slate-800">{order.buyerAddress}</dd>
            </div>
          {/if}
          {#if order.buyerNotes}
            <div class="pt-2 border-t border-slate-100">
              <dt class="text-slate-500 mb-0.5">Catatan Permintaan</dt>
              <dd class="font-medium text-slate-800">{order.buyerNotes}</dd>
            </div>
          {/if}
        </dl>
      </section>

      <section class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 mb-4">Dikerjakan oleh Siswa SMK</h2>

          <button
            type="button"
            onclick={() => navigate(`/profil/${order.seller.username}`)}
            class="flex items-center gap-3.5 text-left group w-full"
          >
            <img
              src={order.seller.avatarUrl}
              alt={order.seller.name}
              class="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div class="overflow-hidden">
              <p class="text-base font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-blue-600 transition">
                <span class="truncate">{order.seller.name}</span>
                {#if order.seller.isVerified}
                  <BadgeCheck class="w-4 h-4 text-blue-600 shrink-0" />
                {/if}
              </p>
              <p class="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
                <School class="w-4 h-4 shrink-0 text-slate-400" />
                <span class="truncate">{order.seller.schoolName || 'Siswa SMK'}</span>
              </p>
              {#if order.seller.major}
                <p class="text-xs font-medium text-slate-500 mt-0.5">Jurusan: {order.seller.major}</p>
              {/if}
            </div>
          </button>
        </div>

        <div class="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            onclick={() => navigate(`/paspor-kerja/${order.seller.username}`)}
            class="h-11 w-full rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm transition"
          >
            Lihat Paspor Kerja (CV) Siswa
          </button>

          {#if order.status !== 'completed' && !order.review}
            <p class="text-xs text-slate-500 text-center mt-1">
              Kolom ulasan pelanggan akan terbuka otomatis setelah pesanan selesai dikerjakan.
            </p>
          {/if}
        </div>
      </section>
    </div>
  {/if}
</div>

