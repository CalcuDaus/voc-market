<script lang="ts">
  import {
    AlertTriangle,
    Award,
    Briefcase,
    Building2,
    Check,
    CheckCircle2,
    Eye,
    ExternalLink,
    FileText,
    Flag,
    RotateCcw,
    School,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    X,
    XCircle
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import { formatDateId, formatRelativeTime } from '../lib/format';

  type TabType = 'companies' | 'schools' | 'challenges' | 'reports';

  let activeTab = $state<TabType>('challenges');
  let loading = $state(true);

  // Overview data states
  let summary = $state({
    pendingCompaniesCount: 0,
    unverifiedSchoolsCount: 0,
    pendingChallengesCount: 0,
    openReportsCount: 0
  });

  let companies = $state<any[]>([]);
  let schools = $state<any[]>([]);
  let challenges = $state<any[]>([]);
  let reports = $state<any[]>([]);

  // Search & filter states
  let companyFilter = $state<'pending' | 'all'>('pending');
  let schoolFilter = $state<'unverified' | 'all'>('all');
  let challengeFilter = $state<'pending' | 'all'>('pending');
  let reportFilter = $state<'open' | 'all'>('open');

  // Certificate revocation tool state
  let certCodeInput = $state('');
  let certRevoking = $state(false);

  // Reject challenge modal state
  let rejectingChallenge = $state<any | null>(null);
  let rejectionReason = $state('Mohon lengkapi kriteria deliverables dan transparansi hadiah bagi siswa.');
  let processingAction = $state(false);

  async function loadOverview() {
    loading = true;
    try {
      const res = await apiFetch<{
        summary?: typeof summary;
        companies?: any[];
        schools?: any[];
        challenges?: any[];
        reports?: any[];
        error?: string;
      }>('/api/admin/overview');

      if (res.ok && res.data) {
        summary = res.data.summary || summary;
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
  async function handleReportAction(report: any, status: 'reviewed' | 'actioned' | 'dismissed', hideTarget = false) {
    try {
      const res = await apiFetch<{ success?: boolean; error?: string }>(
        `/api/admin/reports/${report.id}`,
        {
          method: 'PATCH',
          body: { status, hideTarget }
        }
      );
      if (res.ok) {
        report.status = status;
        summary.openReportsCount = reports.filter((r) => r.status === 'open').length;
        toast.success(
          status === 'actioned'
            ? 'Laporan ditindaklanjuti dan konten target telah disembunyikan.'
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

<div class="space-y-6">
  <!-- Admin Guard Check -->
  {#if auth.ready && (!auth.user || (!auth.user.isAdmin && auth.user.userType !== 'admin'))}
    <div class="bg-white border-2 border-red-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#fca5a5]">
      <ShieldAlert class="w-12 h-12 text-[#EA4335] mx-auto mb-3" />
      <h1 class="text-xl font-black text-gray-900">Akses Khusus Admin Platform</h1>
      <p class="text-xs text-gray-600 mt-2 max-w-sm mx-auto">
        Halaman panel moderasi ini hanya dapat diakses oleh Administrator resmi VOC-Market.
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
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 shadow-[0_5px_0_#d1d5db] flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck class="w-6 h-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black text-gray-900">Panel Moderasi & Pengawasan</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
              Admin Platform
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5">
            Verifikasi mitra industri, pengesahan sekolah, kurasi tantangan, dan penertiban laporan warga.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onclick={loadOverview}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 transition cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5 text-gray-500 {loading ? 'animate-spin' : ''}" />
        Segarkan Data
      </button>
    </div>

    <!-- Summary Metrics (Google 4 Colors) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Blue: Companies -->
      <button
        type="button"
        onclick={() => (activeTab = 'companies')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#4285F4] transition cursor-pointer {activeTab === 'companies' ? 'ring-2 ring-[#4285F4]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-black text-gray-500 uppercase">Mitra Industri</span>
          <Briefcase class="w-4 h-4 text-[#4285F4]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-2">{summary.pendingCompaniesCount}</p>
        <p class="text-[11px] font-semibold text-[#4285F4] mt-0.5">Menunggu Verifikasi</p>
      </button>

      <!-- Green: Schools -->
      <button
        type="button"
        onclick={() => (activeTab = 'schools')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#34A853] transition cursor-pointer {activeTab === 'schools' ? 'ring-2 ring-[#34A853]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-black text-gray-500 uppercase">Sekolah SMK</span>
          <School class="w-4 h-4 text-[#34A853]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-2">{summary.unverifiedSchoolsCount}</p>
        <p class="text-[11px] font-semibold text-[#34A853] mt-0.5">Belum Diverifikasi</p>
      </button>

      <!-- Yellow: Challenges -->
      <button
        type="button"
        onclick={() => (activeTab = 'challenges')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#FBBC05] transition cursor-pointer {activeTab === 'challenges' ? 'ring-2 ring-[#FBBC05]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-black text-gray-500 uppercase">Tantangan Industri</span>
          <Award class="w-4 h-4 text-[#FBBC05]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-2">{summary.pendingChallengesCount}</p>
        <p class="text-[11px] font-semibold text-amber-600 mt-0.5">Antrean Review Admin</p>
      </button>

      <!-- Red: Reports -->
      <button
        type="button"
        onclick={() => (activeTab = 'reports')}
        class="text-left bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_4px_0_#d1d5db] hover:border-[#EA4335] transition cursor-pointer {activeTab === 'reports' ? 'ring-2 ring-[#EA4335]' : ''}"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-black text-gray-500 uppercase">Laporan Konten</span>
          <Flag class="w-4 h-4 text-[#EA4335]" />
        </div>
        <p class="text-2xl font-black text-gray-900 mt-2">{summary.openReportsCount}</p>
        <p class="text-[11px] font-semibold text-[#EA4335] mt-0.5">Laporan Terbuka</p>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
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
        Verifikasi Perusahaan ({companies.length})
      </button>

      <button
        type="button"
        onclick={() => (activeTab = 'schools')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap {activeTab === 'schools'
          ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e6b33]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Verifikasi Sekolah ({schools.length})
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
    </div>

    <!-- TAB 1: MODERASI TANTANGAN -->
    {#if activeTab === 'challenges'}
      <div class="space-y-4">
        <!-- Filter bar -->
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

    <!-- TAB 2: VERIFIKASI PERUSAHAAN -->
    {#if activeTab === 'companies'}
      <div class="space-y-4">
        <!-- Filter bar -->
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

    <!-- TAB 3: VERIFIKASI SEKOLAH -->
    {#if activeTab === 'schools'}
      <div class="space-y-4">
        <!-- Filter bar -->
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
                        class="font-black text-gray-900 hover:text-[#4285F4] text-left"
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

    <!-- TAB 4: LAPORAN & PENERTIBAN SERTIFIKAT -->
    {#if activeTab === 'reports'}
      <div class="space-y-6">
        <!-- Section: Tool Pencabutan Sertifikat Cepat -->
        <div class="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-[0_4px_0_#fcd34d] space-y-3">
          <div class="flex items-center gap-2">
            <ShieldAlert class="w-5 h-5 text-amber-700" />
            <h2 class="text-sm font-black text-amber-950">Alat Penertiban & Pencabutan Sertifikat Digital</h2>
          </div>
          <p class="text-xs text-amber-800">
            Jika ditemukan kecurangan atau plagiarisme karya setelah sertifikat terbit, Administrator dapat mencabut keabsahan sertifikat secara permanen.
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

        <!-- Section: Daftar Laporan Konten -->
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-black text-gray-900">Daftar Pengaduan & Laporan Masuk</h3>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => (reportFilter = 'open')}
                class="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer {reportFilter === 'open'
                  ? 'bg-red-100 text-red-900 border-2 border-red-300'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
              >
                Perlu Tindakan ({summary.openReportsCount})
              </button>
              <button
                type="button"
                onclick={() => (reportFilter = 'all')}
                class="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer {reportFilter === 'all'
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
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#EA4335] border border-red-200">
                          {rep.reasonLabel}
                        </span>
                        <span class="text-xs font-mono font-bold text-gray-500">
                          Target: {rep.targetType} #{rep.targetId}
                        </span>
                      </div>
                      {#if rep.details}
                        <p class="text-xs text-gray-700 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                          "{rep.details}"
                        </p>
                      {/if}
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2">
                      {#if rep.status === 'open'}
                        <button
                          type="button"
                          onclick={() => handleReportAction(rep, 'actioned', true)}
                          class="px-3 py-1.5 rounded-xl bg-[#EA4335] hover:bg-[#d63b2f] text-white text-xs font-black shadow-[0_2px_0_#a8271e] active:translate-y-0.5 cursor-pointer"
                        >
                          Sembunyikan Target
                        </button>
                        <button
                          type="button"
                          onclick={() => handleReportAction(rep, 'reviewed')}
                          class="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          Tandai Ditolak
                        </button>
                        <button
                          type="button"
                          onclick={() => handleReportAction(rep, 'dismissed')}
                          class="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                          aria-label="Abaikan Laporan"
                        >
                          <X class="w-4 h-4" />
                        </button>
                      {:else}
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                          Status: {rep.status}
                        </span>
                      {/if}
                    </div>
                  </div>

                  <div class="text-[11px] text-gray-400 flex items-center justify-between">
                    <span>Pelapor: {rep.reporter ? rep.reporter.name : 'Anonim / Publik'}</span>
                    <span>{formatRelativeTime(rep.createdAt)}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Modal Reject Challenge -->
{#if rejectingChallenge}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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

