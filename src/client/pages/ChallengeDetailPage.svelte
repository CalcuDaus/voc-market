<script lang="ts">
  import {
    ArrowLeft,
    Award,
    BadgeCheck,
    Check,
    CheckCircle2,
    Clock,
    Edit3,
    ExternalLink,
    FileText,
    Flag,
    Medal,
    PlusCircle,
    Send,
    ShieldAlert,
    ShieldCheck,
    Trophy,
    Upload,
    Users
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import ConfirmModal from '../lib/components/ConfirmModal.svelte';
  import ReportModal from '../lib/components/ReportModal.svelte';

  interface Props {
    slug: string;
  }

  let { slug }: Props = $props();

  let challenge = $state<any | null>(null);
  let loading = $state(true);
  let notFound = $state(false);

  // Student Submission Form
  let subTitle = $state('');
  let subDescription = $state('');
  let subExternalLink = $state('');
  let subPublicAfterFinish = $state(true);
  let subFiles = $state<FileList | null>(null);
  let subPreviews = $state<string[]>([]);
  let submittingWork = $state(false);

  // Evaluation state for Company
  let evalModalOpen = $state(false);
  let selectedSub = $state<any | null>(null);
  let evalStatus = $state('submitted');
  let evalRank = $state<number | ''>('');
  let evalScores = $state<Record<string, number>>({});
  let evalFeedback = $state('');
  let evaluating = $state(false);

  // Announce modal state
  let confirmAnnounceOpen = $state(false);
  let announcing = $state(false);

  // Report modal
  let reportModalOpen = $state(false);

  async function loadDetail(s: string) {
    loading = true;
    notFound = false;
    const res = await apiFetch<{ challenge?: any; error?: string }>(`/api/challenges/${s}`);
    if (!res.ok || !res.data?.challenge) {
      notFound = true;
      loading = false;
      return;
    }
    challenge = res.data.challenge;
    loading = false;
  }

  $effect(() => {
    loadDetail(slug);
  });

  function handleFilesChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = input.files;
    subFiles = files;
    if (files) {
      const urls: string[] = [];
      for (let i = 0; i < Math.min(5, files.length); i++) {
        urls.push(URL.createObjectURL(files[i]));
      }
      subPreviews = urls;
    }
  }

  async function handleSubmitWork(e: SubmitEvent) {
    e.preventDefault();
    if (!challenge) return;
    if (!subFiles || subFiles.length === 0) {
      toast.error('Pilih minimal 1 gambar karya untuk dikumpulkan.');
      return;
    }

    submittingWork = true;
    const form = new FormData();
    form.append('title', subTitle);
    form.append('description', subDescription);
    if (subExternalLink) form.append('externalLink', subExternalLink);
    form.append('isPublicAfterFinish', subPublicAfterFinish ? 'true' : 'false');
    for (let i = 0; i < subFiles.length; i++) {
      form.append('images', subFiles[i]);
    }

    const res = await apiFetch(`/api/challenges/${challenge.slug}/submissions`, {
      method: 'POST',
      body: form
    });

    submittingWork = false;
    if (!res.ok) {
      toast.error(res.data?.error || 'Gagal mengumpulkan karya.');
      return;
    }

    toast.success('Karya Anda berhasil dikumpulkan ke juri industri!');
    await loadDetail(challenge.slug);
  }

  async function handleSubmitReview() {
    if (!challenge) return;
    const res = await apiFetch(`/api/company/challenges/${challenge.slug}/submit-review`, {
      method: 'POST'
    });
    if (!res.ok) {
      toast.error(res.data?.error || 'Gagal mengajukan tinjauan.');
      return;
    }
    toast.success('Tantangan berhasil diajukan ke Tim Moderasi Admin!');
    await loadDetail(challenge.slug);
  }

  function openEvalModal(sub: any) {
    selectedSub = sub;
    evalStatus = sub.status || 'submitted';
    evalRank = sub.rank || '';
    evalFeedback = sub.feedback || '';
    const initialScores: Record<string, number> = {};
    for (const c of challenge.judgingCriteria) {
      initialScores[c.name] = sub.scores?.[c.name] ?? 80;
    }
    evalScores = initialScores;
    evalModalOpen = true;
  }

  async function handleSaveEvaluation(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedSub) return;
    evaluating = true;

    const res = await apiFetch(
      `/api/company/challenges/submissions/${selectedSub.id}/evaluate`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: evalStatus,
          rank: evalRank !== '' ? Number(evalRank) : null,
          scores: evalScores,
          feedback: evalFeedback
        })
      }
    );

    evaluating = false;
    if (!res.ok) {
      toast.error(res.data?.error || 'Gagal menyimpan penilaian.');
      return;
    }

    toast.success(`Penilaian untuk ${selectedSub.student.name} tersimpan.`);
    evalModalOpen = false;
    await loadDetail(challenge.slug);
  }

  async function handleConfirmAnnounce() {
    if (!challenge) return;
    announcing = true;
    const res = await apiFetch(`/api/company/challenges/${challenge.slug}/announce`, {
      method: 'POST'
    });
    announcing = false;
    confirmAnnounceOpen = false;

    if (!res.ok) {
      toast.error(res.data?.error || 'Gagal mengumumkan pemenang.');
      return;
    }

    toast.success(
      'Selamat! Hasil tantangan diumumkan dan seluruh Sertifikat QR resmi telah diterbitkan ke siswa.'
    );
    await loadDetail(challenge.slug);
  }
</script>

<div class="max-w-4xl mx-auto px-2 sm:px-4 py-2">
  <button
    type="button"
    onclick={() => navigate('/tantangan')}
    class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 mb-5 active:translate-y-0.5 cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Kembali ke Daftar Tantangan</span>
  </button>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 animate-pulse h-96 shadow-[0_5px_0_#d1d5db]"></div>
  {:else if notFound || !challenge}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <Trophy class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h2 class="text-xl font-black text-gray-900">Tantangan Tidak Ditemukan</h2>
      <p class="text-xs text-gray-500 mt-1">Tantangan ini belum dipublikasikan atau sudah diarsipkan.</p>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Challenge Header Card -->
      <article class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db]">
        {#if challenge.coverImageUrl}
          <div class="h-48 sm:h-64 w-full bg-gray-100 overflow-hidden border-b-2 border-gray-200">
            <img src={challenge.coverImageUrl} alt={challenge.title} class="w-full h-full object-cover" />
          </div>
        {/if}

        <div class="p-5 sm:p-7">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b-2 border-gray-100">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-black bg-blue-50 border border-blue-200 text-[#4285F4]">
                {challenge.statusLabel}
              </span>
              {#if challenge.categoryName}
                <span class="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                  {challenge.categoryName}
                </span>
              {/if}
            </div>

            <div class="flex items-center gap-2">
              {#if !challenge.isCompanyOwner}
                <button
                  type="button"
                  onclick={() => (reportModalOpen = true)}
                  class="h-8 px-2.5 rounded-lg border-2 border-gray-200 hover:border-red-200 text-gray-400 hover:text-[#EA4335] text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <Flag class="w-3 h-3" />
                  <span>Laporkan</span>
                </button>
              {:else if ['draft', 'rejected'].includes(challenge.status)}
                <button
                  type="button"
                  onclick={() => navigate(`/tantangan/${challenge.slug}/edit`)}
                  class="h-8 px-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onclick={handleSubmitReview}
                  class="h-8 px-3 rounded-lg bg-[#4285F4] text-white text-xs font-bold shadow-[0_2px_0_#1a56b0] cursor-pointer"
                >
                  Ajukan Tinjauan Admin
                </button>
              {/if}
            </div>
          </div>

          <!-- Company Host Info -->
          <div class="flex items-center gap-3 mb-3">
            <img
              src={challenge.company.avatarUrl}
              alt={challenge.company.name}
              class="w-10 h-10 rounded-full object-cover border-2 border-gray-300 shrink-0"
            />
            <div>
              <p class="text-xs font-black text-gray-900 flex items-center gap-1">
                <span>{challenge.company.companyName || challenge.company.name}</span>
                {#if challenge.company.isCompanyVerified}
                  <BadgeCheck class="w-4 h-4 text-[#4285F4] shrink-0" />
                {/if}
              </p>
              <p class="text-[11px] text-gray-500">Penyelenggara Resmi Tantangan Industri</p>
            </div>
          </div>

          <h1 class="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{challenge.title}</h1>
          <p class="text-xs sm:text-sm text-gray-600 mt-2 font-medium leading-relaxed">{challenge.summary}</p>

          <!-- Prize & Reward Highlight Card -->
          <div class="mt-5 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
            <div class="flex items-center gap-2 text-amber-900 font-black text-xs uppercase mb-1">
              <Trophy class="w-4 h-4 text-[#FBBC05]" />
              <span>Hadiah & Apresiasi ({challenge.winnerSlots} Kuota Pemenang)</span>
            </div>
            <p class="text-sm font-extrabold text-gray-900 leading-relaxed">
              {challenge.prizeDescription}
            </p>
            <div class="flex flex-wrap gap-1.5 mt-2">
              {#each challenge.rewardTypes as rt}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-amber-900 border border-amber-200 text-[11px] font-bold">
                  <Check class="w-3 h-3 text-amber-600" />
                  <span>{rt}</span>
                </span>
              {/each}
            </div>
          </div>

          <!-- Brief, Requirements & Deliverables -->
          <div class="mt-6 space-y-4 text-xs sm:text-sm">
            <div>
              <h3 class="font-black text-gray-900 uppercase text-xs tracking-wider mb-1">
                Latar Belakang & Brief Proyek
              </h3>
              <p class="text-gray-700 whitespace-pre-line leading-relaxed">{challenge.brief}</p>
            </div>

            <div>
              <h3 class="font-black text-gray-900 uppercase text-xs tracking-wider mb-1">
                Persyaratan Peserta
              </h3>
              <p class="text-gray-700 whitespace-pre-line leading-relaxed">{challenge.requirements}</p>
            </div>

            <div>
              <h3 class="font-black text-gray-900 uppercase text-xs tracking-wider mb-1">
                Format Hasil Karya yang Dikumpulkan (Deliverables)
              </h3>
              <p class="text-gray-700 whitespace-pre-line leading-relaxed">{challenge.deliverables}</p>
            </div>
          </div>

          <!-- Judging Criteria Weights (Sum = 100%) -->
          <div class="mt-6 pt-5 border-t-2 border-gray-100">
            <h3 class="font-black text-gray-900 uppercase text-xs tracking-wider mb-2.5">
              Kriteria Penilaian Juri Industri (Total 100%)
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {#each challenge.judgingCriteria as crit}
                <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <span class="text-xs font-bold text-gray-800">{crit.name}</span>
                  <span class="text-xs font-black text-[#4285F4] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                    Bobot {crit.weight}%
                  </span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Meta Timeline -->
          <div class="mt-5 grid grid-cols-2 gap-3 text-xs pt-4 border-t border-gray-100">
            <div>
              <span class="text-[10px] font-bold text-gray-400 uppercase">Batas Kirim Karya</span>
              <p class="font-black text-gray-900 mt-0.5">{formatDateId(challenge.submissionDeadline)}</p>
            </div>
            <div>
              <span class="text-[10px] font-bold text-gray-400 uppercase">Pengumuman & Sertifikat</span>
              <p class="font-black text-gray-900 mt-0.5">{formatDateId(challenge.announcementDate)}</p>
            </div>
          </div>
        </div>
      </article>

      <!-- Student Submission Area -->
      {#if auth.user?.userType === 'smk'}
        {#if challenge.mySubmission}
          <div class="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-[0_5px_0_#bfdbfe]">
            <div class="flex items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-gray-100">
              <span class="text-xs font-black text-[#4285F4] uppercase">Karya yang Anda Kumpulkan</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#4285F4]">
                {challenge.mySubmission.status}
              </span>
            </div>

            <h3 class="text-sm sm:text-base font-black text-gray-900">{challenge.mySubmission.title}</h3>
            <p class="text-xs text-gray-600 mt-1 whitespace-pre-line leading-relaxed">
              {challenge.mySubmission.description}
            </p>

            {#if challenge.mySubmission.images?.length > 0}
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {#each challenge.mySubmission.images as img}
                  <img src={img} alt="Lampiran" class="w-full h-24 object-cover rounded-xl border border-gray-200" />
                {/each}
              </div>
            {/if}

            {#if challenge.mySubmission.feedback}
              <div class="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p class="text-xs font-black text-emerald-950">Umpan Balik Juri Industri:</p>
                <p class="text-xs text-emerald-900 mt-0.5 italic">"{challenge.mySubmission.feedback}"</p>
              </div>
            {/if}

            {#if challenge.mySubmission.certificateCode}
              <div class="mt-4 flex justify-end">
                <button
                  type="button"
                  onclick={() => navigate(`/sertifikat/${challenge.mySubmission.certificateCode}`)}
                  class="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-[0_2px_0_#581c87] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Award class="w-4 h-4" />
                  <span>Buka Sertifikat QR Resmi</span>
                </button>
              </div>
            {/if}
          </div>
        {:else if challenge.status === 'open'}
          <!-- Submission Form -->
          <form onsubmit={handleSubmitWork} class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db] space-y-4">
            <h2 class="text-sm sm:text-base font-black text-gray-900 pb-3 border-b-2 border-gray-100 flex items-center gap-2">
              <Upload class="w-5 h-5 text-[#34A853]" />
              <span>Kumpulkan Karya Tantangan Anda</span>
            </h2>

            <div>
              <label for="sub-title" class="block text-xs font-bold text-gray-700 mb-1">
                Judul Karya / Proyek <span class="text-[#EA4335]">*</span>
              </label>
              <input
                id="sub-title"
                type="text"
                bind:value={subTitle}
                required
                placeholder="Contoh: Rancang Bangun IoT Agrikultur Cerdas SMK"
                class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#34A853]"
              />
            </div>

            <div>
              <label for="sub-desc" class="block text-xs font-bold text-gray-700 mb-1">
                Penjelasan Konsep & Solusi Karya <span class="text-[#EA4335]">*</span>
              </label>
              <textarea
                id="sub-desc"
                rows="4"
                bind:value={subDescription}
                required
                placeholder="Jelaskan cara kerja, keunggulan karya, dan bagaimana karya Anda memenuhi kriteria penilaian juri..."
                class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#34A853]"
              ></textarea>
            </div>

            <div>
              <label for="sub-link" class="block text-xs font-bold text-gray-700 mb-1">
                Tautan Demo / Repository / File Dokumen Lengkap (Opsional)
              </label>
              <input
                id="sub-link"
                type="url"
                bind:value={subExternalLink}
                placeholder="https://github.com/... atau https://figma.com/..."
                class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#34A853]"
              />
            </div>

            <div>
              <label for="sub-files" class="block text-xs font-bold text-gray-700 mb-1">
                Unggah Bukti / Foto Karya (Minimal 1, Maksimal 5 Gambar) <span class="text-[#EA4335]">*</span>
              </label>
              <input
                id="sub-files"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onchange={handleFilesChange}
                required
                class="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-[#34A853] hover:file:bg-emerald-100 cursor-pointer"
              />

              {#if subPreviews.length > 0}
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                  {#each subPreviews as prev}
                    <img src={prev} alt="Preview" class="w-full h-18 object-cover rounded-lg border border-gray-300" />
                  {/each}
                </div>
              {/if}
            </div>

            <div class="pt-2">
              <label class="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                <input type="checkbox" bind:checked={subPublicAfterFinish} class="w-4 h-4 accent-[#34A853] rounded" />
                <span>Izinkan karya tampil di Galeri Pemenang publik setelah kompetisi selesai</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submittingWork}
              class="w-full h-11 rounded-xl bg-[#34A853] hover:bg-[#2d9247] shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer mt-4"
            >
              <Send class="w-4 h-4" />
              <span>{submittingWork ? 'Mengunggah Karya...' : 'Kumpulkan Karya Tantangan'}</span>
            </button>
          </form>
        {/if}
      {/if}

      <!-- Company Evaluation Section -->
      {#if challenge.isCompanyOwner || auth.user?.isAdmin || auth.user?.userType === 'admin'}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db]">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b-2 border-gray-100">
            <div>
              <h2 class="text-base font-black text-gray-900">Panel Evaluasi Peserta ({challenge.submissions.length})</h2>
              <p class="text-xs text-gray-500">Beri skor per kriteria dan wajib isi umpan balik bagi pemenang.</p>
            </div>

            {#if challenge.status !== 'finished'}
              <button
                type="button"
                onclick={() => (confirmAnnounceOpen = true)}
                class="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-[0_3px_0_#581c87] active:translate-y-0.5 transition cursor-pointer"
              >
                Umumkan Pemenang & Terbitkan Sertifikat
              </button>
            {/if}
          </div>

          {#if challenge.submissions.length === 0}
            <p class="text-xs text-gray-500 py-4">Belum ada karya yang dikumpulkan oleh siswa.</p>
          {:else}
            <div class="space-y-4">
              {#each challenge.submissions as sub (sub.id)}
                <div class="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 flex flex-col justify-between gap-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <img src={sub.student.avatarUrl} alt={sub.student.name} class="w-10 h-10 rounded-xl object-cover border-2 border-gray-200 shrink-0" />
                      <div>
                        <p class="text-xs sm:text-sm font-black text-gray-900">{sub.student.name}</p>
                        <p class="text-[11px] text-gray-500">{sub.student.schoolName || 'SMK'} • {sub.student.major || '-'}</p>
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#4285F4]">
                        {sub.status} {sub.rank ? `(#${sub.rank})` : ''}
                      </span>
                      {#if sub.totalScore}
                        <span class="block text-xs font-black text-gray-900 mt-1">Skor: {sub.totalScore}</span>
                      {/if}
                    </div>
                  </div>

                  <div>
                    <h4 class="text-xs sm:text-sm font-black text-gray-900">{sub.title}</h4>
                    <p class="text-xs text-gray-700 mt-1 whitespace-pre-line">{sub.description}</p>
                  </div>

                  {#if sub.images?.length > 0}
                    <div class="flex gap-2 overflow-x-auto py-1">
                      {#each sub.images as img}
                        <img src={img} alt="Lampiran" class="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0" />
                      {/each}
                    </div>
                  {/if}

                  {#if sub.feedback}
                    <p class="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 italic">
                      Feedback: "{sub.feedback}"
                    </p>
                  {/if}

                  {#if challenge.status !== 'finished'}
                    <div class="flex justify-end pt-2 border-t border-gray-200">
                      <button
                        type="button"
                        onclick={() => openEvalModal(sub)}
                        class="h-8 px-3 rounded-lg bg-white border-2 border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold cursor-pointer"
                      >
                        Nilai Karya Ini
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Public Finished Winners Gallery -->
      {#if challenge.status === 'finished' && challenge.submissions?.length > 0}
        <section class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db]">
          <div class="flex items-center gap-2 mb-4">
            <Trophy class="w-6 h-6 text-[#FBBC05]" />
            <h2 class="text-base sm:text-lg font-black text-gray-900">Galeri Pemenang & Karya Terbaik</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#each challenge.submissions as sub (sub.id)}
              <div class="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/40 flex flex-col justify-between gap-3">
                <div>
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800">
                      {#if sub.status === 'winner'}
                        <Trophy class="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>JUARA UTAMA</span>
                      {:else if sub.status === 'runner_up'}
                        <Medal class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>RUNNER-UP</span>
                      {:else}
                        <Award class="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>FINALIS</span>
                      {/if}
                    </span>
                    {#if sub.totalScore}
                      <span class="text-xs font-black text-gray-700">Skor: {sub.totalScore}</span>
                    {/if}
                  </div>

                  <h3 class="text-sm font-black text-gray-900">{sub.title}</h3>
                  <p class="text-xs text-gray-600 mt-0.5">Oleh: <span class="font-bold text-gray-800">{sub.student.name}</span></p>

                  {#if sub.images?.[0]}
                    <img src={sub.images[0]} alt={sub.title} class="w-full h-32 object-cover rounded-xl mt-2.5 border border-purple-200" />
                  {/if}

                  {#if sub.feedback}
                    <p class="text-xs text-purple-950 bg-white p-2.5 rounded-lg border border-purple-200 mt-2.5 italic">
                      Catatan Juri: "{sub.feedback}"
                    </p>
                  {/if}
                </div>

                {#if sub.certificateCode}
                  <button
                    type="button"
                    onclick={() => navigate(`/sertifikat/${sub.certificateCode}`)}
                    class="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-[0_2px_0_#581c87] inline-flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <Award class="w-4 h-4" />
                    <span>Verifikasi Sertifikat QR</span>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/if}
</div>

<!-- Evaluation Modal -->
{#if evalModalOpen && selectedSub}
  <div class="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden" role="dialog" aria-modal="true">
    <div class="bg-white border-2 border-gray-300 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-[0_6px_0_#d1d5db]">
      <h3 class="text-base font-black text-gray-900 mb-1">Penilaian Karya Peserta</h3>
      <p class="text-xs text-gray-500 mb-4">{selectedSub.student.name} — "{selectedSub.title}"</p>

      <form onsubmit={handleSaveEvaluation} class="space-y-3.5">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="ev-stat" class="block text-xs font-bold text-gray-700 mb-1">Status Penghargaan</label>
            <select id="ev-stat" bind:value={evalStatus} class="w-full p-2 text-xs font-bold border-2 border-gray-300 rounded-xl bg-white">
              <option value="submitted">Peserta (submitted)</option>
              <option value="shortlisted">Finalis (shortlisted)</option>
              <option value="winner">Juara Utama (winner)</option>
              <option value="runner_up">Runner-Up</option>
              <option value="honorable">Honorable Mention</option>
              <option value="disqualified">Didiskualifikasi</option>
            </select>
          </div>
          <div>
            <label for="ev-rank" class="block text-xs font-bold text-gray-700 mb-1">Peringkat / Juara Ke</label>
            <input id="ev-rank" type="number" min="1" max="100" bind:value={evalRank} placeholder="Contoh: 1" class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl" />
          </div>
        </div>

        <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
          <p class="text-xs font-black text-gray-700">Skor per Kriteria (0 - 100):</p>
          {#each challenge.judgingCriteria as crit}
            <div class="flex items-center justify-between gap-3 text-xs">
              <span class="font-bold text-gray-700">{crit.name} ({crit.weight}%)</span>
              <input type="number" min="0" max="100" bind:value={evalScores[crit.name]} class="w-20 p-1.5 text-xs text-center border-2 border-gray-300 rounded-lg bg-white font-black" />
            </div>
          {/each}
        </div>

        <div>
          <label for="ev-fb" class="block text-xs font-bold text-gray-700 mb-1">
            Umpan Balik Tertulis Juri (Wajib untuk Pemenang & Finalis) <span class="text-[#EA4335]">*</span>
          </label>
          <textarea id="ev-fb" rows="3" bind:value={evalFeedback} placeholder="Tuliskan apresiasi dan evaluasi teknis untuk pengembangan siswa..." class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl"></textarea>
        </div>

        <div class="flex justify-end gap-2.5 pt-2">
          <button type="button" onclick={() => (evalModalOpen = false)} class="h-9 px-4 rounded-xl border-2 border-gray-300 font-bold text-xs text-gray-700 cursor-pointer">Batal</button>
          <button type="submit" disabled={evaluating} class="h-9 px-5 rounded-xl bg-[#4285F4] text-white font-bold text-xs shadow-[0_2px_0_#1a56b0] cursor-pointer">
            {evaluating ? 'Menyimpan...' : 'Simpan Penilaian'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmAnnounceOpen}
  title="Umumkan Pemenang & Terbitkan Sertifikat QR?"
  message="Tindakan ini akan mengakhiri tantangan, menerbitkan sertifikat digital terverifikasi QR kepada seluruh peserta yang berhak, dan memperbarui rekam jejak siswa ke profil publik."
  confirmLabel="Ya, Umumkan Sekarang"
  loading={announcing}
  onConfirm={handleConfirmAnnounce}
  onCancel={() => (confirmAnnounceOpen = false)}
/>

{#if challenge}
  <ReportModal
    open={reportModalOpen}
    targetType="challenge"
    targetId={challenge.id}
    targetLabel={challenge.title}
    onClose={() => (reportModalOpen = false)}
  />
{/if}

