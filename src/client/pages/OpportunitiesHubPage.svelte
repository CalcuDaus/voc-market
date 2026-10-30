<script lang="ts">
  import {
    Award,
    Briefcase,
    HandHelping,
    MailCheck,
    Sparkles,
    Trophy,
    UserCheck
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import RequestCard from '../lib/components/RequestCard.svelte';
  import ChallengeCard from '../lib/components/ChallengeCard.svelte';
  import RightSidebar from '../lib/components/RightSidebar.svelte';

  let activeTab = $state<'requests' | 'challenges' | 'invitations'>('requests');
  let requests = $state<any[]>([]);
  let challenges = $state<any[]>([]);
  let invitations = $state<any[]>([]);
  let loading = $state(true);

  async function loadHubData() {
    loading = true;
    const [reqRes, chRes, invRes] = await Promise.all([
      apiFetch<{ items?: any[] }>('/api/requests?recommended=1&limit=6'),
      apiFetch<{ items?: any[] }>('/api/challenges?status=open&limit=6'),
      apiFetch<{ items?: any[] }>('/api/invitations')
    ]);

    if (reqRes.ok && reqRes.data?.items) requests = reqRes.data.items;
    if (chRes.ok && chRes.data?.items) challenges = chRes.data.items;
    if (invRes.ok && invRes.data?.items) invitations = invRes.data.items;
    loading = false;
  }

  $effect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      navigate('/masuk');
      return;
    }
    loadHubData();
  });
</script>

<div class="flex gap-6 items-start justify-center">
  <!-- Center Column -->
  <div class="flex-1 min-w-0 max-w-2xl w-full space-y-5">
    <!-- Top Hero Banner -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white shadow-[0_5px_0_#1e3a8a]">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles class="w-3.5 h-3.5 text-[#FBBC05]" />
            <span>Pusat Peluang Industri Siswa SMK</span>
          </span>
          <h1 class="text-xl sm:text-2xl font-black leading-tight">Hub Peluang & Proyek</h1>
          <p class="text-xs text-blue-100 mt-1 max-w-md">
            Papan terintegrasi untuk menemukan permintaan bantuan warga/UMKM, tantangan industri, dan undangan magang.
          </p>
        </div>

        <button
          type="button"
          onclick={() => navigate('/siap-kerja')}
          class="h-10 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-extrabold text-xs shadow-[0_3px_0_#93c5fd] active:translate-y-0.5 inline-flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
        >
          <UserCheck class="w-4 h-4 text-[#34A853]" />
          <span>{auth.user?.openToWork ? 'Status Siap Kerja: Aktif' : 'Aktifkan Siap Kerja'}</span>
        </button>
      </div>
    </div>

    <!-- 3 Tabs Navigation -->
    <div class="flex flex-wrap items-center gap-2 bg-white border-2 border-gray-300 rounded-2xl p-2 shadow-[0_4px_0_#d1d5db]">
      <button
        type="button"
        onclick={() => (activeTab = 'requests')}
        class="flex-1 h-9 px-3 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'requests'
          ? 'bg-[#34A853] text-white shadow-[0_2px_0_#1e7e34]'
          : 'text-gray-600 hover:bg-gray-100'}"
      >
        <HandHelping class="w-4 h-4" />
        <span>Butuh Bantuan ({requests.length})</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'challenges')}
        class="flex-1 h-9 px-3 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'challenges'
          ? 'bg-[#4285F4] text-white shadow-[0_2px_0_#1a56b0]'
          : 'text-gray-600 hover:bg-gray-100'}"
      >
        <Trophy class="w-4 h-4" />
        <span>Tantangan ({challenges.length})</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'invitations')}
        class="flex-1 h-9 px-3 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'invitations'
          ? 'bg-teal-600 text-white shadow-[0_2px_0_#0f766e]'
          : 'text-gray-600 hover:bg-gray-100'}"
      >
        <MailCheck class="w-4 h-4" />
        <span>Undangan ({invitations.length})</span>
      </button>
    </div>

    <!-- Feed Content -->
    {#if loading}
      <div class="space-y-4">
        {#each [1, 2] as sk (sk)}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 h-48 animate-pulse shadow-[0_5px_0_#d1d5db]"></div>
        {/each}
      </div>
    {:else if activeTab === 'requests'}
      {#if requests.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <HandHelping class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 class="text-base font-bold text-gray-900">Belum Ada Permintaan yang Cocok</h2>
          <p class="text-xs text-gray-500 mt-1">Lihat seluruh permintaan yang sedang dibuka oleh warga dan UMKM.</p>
          <button
            type="button"
            onclick={() => navigate('/butuh-bantuan')}
            class="mt-4 h-9 px-4 rounded-xl bg-[#34A853] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] cursor-pointer"
          >
            Buka Papan Butuh Bantuan
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          {#each requests as r (r.id)}
            <RequestCard request={r} />
          {/each}
        </div>
      {/if}
    {:else if activeTab === 'challenges'}
      {#if challenges.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <Trophy class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 class="text-base font-bold text-gray-900">Belum Ada Tantangan Terbuka</h2>
          <p class="text-xs text-gray-500 mt-1">Nantikan kompetisi dan tantangan proyek nyata berikutnya dari Mitra Industri.</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each challenges as ch (ch.id)}
            <ChallengeCard challenge={ch} />
          {/each}
        </div>
      {/if}
    {:else if activeTab === 'invitations'}
      {#if invitations.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <MailCheck class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 class="text-base font-bold text-gray-900">Belum Ada Undangan Masuk</h2>
          <p class="text-xs text-gray-500 mt-1">Lengkapi profil Anda dan aktifkan status "Siap Kerja" agar dilirik industri.</p>
          <button
            type="button"
            onclick={() => navigate('/siap-kerja')}
            class="mt-4 h-9 px-4 rounded-xl bg-[#34A853] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] cursor-pointer"
          >
            Pengaturan Siap Kerja
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          <div class="flex justify-end">
            <button
              type="button"
              onclick={() => navigate('/undangan')}
              class="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
            >
              Buka Kotak Undangan Lengkap →
            </button>
          </div>
          {#each invitations.slice(0, 3) as inv (inv.id)}
            <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] flex items-center justify-between gap-3">
              <div>
                <span class="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-black">
                  {inv.typeLabel}
                </span>
                <h3 class="text-xs sm:text-sm font-black text-gray-900 mt-1">{inv.position}</h3>
                <p class="text-[11px] text-gray-500">{inv.company.companyName || inv.company.name}</p>
              </div>
              <button
                type="button"
                onclick={() => navigate('/undangan')}
                class="h-8 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold shrink-0 cursor-pointer"
              >
                Lihat Tawaran
              </button>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Right Sidebar -->
  <div class="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-5 self-start">
    <RightSidebar />
  </div>
</div>

