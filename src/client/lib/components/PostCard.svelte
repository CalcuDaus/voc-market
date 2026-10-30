<script lang="ts">
  import {
    Heart,
    Share2,
    ExternalLink,
    MapPin,
    MessageCircle,
    BadgeCheck,
    ShieldCheck,
    Star
  } from 'lucide-svelte';
  import { apiFetch } from '../api';
  import { formatRelativeTime } from '../format';
  import { navigate } from '../router.svelte';
  import { toast } from '../toast.svelte';
  import SharePromoModal from './SharePromoModal.svelte';

  interface Props {
    post: {
      id: number;
      type: 'product' | 'service' | 'portfolio';
      typeLabel: string;
      name: string;
      description: string;
      imageUrl: string;
      formattedPrice: string;
      stock: number;
      projectLink?: string | null;
      likesCount: number;
      sharesCount?: number;
      isLiked?: boolean;
      isVerifiedByTeacher: boolean;
      teacherNote?: string | null;
      avgRating: number;
      reviewsCount: number;
      createdAt: string;
      author: {
        id?: number;
        name: string;
        username: string;
        avatarUrl: string;
        schoolName: string | null;
        major?: string | null;
        userType?: string;
        phoneNumber?: string | null;
        isVerified: boolean;
      };
    };
  }

  let { post }: Props = $props();

  let isLiked = $state(false);
  let likesCount = $state(0);
  let sharesCount = $state(0);
  let liking = $state(false);
  let shareModalOpen = $state(false);

  $effect(() => {
    isLiked = Boolean(post.isLiked);
    likesCount = post.likesCount || 0;
    sharesCount = post.sharesCount || 0;
  });

  async function handleToggleLike(e: MouseEvent) {
    e.stopPropagation();
    if (liking) return;
    liking = true;

    // Optimistic update
    const prevLiked = isLiked;
    const prevCount = likesCount;
    isLiked = !prevLiked;
    likesCount = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    const res = await apiFetch<{ success?: boolean; isLiked?: boolean; likesCount?: number }>(
      `/api/posts/${post.id}/like`,
      { method: 'POST' }
    );

    liking = false;

    if (!res.ok || !res.data?.success) {
      isLiked = prevLiked;
      likesCount = prevCount;
      toast.error('Gagal menyukai karya.');
      return;
    }

    if (res.data.likesCount !== undefined) likesCount = res.data.likesCount;
    if (res.data.isLiked !== undefined) isLiked = res.data.isLiked;
  }

  function handleShare(e: MouseEvent) {
    e.stopPropagation();
    shareModalOpen = true;
  }

  function handleContact(e: MouseEvent) {
    e.stopPropagation();
    if (post.type === 'portfolio') {
      navigate(`/karya/${post.id}`);
      return;
    }
    const cleanPhone = (post.author.phoneNumber || '').replace(/[^\d]/g, '');
    if (cleanPhone) {
      const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
      const msg = encodeURIComponent(
        `Halo ${post.author.name}, saya tertarik dengan karya "${post.name}" di VOC-Market.`
      );
      window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/karya/${post.id}`);
    }
  }

  function handleOpenDemo(e: MouseEvent) {
    e.stopPropagation();
    if (post.projectLink) {
      window.open(post.projectLink, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/karya/${post.id}`);
    }
  }
</script>

<article
  class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#d1d5db] mb-6 overflow-hidden"
>
  <!-- Card Header: Author Info + Type Badge -->
  <div class="flex items-start justify-between gap-3">
    <!-- Author Info -->
    <button
      type="button"
      onclick={() => navigate(`/profil/${post.author.username}`)}
      class="flex items-center gap-3 text-left group overflow-hidden focus:outline-none cursor-pointer"
    >
      <img
        src={post.author.avatarUrl}
        alt={post.author.name}
        class="w-11 h-11 rounded-full object-cover border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] shrink-0"
      />
      <div class="overflow-hidden">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="font-bold text-base text-gray-900 group-hover:text-[#4285F4] transition truncate">
            {post.author.name}
          </span>
          <span class="inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold shrink-0">
            SMK
          </span>
          {#if post.author.isVerified}
            <BadgeCheck class="w-4 h-4 text-[#4285F4] shrink-0" />
          {/if}
        </div>
        <p class="text-xs text-gray-500 mt-0.5 truncate">
          {post.author.schoolName || 'Siswa SMK'} • {formatRelativeTime(post.createdAt)}
        </p>
      </div>
    </button>

    <!-- Post Type Badge with Google 4-Color Palette (Section 3 & 6.2) -->
    <div class="flex items-center gap-1.5 shrink-0">
      {#if post.isVerifiedByTeacher}
        <span
          class="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 border border-emerald-200 text-[#34A853]"
          title="Telah dikurasi oleh Guru Pembimbing TeFa"
        >
          <ShieldCheck class="w-3.5 h-3.5 text-[#34A853]" />
          <span>Stempel TeFa</span>
        </span>
      {/if}

      {#if (post as any).distanceLabel}
        <span
          class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-50 border border-amber-300 text-amber-900"
          title="Jarak dari lokasi Anda"
        >
          <MapPin class="w-3 h-3 text-amber-700 shrink-0" />
          <span>{(post as any).distanceLabel}</span>
        </span>
      {/if}

      <span
        class="px-3 py-1 rounded-lg text-[11px] font-extrabold text-white uppercase tracking-wider shadow-xs {post.type ===
        'portfolio'
          ? 'bg-[#EA4335] shadow-[0_2px_0_#b3261e]'
          : post.type === 'service'
            ? 'bg-[#4285F4] shadow-[0_2px_0_#1a56b0]'
            : 'bg-[#34A853] shadow-[0_2px_0_#1e7e34]'}"
      >
        {post.type.toUpperCase()}
      </span>
    </div>
  </div>

  <!-- Post Title -->
  <button
    type="button"
    onclick={() => navigate(`/karya/${post.id}`)}
    class="text-left w-full focus:outline-none cursor-pointer"
  >
    <h3
      class="text-lg sm:text-xl font-bold text-gray-900 mt-3.5 mb-3 leading-snug hover:text-[#4285F4] transition"
    >
      {post.name}
    </h3>
  </button>

  <!-- Big Media / Image with tactile border -->
  <button
    type="button"
    onclick={() => navigate(`/karya/${post.id}`)}
    class="relative aspect-16/10 w-full rounded-xl overflow-hidden bg-slate-100 border-2 border-gray-200 block group focus:outline-none mb-3.5 cursor-pointer shadow-xs"
  >
    <img
      src={post.imageUrl}
      alt={post.name}
      loading="lazy"
      class="w-full h-full object-cover group-hover:scale-102 transition duration-300"
    />
  </button>

  <!-- Action Bar: Left (Like, Share, Demo) & Right (Hubungi WhatsApp 3D CTA) -->
  <div class="flex items-center justify-between gap-3 pt-1 pb-3">
    <!-- Left Actions -->
    <div class="flex items-center gap-3 sm:gap-4">
      <!-- Like button -->
      <button
        type="button"
        onclick={handleToggleLike}
        class="flex items-center gap-1.5 text-xs font-bold transition cursor-pointer {isLiked
          ? 'text-[#EA4335]'
          : 'text-gray-600 hover:text-gray-900'}"
        title="Sukai karya ini"
      >
        <Heart class="w-5 h-5 {isLiked ? 'fill-[#EA4335] text-[#EA4335]' : ''}" />
        <span>{likesCount}</span>
      </button>

      <!-- Share button -->
      <button
        type="button"
        onclick={handleShare}
        class="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition cursor-pointer"
        title="Bagikan karya"
      >
        <Share2 class="w-5 h-5" />
        {#if sharesCount > 0}
          <span>{sharesCount}</span>
        {/if}
      </button>

      <!-- Demo / Link Button (Google Yellow Action) -->
      {#if post.projectLink}
        <button
          type="button"
          onclick={handleOpenDemo}
          class="h-8 px-3 rounded-lg bg-[#FBBC05] hover:bg-[#e0a800] text-gray-900 font-bold text-xs shadow-[0_2px_0_#c68f00] active:translate-y-0.5 active:shadow-none inline-flex items-center gap-1 transition cursor-pointer"
          title="Buka tautan proyek"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          <span>Demo / Link</span>
        </button>
      {/if}
    </div>

    <!-- Right Action: Google Green 3D "Hubungi" CTA (Section 6.4) -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={handleContact}
        class="h-8 px-3.5 rounded-lg bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_2px_0_#1e7e34] active:translate-y-0.5 active:shadow-none inline-flex items-center gap-1.5 transition cursor-pointer"
      >
        <MessageCircle class="w-4 h-4" />
        <span>Hubungi</span>
      </button>
    </div>
  </div>

  <!-- Price & Description Snippet -->
  <div class="pt-2.5 border-t-2 border-gray-100 flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <span class="text-base sm:text-lg font-extrabold text-[#4285F4]">
        {post.formattedPrice}
      </span>

      {#if post.reviewsCount > 0}
        <span class="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
          <Star class="w-3.5 h-3.5 fill-[#FBBC05] text-[#FBBC05]" />
          <span>{post.avgRating}</span>
          <span class="text-gray-400 font-normal">({post.reviewsCount})</span>
        </span>
      {/if}
    </div>

    <p class="text-sm text-gray-600 line-clamp-2 leading-relaxed">
      {post.description}
    </p>

    <button
      type="button"
      onclick={() => navigate(`/karya/${post.id}`)}
      class="text-left text-[#4285F4] hover:underline font-bold text-xs mt-0.5 focus:outline-none cursor-pointer"
    >
      Baca selengkapnya
    </button>
  </div>
</article>

<SharePromoModal open={shareModalOpen} {post} onclose={() => (shareModalOpen = false)} />
