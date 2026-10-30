<script lang="ts">
  import {
    Award,
    BadgeCheck,
    Briefcase,
    CheckCircle2,
    FileBadge,
    Flag,
    GraduationCap,
    LogOut,
    PlusCircle,
    School,
    ShieldCheck,
    Star,
    Trophy,
    User,
    UserCheck
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import ReportModal from '../lib/components/ReportModal.svelte';
  import CreatorLevelCard from '../lib/components/CreatorLevelCard.svelte';
  import BadgeGrid from '../lib/components/BadgeGrid.svelte';
  import { USER_ROLE_LABELS } from '../../shared/constants';

  interface Props {
    username: string;
  }

  let { username }: Props = $props();

  let loading = $state(true);
  let errorMsg = $state('');
  let profile = $state<any>(null);
  let reportModalOpen = $state(false);

  let isOwnProfile = $derived(Boolean(auth.user && profile && auth.user.id === profile.id));

  async function loadProfile(uname: string) {
    loading = true;
    errorMsg = '';
    const res = await apiFetch<{ profile?: any; error?: string }>(
      `/api/profile/${encodeURIComponent(uname)}`
    );

    if (!res.ok || !res.data?.profile) {
      errorMsg = res.data?.error || 'Profil pengguna tidak ditemukan.';
      profile = null;
      loading = false;
      return;
    }

    profile = res.data.profile;
    loading = false;
  }

  $effect(() => {
    loadProfile(username);
  });

  async function handleLogout() {
    await auth.logout();
    toast.success('Anda berhasil keluar dari akun.');
    navigate('/');
  }
</script>

<div class="max-w-5xl mx-auto px-2 sm:px-4 py-2">
  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <div class="w-9 h-9 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-bold text-gray-500 mt-3">Memuat profil...</p>
    </div>
  {:else if errorMsg || !profile}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center max-w-md mx-auto shadow-[0_5px_0_#d1d5db]">
      <User class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h1 class="text-lg font-black text-gray-900">Profil Tidak Ditemukan</h1>
      <p class="text-xs text-gray-500 mt-1">{errorMsg}</p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-6 h-10 px-5 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 transition cursor-pointer"
      >
        Kembali ke Katalog
      </button>
    </div>
  {:else}
    <!-- Profile Identity Header -->
    <section class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db] mb-6">
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div class="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] shrink-0 bg-gray-100"
          />

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
                {USER_ROLE_LABELS[profile.userType] || 'Pengguna'}
              </span>

              {#if profile.userType === 'smk'}
                {#if profile.openToWork}
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-[#34A853] border border-emerald-200">
                    ● Siap Kerja
                  </span>
                {/if}
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-bold {profile.acceptingOrders
                    ? 'bg-blue-50 text-[#4285F4] border border-blue-200'
                    : 'bg-gray-100 text-gray-600'}"
                >
                  {profile.acceptingOrders ? '● Terima Pesanan' : 'Fokus Belajar'}
                </span>
              {/if}
            </div>

            <h1 class="text-xl sm:text-2xl font-black text-gray-900 mt-2 flex items-center gap-2 flex-wrap">
              <span>{profile.name}</span>
              {#if profile.isVerified}
                <BadgeCheck class="w-5 h-5 text-[#4285F4] shrink-0" />
              {/if}
            </h1>
            <p class="text-xs text-gray-500 font-semibold">@{profile.username}</p>

            {#if profile.headline}
              <p class="text-xs sm:text-sm font-bold text-gray-800 mt-1 italic">
                "{profile.headline}"
              </p>
            {/if}

            {#if profile.school}
              <p class="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5 mt-2">
                <School class="w-4 h-4 text-[#4285F4] shrink-0" />
                <button
                  type="button"
                  onclick={() => navigate(`/sekolah/${profile.school.slug}`)}
                  class="text-[#4285F4] hover:underline cursor-pointer"
                >
                  {profile.school.name}
                </button>
                {#if profile.major}
                  <span class="text-gray-500 font-normal">• Jurusan {profile.major}</span>
                {/if}
              </p>
            {:else if profile.schoolName}
              <p class="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5 mt-2">
                <School class="w-4 h-4 text-[#4285F4] shrink-0" />
                <span>{profile.schoolName}</span>
                {#if profile.major}
                  <span class="text-gray-500 font-normal">• Jurusan {profile.major}</span>
                {/if}
              </p>
            {:else if profile.businessName}
              <p class="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5 mt-2">
                <Briefcase class="w-4 h-4 text-[#4285F4] shrink-0" />
                <span>
                  {profile.businessName}
                  {#if profile.businessType}
                    ({profile.businessType})
                  {/if}
                </span>
              </p>
            {/if}

            {#if profile.isVerified && profile.userType === 'smk'}
              <p class="text-xs font-bold text-[#34A853] mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 class="w-4 h-4 text-[#34A853] shrink-0" />
                <span>Siswa resmi terverifikasi oleh {profile.verifierName || 'Guru Pembimbing SMK'}</span>
              </p>
            {/if}

            {#if profile.bio}
              <p class="text-xs sm:text-sm text-gray-700 mt-3 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>
            {/if}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2 shrink-0 w-full md:w-auto">
          {#if profile.userType === 'smk'}
            <button
              type="button"
              onclick={() => navigate(`/paspor-kerja/${profile.username}`)}
              class="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-[0_3px_0_#581c87] active:translate-y-0.5 transition cursor-pointer"
            >
              <FileBadge class="w-4 h-4" />
              <span>Buka Paspor Kerja (CV)</span>
            </button>
          {/if}

          {#if isOwnProfile}
            {#if profile.userType === 'smk'}
              <button
                type="button"
                onclick={() => navigate('/siap-kerja')}
                class="h-10 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#34A853] border-2 border-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-2 shadow-[0_2px_0_#a7f3d0] active:translate-y-0.5 transition cursor-pointer"
              >
                <UserCheck class="w-4 h-4" />
                <span>Atur Status Siap Kerja</span>
              </button>
              <button
                type="button"
                onclick={() => navigate('/jual')}
                class="h-10 px-4 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs inline-flex items-center justify-center gap-2 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 transition cursor-pointer"
              >
                <PlusCircle class="w-4 h-4 text-[#4285F4]" />
                <span>Unggah Karya Baru</span>
              </button>
            {:else if profile.userType === 'teacher'}
              <button
                type="button"
                onclick={() => navigate('/dashboard/guru')}
                class="h-10 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] inline-flex items-center justify-center gap-2 active:translate-y-0.5 transition cursor-pointer"
              >
                <GraduationCap class="w-4 h-4" />
                <span>Panel Guru SMK</span>
              </button>
            {/if}

            <button
              type="button"
              onclick={handleLogout}
              class="h-10 px-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-[#EA4335] font-bold text-xs inline-flex items-center justify-center gap-2 active:translate-y-0.5 transition cursor-pointer"
            >
              <LogOut class="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
          {:else}
            <button
              type="button"
              onclick={() => (reportModalOpen = true)}
              class="h-9 px-3 rounded-xl border-2 border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-[#EA4335] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Flag class="w-3.5 h-3.5" />
              <span>Laporkan Akun</span>
            </button>
          {/if}
        </div>
      </div>

      {#if profile.userType === 'smk' && profile.experienceLevel}
        <div class="mt-5 pt-4 border-t-2 border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-50 border-2 border-amber-200 text-[#b45309] flex items-center justify-center shrink-0">
              <Award class="w-4 h-4" />
            </div>
            <div>
              <p class="text-xs font-black text-gray-900">
                Tingkat Pengalaman: {profile.experienceLevel.title}
              </p>
              <p class="text-[11px] text-gray-500">{profile.experienceLevel.subtitle}</p>
            </div>
          </div>
        </div>
      {/if}
    </section>

    {#if profile.userType === 'smk'}
      <!-- 4 Real Track-Record Metrics -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
          <p class="text-[10px] font-black uppercase tracking-wide text-gray-400">Pesanan Selesai</p>
          <p class="text-xl sm:text-2xl font-black text-gray-900 mt-1">
            {profile.metrics.completedOrdersCount}
          </p>
        </div>

        <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
          <p class="text-[10px] font-black uppercase tracking-wide text-gray-400">Rating Pelanggan</p>
          <p class="text-xl sm:text-2xl font-black text-amber-600 mt-1 flex items-center gap-1.5">
            <Star class="w-5 h-5 fill-[#FBBC05] text-[#FBBC05]" />
            <span>{profile.metrics.avgRating > 0 ? profile.metrics.avgRating : '-'}</span>
          </p>
        </div>

        <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
          <p class="text-[10px] font-black uppercase tracking-wide text-gray-400">Ulasan Nyata</p>
          <p class="text-xl sm:text-2xl font-black text-gray-900 mt-1">
            {profile.metrics.reviewsCount}
          </p>
        </div>

        <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
          <p class="text-[10px] font-black uppercase tracking-wide text-gray-400">Sertifikat Industri</p>
          <p class="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {profile.metrics.certificatesCount || 0}
          </p>
        </div>
      </div>

      <!-- Tier 3: Tingkat Kreator & Lencana Vokasi (#11) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <CreatorLevelCard level={profile.creatorLevel || 1} title={profile.creatorLevelTitle} />
        <BadgeGrid badges={profile.badges || []} />
      </div>

      <!-- Sertifikat Tantangan Industri Terverifikasi QR (Tier 2 #7) -->
      {#if profile.certificates?.length > 0}
        <section class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#d1d5db] mb-6">
          <div class="flex items-center gap-2 mb-3">
            <Trophy class="w-5 h-5 text-[#FBBC05]" />
            <h2 class="text-sm font-black text-gray-900 uppercase tracking-wide">
              Sertifikat Tantangan Industri Terverifikasi QR ({profile.certificates.length})
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each profile.certificates as cert (cert.code)}
              <div class="p-3.5 rounded-xl border-2 border-purple-200 bg-purple-50/50 flex flex-col justify-between gap-2">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black">
                      {cert.typeLabel}
                    </span>
                    <span class="text-[10px] font-mono text-gray-400">{cert.code}</span>
                  </div>
                  <h3 class="text-xs font-black text-gray-900 mt-1.5">{cert.title}</h3>
                  <p class="text-[11px] text-gray-600 mt-0.5">
                    Penyelenggara: <span class="font-bold text-gray-800">{cert.issuerName}</span>
                  </p>
                </div>
                <div class="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                  <span class="text-[10px] text-gray-400">{formatDateId(cert.issuedAt)}</span>
                  <button
                    type="button"
                    onclick={() => navigate(`/sertifikat/${cert.code}`)}
                    class="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    Verifikasi Sertifikat →
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Skills & Endorsements -->
      {#if profile.endorsedSkills?.length > 0 || profile.skills?.length > 0}
        <section class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#d1d5db] mb-6">
          <h2 class="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">
            Keahlian & Pengakuan Pelanggan
          </h2>

          {#if profile.endorsedSkills?.length > 0}
            <div class="mb-3">
              <p class="text-[11px] font-black text-[#34A853] mb-2">
                Diakui oleh Pelanggan Nyata:
              </p>
              <div class="flex flex-wrap gap-2">
                {#each profile.endorsedSkills as item}
                  <span class="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 class="w-3.5 h-3.5 text-[#34A853]" />
                    <span>{item.tag}</span>
                    <span class="bg-[#34A853] text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {item.count}x
                    </span>
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          {#if profile.skills?.length > 0}
            <div>
              <p class="text-[11px] font-black text-gray-500 mb-2">
                Kompetensi Kejuruan:
              </p>
              <div class="flex flex-wrap gap-2">
                {#each profile.skills as sk}
                  <span class="px-3 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-bold">
                    {sk}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </section>
      {/if}

      <!-- Student Works Grid -->
      <section class="mb-8">
        <h2 class="text-sm font-black uppercase tracking-wider text-gray-500 mb-3">
          Etalase Karya & Layanan ({profile.posts?.length || 0})
        </h2>

        {#if !profile.posts || profile.posts.length === 0}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 text-center shadow-[0_5px_0_#d1d5db]">
            <p class="text-xs sm:text-sm text-gray-500">Siswa ini belum mengunggah karya ke etalase.</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each profile.posts as post (post.id)}
              <button
                type="button"
                onclick={() => navigate(`/karya/${post.id}`)}
                class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden text-left shadow-[0_4px_0_#d1d5db] hover:border-[#4285F4] transition flex flex-col group cursor-pointer"
              >
                <div class="relative aspect-4/3 w-full bg-gray-100 overflow-hidden border-b-2 border-gray-200">
                  <img
                    src={post.imageUrl}
                    alt={post.name}
                    loading="lazy"
                    class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white/95 text-gray-800 shadow-xs">
                      {post.typeLabel}
                    </span>
                    {#if post.isVerifiedByTeacher}
                      <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#34A853] text-white flex items-center gap-1 shadow-xs">
                        <ShieldCheck class="w-3 h-3" />
                        <span>Stempel Guru</span>
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="p-3.5 flex-1 flex flex-col justify-between">
                  <h3 class="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#4285F4] transition">
                    {post.name}
                  </h3>
                  <p class="text-sm font-black text-[#4285F4] mt-2">{post.formattedPrice}</p>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  {/if}
</div>

{#if profile}
  <ReportModal
    open={reportModalOpen}
    targetType="user"
    targetId={profile.id}
    targetLabel={`@${profile.username} (${profile.name})`}
    onClose={() => (reportModalOpen = false)}
  />
{/if}
