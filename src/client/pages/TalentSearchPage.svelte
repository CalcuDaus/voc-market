<script lang="ts">
  import {
    Briefcase,
    ChevronLeft,
    ChevronRight,
    Clock,
    Lock,
    Search,
    Send,
    ShieldAlert,
    SlidersHorizontal,
    Sparkles,
    UserCheck,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import TalentCard from '../lib/components/TalentCard.svelte';
  import RightSidebar from '../lib/components/RightSidebar.svelte';

  let items = $state<any[]>([]);
  let regions = $state<any[]>([]);
  let total = $state(0);
  let page = $state(1);
  let totalPages = $state(1);
  let loading = $state(true);
  let accessDeniedMessage = $state('');

  let searchInput = $state('');
  let debouncedQuery = $state('');
  let major = $state('');
  let regionId = $state<number>(0);
  let studentStatus = $state('');
  let jobType = $state('');
  let verifiedOnly = $state(false);
  let minRating = $state<number>(0);
  let showFilters = $state(false);

  // Invite Modal State
  let inviteModalOpen = $state(false);
  let targetStudent = $state<any | null>(null);
  let inviteType = $state<'pkl' | 'magang' | 'kerja' | 'freelance'>('magang');
  let invitePosition = $state('');
  let inviteMessage = $state('');
  let inviteSalary = $state('');
  let sendingInvite = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleSearchInput(val: string) {
    searchInput = val;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQuery = val.trim();
      page = 1;
    }, 250);
  }

  function clearFilters() {
    searchInput = '';
    debouncedQuery = '';
    major = '';
    regionId = 0;
    studentStatus = '';
    jobType = '';
    verifiedOnly = false;
    minRating = 0;
    page = 1;
  }

  async function loadTalent() {
    loading = true;
    accessDeniedMessage = '';

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');
    if (major) params.set('major', major);
    if (regionId > 0) params.set('regionId', String(regionId));
    if (studentStatus) params.set('studentStatus', studentStatus);
    if (jobType) params.set('jobType', jobType);
    if (verifiedOnly) params.set('verifiedOnly', '1');
    if (minRating > 0) params.set('minRating', String(minRating));
    if (debouncedQuery.length >= 2) params.set('q', debouncedQuery);

    const res = await apiFetch<{ items?: any[]; total?: number; totalPages?: number; error?: string }>(
      `/api/talent?${params.toString()}`
    );

    if (!res.ok) {
      accessDeniedMessage =
        res.data?.error || 'Akses khusus untuk Mitra Industri yang telah diverifikasi Admin.';
      items = [];
      loading = false;
      return;
    }

    items = res.data?.items || [];
    total = res.data?.total || 0;
    totalPages = res.data?.totalPages || 1;
    loading = false;
  }

  $effect(() => {
    apiFetch<{ items?: any[] }>('/api/regions').then((res) => {
      if (res.ok && res.data?.items) regions = res.data.items;
    });
  });

  $effect(() => {
    void major;
    void regionId;
    void studentStatus;
    void jobType;
    void verifiedOnly;
    void minRating;
    void debouncedQuery;
    void page;
    loadTalent();
  });

  async function handleToggleSave(student: any) {
    const res = await apiFetch<{ success?: boolean; isSaved?: boolean }>(
      `/api/talent/${student.username}/save`,
      { method: 'POST' }
    );
    if (res.ok && res.data) {
      student.isSaved = res.data.isSaved;
      toast.success(
        res.data.isSaved
          ? `${student.name} disimpan ke daftar favorit kandidat.`
          : `${student.name} dihapus dari favorit.`
      );
    }
  }

  function openInviteModal(student: any) {
    targetStudent = student;
    invitePosition = '';
    inviteMessage = '';
    inviteSalary = '';
    inviteType = student.studentStatus === 'active' ? 'pkl' : 'magang';
    inviteModalOpen = true;
  }

  async function handleSendInvite(e: SubmitEvent) {
    e.preventDefault();
    if (!targetStudent) return;
    sendingInvite = true;

    const res = await apiFetch<{ success?: boolean; error?: string }>(
      `/api/talent/${targetStudent.username}/invite`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: inviteType,
          position: invitePosition,
          message: inviteMessage,
          salaryInfo: inviteSalary
        })
      }
    );

    sendingInvite = false;
    if (!res.ok) {
      toast.error(res.data?.error || 'Gagal mengirim undangan.');
      return;
    }

    toast.success(
      `Undangan berhasil dikirim ke ${targetStudent.name}! Guru pembimbing sekolah juga telah diberitahu.`
    );
    inviteModalOpen = false;
  }
</script>

<div class="flex gap-6 items-start justify-center">
  <!-- Center Column -->
  <div class="flex-1 min-w-0 max-w-2xl w-full">
    <!-- Header Banner -->
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] mb-5">
      <div class="flex items-start gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-blue-50 border-2 border-blue-200 text-[#4285F4] flex items-center justify-center shrink-0">
          <Briefcase class="w-6 h-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider text-[#4285F4]">
            Direktori Kesiapan Kerja Vokasi
          </span>
          <h1 class="text-xl font-black text-gray-900 leading-snug">Cari Talenta SMK</h1>
          <p class="text-xs text-gray-500 mt-0.5">
            Temukan talenta siswa & alumni SMK terverifikasi berdasarkan jurusan, rating, dan karya nyata.
          </p>
        </div>
      </div>

      <!-- Search Input -->
      <div class="mt-4 flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchInput}
            oninput={(e) => handleSearchInput((e.currentTarget as HTMLInputElement).value)}
            placeholder="Cari keahlian: web development, servis motor, AutoCAD, barista..."
            class="w-full h-10 pl-10 pr-9 rounded-xl border-2 border-gray-300 bg-gray-50 focus:bg-white focus:border-[#4285F4] focus:outline-none text-xs text-gray-900 shadow-[0_2px_0_#d1d5db] transition"
          />
          {#if searchInput}
            <button
              type="button"
              onclick={() => handleSearchInput('')}
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          {/if}
        </div>

        <button
          type="button"
          onclick={() => (showFilters = !showFilters)}
          class="h-10 px-3 rounded-xl border-2 border-gray-300 font-bold text-xs inline-flex items-center gap-1.5 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 cursor-pointer {showFilters
            ? 'bg-blue-50 border-[#4285F4] text-[#4285F4]'
            : 'bg-white text-gray-700'}"
        >
          <SlidersHorizontal class="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>
      </div>

      <!-- Quick Toggles -->
      <div class="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1">
        {#each [
          { id: '', label: 'Semua Peluang' },
          { id: 'pkl', label: 'PKL / Prakerin' },
          { id: 'magang', label: 'Magang Industri' },
          { id: 'kerja', label: 'Kerja Penuh Waktu' }
        ] as jTab}
          <button
            type="button"
            onclick={() => {
              jobType = jTab.id;
              page = 1;
            }}
            class="h-8 px-3 rounded-lg text-xs font-bold transition active:translate-y-0.5 cursor-pointer {jobType ===
            jTab.id
              ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
              : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'}"
          >
            {jTab.label}
          </button>
        {/each}
      </div>

      <!-- Expanded Filters -->
      {#if showFilters}
        <div class="mt-3.5 pt-3.5 border-t-2 border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            bind:value={major}
            placeholder="Ketik jurusan (misal: RPL)"
            class="p-2 text-xs border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          />

          <select
            bind:value={regionId}
            class="p-2 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          >
            <option value={0}>Semua Wilayah</option>
            {#each regions as r (r.id)}
              <option value={r.id}>{r.name} ({r.province})</option>
            {/each}
          </select>

          <select
            bind:value={studentStatus}
            class="p-2 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          >
            <option value="">Semua Tingkat</option>
            <option value="active">Siswa Aktif (X/XI)</option>
            <option value="final_year">Tingkat Akhir (XII)</option>
            <option value="alumni">Alumni SMK</option>
          </select>
        </div>
      {/if}
    </div>

    <!-- Access Denied Banner for Non-Verified Companies -->
    {#if accessDeniedMessage}
      <div class="bg-white border-2 border-amber-300 rounded-2xl p-6 text-center shadow-[0_5px_0_#fde68a]">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-200 text-[#b45309] flex items-center justify-center mx-auto mb-3">
          <Clock class="w-6 h-6" />
        </div>
        <h2 class="text-base font-black text-gray-900">Pencarian Talenta Menunggu Verifikasi</h2>
        <p class="text-xs text-gray-600 mt-1 max-w-md mx-auto leading-relaxed">
          {accessDeniedMessage}
        </p>
        <div class="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onclick={() => navigate('/tantangan')}
            class="h-9 px-4 rounded-xl bg-[#4285F4] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] cursor-pointer"
          >
            Buka Tantangan Industri
          </button>
        </div>
      </div>
    {:else if loading}
      <div class="space-y-4">
        {#each [1, 2, 3] as sk (sk)}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 h-56 animate-pulse shadow-[0_5px_0_#d1d5db]"></div>
        {/each}
      </div>
    {:else if items.length === 0}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-[#4285F4] flex items-center justify-center mx-auto mb-3">
          <Sparkles class="w-6 h-6" />
        </div>
        <h2 class="text-base font-bold text-gray-900">Belum Ada Kandidat yang Sesuai</h2>
        <p class="text-xs text-gray-500 mt-1">Coba gunakan kata kunci keahlian lain atau bersihkan filter.</p>
        <button
          type="button"
          onclick={clearFilters}
          class="mt-4 h-9 px-4 rounded-xl bg-[#4285F4] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] cursor-pointer"
        >
          Tampilkan Semua Talenta
        </button>
      </div>
    {:else}
      <div class="space-y-4">
        {#each items as st (st.id)}
          <TalentCard
            student={st}
            onInvite={openInviteModal}
            onToggleSave={handleToggleSave}
          />
        {/each}
      </div>

      {#if totalPages > 1}
        <div class="mt-5 mb-8 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onclick={() => (page = Math.max(1, page - 1))}
            class="h-9 px-4 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_3px_0_#d1d5db] active:shadow-none active:translate-y-0.5 transition cursor-pointer"
          >
            <ChevronLeft class="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>
          <span class="text-xs font-bold text-gray-600">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onclick={() => (page = Math.min(totalPages, page + 1))}
            class="h-9 px-4 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_3px_0_#d1d5db] active:shadow-none active:translate-y-0.5 transition cursor-pointer"
          >
            <span>Selanjutnya</span>
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Right Sidebar -->
  <div class="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-5 self-start">
    <RightSidebar />
  </div>
</div>

<!-- Modal Kirim Undangan Rekrutmen -->
{#if inviteModalOpen && targetStudent}
  <div
    class="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white border-2 border-gray-300 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-[0_6px_0_#d1d5db]">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 class="text-base font-black text-gray-900">Kirim Undangan Rekrutmen</h3>
          <p class="text-xs text-gray-500">
            Mengundang <span class="font-bold text-gray-800">{targetStudent.name}</span> ({targetStudent.schoolName || 'SMK'})
          </p>
        </div>
        <button
          type="button"
          onclick={() => (inviteModalOpen = false)}
          class="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <form onsubmit={handleSendInvite} class="space-y-3.5">
        <div>
          <label for="inv-type" class="block text-xs font-bold text-gray-700 mb-1">
            Jenis Peluang Ditawarkan <span class="text-[#EA4335]">*</span>
          </label>
          <select
            id="inv-type"
            bind:value={inviteType}
            class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          >
            {#if targetStudent.studentStatus === 'active'}
              <option value="pkl">PKL / Prakerin</option>
              <option value="freelance">Proyek Lepas (Freelance)</option>
            {:else}
              <option value="magang">Magang Industri</option>
              <option value="kerja">Kerja Penuh Waktu</option>
              <option value="pkl">PKL / Prakerin</option>
              <option value="freelance">Proyek Lepas (Freelance)</option>
            {/if}
          </select>
        </div>

        <div>
          <label for="inv-pos" class="block text-xs font-bold text-gray-700 mb-1">
            Nama Posisi / Pekerjaan <span class="text-[#EA4335]">*</span>
          </label>
          <input
            id="inv-pos"
            type="text"
            bind:value={invitePosition}
            required
            placeholder="Contoh: Junior Web Developer / Teknisi Motor"
            class="w-full p-2.5 text-xs border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]"
          />
        </div>

        <div>
          <label for="inv-sal" class="block text-xs font-bold text-gray-700 mb-1">
            Uang Saku / Gaji (Opsional)
          </label>
          <input
            id="inv-sal"
            type="text"
            bind:value={inviteSalary}
            placeholder="Contoh: Rp 2.500.000 / bulan + transport"
            class="w-full p-2.5 text-xs border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]"
          />
        </div>

        <div>
          <label for="inv-msg" class="block text-xs font-bold text-gray-700 mb-1">
            Pesan Undangan & Rincian Proyek <span class="text-[#EA4335]">*</span>
          </label>
          <textarea
            id="inv-msg"
            rows="3"
            bind:value={inviteMessage}
            required
            placeholder="Jelaskan deskripsi pekerjaan, lokasi kantor, dan fasilitas yang disediakan perusahaan..."
            class="w-full p-2.5 text-xs border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]"
          ></textarea>
        </div>

        <p class="text-[10px] text-gray-500 leading-relaxed bg-blue-50 p-2.5 rounded-lg border border-blue-200">
          Demi perlindungan privasi siswa, nomor WhatsApp siswa baru akan dibuka secara otomatis setelah siswa menerima undangan Anda. Guru pembimbing sekolah juga akan mendapatkan notifikasi.
        </p>

        <div class="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onclick={() => (inviteModalOpen = false)}
            class="h-9 px-4 rounded-xl border-2 border-gray-300 font-bold text-xs text-gray-700 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={sendingInvite}
            class="h-9 px-5 rounded-xl bg-[#34A853] hover:bg-[#2d9247] shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <Send class="w-3.5 h-3.5" />
            <span>{sendingInvite ? 'Mengirim...' : 'Kirim Undangan'}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

