<script lang="ts">
  import {
    ArrowLeft,
    BadgeCheck,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    Edit3,
    ExternalLink,
    Eye,
    FileBadge,
    Github,
    Globe,
    Heart,
    MessageCircle,
    School,
    Share2,
    Sparkles,
    User
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import ShowcaseMediaViewer from '../lib/components/ShowcaseMediaViewer.svelte';
  import ShowcaseEditorModal from '../lib/components/ShowcaseEditorModal.svelte';
  import SharePromoModal from '../lib/components/SharePromoModal.svelte';

  interface Props {
    postId: number;
  }

  let { postId }: Props = $props();

  let post = $state<any | null>(null);
  let details = $state<any | null>(null);
  let media = $state<any[]>([]);
  let related = $state<any[]>([]);
  let loading = $state(true);
  let errorMsg = $state('');

  let showEditor = $state(false);
  let showShareModal = $state(false);

  let isAuthor = $derived(auth.user && post && auth.user.id === post.userId);
  let canManage = $derived(
    isAuthor ||
    auth.user?.userType === 'admin' ||
    (auth.user?.userType === 'teacher' && auth.user.schoolId && post && auth.user.schoolId === post.schoolId)
  );

  async function fetchShowcaseDetail() {
    try {
      loading = true;
      const res = await apiFetch<any>(`/api/showcase/${postId}`);
      if (res.data) {
        post = res.data.post;
        details = res.data.details;
        media = res.data.media || [];
        related = res.data.related || [];
      } else {
        errorMsg = res.error || 'Karya tidak ditemukan';
      }
    } catch {
      errorMsg = 'Gagal memuat detail karya showcase';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    fetchShowcaseDetail();
  });
</script>

<div class="max-w-5xl mx-auto space-y-6 pb-16">
  <!-- Top Navigation & Actions Bar -->
  <div class="flex items-center justify-between gap-4">
    <button
      type="button"
      onclick={() => navigate('/pameran')}
      class="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Kembali ke Pameran Karya</span>
    </button>

    <div class="flex items-center gap-2">
      {#if canManage}
        <button
          type="button"
          onclick={() => (showEditor = true)}
          class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <Edit3 class="w-4 h-4" />
          <span>Kelola Media 3D &amp; Studi Kasus</span>
        </button>
      {/if}

      <button
        type="button"
        onclick={() => (showShareModal = true)}
        class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
      >
        <Share2 class="w-4 h-4" />
        <span>Bagikan</span>
      </button>
    </div>
  </div>

  {#if loading}
    <div class="bg-white rounded-3xl p-8 border-2 border-slate-200 shadow-sm animate-pulse space-y-6">
      <div class="h-6 bg-slate-200 rounded-md w-1/3"></div>
      <div class="aspect-video bg-slate-200 rounded-2xl"></div>
      <div class="space-y-3">
        <div class="h-4 bg-slate-200 rounded-md w-full"></div>
        <div class="h-4 bg-slate-100 rounded-md w-4/5"></div>
      </div>
    </div>
  {:else if errorMsg || !post}
    <div class="bg-white rounded-3xl p-12 text-center border-2 border-slate-200 shadow-sm space-y-4">
      <p class="text-base font-bold text-rose-600">{errorMsg || 'Karya tidak ditemukan'}</p>
      <button
        type="button"
        onclick={() => navigate('/pameran')}
        class="h-10 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold"
      >
        Ke Galeri Pameran
      </button>
    </div>
  {:else}
    <!-- Main Showcase Header -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-5">
      <!-- Badges Row -->
      <div class="flex items-center gap-2 flex-wrap">
        {#if details?.major}
          <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black border border-blue-200">
            {details.major}
          </span>
        {/if}

        {#if post.isVerifiedByTeacher}
          <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
            <BadgeCheck class="w-3.5 h-3.5 text-emerald-600" />
            <span>Terverifikasi Guru Pembimbing (TeFa)</span>
          </span>
        {/if}

        <span class="text-xs text-slate-400 font-medium ml-auto flex items-center gap-1">
          <Calendar class="w-3.5 h-3.5" />
          <span>{formatDateId(post.createdAt)}</span>
        </span>
      </div>

      <!-- Title & Tagline -->
      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          {post.name}
        </h1>
        {#if details?.tagline}
          <p class="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            {details.tagline}
          </p>
        {/if}
      </div>

      <!-- Interactive 3D / Video / Image Stage -->
      <div class="pt-2">
        <ShowcaseMediaViewer
          coverImage={post.coverImage}
          modelUrl={details?.modelUrl}
          demoUrl={details?.demoUrl}
          mediaList={media}
          postTitle={post.name}
        />
      </div>

      <!-- Quick Links (Live Demo & Repository) -->
      {#if details?.demoUrl || details?.repoUrl || post.projectLink}
        <div class="flex items-center gap-3 pt-4 border-t border-slate-100 flex-wrap">
          {#if details?.demoUrl || post.projectLink}
            <a
              href={details?.demoUrl || post.projectLink}
              target="_blank"
              rel="noopener noreferrer"
              class="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
            >
              <Globe class="w-4 h-4" />
              <span>Coba Demo Aplikasi Web</span>
              <ExternalLink class="w-3.5 h-3.5 opacity-70" />
            </a>
          {/if}

          {#if details?.repoUrl}
            <a
              href={details.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="h-10 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-xs transition"
            >
              <Github class="w-4 h-4" />
              <span>Repositori Proyek</span>
              <ExternalLink class="w-3.5 h-3.5 opacity-70" />
            </a>
          {/if}
        </div>
      {/if}
    </div>

    <!-- 2 Columns: Study Case Content & Author Profile -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Case Study Sections -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Tools & Software Badges -->
        {#if details?.tools && details.tools.length > 0}
          <div class="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm space-y-3">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Software &amp; Teknologi yang Digunakan</h3>
            <div class="flex items-center gap-2 flex-wrap">
              {#each details.tools as tool}
                <span class="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                  {tool}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 3-Part Case Study: Problem, Process, Result -->
        <div class="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 shadow-sm space-y-6">
          <h2 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
            Studi Kasus &amp; Proses Pengerjaan
          </h2>

          {#if details?.problem}
            <div class="space-y-2">
              <h3 class="text-xs font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>01. Masalah &amp; Latar Belakang</span>
              </h3>
              <p class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {details.problem}
              </p>
            </div>
          {/if}

          {#if details?.process}
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <h3 class="text-xs font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>02. Proses Pengerjaan &amp; Solusi Teknis</span>
              </h3>
              <p class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {details.process}
              </p>
            </div>
          {/if}

          {#if details?.result}
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <h3 class="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>03. Hasil Akhir &amp; Dampak</span>
              </h3>
              <p class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {details.result}
              </p>
            </div>
          {/if}

          <!-- Fallback if no detailed case study filled yet -->
          {#if !details?.problem && !details?.process && !details?.result}
            <div class="space-y-2">
              <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Deskripsi Karya</h3>
              <p class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {post.description}
              </p>
              {#if canManage}
                <div class="pt-3">
                  <button
                    type="button"
                    onclick={() => (showEditor = true)}
                    class="h-9 px-4 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                  >
                    + Lengkapi Narasi Studi Kasus (Masalah, Solusi &amp; Dampak)
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Teacher Verification Stamp Box -->
        {#if post.isVerifiedByTeacher}
          <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <BadgeCheck class="w-6 h-6" />
            </div>
            <div class="space-y-1">
              <h3 class="text-sm font-black text-emerald-950">
                Karya Terstandarisasi Guru Pembimbing
              </h3>
              <p class="text-xs text-emerald-800 leading-relaxed">
                {post.teacherNote || 'Karya telah diperiksa dan dinyatakan memenuhi standar kompetensi vokasi dan siap diaplikasikan pada standar industri nyata.'}
              </p>
              <p class="text-[11px] text-emerald-600 font-bold mt-1">
                Unit Pembelajaran Vokasi • {post.schoolName || 'SMK'}
              </p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Right Column: Author & Industrial Action Card -->
      <div class="space-y-6">
        <!-- Author Profile Card -->
        <div class="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-5">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider">Kreator Karya</h3>

          <div class="flex items-center gap-3.5">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              class="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
            />
            <div class="min-w-0">
              <h4 class="text-base font-black text-slate-900 truncate">{post.authorName}</h4>
              <p class="text-xs text-slate-500 truncate">{post.authorMajor || 'Siswa SMK'}</p>
              <p class="text-[11px] text-slate-400 truncate mt-0.5">{post.schoolName || 'SMK'}</p>
            </div>
          </div>

          <!-- Open To Work Indicator -->
          {#if post.authorIsOpenToWork}
            <div class="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Siap Kerja &amp; Magang Industri</span>
            </div>
          {/if}

          <!-- Skills Chips -->
          {#if post.authorSkills && post.authorSkills.length > 0}
            <div class="space-y-1.5">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keahlian Utama:</span>
              <div class="flex flex-wrap gap-1.5">
                {#each post.authorSkills.slice(0, 5) as skill}
                  <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {skill}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Industrial CTAs -->
          <div class="space-y-2.5 pt-2 border-t border-slate-100">
            <!-- Open CV Passport -->
            <button
              type="button"
              onclick={() => navigate(`/paspor/${post.authorUsername}`)}
              class="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <FileBadge class="w-4 h-4 text-amber-400" />
              <span>Lihat Paspor Kerja &amp; Portofolio (CV)</span>
            </button>

            <!-- Industrial Invite Button -->
            <button
              type="button"
              onclick={() => {
                if (!auth.user) {
                  toast.info('Silakan masuk sebagai Akun Industri untuk mengundang siswa');
                  navigate('/masuk');
                } else if (auth.user.userType === 'company') {
                  navigate(`/undangan?invite=${post.authorUsername}`);
                } else {
                  // Direct WhatsApp contact if buyer/public
                  if (post.authorPhone) {
                    const cleanPhone = post.authorPhone.replace(/\D/g, '').replace(/^0/, '62');
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Halo ${post.authorName}, saya melihat karya 3D / Portofolio "${post.name}" di Skill-Hub dan tertarik untuk berdiskusi.`)}`, '_blank');
                  } else {
                    toast.info('Kontak WhatsApp siswa tidak dibuka secara publik');
                  }
                }
              }}
              class="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Briefcase class="w-4 h-4" />
              <span>Undang Siswa untuk Proyek / Magang</span>
            </button>
          </div>
        </div>

        <!-- School Info Card -->
        {#if post.schoolName}
          <div class="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <School class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-black text-slate-800 truncate">{post.schoolName}</h4>
              <p class="text-[11px] text-slate-400 truncate mt-0.5">{post.schoolAddress || 'Sekolah Menengah Kejuruan'}</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Editor Modal -->
{#if showEditor && post}
  <ShowcaseEditorModal
    postId={post.id}
    initialDetails={details}
    initialMedia={media}
    isOpen={showEditor}
    onClose={() => (showEditor = false)}
    onUpdated={() => {
      fetchShowcaseDetail();
    }}
  />
{/if}

<!-- Share Promo Modal -->
{#if showShareModal && post}
  <SharePromoModal
    post={{
      id: post.id,
      name: post.name,
      price: 0,
      priceMin: null,
      priceMax: null,
      type: 'portfolio',
      image: post.coverImage,
      author: {
        name: post.authorName,
        schoolName: post.schoolName
      }
    }}
    isOpen={showShareModal}
    onClose={() => (showShareModal = false)}
  />
{/if}
