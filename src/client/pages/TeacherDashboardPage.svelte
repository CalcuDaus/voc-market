<script lang="ts">
  import {
    BadgeCheck,
    Building2,
    CheckCircle2,
    ExternalLink,
    FileBadge,
    GraduationCap,
    School,
    Settings,
    ShieldCheck,
    Users,
    Wallet
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId, formatRupiah } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';

  let loading = $state(true);
  let errorMsg = $state('');
  let schoolName = $state('');
  let schoolSlug = $state<string | null>(null);
  let isSchoolAdmin = $state(false);
  let summary = $state({
    totalStudents: 0,
    verifiedStudents: 0,
    totalWorks: 0,
    verifiedWorks: 0,
    tefaWorks: 0,
    totalCompletedOrders: 0,
    totalSchoolRevenue: 0,
    formattedSchoolRevenue: 'Rp 0'
  });
  let students = $state<any[]>([]);
  let posts = $state<any[]>([]);
  let activeTab = $state<'students' | 'posts'>('students');

  let teacherNotes = $state<Record<number, string>>({});
  let tefaFlags = $state<Record<number, boolean>>({});
  let tefaUnits = $state<Record<number, string>>({});
  let busyStudentId = $state<number | null>(null);
  let busyPostId = $state<number | null>(null);

  async function loadDashboard() {
    loading = true;
    errorMsg = '';
    const res = await apiFetch<{
      schoolName?: string;
      schoolSlug?: string | null;
      isSchoolAdmin?: boolean;
      summary?: any;
      students?: any[];
      posts?: any[];
      error?: string;
    }>('/api/teacher/dashboard');

    if (!res.ok || !res.data?.summary) {
      errorMsg = res.data?.error || 'Gagal memuat Panel Guru Pembimbing.';
      loading = false;
      return;
    }

    schoolName = res.data.schoolName || auth.user?.schoolName || 'Sekolah SMK';
    schoolSlug = res.data.schoolSlug ?? auth.schoolSlug;
    isSchoolAdmin = Boolean(res.data.isSchoolAdmin);
    summary = res.data.summary;
    students = res.data.students || [];
    posts = res.data.posts || [];

    const notesMap: Record<number, string> = {};
    const flagsMap: Record<number, boolean> = {};
    const unitsMap: Record<number, string> = {};
    for (const p of posts) {
      notesMap[p.id] =
        p.teacherNote || 'Telah diuji standar kualitas praktik Teaching Factory (TeFa) sekolah.';
      flagsMap[p.id] = Boolean(p.isTefa);
      unitsMap[p.id] = p.tefaUnit || `Unit Produksi TeFa ${schoolName}`;
    }
    teacherNotes = notesMap;
    tefaFlags = flagsMap;
    tefaUnits = unitsMap;
    loading = false;
  }

  $effect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      navigate('/masuk');
      return;
    }
    loadDashboard();
  });

  async function toggleVerifyStudent(student: any) {
    busyStudentId = student.id;
    const nextState = !student.isVerified;

    const res = await apiFetch<{ success?: boolean; isVerified?: boolean; error?: string }>(
      `/api/teacher/students/${student.id}/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ isVerified: nextState })
      }
    );

    busyStudentId = null;

    if (!res.ok || !res.data?.success) {
      toast.error(res.data?.error || 'Gagal mengubah status verifikasi siswa.');
      return;
    }

    toast.success(
      nextState
        ? `${student.name} berhasil diverifikasi sebagai siswa resmi sekolah.`
        : `Status verifikasi ${student.name} telah dicabut.`
    );
    await loadDashboard();
  }

  async function saveCuration(post: any, nextVerified: boolean) {
    busyPostId = post.id;

    const res = await apiFetch<{
      success?: boolean;
      isVerifiedByTeacher?: boolean;
      error?: string;
    }>(`/api/teacher/posts/${post.id}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        isVerified: nextVerified,
        teacherNote: teacherNotes[post.id] || '',
        isTefa: nextVerified ? Boolean(tefaFlags[post.id]) : false,
        tefaUnit: tefaUnits[post.id] || ''
      })
    });

    busyPostId = null;

    if (!res.ok || !res.data?.success) {
      toast.error(res.data?.error || 'Gagal memperbarui stempel kurasi karya.');
      return;
    }

    toast.success(
      nextVerified
        ? `Stempel Kualitas Guru (TeFa) disimpan pada "${post.name}".`
        : `Stempel kurasi pada "${post.name}" telah dicabut.`
    );
    await loadDashboard();
  }
</script>

<div class="max-w-5xl mx-auto px-2 sm:px-4 py-2">
  <!-- Header Card -->
  <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#d1d5db] mb-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-start gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 border-2 border-blue-200 text-[#4285F4] flex items-center justify-center shrink-0">
          <GraduationCap class="w-6 h-6" />
        </div>
        <div>
          <span class="text-[11px] font-black uppercase tracking-wider text-[#4285F4]">
            Panel Supervisi & Kurasi Teaching Factory (TeFa)
          </span>
          <h1 class="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{schoolName}</h1>
          <p class="text-xs sm:text-sm text-gray-600 mt-1">
            Verifikasi identitas siswa, kurasi produk resmi Unit TeFa, dan pantau kesiapan industri sekolah Anda.
          </p>
        </div>
      </div>

      {#if schoolSlug}
        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onclick={() => navigate(`/sekolah/${schoolSlug}`)}
            class="h-10 px-4 rounded-xl bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <School class="w-4 h-4 text-[#4285F4]" />
            <span>Lihat Etalase SMK</span>
          </button>

          {#if isSchoolAdmin}
            <button
              type="button"
              onclick={() => navigate(`/sekolah/${schoolSlug}/kelola`)}
              class="h-10 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Settings class="w-4 h-4" />
              <span>Kelola Etalase</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if errorMsg}
    <div class="bg-white border-2 border-red-200 rounded-2xl p-8 text-center shadow-[0_5px_0_#fecdd3]">
      <p class="text-sm font-bold text-[#EA4335]">{errorMsg}</p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-4 h-10 px-5 rounded-xl bg-[#4285F4] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] cursor-pointer"
      >
        Kembali ke Beranda
      </button>
    </div>
  {:else if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <div class="w-9 h-9 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-bold text-gray-500 mt-3">Memuat data siswa & karya sekolah...</p>
    </div>
  {:else}
    <!-- 4 Summary Metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
        <div class="flex items-center gap-1.5 text-[#4285F4] text-[11px] font-black uppercase">
          <Users class="w-4 h-4" />
          <span>Siswa Terverifikasi</span>
        </div>
        <p class="text-2xl font-black text-gray-900 mt-2">
          {summary.verifiedStudents}
          <span class="text-xs font-bold text-gray-400">/ {summary.totalStudents}</span>
        </p>
      </div>

      <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
        <div class="flex items-center gap-1.5 text-[#34A853] text-[11px] font-black uppercase">
          <ShieldCheck class="w-4 h-4" />
          <span>Karya Stempel TeFa</span>
        </div>
        <p class="text-2xl font-black text-gray-900 mt-2">
          {summary.verifiedWorks}
          <span class="text-xs font-bold text-gray-400">/ {summary.totalWorks}</span>
        </p>
      </div>

      <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
        <div class="flex items-center gap-1.5 text-indigo-600 text-[11px] font-black uppercase">
          <CheckCircle2 class="w-4 h-4" />
          <span>Pesanan Selesai</span>
        </div>
        <p class="text-2xl font-black text-gray-900 mt-2">{summary.totalCompletedOrders}</p>
      </div>

      <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db]">
        <div class="flex items-center gap-1.5 text-amber-700 text-[11px] font-black uppercase">
          <Wallet class="w-4 h-4" />
          <span>Nilai Proyek Siswa</span>
        </div>
        <p class="text-lg sm:text-xl font-black text-[#4285F4] mt-2 truncate">
          {summary.formattedSchoolRevenue}
        </p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap gap-2.5 mb-6">
      <button
        type="button"
        onclick={() => (activeTab = 'students')}
        class="h-10 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'students'
          ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db]'}"
      >
        <Users class="w-4 h-4" />
        <span>1. Verifikasi Siswa ({students.length})</span>
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'posts')}
        class="h-10 px-4 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer {activeTab ===
        'posts'
          ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db]'}"
      >
        <ShieldCheck class="w-4 h-4" />
        <span>2. Kurasi Karya & Unit TeFa ({posts.length})</span>
      </button>
    </div>

    <!-- Tab 1: Students Verification -->
    {#if activeTab === 'students'}
      {#if students.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <p class="text-sm text-gray-600">
            Belum ada siswa yang mendaftar dengan nama sekolah <span class="font-bold">{schoolName}</span>.
          </p>
        </div>
      {:else}
        <div class="space-y-3.5">
          {#each students as student (student.id)}
            <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_0_#d1d5db]">
              <div class="flex items-start gap-3.5">
                <img
                  src={student.avatarUrl}
                  alt={student.name}
                  class="w-12 h-12 rounded-2xl object-cover border-2 border-gray-300 shrink-0"
                />
                <div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onclick={() => navigate(`/profil/${student.username}`)}
                      class="text-sm sm:text-base font-extrabold text-gray-900 hover:text-[#4285F4] transition text-left cursor-pointer"
                    >
                      {student.name}
                    </button>
                    {#if student.isVerified}
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#4285F4] border border-blue-200 text-[11px] font-bold">
                        <BadgeCheck class="w-3.5 h-3.5" />
                        <span>Terverifikasi Sekolah</span>
                      </span>
                    {:else}
                      <span class="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                        Belum Diverifikasi
                      </span>
                    {/if}
                    {#if student.openToWork}
                      <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#34A853] border border-emerald-200 text-[11px] font-bold">
                        ● Siap Kerja
                      </span>
                    {/if}
                  </div>

                  <p class="text-xs text-gray-600 mt-1">
                    Jurusan: <span class="font-bold text-gray-800">{student.major || '-'}</span>
                    • NISN: <span class="font-bold text-gray-800">{student.nisn || '-'}</span>
                  </p>
                  <p class="text-[11px] text-gray-500 mt-0.5">
                    {student.completedOrdersCount} pesanan selesai • Total nilai proyek {student.formattedRevenue}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onclick={() => navigate(`/paspor-kerja/${student.username}`)}
                  class="h-9 px-3.5 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_2px_0_#d1d5db] cursor-pointer"
                >
                  <FileBadge class="w-3.5 h-3.5 text-[#4285F4]" />
                  <span>Paspor Kerja</span>
                </button>

                <button
                  type="button"
                  disabled={busyStudentId === student.id}
                  onclick={() => toggleVerifyStudent(student)}
                  class="h-9 px-4 rounded-xl font-bold text-xs transition disabled:opacity-60 cursor-pointer {student.isVerified
                    ? 'border-2 border-red-200 bg-red-50 hover:bg-red-100 text-[#EA4335]'
                    : 'bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_3px_0_#1a56b0] text-white'}"
                >
                  {busyStudentId === student.id
                    ? 'Memproses...'
                    : student.isVerified
                      ? 'Cabut Verifikasi'
                      : 'Verifikasi Siswa'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <!-- Tab 2: TeFa Works Curation -->
      {#if posts.length === 0}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
          <p class="text-sm text-gray-600">
            Belum ada karya siswa yang dipublikasikan dari <span class="font-bold">{schoolName}</span>.
          </p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each posts as post (post.id)}
            <article class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_4px_0_#d1d5db]">
              <div class="flex flex-col md:flex-row gap-4">
                <img
                  src={post.imageUrl}
                  alt={post.name}
                  class="w-full md:w-36 h-44 md:h-28 rounded-xl object-cover border-2 border-gray-200 shrink-0 bg-gray-100"
                />

                <div class="flex-1">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-bold">
                        {post.typeLabel}
                      </span>
                      {#if post.isVerifiedByTeacher}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#34A853] border border-emerald-200 text-[11px] font-bold">
                          <ShieldCheck class="w-3.5 h-3.5" />
                          <span>Stempel Guru</span>
                        </span>
                      {/if}
                      {#if post.isTefa}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#4285F4] border border-blue-200 text-[11px] font-bold">
                          <Building2 class="w-3 h-3" />
                          <span>{post.tefaUnit || 'Unit TeFa'}</span>
                        </span>
                      {/if}
                      <span class="text-[11px] text-gray-400">{formatDateId(post.createdAt)}</span>
                    </div>

                    <button
                      type="button"
                      onclick={() => navigate(`/karya/${post.id}`)}
                      class="text-xs font-bold text-[#4285F4] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Karya</span>
                      <ExternalLink class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 class="text-base font-extrabold text-gray-900 mt-1.5">{post.name}</h3>

                  <p class="text-xs text-gray-600 mt-0.5">
                    Karya: <span class="font-bold text-gray-800">{post.author.name}</span>
                    ({post.author.major || 'Siswa SMK'}) • Harga Jual:
                    <span class="font-black text-[#4285F4]">{post.formattedPrice}</span>
                    {#if post.costPrice > 0}
                      • HPP Modal: <span class="font-bold text-gray-700">{formatRupiah(post.costPrice)}</span>
                    {/if}
                  </p>

                  <!-- TeFa Unit Toggle & Teacher Note -->
                  <div class="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
                    <div class="flex flex-wrap items-center gap-3">
                      <label class="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          bind:checked={tefaFlags[post.id]}
                          class="w-4 h-4 accent-[#34A853] rounded"
                        />
                        <span>Tandai Produk Resmi Unit Produksi TeFa</span>
                      </label>

                      {#if tefaFlags[post.id]}
                        <input
                          type="text"
                          bind:value={tefaUnits[post.id]}
                          placeholder="Nama Unit TeFa (misal: TeFa RPL & IoT)"
                          class="flex-1 min-w-48 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold"
                        />
                      {/if}
                    </div>

                    <div class="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        bind:value={teacherNotes[post.id]}
                        placeholder="Catatan rekomendasi guru pembimbing untuk pembeli..."
                        class="h-10 flex-1 rounded-xl border-2 border-gray-300 bg-white px-3 text-xs text-gray-900 focus:outline-none focus:border-[#34A853]"
                      />

                      <div class="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyPostId === post.id}
                          onclick={() => saveCuration(post, true)}
                          class="h-10 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          <ShieldCheck class="w-4 h-4" />
                          <span>
                            {busyPostId === post.id
                              ? 'Menyimpan...'
                              : post.isVerifiedByTeacher
                                ? 'Perbarui Kurasi'
                                : 'Beri Stempel TeFa'}
                          </span>
                        </button>

                        {#if post.isVerifiedByTeacher}
                          <button
                            type="button"
                            disabled={busyPostId === post.id}
                            onclick={() => saveCuration(post, false)}
                            class="h-10 px-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-[#EA4335] font-bold text-xs cursor-pointer"
                          >
                            Cabut
                          </button>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    {/if}
  {/if}
</div>
