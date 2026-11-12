<script lang="ts">
  import {
    ArrowLeft,
    BadgeCheck,
    Building2,
    Check,
    Edit3,
    ExternalLink,
    Eye,
    FileBadge,
    Flag,
    Globe,
    Heart,
    Lock,
    MapPin,
    School,
    Share2,
    ShieldCheck,
    ShoppingBag,
    Star,
    Trash2
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId, formatRupiah, saveGuestOrderBookmark } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import ConfirmModal from '../lib/components/ConfirmModal.svelte';
  import ReportModal from '../lib/components/ReportModal.svelte';
  import SharePromoModal from '../lib/components/SharePromoModal.svelte';
  import ShowcaseDetailPage from './ShowcaseDetailPage.svelte';

  interface Props {
    postId: number;
  }

  let { postId }: Props = $props();

  let post = $state<any | null>(null);
  let loading = $state(true);
  let notFound = $state(false);
  let shareModalOpen = $state(false);

  // Order Form State (Guest-friendly)
  let buyerName = $state('');
  let buyerPhone = $state('');
  let quantity = $state(1);
  let buyerAddress = $state('');
  let buyerNotes = $state('');
  let orderLoading = $state(false);
  let orderError = $state('');

  let confirmDeleteOpen = $state(false);
  let deleting = $state(false);
  let reportModalOpen = $state(false);

  let estimatedTotal = $derived.by(() => {
    if (!post) return 0;
    const unit = post.type === 'service' ? post.priceMin || post.price : post.price;
    return unit * Math.max(1, quantity);
  });

  let isOwner = $derived(Boolean(auth.user && post && auth.user.id === post.author.id));

  async function loadDetail(id: number) {
    loading = true;
    notFound = false;
    const res = await apiFetch(`/api/posts/${id}`);
    if (!res.ok || !res.data?.post) {
      notFound = true;
      loading = false;
      return;
    }
    post = res.data.post;
    if (auth.user) {
      if (!buyerName) buyerName = auth.user.name;
      if (!buyerPhone && auth.user.phoneNumber) buyerPhone = auth.user.phoneNumber;
    }
    loading = false;
  }

  $effect(() => {
    loadDetail(postId);
  });

  async function toggleLike() {
    if (!post) return;
    const res = await apiFetch(`/api/posts/${post.id}/like`, { method: 'POST' });
    if (res.ok && res.data) {
      post.isLiked = res.data.isLiked;
      post.likesCount = res.data.likesCount;
    }
  }

  function handleShare() {
    if (!post) return;
    shareModalOpen = true;
  }

  async function handleOrderSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!post) return;
    orderError = '';
    orderLoading = true;

    const res = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        productId: post.id,
        buyerName,
        buyerPhone,
        quantity,
        buyerAddress,
        buyerNotes
      })
    });

    orderLoading = false;
    if (!res.ok) {
      orderError = res.data?.error || 'Gagal membuat pesanan. Periksa kembali isian Anda.';
      return;
    }

    saveGuestOrderBookmark({
      orderCode: res.data.orderCode,
      trackPath: res.data.trackUrl,
      postName: post.name,
      sellerName: post.author.name,
      formattedPrice: formatRupiah(estimatedTotal),
      createdAt: new Date().toISOString()
    });

    toast.success('Pesanan tercatat! Silakan lanjut hubungi siswa via WhatsApp.');
    navigate(res.data.trackUrl);
  }

  async function handleDeleteConfirmed() {
    if (!post) return;
    deleting = true;
    const res = await apiFetch(`/api/posts/${post.id}`, { method: 'DELETE' });
    deleting = false;
    confirmDeleteOpen = false;

    if (res.ok) {
      toast.success('Karya berhasil dihapus.');
      navigate('/');
    } else {
      toast.error(res.data?.error || 'Gagal menghapus karya.');
    }
  }
</script>

<div class="max-w-5xl mx-auto px-2 sm:px-4 py-2">
  <button
    type="button"
    onclick={() => navigate('/')}
    class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 mb-5 active:translate-y-0.5 cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Kembali ke Katalog</span>
  </button>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 animate-pulse h-96 shadow-[0_5px_0_#d1d5db]"></div>
  {:else if notFound || !post}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <h2 class="text-xl font-black text-gray-900">Karya Tidak Ditemukan</h2>
      <p class="text-sm text-gray-600 mt-1">Karya ini mungkin telah dihapus atau diarsipkan.</p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-5 h-10 px-5 rounded-xl bg-[#4285F4] shadow-[0_3px_0_#1a56b0] text-white font-bold text-xs cursor-pointer"
      >
        Kembali ke Beranda
      </button>
    </div>
  {:else if post.type === 'portfolio'}
    <ShowcaseDetailPage {postId} />
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Photo, Details & Reviews -->
      <div class="lg:col-span-7 flex flex-col gap-6">
        <div class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db]">
          <div class="bg-gray-100 aspect-4/3 w-full overflow-hidden border-b-2 border-gray-200">
            <img src={post.imageUrl} alt={post.name} class="w-full h-full object-cover" />
          </div>

          <div class="p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="px-3 py-1 rounded-lg text-xs font-black bg-blue-50 border border-blue-200 text-[#4285F4]">
                  {post.typeLabel}
                </span>
                {#if post.isTefa}
                  <span class="px-3 py-1 rounded-lg text-xs font-black bg-emerald-50 border border-emerald-200 text-[#34A853] inline-flex items-center gap-1">
                    <Building2 class="w-3.5 h-3.5" />
                    <span>{post.tefaUnit || 'Unit Produksi TeFa'}</span>
                  </span>
                {/if}
                {#if post.categoryName}
                  <span class="px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                    {post.categoryName}
                  </span>
                {/if}
                {#if post.serviceAreaType === 'digital'}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-cyan-50 border border-cyan-200 text-cyan-800">
                    <Globe class="w-3.5 h-3.5 text-cyan-700" />
                    <span>Layanan Online (Seluruh Indonesia)</span>
                  </span>
                {:else if post.subdistrictName}
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-amber-50 border border-amber-200 text-amber-800">
                    <MapPin class="w-3.5 h-3.5 text-amber-700" />
                    <span>Kec. {post.subdistrictName}</span>
                  </span>
                {/if}
              </div>

              <span class="inline-flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                <Eye class="w-4 h-4" />
                <span>Dilihat {post.viewsCount}x</span>
              </span>
            </div>

            <h1 class="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{post.name}</h1>

            <div class="mt-3 flex flex-wrap items-baseline gap-3">
              <span class="text-2xl font-black text-[#4285F4]">{post.formattedPrice}</span>
              {#if post.type === 'product'}
                <span class="text-xs font-bold text-gray-600">
                  • Stok tersedia: <strong>{post.stock}</strong>
                </span>
              {/if}
            </div>

            {#if isOwner && post.costPrice > 0}
              <div class="mt-3 p-3 bg-violet-50 border-2 border-violet-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 text-violet-950 font-bold">
                <span class="inline-flex items-center gap-1.5">
                  <Lock class="w-3.5 h-3.5 text-violet-700" />
                  <span>Modal Pokok HPP Pribadi: {formatRupiah(post.costPrice)}</span>
                </span>
                <span class="text-emerald-700 font-black">
                  Estimasi Laba: {formatRupiah((post.price || 0) - post.costPrice)} ({Math.round((((post.price || 0) - post.costPrice) / (post.price || 1)) * 100)}%)
                </span>
              </div>
            {/if}

            <!-- Like, Share, Demo & Report Actions -->
            <div class="mt-5 pt-4 border-t-2 border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onclick={toggleLike}
                  class="h-9 px-3.5 rounded-xl border-2 text-xs font-bold flex items-center gap-1.5 transition active:translate-y-0.5 cursor-pointer {post.isLiked
                    ? 'bg-rose-50 border-rose-300 text-[#EA4335]'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-[0_2px_0_#d1d5db]'}"
                >
                  <Heart class="w-4 h-4 {post.isLiked ? 'fill-[#EA4335] text-[#EA4335]' : ''}" />
                  <span>Suka ({post.likesCount})</span>
                </button>

                <button
                  type="button"
                  onclick={handleShare}
                  class="h-9 px-3.5 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 transition cursor-pointer"
                >
                  <Share2 class="w-4 h-4" />
                  <span>Bagikan</span>
                </button>

                {#if post.projectLink}
                  <a
                    href={post.projectLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="h-9 px-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_2px_0_#000000] transition"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                    <span>Demo Proyek</span>
                  </a>
                {/if}

                {#if !isOwner}
                  <button
                    type="button"
                    onclick={() => (reportModalOpen = true)}
                    class="h-9 px-3 rounded-xl border-2 border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-[#EA4335] text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                    title="Laporkan Karya"
                  >
                    <Flag class="w-3.5 h-3.5" />
                    <span>Laporkan</span>
                  </button>
                {/if}
              </div>

              {#if isOwner}
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick={() => navigate(`/karya/${post.id}/edit`)}
                    class="h-9 px-3.5 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_2px_0_#d1d5db] cursor-pointer"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onclick={() => (confirmDeleteOpen = true)}
                    class="h-9 px-3.5 rounded-xl border-2 border-red-200 text-[#EA4335] hover:bg-red-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              {/if}
            </div>

            <!-- Teacher Curated Stamp (TeFa Approved) -->
            {#if post.isVerifiedByTeacher}
              <div class="mt-5 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-start gap-3">
                <ShieldCheck class="w-6 h-6 text-[#34A853] shrink-0 mt-0.5" />
                <div>
                  <p class="text-xs sm:text-sm font-black text-emerald-950">
                    Lolos Kurasi Guru Pembimbing SMK (TeFa Approved)
                  </p>
                  {#if post.teacherNote}
                    <p class="text-xs sm:text-sm text-emerald-900 mt-0.5 italic">"{post.teacherNote}"</p>
                  {/if}
                  {#if post.verifierName}
                    <p class="text-xs text-[#34A853] font-bold mt-1">
                      Ditinjau oleh: {post.verifierName}
                    </p>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Description -->
            <div class="mt-6">
              <h2 class="text-sm font-black uppercase tracking-wider text-gray-500 mb-2">
                Rincian Karya & Spesifikasi
              </h2>
              <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {post.description}
              </p>
            </div>
          </div>
        </div>

        <!-- Verified Customer Reviews Section -->
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#d1d5db]">
          <h2 class="text-base font-black text-gray-900 mb-4">
            Ulasan Pelanggan Terverifikasi ({post.reviews.length})
          </h2>

          {#if post.reviews.length === 0}
            <p class="text-xs sm:text-sm text-gray-500">
              Belum ada ulasan untuk karya ini. Jadilah pelanggan pertama yang mendukung karya siswa ini!
            </p>
          {:else}
            <div class="flex flex-col gap-3.5">
              {#each post.reviews as rev (rev.id)}
                <div class="p-4 rounded-xl bg-gray-50 border-2 border-gray-200">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-xs sm:text-sm text-gray-900">{rev.reviewerName}</span>
                    <span class="inline-flex items-center gap-1 text-xs font-black text-amber-700">
                      <Star class="w-4 h-4 fill-[#FBBC05] text-[#FBBC05]" />
                      <span>{rev.rating} / 5</span>
                    </span>
                  </div>
                  <p class="text-xs sm:text-sm text-gray-700 mt-2 leading-relaxed">{rev.comment}</p>
                  {#if rev.endorsementTags?.length > 0}
                    <div class="flex flex-wrap gap-1.5 mt-2.5">
                      {#each rev.endorsementTags as tag}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#4285F4] text-[11px] font-bold">
                          <Check class="w-3 h-3 text-[#4285F4]" />
                          <span>{tag}</span>
                        </span>
                      {/each}
                    </div>
                  {/if}
                  <p class="text-[11px] text-gray-400 mt-2">{formatDateId(rev.createdAt)}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Column: Student Card & 1-Screen Quick Order Form -->
      <div class="lg:col-span-5 flex flex-col gap-6">
        <!-- Creator Card -->
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db]">
          <p class="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3">
            Dibuat Oleh Siswa SMK
          </p>
          <div class="flex items-center gap-3.5">
            <img
              src={post.author.avatarUrl}
              alt={post.author.name}
              class="w-14 h-14 rounded-2xl object-cover border-2 border-gray-300 shrink-0"
            />
            <div class="overflow-hidden">
              <button
                type="button"
                onclick={() => navigate(`/profil/${post.author.username}`)}
                class="font-extrabold text-base text-gray-900 hover:text-[#4285F4] flex items-center gap-1 text-left cursor-pointer"
              >
                <span class="truncate">{post.author.name}</span>
                {#if post.author.isVerified}
                  <BadgeCheck class="w-4 h-4 text-[#4285F4] shrink-0" />
                {/if}
              </button>
              <p class="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                <School class="w-3.5 h-3.5 shrink-0 text-[#4285F4]" />
                <span class="truncate">{post.author.schoolName || 'Siswa SMK'}</span>
              </p>
              {#if post.author.major}
                <p class="text-xs text-[#4285F4] font-bold mt-0.5">{post.author.major}</p>
              {/if}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t-2 border-gray-100 text-center">
            <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <p class="text-base font-black text-gray-900">
                {post.author.completedOrdersCount}
              </p>
              <p class="text-[11px] font-semibold text-gray-500">Pesanan Selesai</p>
            </div>
            <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <p class="text-base font-black text-gray-900 flex items-center justify-center gap-1">
                {#if post.author.avgRating > 0}
                  <span>{post.author.avgRating}</span>
                  <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-500 inline" />
                {:else}
                  <span>Baru</span>
                {/if}
              </p>
              <p class="text-[11px] font-semibold text-gray-500">{post.author.reviewsCount} Ulasan</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5 mt-3">
            <button
              type="button"
              onclick={() => navigate(`/profil/${post.author.username}`)}
              class="h-10 px-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 transition cursor-pointer"
            >
              Lihat Profil
            </button>
            <button
              type="button"
              onclick={() => navigate(`/paspor-kerja/${post.author.username}`)}
              class="h-10 px-3 rounded-xl bg-purple-50 border-2 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-[0_2px_0_#e9d5ff] active:translate-y-0.5 transition cursor-pointer"
            >
              <FileBadge class="w-4 h-4" />
              <span>Paspor Kerja</span>
            </button>
          </div>
        </div>

        <!-- Quick Order Form (For Product & Service) -->
        {#if post.type !== 'portfolio' && !isOwner}
          <div class="bg-white border-2 border-emerald-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#a7f3d0]">
            <div class="flex items-center gap-2 mb-1">
              <ShoppingBag class="w-5 h-5 text-[#34A853]" />
              <h2 class="text-base sm:text-lg font-black text-gray-900">Pesan Karya Ini Sekarang</h2>
            </div>
            <p class="text-xs text-gray-600 mb-4 leading-relaxed">
              Tanpa wajib daftar akun. Isi data singkat di bawah, lalu lanjut diskusi langsung di WhatsApp siswa.
            </p>

            {#if post.type === 'product' && post.stock <= 0}
              <div class="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-900 text-xs font-bold">
                Stok barang ini sedang habis.
              </div>
            {:else}
              {#if orderError}
                <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#EA4335] text-xs font-bold">
                  {orderError}
                </div>
              {/if}

              <form onsubmit={handleOrderSubmit} class="flex flex-col gap-3">
                <div>
                  <label for="ord-name" class="block text-xs font-bold text-gray-700 mb-1">
                    Nama Anda <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="ord-name"
                    type="text"
                    bind:value={buyerName}
                    required
                    placeholder="Contoh: Ibu Dewi / Pak Rahmat"
                    class="w-full p-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#34A853] focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label for="ord-wa" class="block text-xs font-bold text-gray-700 mb-1">
                    Nomor WhatsApp Anda <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="ord-wa"
                    type="tel"
                    bind:value={buyerPhone}
                    required
                    placeholder="0812xxxxxxxx"
                    class="w-full p-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#34A853] focus:outline-none text-sm"
                  />
                </div>

                {#if post.type === 'product'}
                  <div>
                    <label for="ord-qty" class="block text-xs font-bold text-gray-700 mb-1">
                      Jumlah Pesanan (Maks. {post.stock})
                    </label>
                    <input
                      id="ord-qty"
                      type="number"
                      min="1"
                      max={post.stock}
                      bind:value={quantity}
                      class="w-full p-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#34A853] focus:outline-none text-sm"
                    />
                  </div>
                {/if}

                <div>
                  <label for="ord-addr" class="block text-xs font-bold text-gray-700 mb-1">
                    Alamat Pengiriman / Lokasi (Opsional)
                  </label>
                  <input
                    id="ord-addr"
                    type="text"
                    bind:value={buyerAddress}
                    placeholder="Kecamatan / alamat singkat"
                    class="w-full p-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#34A853] focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label for="ord-note" class="block text-xs font-bold text-gray-700 mb-1">
                    Catatan Permintaan (Opsional)
                  </label>
                  <textarea
                    id="ord-note"
                    rows="2"
                    bind:value={buyerNotes}
                    placeholder="Contoh: Pesan tulisan nama custom / jadwal servis..."
                    class="w-full p-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#34A853] focus:outline-none text-sm"
                  ></textarea>
                </div>

                <div class="p-3 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center justify-between">
                  <span class="text-xs font-bold text-gray-600">Estimasi Biaya:</span>
                  <span class="text-base font-black text-gray-900">
                    {formatRupiah(estimatedTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={orderLoading}
                  class="h-12 rounded-xl bg-[#34A853] hover:bg-[#2d9247] shadow-[0_4px_0_#1e7e34] active:shadow-none active:translate-y-0.5 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>{orderLoading ? 'Mencatat Pesanan...' : 'Pesan & Hubungi via WhatsApp'}</span>
                </button>
              </form>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<ConfirmModal
  open={confirmDeleteOpen}
  title="Hapus Karya Ini?"
  message="Karya yang sudah dihapus tidak akan tampil lagi di katalog beranda."
  confirmLabel="Ya, Hapus Karya"
  danger={true}
  loading={deleting}
  onConfirm={handleDeleteConfirmed}
  onCancel={() => (confirmDeleteOpen = false)}
/>

{#if post}
  <ReportModal
    open={reportModalOpen}
    targetType="post"
    targetId={post.id}
    targetLabel={post.name}
    onClose={() => (reportModalOpen = false)}
  />

  <SharePromoModal
    open={shareModalOpen}
    {post}
    onclose={() => (shareModalOpen = false)}
  />
{/if}
