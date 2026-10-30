<script lang="ts">
  import {
    BadgeCheck,
    Briefcase,
    Clock,
    FileBadge,
    GraduationCap,
    HandHelping,
    School,
    ShieldAlert,
    ShoppingBag,
    Sparkles,
    Trophy,
    UserCheck
  } from 'lucide-svelte';
  import { apiFetch } from '../api';
  import { auth } from '../auth.svelte';
  import { navigate } from '../router.svelte';
  import { USER_ROLE_LABELS } from '../../../shared/constants';

  interface Creator {
    id: number;
    name: string;
    username: string;
    avatarUrl: string;
    schoolName: string | null;
    major: string | null;
    isVerified?: boolean;
  }

  interface Props {
    creators?: Creator[];
  }

  let { creators }: Props = $props();
  let fetchedCreators = $state<Creator[]>([]);
  let loadedFallback = $state(false);

  let displayCreators = $derived(
    creators && creators.length > 0 ? creators : fetchedCreators
  );

  $effect(() => {
    if ((!creators || creators.length === 0) && !loadedFallback) {
      loadedFallback = true;
      apiFetch<{ suggestedCreators?: Creator[] }>('/api/posts?limit=1').then((res) => {
        if (res.ok && res.data?.suggestedCreators) {
          fetchedCreators = res.data.suggestedCreators;
        }
      });
    }
  });
</script>

<aside class="space-y-5 print:hidden">
  <!-- Top Widget: Guest Call to Action or Logged-in User Card -->
  {#if !auth.user}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db]">
      <h2 class="text-sm font-extrabold text-gray-900 leading-snug">
        Bergabung dengan VOC-Market!
      </h2>
      <p class="text-xs text-gray-500 mt-1 leading-relaxed">
        Pamerkan karyamu, ajukan bantuan warga/UMKM, atau rekrut talenta terbaik SMK.
      </p>

      <div class="flex items-center gap-2.5 mt-4">
        <button
          type="button"
          onclick={() => navigate('/masuk')}
          class="h-10 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 flex-1 text-center transition cursor-pointer"
        >
          Masuk
        </button>
        <button
          type="button"
          onclick={() => navigate('/daftar')}
          class="h-10 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 flex-1 text-center transition cursor-pointer"
        >
          Daftar
        </button>
      </div>
    </div>
  {:else}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db]">
      <div class="flex items-center gap-3">
        <img
          src={auth.user.avatarUrl}
          alt={auth.user.name}
          class="w-12 h-12 rounded-full object-cover border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] shrink-0"
        />
        <div class="overflow-hidden">
          <div class="flex items-center gap-1">
            <span class="font-bold text-sm text-gray-900 truncate">
              {auth.user.companyName || auth.user.name}
            </span>
            {#if auth.user.isVerified || auth.user.isCompanyVerified}
              <BadgeCheck class="w-4 h-4 text-[#4285F4] shrink-0" />
            {/if}
          </div>
          <div class="flex flex-wrap items-center gap-1 mt-0.5">
            <span class="inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold">
              {USER_ROLE_LABELS[auth.user.userType] || 'Pengguna'}
            </span>
            {#if auth.user.userType === 'smk' && auth.user.openToWork}
              <span class="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-[#34A853] text-[10px] font-extrabold">
                ● Siap Kerja
              </span>
            {/if}
            {#if auth.user.userType === 'company' && !auth.user.isCompanyVerified}
              <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                <Clock class="w-2.5 h-2.5" />
                <span>Menunggu Verifikasi</span>
              </span>
            {/if}
          </div>
          {#if auth.user.schoolName}
            <p class="text-[11px] text-gray-500 truncate mt-1 flex items-center gap-1">
              <School class="w-3 h-3 shrink-0" />
              <span class="truncate">{auth.user.schoolName}</span>
            </p>
          {/if}
        </div>
      </div>

      <div class="mt-4 pt-3.5 border-t-2 border-gray-100 flex flex-col gap-2">
        {#if auth.user.userType === 'smk'}
          <button
            type="button"
            onclick={() => navigate('/siap-kerja')}
            class="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#34A853] border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
          >
            <UserCheck class="w-3.5 h-3.5" />
            <span>{auth.user.openToWork ? 'Kelola Status Siap Kerja' : 'Aktifkan Siap Kerja'}</span>
          </button>
          <button
            type="button"
            onclick={() => navigate(`/paspor-kerja/${auth.user!.username}`)}
            class="h-9 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
          >
            <FileBadge class="w-3.5 h-3.5" />
            <span>Buka Paspor Kerja (CV)</span>
          </button>
        {:else if auth.user.userType === 'teacher'}
          <button
            type="button"
            onclick={() => navigate('/dashboard/guru')}
            class="h-9 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#4285F4] border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
          >
            <GraduationCap class="w-3.5 h-3.5" />
            <span>Buka Panel Guru SMK</span>
          </button>
        {:else if auth.user.userType === 'company'}
          <button
            type="button"
            onclick={() => navigate('/talenta')}
            class="h-9 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#4285F4] border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
          >
            <Briefcase class="w-3.5 h-3.5" />
            <span>Cari Talenta Siswa SMK</span>
          </button>
        {:else if auth.user.isAdmin || auth.user.userType === 'admin'}
          <button
            type="button"
            onclick={() => navigate('/admin')}
            class="h-9 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-[#EA4335] border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
          >
            <ShieldAlert class="w-3.5 h-3.5" />
            <span>Panel Moderasi Admin</span>
          </button>
        {:else}
          <button
            type="button"
            onclick={() => navigate('/riwayat-pesanan')}
            class="h-9 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
          >
            <ShoppingBag class="w-3.5 h-3.5" />
            <span>Pesanan Saya</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Pintasan Jembatan Industri Widget -->
  <div>
    <h3 class="text-xs font-black uppercase tracking-wider text-gray-500 px-1 mb-2.5">
      PINTASAN PELUANG & INDUSTRI
    </h3>
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_5px_0_#d1d5db] space-y-2.5">
      <button
        type="button"
        onclick={() => navigate('/butuh-bantuan/buat')}
        class="w-full p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-2.5 text-left transition cursor-pointer"
      >
        <div class="w-8 h-8 rounded-lg bg-[#34A853] text-white flex items-center justify-center shrink-0">
          <HandHelping class="w-4 h-4" />
        </div>
        <div>
          <p class="text-xs font-extrabold text-gray-900">Posting Butuh Bantuan</p>
          <p class="text-[11px] text-gray-500">Cari siswa SMK untuk proyekmu</p>
        </div>
      </button>

      <button
        type="button"
        onclick={() => navigate('/tantangan')}
        class="w-full p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100 border border-amber-200 flex items-center gap-2.5 text-left transition cursor-pointer"
      >
        <div class="w-8 h-8 rounded-lg bg-[#FBBC05] text-gray-900 flex items-center justify-center shrink-0">
          <Trophy class="w-4 h-4" />
        </div>
        <div>
          <p class="text-xs font-extrabold text-gray-900">Tantangan Industri</p>
          <p class="text-[11px] text-gray-500">Raih sertifikat QR & magang</p>
        </div>
      </button>

      <button
        type="button"
        onclick={() => navigate('/sekolah')}
        class="w-full p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100 border border-blue-200 flex items-center gap-2.5 text-left transition cursor-pointer"
      >
        <div class="w-8 h-8 rounded-lg bg-[#4285F4] text-white flex items-center justify-center shrink-0">
          <School class="w-4 h-4" />
        </div>
        <div>
          <p class="text-xs font-extrabold text-gray-900">Direktori Etalase SMK</p>
          <p class="text-[11px] text-gray-500">Jelajahi Unit Produksi TeFa</p>
        </div>
      </button>
    </div>
  </div>

  <!-- Kreator SMK Terpopuler Widget -->
  {#if displayCreators.length > 0}
    <div>
      <h3 class="text-xs font-black uppercase tracking-wider text-gray-500 px-1 mb-2.5">
        KREATOR SMK TERPOPULER
      </h3>

      <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_5px_0_#d1d5db] divide-y divide-gray-100">
        {#each displayCreators as creator (creator.id)}
          <div class="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onclick={() => navigate(`/profil/${creator.username}`)}
              class="flex items-center gap-2.5 text-left group overflow-hidden flex-1 cursor-pointer"
            >
              <img
                src={creator.avatarUrl}
                alt={creator.name}
                class="w-9 h-9 rounded-full object-cover border-2 border-gray-300 shrink-0"
              />
              <div class="overflow-hidden">
                <p class="text-xs font-bold text-gray-900 group-hover:text-[#4285F4] truncate transition">
                  {creator.name}
                </p>
                <p class="text-[11px] text-gray-500 truncate">
                  {creator.schoolName || 'Siswa SMK'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onclick={() => navigate(`/profil/${creator.username}`)}
              class="h-7 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#4285F4] border border-blue-200 font-bold text-xs shrink-0 transition active:translate-y-0.5 cursor-pointer"
            >
              Lihat
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Extra Platform Info Card -->
  <div class="p-4 rounded-2xl bg-white border-2 border-gray-300 shadow-[0_3px_0_#d1d5db] text-xs text-gray-600 leading-relaxed">
    <div class="flex items-center gap-2 text-gray-900 font-bold mb-1">
      <Sparkles class="w-4 h-4 text-[#FBBC05]" />
      <span>Standar Praktik Industri</span>
    </div>
    Karya bertanda <b class="text-[#34A853]">Stempel TeFa</b> telah diverifikasi langsung oleh Guru Pembimbing Teaching Factory SMK.
  </div>
</aside>
