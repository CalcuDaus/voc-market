<script lang="ts">
  import {
    AlertTriangle,
    Archive,
    Award,
    BadgeCheck,
    Ban,
    Briefcase,
    Check,
    CheckCircle2,
    Eye,
    Flag,
    KeyRound,
    Layers,
    RotateCcw,
    School,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import { formatDateId, formatRelativeTime, formatRupiah } from '../lib/format';

  type TabType = 'posts' | 'users' | 'reports' | 'challenges' | 'companies' | 'schools';

  let activeTab = $state<TabType>('posts');
  let loading = $state(true);

  // Overview data states
  let summary = $state({
    totalPostsCount: 0,
    archivedPostsCount: 0,
    totalUsersCount: 0,
    totalRequestsCount: 0,
    pendingCompaniesCount: 0,
    unverifiedSchoolsCount: 0,
    pendingChallengesCount: 0,
    openReportsCount: 0
  });

  let posts = $state<any[]>([]);
  let allUsers = $state<any[]>([]);
  let requests = $state<any[]>([]);
  let companies = $state<any[]>([]);
  let schools = $state<any[]>([]);
  let challenges = $state<any[]>([]);
  let reports = $state<any[]>([]);

  // Search & filter states
  let postSearch = $state('');
  let postStatusFilter = $state<'all' | 'published' | 'archived'>('all');
  let postTypeFilter = $state<'all' | 'portfolio' | 'service' | 'product'>('all');

  let userSearch = $state('');
  let userRoleFilter = $state<'all' | 'smk' | 'teacher' | 'company' | 'public' | 'admin'>('all');

  let companyFilter = $state<'pending' | 'all'>('pending');
  let schoolFilter = $state<'unverified' | 'all'>('all');
  let challengeFilter = $state<'pending' | 'all'>('pending');
  let reportFilter = $state<'open' | 'all'>('open');

  // Certificate revocation tool state
  let certCodeInput = $state('');
  let certRevoking = $state(false);

  // Modals state
  let rejectingChallenge = $state<any | null>(null);
  let rejectionReason = $state('Mohon lengkapi kriteria deliverables dan transparansi hadiah bagi siswa.');
  let processingAction = $state(false);

  let takedownModalPost = $state<any | null>(null);
  let takedownReason = $state(
    'Postingan melanggar Ketentuan & Kebijakan Konten Skill-Hub (mengandung unsur SARA / pornografi / rasisme / di luar seputar karya vokasi).'
  );

  let resetPasswordUser = $state<any | null>(null);
  let newPasswordValue = $state('');

  async function loadOverview() {
    loading = true;
    try {
      const res = await apiFetch<{
        summary?: typeof summary;
        posts?: any[];
        users?: any[];
        requests?: any[];
        companies?: any[];
        schools?: any[];
        challenges?: any[];
        reports?: any[];
        error?: string;
      }>('/api/admin/overview');

      if (res.ok && res.data) {
        summary = { ...summary, ...(res.data.summary || {}) };
        posts = res.data.posts || [];
        allUsers = res.data.users || [];
        requests = res.data.requests || [];
        companies = res.data.companies || [];
        schools = res.data.schools || [];
        challenges = res.data.challenges || [];
        reports = res.data.reports || [];
      } else {
        toast.error(res.data?.error || 'Gagal memuat data administrasi platform.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghubungkan ke server.');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (auth.user?.isAdmin || auth.user?.userType === 'admin') {
      loadOverview();
    } else if (auth.ready) {
      loading = false;
    }
  });

  // --- POST MANAGEMENT ACTIONS ---
  async function executeTakedownPost(post: any, targetStatus: 'archived' | 'published', reason?: string) {
    processingAction = true;
    try {
      const res = await apiFetch<{ success?: boolean; status?: string; error?: string }>(
        `/api/admin/posts/${post.id}/takedown`,
        {
          method: 'POST',
          body: { status: targetStatus, reason }
        }
      );
      if (res.ok) {
        post.status = targetStatus;
        summary.archivedPostsCount = posts.filter((p) => p.status === 'archived').length;
        toast.success(
          targetStatus === 'archived'
            ? `Postingan "${post.name}" berhasil di-takedown!`
            : `Postingan "${post.name}" berhasil dipulihkan ke katalog!`
        );
        takedownModalPost = null;
      } else {
        toast.error(res.data?.error || 'Gagal memperbarui status postingan.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      processingAction = false;
    }
  }

  async function deletePostPermanently(post: any) {
    if (!confirm(`Hapus permanen karya "${post.name}" oleh ${post.author?.name}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      const res = await apiFetch<{ success?: boolean; error?: string }>(
        `/api/admin/posts/${post.id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        posts = posts.filter((p) => p.id !== post.id);
        summary.totalPostsCount = posts.length;
        summary.archivedPostsCount = posts.filter((p) => p.status === 'archived').length;
        toast.success(`Karya "${post.name}" telah dihapus secara permanen.`);
      } else {
        toast.error(res.data?.error || 'Gagal menghapus postingan.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    }
  }

  // --- USER ACCOUNT MANAGEMENT ACTIONS ---
  async function updateUserAccount(
    u: any,
    payload: {
      userType?: string;
      isVerified?: boolean;
      isAdmin?: boolean;
      takedownAllPosts?: boolean;
      revokeSessions?: boolean;
      newPassword?: string;
    },
    successMsg: string
  ) {
    try {
      const res = await apiFetch<{ success?: boolean; error?: string }>(
        `/api/admin/users/${u.id}`,
        {
          method: 'PATCH',
          body: payload
        }
      );
      if (res.ok) {
        if (payload.userType) u.userType = payload.userType;
        if (payload.isVerified !== undefined) u.isVerified = payload.isVerified;
        if (payload.isAdmin !== undefined) u.isAdmin = payload.isAdmin;
        if (payload.takedownAllPosts) {
          posts = posts.map((p) => (p.author?.id === u.id ? { ...p, status: 'archived' } : p));
          summary.archivedPostsCount = posts.filter((p) => p.status === 'archived').length;
        }
        toast.success(successMsg);
        resetPasswordUser = null;
        newPasswordValue = '';
      } else {
        toast.error(res.data?.error || 'Gagal memperbarui akun pengguna.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    }
  }

  async function deleteUserPermanently(u: any) {
    if (
      !confirm(
        `Hapus permanen akun "${u.name}" (@${u.username}) beserta seluruh karya dan datanya? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }
    try {
      const res = await apiFetch<{ success?: boolean; error?: string }>(
        `/api/admin/users/${u.id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        allUsers = allUsers.filter((item) => item.id !== u.id);
        posts = posts.filter((p) => p.author?.id !== u.id);
        summary.totalUsersCount = allUsers.length;
        summary.totalPostsCount = posts.length;
        toast.success(`Akun @${u.username} berhasil dihapus secara permanen.`);
      } else {
        toast.error(res.data?.error || 'Gagal menghapus akun pengguna.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    }
  }

  // --- REQUESTS MODERATION ---
  async function moderateJobRequest(reqItem: any, action: 'toggle' | 'delete') {
    if (action === 'delete' && !confirm(`Hapus permanen permintaan "${reqItem.title}"?`)) {
      return;
    }
    try {
      const nextStatus = reqItem.status === 'hidden' ? 'open' : 'hidden';
      const res = await apiFetch<{ success?: boolean; status?: string; error?: string }>(
        `/api/admin/requests/${reqItem.id}/moderate`,
        {
          method: 'POST',
          body: action === 'delete' ? { action: 'delete' } : { status: nextStatus }
        }
      );
      if (res.ok) {
        if (action === 'delete') {
          requests = requests.filter((r) => r.id !== reqItem.id);
          toast.success('Permintaan berhasil dihapus.');
        } else {
          reqItem.status = nextStatus;
          toast.success(
            nextStatus === 'hidden'
              ? 'Permintaan berhasil di-takedown (disembunyikan).'
              : 'Permintaan dipulihkan.'
          );
        }
      } else {
        toast.error(res.data?.error || 'Gagal memproses permintaan.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    }
  }

  // Verify Company Action
  async function toggleCompanyVerification(company: any) {
    const nextState = !company.companyVerifiedAt;
    try {
      const res = await apiFetch<{ success?: boolean; isCompanyVerified?: boolean; error?: string }>(
        `/api/admin/companies/${company.id}/verify`,
        {
          method: 'POST',
          body: { verified: nextState }
        }
      );
      if (res.ok) {
        company.companyVerifiedAt = nextState ? new Date().toISOString() : null;
        company.isVerified = nextState;
        summary.pendingCompaniesCount = companies.filter((c) => !c.companyVerifiedAt).length;
        toast.success(
          nextState
            ? `Perusahaan ${company.companyName || company.name} berhasil diverifikasi!`
            : `Verifikasi perusahaan ${company.companyName || company.name} dicabut.`
        );
      } else {
        toast.error(res.data?.error || 'Gagal mengubah status verifikasi.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    }
  }

  // Verify School Action
  async function toggleSchoolVerification(school: any) {
    const nextState = !school.isVerified;
    try {
      const res = await apiFetch<{ success?: boolean; isVerified?: boolean; error?: string }>(
        `/api/admin/schools/${school.id}/verify`,
        {
          method: 'POST',
          body: { isVerified: nextState }
        }
      );
      if (res.ok) {
        school.isVerified = nextState;
        summary.unverifiedSchoolsCount = schools.filter((s) => !s.isVerified).length;
        toast.success(
          nextState
            ? `Sekolah ${school.name} berhasil diverifikasi!`
            : `Verifikasi sekolah ${school.name} dicabut.`
        );
      } else {
        toast.error(res.data?.error || 'Gagal mengubah status sekolah.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    }
  }

  // Moderate Challenge: Approve
  async function approveChallenge(challenge: any) {
    processingAction = true;
    try {
      const res = await apiFetch<{ success?: boolean; error?: string }>(
        `/api/admin/challenges/${challenge.id}/moderate`,
        {
          method: 'POST',
          body: { action: 'approve' }
        }
      );
      if (res.ok) {
        challenge.status = 'open';
        challenge.rejectionReason = null;
        summary.pendingChallengesCount = challenges.filter(
          (c) => c.status === 'pending_review'
        ).length;
        toast.success(`Tantangan "${challenge.title}" berhasil disetujui dan kini tayang!`);
      } else {
        toast.error(res.data?.error || 'Gagal menyetujui tantangan.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      processingAction = false;
    }
  }

  // Moderate Challenge: Reject
  async function submitRejectChallenge() {
    if (!rejectingChallenge) return;
    processingAction = true;
    try {
      const res = await apiFetch<{ success?: boolean; error?: string }>(
        `/api/admin/challenges/${rejectingChallenge.id}/moderate`,
        {
          method: 'POST',
          body: {
            action: 'reject',
            rejectionReason: rejectionReason.trim()
          }
        }
      );
      if (res.ok) {
        rejectingChallenge.status = 'rejected';
        rejectingChallenge.rejectionReason = rejectionReason.trim();
        summary.pendingChallengesCount = challenges.filter(
          (c) => c.status === 'pending_review'
        ).length;
        toast.success('Tantangan ditolak dan alasan telah diteruskan ke Mitra Industri.');
        rejectingChallenge = null;
      } else {
        toast.error(res.data?.error || 'Gagal menolak tantangan.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      processingAction = false;
    }
  }

  // Handle Report
  async function handleReportAction(
    report: any,
    status: 'reviewed' | 'actioned' | 'dismissed',
    hideTarget = false,
    deleteTarget = false
  ) {
    try {
      const res = await apiFetch<{ success?: boolean; error?: string }>(
        `/api/admin/reports/${report.id}`,
        {
          method: 'PATCH',
          body: { status, hideTarget, deleteTarget }
        }
      );
      if (res.ok) {
        report.status = status;
        summary.openReportsCount = reports.filter((r) => r.status === 'open').length;
        if (report.targetType === 'post') {
          if (deleteTarget) {
            posts = posts.filter((p) => p.id !== report.targetId);
          } else if (hideTarget) {
            posts = posts.map((p) => (p.id === report.targetId ? { ...p, status: 'archived' } : p));
          }
        }
        toast.success(
          deleteTarget
            ? 'Laporan ditindaklanjuti & konten target telah DIHAPUS PERMANEN.'
            : status === 'actioned'
              ? 'Laporan ditindaklanjuti & konten target telah di-takedown.'
              : status === 'dismissed'
                ? 'Laporan diabaikan / ditolak.'
                : 'Laporan ditandai telah ditinjau.'
        );
      } else {
        toast.error(res.data?.error || 'Gagal memproses laporan.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    }
  }

  // Revoke / Restore Certificate
  async function handleCertificateRevoke(revoke: boolean) {
    const code = certCodeInput.trim().toUpperCase();
    if (!code) {
      toast.error('Masukkan nomor registrasi sertifikat (misal: VOC-CERT-XXXXXXXX).');
      return;
    }

    certRevoking = true;
    try {
      const res = await apiFetch<{ success?: boolean; isRevoked?: boolean; error?: string }>(
        `/api/admin/certificates/${code}/revoke`,
        {
          method: 'POST',
          body: { revoke }
        }
      );
      if (res.ok) {
        toast.success(
          revoke
            ? `Sertifikat ${code} telah resmi DICABUT dari pangkalan data.`
            : `Sertifikat ${code} telah dipulihkan (STATUS VALID).`
        );
        certCodeInput = '';
      } else {
        toast.error(res.data?.error || 'Gagal memperbarui status sertifikat.');
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      certRevoking = false;
    }
  }

  // Filtered views
  let displayedPosts = $derived.by(() => {
    const q = postSearch.trim().toLowerCase();
    return posts.filter((p) => {
      if (postStatusFilter !== 'all' && p.status !== postStatusFilter) return false;
      if (postTypeFilter !== 'all' && p.type !== postTypeFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.code} ${p.author?.name || ''} ${p.author?.username || ''} ${p.author?.schoolName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  let displayedUsers = $derived.by(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (userRoleFilter !== 'all' && u.userType !== userRoleFilter) return false;
      if (q) {
        const hay = `${u.name} ${u.username} ${u.email} ${u.schoolName || ''} ${u.companyName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  let displayedCompanies = $derived.by(() => {
    if (companyFilter === 'pending') {
      return companies.filter((c) => !c.companyVerifiedAt);
    }
    return companies;
  });

  let displayedSchools = $derived.by(() => {
    if (schoolFilter === 'unverified') {
      return schools.filter((s) => !s.isVerified);
    }
    return schools;
  });

  let displayedChallenges = $derived.by(() => {
    if (challengeFilter === 'pending') {
      return challenges.filter((c) => c.status === 'pending_review');
    }
    return challenges;
  });

  let displayedReports = $derived.by(() => {
    if (reportFilter === 'open') {
      return reports.filter((r) => r.status === 'open');
    }
    return reports;
  });
</script>

<div class="space-y-6 pb-12">
  <!-- Admin Guard Check -->
  {#if auth.ready && (!auth.user || (!auth.user.isAdmin && auth.user.userType !== 'admin'))}
    <div class="bg-white border-2 border-red-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#fca5a5]">
      <ShieldAlert class="w-12 h-12 text-[#EA4335] mx-auto mb-3" />
      <h1 class="text-xl font-black text-gray-900">Akses Khusus Superadmin Skill-Hub</h1>
      <p class="text-xs text-gray-600 mt-2 max-w-sm mx-auto">
        Halaman pusat kontrol ini hanya dapat diakses oleh Superadmin & Administrator resmi Skill-Hub.
      </p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-4 px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 cursor-pointer"
      >
        Kembali ke Beranda
      </button>
    </div>
  {:else}
    <!-- Header -->
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-2 border-slate-800 rounded-2xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shrink-0">
          <ShieldCheck class="w-7 h-7" />
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl font-black text-white">Pusat Kontrol Superadmin Skill-Hub</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
              Full Control
            </span>
          </div>
          <p class="text-xs text-slate-300 mt-0.5">
            Takedown postingan yang melanggar aturan/UU, kelola seluruh akun pengguna, tinjau laporan, serta verifikasi sekolah & mitra industri.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onclick={loadOverview}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5 {loading ? 'animate-spin' : ''}" />
        <span>Segarkan Data</span>
      </button>
    </div>

    <!-- Summary Metrics (6 Cards) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      <!-- 1. Posts -->
      <button
        type="button"
        onclick={() => (activeTab = 'posts')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#4285F4] transition cursor-pointer {activeTab === 'posts' ? 'ring-2 ring-[#4285F4]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase">Semua Karya</span>
          <Layers class="w-4 h-4 text-[#4285F4]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-1.5">{summary.totalPostsCount}</p>
        <p class="text-[11px] font-semibold text-rose-600 mt-0.5">
          {summary.archivedPostsCount} Di-takedown
        </p>
      </button>

      <!-- 2. Users -->
      <button
        type="button"
        onclick={() => (activeTab = 'users')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-indigo-500 transition cursor-pointer {activeTab === 'users' ? 'ring-2 ring-indigo-500' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase">Akun Pengguna</span>
          <Users class="w-4 h-4 text-indigo-600" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-1.5">{summary.totalUsersCount}</p>
        <p class="text-[11px] font-semibold text-indigo-600 mt-0.5">Semua Peran</p>
      </button>

      <!-- 3. Reports -->
      <button
        type="button"
        onclick={() => (activeTab = 'reports')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#EA4335] transition cursor-pointer {activeTab === 'reports' ? 'ring-2 ring-[#EA4335]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase">Laporan Warga</span>
          <Flag class="w-4 h-4 text-[#EA4335]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-1.5">{summary.openReportsCount}</p>
        <p class="text-[11px] font-semibold text-[#EA4335] mt-0.5">Perlu Tindakan</p>
      </button>

      <!-- 4. Challenges -->
      <button
        type="button"
        onclick={() => (activeTab = 'challenges')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#FBBC05] transition cursor-pointer {activeTab === 'challenges' ? 'ring-2 ring-[#FBBC05]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase">Tantangan</span>
          <Award class="w-4 h-4 text-[#FBBC05]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-1.5">{summary.pendingChallengesCount}</p>
        <p class="text-[11px] font-semibold text-amber-600 mt-0.5">Antrean Review</p>
      </button>

      <!-- 5. Companies -->
      <button
        type="button"
        onclick={() => (activeTab = 'companies')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#4285F4] transition cursor-pointer {activeTab === 'companies' ? 'ring-2 ring-[#4285F4]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase">Mitra Industri</span>
          <Briefcase class="w-4 h-4 text-[#4285F4]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-1.5">{summary.pendingCompaniesCount}</p>
        <p class="text-[11px] font-semibold text-[#4285F4] mt-0.5">Menunggu Verifikasi</p>
      </button>

      <!-- 6. Schools -->
      <button
        type="button"
        onclick={() => (activeTab = 'schools')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#34A853] transition cursor-pointer {activeTab === 'schools' ? 'ring-2 ring-[#34A853]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-gray-500 uppercase">Sekolah SMK</span>
          <School class="w-4 h-4 text-[#34A853]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-1.5">{summary.unverifiedSchoolsCount}</p>
        <p class="text-[11px] font-semibold text-[#34A853] mt-0.5">Belum Diverifikasi</p>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
      <button
        type="button"
        onclick={() => (activeTab = 'posts')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'posts'
          ? 'bg-slate-900 text-white shadow-[0_3px_0_#0f172a]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Kelola Postingan & Karya ({posts.length})
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'users')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'users'
          ? 'bg-indigo-600 text-white shadow-[0_3px_0_#3730a3]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Kelola Akun Pengguna ({allUsers.length})
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'reports')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'reports'
          ? 'bg-[#EA4335] text-white shadow-[0_3px_0_#a8271e]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Laporan & Penertiban ({reports.length})
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'challenges')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'challenges'
          ? 'bg-[#FBBC05] text-gray-900 shadow-[0_3px_0_#d99b00]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Moderasi Tantangan ({challenges.length})
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'companies')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'companies'
          ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Mitra Industri ({companies.length})
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'schools')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'schools'
          ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e6b33]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Sekolah SMK ({schools.length})
      </button>
    </div>

    <!-- TAB 1: KELOLA SEMUA POSTINGAN & KARYA -->
    {#if activeTab === 'posts'}
      <div class="space-y-4">
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              bind:value={postSearch}
              placeholder="Cari judul karya, kode, nama kreator, atau sekolah..."
              class="w-full h-10 pl-9 pr-4 rounded-xl border-2 border-gray-300 focus:border-[#4285F4] focus:outline-none text-xs font-semibold"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              bind:value={postStatusFilter}
              aria-label="Filter Status Karya"
              class="h-10 px-3 rounded-xl border-2 border-gray-300 text-xs font-bold bg-white cursor-pointer"
            >
              <option value="all">Semua Status ({posts.length})</option>
              <option value="published">Tayang Publik ({posts.filter((p) => p.status === 'published').length})</option>
              <option value="archived">Di-takedown / Arsip ({posts.filter((p) => p.status === 'archived').length})</option>
            </select>

            <select
              bind:value={postTypeFilter}
              aria-label="Filter Tipe Karya"
              class="h-10 px-3 rounded-xl border-2 border-gray-300 text-xs font-bold bg-white cursor-pointer"
            >
              <option value="all">Semua Tipe</option>
              <option value="portfolio">Portofolio Showcase</option>
              <option value="service">Jasa & Layanan</option>
              <option value="product">Produk Fisik</option>
            </select>
          </div>
        </div>

        <div class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db]">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th class="p-3.5 font-bold">Karya / Postingan</th>
                  <th class="p-3.5 font-bold">Kreator & Sekolah</th>
                  <th class="p-3.5 font-bold">Tipe & Harga</th>
                  <th class="p-3.5 font-bold">Status Tayang</th>
                  <th class="p-3.5 font-bold text-right">Kontrol Superadmin</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each displayedPosts as p (p.id)}
                  <tr class="hover:bg-gray-50/60 {p.status === 'archived' ? 'bg-red-50/30' : ''}">
                    <td class="p-3.5">
                      <div class="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          class="w-12 h-12 rounded-xl object-cover border border-gray-300 shrink-0 bg-gray-100"
                        />
                        <div class="min-w-0 max-w-xs">
                          <button
                            type="button"
                            onclick={() => navigate(`/karya/${p.id}`)}
                            class="font-black text-gray-900 hover:text-[#4285F4] text-left line-clamp-1 cursor-pointer"
                          >
                            {p.name}
                          </button>
                          <p class="text-[10px] text-gray-400 font-mono mt-0.5">
                            {p.code} • {formatRelativeTime(p.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td class="p-3.5">
                      <button
                        type="button"
                        onclick={() => navigate(`/profil/${p.author?.username}`)}
                        class="font-bold text-gray-800 hover:text-[#4285F4] cursor-pointer"
                      >
                        {p.author?.name}
                      </button>
                      <p class="text-[11px] text-gray-500">
                        @{p.author?.username} • {p.author?.schoolName || 'Umum'}
                      </p>
                    </td>

                    <td class="p-3.5">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {p.typeLabel}
                      </span>
                      <p class="text-xs font-bold text-[#4285F4] mt-1">
                        {p.type === 'portfolio' ? 'Portofolio' : formatRupiah(p.price || 0)}
                      </p>
                    </td>

                    <td class="p-3.5">
                      {#if p.status === 'published'}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 class="w-3 h-3" />
                          Tayang Publik
                        </span>
                      {:else}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                          <Ban class="w-3 h-3" />
                          Di-takedown
                        </span>
                      {/if}
                    </td>

                    <td class="p-3.5 text-right">
                      <div class="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onclick={() => navigate(`/karya/${p.id}`)}
                          title="Lihat Postingan"
                          class="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
                        >
                          <Eye class="w-3.5 h-3.5" />
                        </button>

                        {#if p.status === 'published'}
                          <button
                            type="button"
                            onclick={() => (takedownModalPost = p)}
                            class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-[0_2px_0_#b45309] active:translate-y-0.5 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Ban class="w-3.5 h-3.5" />
                            <span>Takedown</span>
                          </button>
                        {:else}
                          <button
                            type="button"
                            onclick={() => executeTakedownPost(p, 'published')}
                            class="px-3 py-1.5 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white text-xs font-black shadow-[0_2px_0_#1e7e34] active:translate-y-0.5 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check class="w-3.5 h-3.5" />
                            <span>Pulihkan</span>
                          </button>
                        {/if}

                        <button
                          type="button"
                          onclick={() => deletePostPermanently(p)}
                          title="Hapus Permanen"
                          class="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#EA4335] border border-red-200 cursor-pointer"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 2: KELOLA SEMUA AKUN PENGGUNA -->
    {#if activeTab === 'users'}
      <div class="space-y-4">
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              bind:value={userSearch}
              placeholder="Cari nama pengguna, @username, email, atau sekolah..."
              class="w-full h-10 pl-9 pr-4 rounded-xl border-2 border-gray-300 focus:border-[#4285F4] focus:outline-none text-xs font-semibold"
            />
          </div>

          <div class="flex items-center gap-2">
            <select
              bind:value={userRoleFilter}
              aria-label="Filter Peran Pengguna"
              class="h-10 px-3 rounded-xl border-2 border-gray-300 text-xs font-bold bg-white cursor-pointer"
            >
              <option value="all">Semua Peran ({allUsers.length})</option>
              <option value="smk">Siswa SMK ({allUsers.filter((u) => u.userType === 'smk').length})</option>
              <option value="teacher">Guru Pembimbing ({allUsers.filter((u) => u.userType === 'teacher').length})</option>
              <option value="company">Mitra Industri ({allUsers.filter((u) => u.userType === 'company').length})</option>
              <option value="public">Pembeli Umum ({allUsers.filter((u) => u.userType === 'public').length})</option>
              <option value="admin">Superadmin / Admin ({allUsers.filter((u) => u.userType === 'admin' || u.isAdmin).length})</option>
            </select>
          </div>
        </div>

        <div class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db]">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th class="p-3.5 font-bold">Pengguna</th>
                  <th class="p-3.5 font-bold">Kontak & Instansi</th>
                  <th class="p-3.5 font-bold">Peran (Role)</th>
                  <th class="p-3.5 font-bold">Status Verifikasi</th>
                  <th class="p-3.5 font-bold text-right">Kontrol Akun</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each displayedUsers as u (u.id)}
                  <tr class="hover:bg-gray-50/60">
                    <td class="p-3.5">
                      <div class="flex items-center gap-3">
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          class="w-10 h-10 rounded-full object-cover border border-gray-300 shrink-0"
                        />
                        <div>
                          <div class="flex items-center gap-1.5">
                            <button
                              type="button"
                              onclick={() => navigate(`/profil/${u.username}`)}
                              class="font-black text-gray-900 hover:text-[#4285F4] cursor-pointer"
                            >
                              {u.name}
                            </button>
                            {#if u.isAdmin}
                              <span class="px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 text-[9px] font-black uppercase">
                                Admin
                              </span>
                            {/if}
                          </div>
                          <p class="text-[11px] text-gray-500 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    <td class="p-3.5">
                      <p class="font-mono text-gray-800">{u.email}</p>
                      <p class="text-[11px] text-gray-500">
                        {u.schoolName || u.companyName || u.phoneNumber || '-'}
                      </p>
                    </td>

                    <td class="p-3.5">
                      <select
                        value={u.userType}
                        disabled={u.id === auth.user?.id}
                        onchange={(e) =>
                          updateUserAccount(
                            u,
                            { userType: (e.currentTarget as HTMLSelectElement).value },
                            `Peran @${u.username} diubah menjadi ${(e.currentTarget as HTMLSelectElement).value}.`
                          )}
                        aria-label="Ubah Peran Pengguna"
                        class="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white cursor-pointer disabled:opacity-60"
                      >
                        <option value="smk">Siswa SMK</option>
                        <option value="teacher">Guru SMK</option>
                        <option value="company">Mitra Industri</option>
                        <option value="public">Pembeli / Umum</option>
                        <option value="admin">Superadmin / Admin</option>
                      </select>
                    </td>

                    <td class="p-3.5">
                      <button
                        type="button"
                        onclick={() =>
                          updateUserAccount(
                            u,
                            { isVerified: !u.isVerified },
                            u.isVerified
                              ? `Verifikasi @${u.username} dicabut.`
                              : `Akun @${u.username} berhasil diverifikasi.`
                          )}
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer transition {u.isVerified
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'}"
                      >
                        <BadgeCheck class="w-3.5 h-3.5" />
                        <span>{u.isVerified ? 'Terverifikasi' : 'Belum Verifikasi'}</span>
                      </button>
                    </td>

                    <td class="p-3.5 text-right">
                      <div class="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onclick={() => {
                            resetPasswordUser = u;
                            newPasswordValue = '';
                          }}
                          title="Reset Password Pengguna"
                          class="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
                        >
                          <KeyRound class="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onclick={() =>
                            updateUserAccount(
                              u,
                              { takedownAllPosts: true, revokeSessions: true },
                              `Seluruh karya @${u.username} telah di-takedown & sesi login dicabut.`
                            )}
                          title="Takedown Semua Karya & Putus Sesi Login"
                          class="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Archive class="w-3.5 h-3.5" />
                          <span>Bekukan Karya</span>
                        </button>

                        {#if u.id !== auth.user?.id}
                          <button
                            type="button"
                            onclick={() => deleteUserPermanently(u)}
                            title="Hapus Akun Permanen"
                            class="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#EA4335] border border-red-200 cursor-pointer"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 3: LAPORAN & PENERTIBAN -->
    {#if activeTab === 'reports'}
      <div class="space-y-6">
        <!-- Daftar Laporan Konten -->
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-sm font-black text-gray-900">Daftar Pengaduan & Laporan Pelanggaran Masuk</h3>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => (reportFilter = 'open')}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {reportFilter === 'open'
                  ? 'bg-red-100 text-red-900 border-2 border-red-300'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
              >
                Perlu Tindakan ({summary.openReportsCount})
              </button>
              <button
                type="button"
                onclick={() => (reportFilter = 'all')}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {reportFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
              >
                Semua Riwayat ({reports.length})
              </button>
            </div>
          </div>

          {#if displayedReports.length === 0}
            <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
              <CheckCircle2 class="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p class="text-xs font-bold text-gray-700">Tidak ada pengaduan aktif yang membutuhkan penanganan.</p>
            </div>
          {:else}
            <div class="space-y-3">
              {#each displayedReports as rep (rep.id)}
                <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_4px_0_#d1d5db] space-y-3">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#EA4335] border border-red-200">
                          {rep.reasonLabel}
                        </span>
                        <span class="text-xs font-bold text-gray-800">
                          Target ({rep.targetType}): {rep.targetTitle || `#${rep.targetId}`}
                        </span>
                        {#if rep.targetType === 'post'}
                          <button
                            type="button"
                            onclick={() => navigate(`/karya/${rep.targetId}`)}
                            class="text-xs font-bold text-[#4285F4] hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye class="w-3.5 h-3.5" />
                            <span>Buka Karya</span>
                          </button>
                        {/if}
                      </div>
                      {#if rep.details}
                        <p class="text-xs text-gray-700 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                          "{rep.details}"
                        </p>
                      {/if}
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-wrap items-center gap-2">
                      {#if rep.status === 'open'}
                        <button
                          type="button"
                          onclick={() => handleReportAction(rep, 'actioned', true, false)}
                          class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-[0_2px_0_#b45309] active:translate-y-0.5 cursor-pointer"
                        >
                          Takedown Konten
                        </button>
                        <button
                          type="button"
                          onclick={() => handleReportAction(rep, 'actioned', true, true)}
                          class="px-3 py-1.5 rounded-xl bg-[#EA4335] hover:bg-[#d63b2f] text-white text-xs font-black shadow-[0_2px_0_#a8271e] active:translate-y-0.5 cursor-pointer"
                        >
                          Hapus Permanen
                        </button>
                        <button
                          type="button"
                          onclick={() => handleReportAction(rep, 'dismissed')}
                          class="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          Tolak Laporan
                        </button>
                      {:else}
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                          Status: {rep.status}
                        </span>
                      {/if}
                    </div>
                  </div>

                  <div class="text-[11px] text-gray-400 flex items-center justify-between">
                    <span>Pelapor: {rep.reporter ? `${rep.reporter.name} (@${rep.reporter.username})` : 'Anonim / Publik'}</span>
                    <span>{formatRelativeTime(rep.createdAt)}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Moderasi Papan Butuh Bantuan -->
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_4px_0_#d1d5db] space-y-3">
          <h3 class="text-sm font-black text-gray-900">Moderasi Papan Butuh Bantuan ({requests.length})</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th class="p-3 font-bold">Judul Permintaan</th>
                  <th class="p-3 font-bold">Pemohon</th>
                  <th class="p-3 font-bold">Status</th>
                  <th class="p-3 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each requests as reqItem (reqItem.id)}
                  <tr>
                    <td class="p-3 font-bold text-gray-900">{reqItem.title}</td>
                    <td class="p-3 text-gray-600">{reqItem.requester?.name} (@{reqItem.requester?.username})</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase {reqItem.status === 'hidden' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}">
                        {reqItem.status}
                      </span>
                    </td>
                    <td class="p-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onclick={() => moderateJobRequest(reqItem, 'toggle')}
                        class="px-2.5 py-1 rounded-lg border border-gray-300 text-xs font-bold hover:bg-gray-100 cursor-pointer"
                      >
                        {reqItem.status === 'hidden' ? 'Pulihkan' : 'Takedown'}
                      </button>
                      <button
                        type="button"
                        onclick={() => moderateJobRequest(reqItem, 'delete')}
                        class="px-2.5 py-1 rounded-lg bg-red-50 text-[#EA4335] border border-red-200 text-xs font-bold hover:bg-red-100 cursor-pointer"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section: Tool Pencabutan Sertifikat Cepat -->
        <div class="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-[0_4px_0_#fcd34d] space-y-3">
          <div class="flex items-center gap-2">
            <ShieldAlert class="w-5 h-5 text-amber-700" />
            <h2 class="text-sm font-black text-amber-950">Alat Penertiban & Pencabutan Sertifikat Digital</h2>
          </div>
          <p class="text-xs text-amber-800">
            Jika ditemukan kecurangan atau plagiarisme karya setelah sertifikat terbit, Superadmin dapat mencabut keabsahan sertifikat secara permanen.
          </p>

          <div class="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <input
              type="text"
              bind:value={certCodeInput}
              placeholder="Masukkan Kode Sertifikat (contoh: VOC-CERT-ABC12345)"
              class="w-full sm:flex-1 px-4 py-2 rounded-xl border-2 border-amber-300 focus:border-[#4285F4] focus:outline-none text-xs font-mono font-bold bg-white"
            />
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={certRevoking}
                onclick={() => handleCertificateRevoke(true)}
                class="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#EA4335] hover:bg-[#d63b2f] text-white font-black text-xs shadow-[0_2px_0_#a8271e] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                Cabut Sertifikat
              </button>
              <button
                type="button"
                disabled={certRevoking}
                onclick={() => handleCertificateRevoke(false)}
                class="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white border-2 border-emerald-400 text-emerald-800 font-black text-xs hover:bg-emerald-50 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                Pulihkan
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 4: MODERASI TANTANGAN -->
    {#if activeTab === 'challenges'}
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => (challengeFilter = 'pending')}
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {challengeFilter === 'pending'
                ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
            >
              Antrean Review ({summary.pendingChallengesCount})
            </button>
            <button
              type="button"
              onclick={() => (challengeFilter = 'all')}
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {challengeFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
            >
              Semua Tantangan ({challenges.length})
            </button>
          </div>
        </div>

        {#if displayedChallenges.length === 0}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
            <CheckCircle2 class="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p class="text-xs font-bold text-gray-700">Tidak ada tantangan dalam antrean review saat ini.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each displayedChallenges as item (item.id)}
              <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_4px_0_#d1d5db] space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider {item.status === 'pending_review'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : item.status === 'open'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'}">
                        {item.status}
                      </span>
                      <span class="text-xs font-bold text-gray-500">
                        Oleh: {item.company?.companyName || item.company?.name}
                      </span>
                    </div>
                    <h3 class="text-base font-black text-gray-900 mt-1">{item.title}</h3>
                    <p class="text-xs text-gray-600 mt-0.5">{item.summary}</p>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onclick={() => navigate(`/tantangan/${item.slug}`)}
                      class="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye class="w-3.5 h-3.5" />
                      Pratinjau
                    </button>

                    {#if item.status === 'pending_review'}
                      <button
                        type="button"
                        disabled={processingAction}
                        onclick={() => approveChallenge(item)}
                        class="px-4 py-1.5 rounded-xl bg-[#34A853] hover:bg-[#2d9246] text-white text-xs font-black shadow-[0_2px_0_#1e6b33] active:translate-y-0.5 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <Check class="w-3.5 h-3.5" />
                        Setujui & Buka
                      </button>

                      <button
                        type="button"
                        disabled={processingAction}
                        onclick={() => (rejectingChallenge = item)}
                        class="px-4 py-1.5 rounded-xl bg-[#EA4335] hover:bg-[#d63b2f] text-white text-xs font-black shadow-[0_2px_0_#a8271e] active:translate-y-0.5 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <X class="w-3.5 h-3.5" />
                        Tolak
                      </button>
                    {/if}
                  </div>
                </div>

                <div class="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <span>Hadiah: <strong class="text-gray-800">{item.prizeDescription}</strong></span>
                  <span>Batas Akhir: {formatDateId(item.submissionDeadline)}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- TAB 5: VERIFIKASI PERUSAHAAN -->
    {#if activeTab === 'companies'}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={() => (companyFilter = 'pending')}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {companyFilter === 'pending'
              ? 'bg-blue-100 text-[#1a73e8] border-2 border-blue-300'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
          >
            Belum Diverifikasi ({summary.pendingCompaniesCount})
          </button>
          <button
            type="button"
            onclick={() => (companyFilter = 'all')}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {companyFilter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
          >
            Semua Mitra Industri ({companies.length})
          </button>
        </div>

        <div class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db]">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th class="p-3.5 font-bold">Nama Perusahaan / Kontak</th>
                  <th class="p-3.5 font-bold">Nomor Induk Berusaha (NIB)</th>
                  <th class="p-3.5 font-bold">Wilayah Operasional</th>
                  <th class="p-3.5 font-bold">Status</th>
                  <th class="p-3.5 font-bold text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each displayedCompanies as comp (comp.id)}
                  <tr class="hover:bg-gray-50/50">
                    <td class="p-3.5">
                      <p class="font-black text-gray-900">{comp.companyName || comp.name}</p>
                      <p class="text-[11px] text-gray-500 font-mono">{comp.email} • {comp.phoneNumber || '-'}</p>
                    </td>
                    <td class="p-3.5 font-mono text-gray-800">
                      {comp.companyNib || '-'}
                    </td>
                    <td class="p-3.5 text-gray-600">
                      {comp.regionName || 'Nasional'}
                    </td>
                    <td class="p-3.5">
                      {#if comp.companyVerifiedAt}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 class="w-3 h-3" />
                          Terverifikasi
                        </span>
                      {:else}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          Menunggu
                        </span>
                      {/if}
                    </td>
                    <td class="p-3.5 text-right">
                      <button
                        type="button"
                        onclick={() => toggleCompanyVerification(comp)}
                        class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer {comp.companyVerifiedAt
                          ? 'bg-red-50 text-[#EA4335] border border-red-200 hover:bg-red-100'
                          : 'bg-[#4285F4] hover:bg-[#1a73e8] text-white shadow-[0_2px_0_#1a56b0] active:translate-y-0.5'}"
                      >
                        {comp.companyVerifiedAt ? 'Cabut Verifikasi' : 'Verifikasi Akun'}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB 6: VERIFIKASI SEKOLAH -->
    {#if activeTab === 'schools'}
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={() => (schoolFilter = 'unverified')}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {schoolFilter === 'unverified'
              ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
          >
            Belum Diverifikasi ({summary.unverifiedSchoolsCount})
          </button>
          <button
            type="button"
            onclick={() => (schoolFilter = 'all')}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer {schoolFilter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
          >
            Semua Sekolah ({schools.length})
          </button>
        </div>

        <div class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db]">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th class="p-3.5 font-bold">NPSN & Nama Sekolah</th>
                  <th class="p-3.5 font-bold">Wilayah</th>
                  <th class="p-3.5 font-bold">Unit Produksi (TeFa)</th>
                  <th class="p-3.5 font-bold">Status Verifikasi</th>
                  <th class="p-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each displayedSchools as sch (sch.id)}
                  <tr class="hover:bg-gray-50/50">
                    <td class="p-3.5">
                      <button
                        type="button"
                        onclick={() => navigate(`/sekolah/${sch.slug}`)}
                        class="font-black text-gray-900 hover:text-[#4285F4] text-left cursor-pointer"
                      >
                        {sch.name}
                      </button>
                      <p class="text-[11px] text-gray-500 font-mono">NPSN: {sch.npsn || 'Belum diisi'}</p>
                    </td>
                    <td class="p-3.5 text-gray-600">{sch.regionName || '-'}</td>
                    <td class="p-3.5">
                      {#if sch.hasTefa}
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#1a73e8]">
                          Aktif
                        </span>
                      {:else}
                        <span class="text-gray-400 text-[11px]">-</span>
                      {/if}
                    </td>
                    <td class="p-3.5">
                      {#if sch.isVerified}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 class="w-3 h-3" />
                          Terverifikasi
                        </span>
                      {:else}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-700 border border-gray-300">
                          Belum
                        </span>
                      {/if}
                    </td>
                    <td class="p-3.5 text-right">
                      <button
                        type="button"
                        onclick={() => toggleSchoolVerification(sch)}
                        class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer {sch.isVerified
                          ? 'bg-red-50 text-[#EA4335] border border-red-200 hover:bg-red-100'
                          : 'bg-[#34A853] hover:bg-[#2d9246] text-white shadow-[0_2px_0_#1e6b33] active:translate-y-0.5'}"
                      >
                        {sch.isVerified ? 'Cabut Verifikasi' : 'Verifikasi Sekolah'}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Modal Takedown Post -->
{#if takedownModalPost}
  <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 max-w-md w-full shadow-[0_8px_0_#d1d5db] space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-black text-gray-900">Takedown Postingan Karya</h3>
        <button
          type="button"
          onclick={() => (takedownModalPost = null)}
          class="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <p class="text-xs text-gray-600">
        Anda akan menurunkan karya <strong>"{takedownModalPost.name}"</strong> oleh <strong>{takedownModalPost.author?.name}</strong> dari katalog publik. Berikan alasan penertiban:
      </p>

      <textarea
        bind:value={takedownReason}
        rows="3"
        class="w-full px-3 py-2 text-xs rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none"
      ></textarea>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onclick={() => (takedownModalPost = null)}
          class="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={processingAction}
          onclick={() => executeTakedownPost(takedownModalPost, 'archived', takedownReason)}
          class="px-5 py-2 rounded-xl bg-[#EA4335] hover:bg-[#d63b2f] text-white text-xs font-black shadow-[0_3px_0_#a8271e] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          {processingAction ? 'Memproses...' : 'Konfirmasi Takedown'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Reset Password User -->
{#if resetPasswordUser}
  <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 max-w-sm w-full shadow-[0_8px_0_#d1d5db] space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-black text-gray-900">Reset Password Akun</h3>
        <button
          type="button"
          onclick={() => (resetPasswordUser = null)}
          class="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <p class="text-xs text-gray-600">
        Tetapkan password baru untuk <strong>{resetPasswordUser.name} (@{resetPasswordUser.username})</strong>:
      </p>

      <input
        type="text"
        bind:value={newPasswordValue}
        placeholder="Minimal 6 karakter..."
        class="w-full px-3 py-2 text-xs font-mono rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onclick={() => (resetPasswordUser = null)}
          class="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={newPasswordValue.trim().length < 6}
          onclick={() =>
            updateUserAccount(
              resetPasswordUser,
              { newPassword: newPasswordValue.trim() },
              `Password akun @${resetPasswordUser.username} berhasil direset.`
            )}
          class="px-5 py-2 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white text-xs font-black shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          Simpan Password
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Reject Challenge -->
{#if rejectingChallenge}
  <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 max-w-md w-full shadow-[0_8px_0_#d1d5db] space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-black text-gray-900">Alasan Penolakan Tantangan</h3>
        <button
          type="button"
          onclick={() => (rejectingChallenge = null)}
          class="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <p class="text-xs text-gray-500">
        Berikan catatan evaluasi konstruktif kepada <strong>{rejectingChallenge.company?.companyName || 'Mitra Industri'}</strong> agar mereka dapat merevisi brief tantangan.
      </p>

      <textarea
        bind:value={rejectionReason}
        rows="4"
        class="w-full px-3 py-2 text-xs rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none"
      ></textarea>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          disabled={processingAction}
          onclick={() => (rejectingChallenge = null)}
          class="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          Batal
        </button>

        <button
          type="button"
          disabled={processingAction || !rejectionReason.trim()}
          onclick={submitRejectChallenge}
          class="px-5 py-2 rounded-xl bg-[#EA4335] hover:bg-[#d63b2f] text-white text-xs font-black shadow-[0_3px_0_#a8271e] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          {processingAction ? 'Memproses...' : 'Kirim Penolakan'}
        </button>
      </div>
    </div>
  </div>
{/if}
