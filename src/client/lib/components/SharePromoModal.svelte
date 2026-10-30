<script lang="ts">
  import {
    Briefcase,
    Check,
    Copy,
    MessageCircle,
    Share2,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../api';
  import { formatRupiah } from '../format';

  let {
    open = false,
    post,
    onclose
  }: {
    open: boolean;
    post: {
      id: number;
      name: string;
      type: string;
      price?: number | null;
      priceMin?: number | null;
      image: string;
      ogImage?: string | null;
      author?: {
        name: string;
        schoolName?: string | null;
      } | null;
    };
    onclose: () => void;
  } = $props();

  let templateType = $state<'casual' | 'formal'>('casual');
  let customText = $state('');
  let copied = $state(false);

  const postUrl = $derived.by(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/karya/${post.id}`;
  });

  const priceText = $derived.by(() => {
    if (post.type === 'portfolio') return 'Portofolio Karya Siswa';
    const effectivePrice = post.priceMin || post.price || 0;
    return effectivePrice > 0 ? `Mulai ${formatRupiah(effectivePrice)}` : 'Gratis / Diskusi';
  });

  const generatedText = $derived.by(() => {
    const authorName = post.author?.name || 'Siswa SMK';
    const school = post.author?.schoolName ? ` (${post.author.schoolName})` : '';

    if (templateType === 'casual') {
      return `Halo semuanya,\n\nYuk dukung karya vokasi saya di VOC-Market:\n*${post.name}*\nHarga: ${priceText}\nOleh: ${authorName}${school}\n\nLihat detail & portofolio lengkapnya di tautan ini:\n${postUrl}\n\nTerima kasih atas dukungannya!`;
    } else {
      return `Yth. Bapak/Ibu Rekan Bisnis & Mitra Industri,\n\nPerkenalkan saya *${authorName}* dari ${post.author?.schoolName || 'SMK'}. Kami menawarkan solusi:\n*${post.name}*\nPenawaran: ${priceText}\n\nKarya ini dikerjakan dengan standar kompetensi vokasi terverifikasi. Untuk informasi detail spesifikasi dan pemesanan, silakan kunjungi:\n${postUrl}\n\nSalam hormat,\n${authorName}`;
    }
  });

  // Sync customText whenever template or generated text changes
  $effect(() => {
    customText = generatedText;
  });

  async function triggerShareAnalytics() {
    try {
      await apiFetch(`/api/posts/${post.id}/share`, { method: 'POST' });
    } catch {
      // quiet
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(customText);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2500);
      void triggerShareAnalytics();
    } catch {
      // fallback
    }
  }

  function shareToWhatsApp() {
    void triggerShareAnalytics();
    const waUrl = `https://wa.me/?text=${encodeURIComponent(customText)}`;
    window.open(waUrl, '_blank');
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
    <div
      class="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border-2 border-slate-900 shadow-[0_8px_0_#0f172a] p-6 text-slate-800"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700">
            <Share2 class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-black text-slate-900">Kit Promosi &amp; Bagikan Karya</h2>
            <p class="text-xs font-semibold text-slate-500">Preview kartu 1200×630 siap kirim ke WhatsApp</p>
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

      <!-- Preview Image Card -->
      <div class="mt-4">
        <label for="preview-og-card" class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
          Preview Gambar WhatsApp (1200×630)
        </label>
        <div id="preview-og-card" class="relative overflow-hidden rounded-2xl border-2 border-slate-900 shadow-[0_4px_0_#0f172a] bg-slate-100 aspect-16/9">
          <img
            src={post.ogImage || post.image}
            alt={post.name}
            class="w-full h-full object-cover"
          />
          <span class="absolute top-2.5 right-2.5 px-2.5 py-1 text-xs font-black bg-white/90 backdrop-blur-xs text-slate-800 rounded-lg border border-slate-300">
            Open Graph WebP
          </span>
        </div>
      </div>

      <!-- Template Selector -->
      <div class="mt-5">
        <span class="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
          Pilih Nada Pesan Promosi
        </span>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onclick={() => (templateType = 'casual')}
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer {templateType === 'casual'
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-[0_3px_0_#2563eb]'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}"
          >
            <MessageCircle class="w-4 h-4 text-blue-600" />
            <span>Santai (Teman &amp; Keluarga)</span>
          </button>
          <button
            type="button"
            onclick={() => (templateType = 'formal')}
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer {templateType === 'formal'
              ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-[0_3px_0_#7c3aed]'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}"
          >
            <Briefcase class="w-4 h-4 text-purple-600" />
            <span>Formal (UMKM &amp; Industri)</span>
          </button>
        </div>
      </div>

      <!-- Text Box -->
      <div class="mt-4">
        <label for="custom-promo-text" class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
          Teks Pesan Siap Kirim
        </label>
        <textarea
          id="custom-promo-text"
          bind:value={customText}
          rows="6"
          class="w-full p-3 text-xs font-medium rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-0 text-slate-800 bg-slate-50/70"
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <button
          type="button"
          onclick={shareToWhatsApp}
          class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-emerald-700 bg-emerald-600 text-white font-black text-sm shadow-[0_4px_0_#065f46] hover:bg-emerald-500 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          <MessageCircle class="w-4 h-4" />
          <span>Buka &amp; Kirim WhatsApp</span>
        </button>

        <button
          type="button"
          onclick={copyText}
          class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-900 bg-white text-slate-800 font-bold text-sm shadow-[0_4px_0_#0f172a] hover:bg-slate-50 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          {#if copied}
            <Check class="w-4 h-4 text-emerald-600" />
            <span>Tersalin!</span>
          {:else}
            <Copy class="w-4 h-4" />
            <span>Salin Teks</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
