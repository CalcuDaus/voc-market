<script lang="ts">
  import {
    ArrowLeft,
    Award,
    BadgeCheck,
    Building2,
    CheckCircle2,
    FileBadge,
    Globe,
    GraduationCap,
    MapPin,
    MessageCircle,
    Phone,
    School,
    Settings,
    ShieldCheck,
    Sparkles,
    Trophy,
    Users
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { formatDateId } from '../lib/format';
  import { navigate } from '../lib/router.svelte';

  interface Props {
    slug: string;
  }

  let { slug }: Props = $props();

  let school = $state<any | null>(null);
  let loading = $state(true);
  let notFound = $state(false);
  let activeTab = $state<'works' | 'tefa' | 'students' | 'achievements'>('works');

  async function loadSchool(s: string) {
    loading = true;
    notFound = false;
    const res = await apiFetch<{ school?: any; error?: string }>(`/api/schools/${s}`);
    if (!res.ok || !res.data?.school) {
      notFound = true;
      loading = false;
      return;
    }
    school = res.data.school;
    loading = false;
  }

  $effect(() => {
    loadSchool(slug);
  });
</script>

<div class="max-w-5xl mx-auto px-2 sm:px-4 py-2">
  <button
    type="button"
    onclick={() => navigate('/sekolah')}
    class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 mb-5 active:translate-y-0.5 cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Kembali ke Direktori SMK</span>
  </button>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 animate-pulse h-96 shadow-[0_5px_0_#d1d5db]"></div>
  {:else if notFound || !school}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <School class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h2 class="text-xl font-black text-gray-900">Etalase Sekolah Tidak Ditemukan</h2>
      <p class="text-xs text-gray-500 mt-1">Data sekolah ini belum terdaftar di VOC-Market.</p>
    </div>
  {:else}
    <!-- School Profile Header Card -->
    <header class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db] mb-6">
      {#if school.coverImageUrl}
        <div class="h-44 sm:h-56 w-full bg-gray-100 overflow-hidden border-b-2 border-gray-200">
          <img src={school.coverImageUrl} alt={school.name} class="w-full h-full object-cover" />
        </div>
      {/if}

      <div class="p-5 sm:p-7">
        <div class="flex flex-col sm:flex-row items-start justify-between gap-5">
          <div class="flex items-start gap-4">
            <img
              src={school.logoUrl}
              alt={school.name}
              class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain border-2 border-gray-300 p-1.5 bg-white shadow-[0_2px_0_#d1d5db] shrink-0"
            />
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black text-gray-900">{school.name}</h1>
                {#if school.isVerified}
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#4285F4] border border-blue-200 text-xs font-black">
                    <BadgeCheck class="w-3.5 h-3.5" />
                    <span>SMK Resmi Terverifikasi</span>
                  </span>
                {/if}
              </div>

              {#if school.npsn}
                <p class="text-xs font-mono text-gray-500 font-semibold mt-0.5">NPSN: {school.npsn}</p>
              {/if}

              <p class="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 mt-1.5">
                <MapPin class="w-4 h-4 text-[#EA4335] shrink-0" />
                <span>{school.address || school.regionName || 'Indonesia'}</span>
              </p>

              {#if school.website}
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs font-bold text-[#4285F4] hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <Globe class="w-3.5 h-3.5" />
                  <span>{school.website}</span>
                </a>
              {/if}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {#if school.officialWhatsappUrl}
              <a
                href={school.officialWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="h-10 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 inline-flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle class="w-4 h-4" />
                <span>Hubungi Humas / TeFa</span>
              </a>
            {/if}

            {#if school.canManage}
              <button
                type="button"
                onclick={() => navigate(`/sekolah/${school.slug}/kelola`)}
                class="h-10 px-4 rounded-xl bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Settings class="w-4 h-4 text-[#4285F4]" />
                <span>Kelola Etalase</span>
              </button>
            {/if}
          </div>
        </div>

        {#if school.description}
          <p class="text-xs sm:text-sm text-gray-700 mt-4 pt-4 border-t-2 border-gray-100 leading-relaxed whitespace-pre-line">
            {school.description}
          </p>
        {/if}

        <!-- 4 Stats Banner -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t-2 border-gray-100">
          <div class="p-3 rounded-xl bg-gray-50 border-2 border-gray-200">
            <span class="text-[10px] font-black uppercase text-gray-400">Total Siswa</span>
            <p class="text-lg font-black text-gray-900 mt-0.5">{school.stats.totalStudents}</p>
          </div>
          <div class="p-3 rounded-xl bg-blue-50 border-2 border-blue-200">
            <span class="text-[10px] font-black uppercase text-[#4285F4]">Karya Etalase</span>
            <p class="text-lg font-black text-gray-900 mt-0.5">{school.stats.totalWorks}</p>
          </div>
          <div class="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200">
            <span class="text-[10px] font-black uppercase text-[#34A853]">Produk Unit TeFa</span>
            <p class="text-lg font-black text-gray-900 mt-0.5">{school.stats.tefaWorksCount}</p>
          </div>
          <div class="p-3 rounded-xl bg-purple-50 border-2 border-purple-200">
            <span class="text-[10px] font-black uppercase text-purple-700">Pesanan Selesai</span>
            <p class="text-lg font-black text-gray-900 mt-0.5">{school.stats.totalCompletedOrders}</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <button
        type="button"
        onclick={() => (activeTab = 'works')}
        class="h-10 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'works'
          ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db]'}"
      >
        <span>Semua Karya ({school.works.length})</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'tefa')}
        class="h-10 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'tefa'
          ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db]'}"
      >
        <Building2 class="w-4 h-4" />
        <span>Unit Produksi TeFa ({school.tefaWorks.length})</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'students')}
        class="h-10 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'students'
          ? 'bg-gray-900 text-white shadow-[0_3px_0_#000000]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db]'}"
      >
        <Users class="w-4 h-4" />
        <span>Talenta Siswa ({school.topStudents.length})</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'achievements')}
        class="h-10 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'achievements'
          ? 'bg-purple-600 text-white shadow-[0_3px_0_#581c87]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db]'}"
      >
        <Trophy class="w-4 h-4" />
        <span>Prestasi & Sertifikat ({school.achievements.length})</span>
      </button>
    </div>

    <!-- Tab 1: Semua Karya -->
    {#if activeTab === 'works'}
      {#if school.works.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <p class="text-xs text-gray-500">Belum ada karya siswa yang dipublikasikan dari sekolah ini.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each school.works as w (w.id)}
            <button
              type="button"
              onclick={() => navigate(`/karya/${w.id}`)}
              class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden text-left shadow-[0_4px_0_#d1d5db] hover:border-[#4285F4] transition flex flex-col group cursor-pointer"
            >
              <div class="relative aspect-4/3 w-full bg-gray-100 overflow-hidden border-b-2 border-gray-200">
                <img src={w.imageUrl} alt={w.name} class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/95 text-gray-800 shadow-xs">
                    {w.typeLabel}
                  </span>
                  {#if w.isTefa}
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#34A853] text-white flex items-center gap-1 shadow-xs">
                      <Building2 class="w-3 h-3" />
                      <span>{w.tefaUnit || 'Unit TeFa'}</span>
                    </span>
                  {/if}
                </div>
              </div>
              <div class="p-3.5 flex-1 flex flex-col justify-between">
                <h3 class="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#4285F4] transition">
                  {w.name}
                </h3>
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span class="font-black text-[#4285F4]">{w.formattedPrice}</span>
                  <span class="text-[11px] text-gray-500 font-semibold">{w.author.name}</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    <!-- Tab 2: Unit Produksi TeFa -->
    {:else if activeTab === 'tefa'}
      {#if school.tefaWorks.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <Building2 class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 class="text-base font-bold text-gray-900">Belum Ada Produk Resmi TeFa</h2>
          <p class="text-xs text-gray-500 mt-1">Guru pembimbing dapat menandai produk siswa sebagai produk resmi Teaching Factory.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each school.tefaWorks as w (w.id)}
            <button
              type="button"
              onclick={() => navigate(`/karya/${w.id}`)}
              class="bg-white border-2 border-emerald-300 rounded-2xl overflow-hidden text-left shadow-[0_4px_0_#a7f3d0] hover:border-[#34A853] transition flex flex-col group cursor-pointer"
            >
              <div class="relative aspect-4/3 w-full bg-gray-100 overflow-hidden border-b-2 border-gray-200">
                <img src={w.imageUrl} alt={w.name} class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#34A853] text-white flex items-center gap-1 shadow-xs">
                    <Building2 class="w-3 h-3" />
                    <span>{w.tefaUnit || 'Unit TeFa'}</span>
                  </span>
                </div>
              </div>
              <div class="p-3.5 flex-1 flex flex-col justify-between">
                <h3 class="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#34A853] transition">
                  {w.name}
                </h3>
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span class="font-black text-[#34A853]">{w.formattedPrice}</span>
                  <span class="text-[11px] text-gray-500 font-semibold">{w.author.name}</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    <!-- Tab 3: Talenta Siswa -->
    {:else if activeTab === 'students'}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {#each school.topStudents as st (st.id)}
          <div class="p-3.5 rounded-xl border-2 border-gray-300 bg-white shadow-[0_3px_0_#d1d5db] flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <img src={st.avatarUrl} alt={st.name} class="w-10 h-10 rounded-full object-cover border border-gray-300 shrink-0" />
              <div class="overflow-hidden">
                <button
                  type="button"
                  onclick={() => navigate(`/profil/${st.username}`)}
                  class="text-xs font-extrabold text-gray-900 hover:text-[#4285F4] truncate block text-left cursor-pointer"
                >
                  {st.name}
                </button>
                <p class="text-[11px] text-gray-500 truncate">{st.major || 'Siswa SMK'}</p>
              </div>
            </div>
            <button
              type="button"
              onclick={() => navigate(`/paspor-kerja/${st.username}`)}
              class="h-8 px-2.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold shrink-0 inline-flex items-center gap-1 active:translate-y-0.5 cursor-pointer"
            >
              <FileBadge class="w-3.5 h-3.5" />
              <span>CV</span>
            </button>
          </div>
        {/each}
      </div>
    <!-- Tab 4: Prestasi & Sertifikat -->
    {:else if activeTab === 'achievements'}
      {#if school.achievements.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <Trophy class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 class="text-base font-bold text-gray-900">Belum Ada Rekam Sertifikat</h2>
          <p class="text-xs text-gray-500 mt-1">Sertifikat terbit otomatis ketika siswa memenangkan Tantangan Industri.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {#each school.achievements as ach (ach.code)}
            <div class="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50 shadow-[0_2px_0_#e9d5ff] flex flex-col justify-between gap-2">
              <div>
                <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-black">
                  {ach.typeLabel}
                </span>
                <h3 class="text-xs sm:text-sm font-black text-gray-900 mt-1">{ach.title}</h3>
                <p class="text-[11px] text-gray-600 mt-0.5">
                  Peraih: <span class="font-bold text-gray-800">{ach.student.name}</span> ({ach.student.major || 'Siswa'})
                </p>
                <p class="text-[10px] text-gray-400">Pemberi: {ach.issuerName} • {formatDateId(ach.issuedAt)}</p>
              </div>
              <div class="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                <span class="font-mono text-[10px] text-purple-700">{ach.code}</span>
                <button
                  type="button"
                  onclick={() => navigate(`/sertifikat/${ach.code}`)}
                  class="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Verifikasi Sertifikat →
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {/if}
</div>

