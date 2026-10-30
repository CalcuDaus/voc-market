<script lang="ts">
  import {
    ArrowLeft,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    HelpCircle,
    Image as ImageIcon,
    Layers,
    Check,
    Plus,
    Scale,
    ShieldAlert,
    Trash2,
    Upload
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import { SMK_MAJORS_LIST } from '../../shared/constants';

  interface Props {
    editSlug?: string;
  }

  let { editSlug }: Props = $props();

  let isEditMode = $derived(Boolean(editSlug));

  // Form states
  let title = $state('');
  let summary = $state('');
  let brief = $state('');
  let requirements = $state('');
  let deliverables = $state('');
  let categoryId = $state<number | null>(null);
  let targetMajors = $state<string[]>([]);
  let prizeDescription = $state('');
  let winnerSlots = $state(3);
  let ipPolicy = $state<'winner_only' | 'none'>('winner_only');
  let submissionDeadline = $state('');
  let announcementDate = $state('');

  // Reward types checkboxes
  let rewardMoney = $state(true);
  let rewardCertificate = $state(true);
  let rewardInternship = $state(false);
  let rewardJob = $state(false);
  let rewardProduct = $state(false);

  // Judging criteria dynamic rows
  let criteria = $state<{ name: string; weight: number }[]>([
    { name: 'Kesesuaian Solusi & Brief', weight: 40 },
    { name: 'Kualitas & Estetika Eksekusi', weight: 30 },
    { name: 'Kreativitas & Orisinalitas', weight: 30 }
  ]);

  // Cover image
  let coverFile = $state<File | null>(null);
  let coverPreview = $state('');
  let existingCoverUrl = $state('');

  // UI & Loading states
  let categories = $state<{ id: number; name: string }[]>([]);
  let loadingInit = $state(false);
  let submitting = $state(false);
  let statusBadge = $state<string | null>(null);

  // Computed total criteria weight
  let totalWeight = $derived(
    criteria.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0)
  );

  let isWeightValid = $derived(totalWeight === 100);

  // Selected reward types list
  let selectedRewards = $derived.by(() => {
    const list: string[] = [];
    if (rewardMoney) list.push('uang');
    if (rewardCertificate) list.push('sertifikat');
    if (rewardInternship) list.push('magang');
    if (rewardJob) list.push('kerja');
    if (rewardProduct) list.push('produk');
    return list;
  });

  async function loadCategories() {
    try {
      const res = await apiFetch<{ items?: { id: number; name: string }[] }>('/api/categories');
      if (res.ok && res.data?.items) {
        categories = res.data.items;
      }
    } catch {
      // Non-blocking
    }
  }

  async function loadExistingChallenge(slug: string) {
    loadingInit = true;
    try {
      const res = await apiFetch<{ challenge?: any }>(`/api/challenges/${slug}`);
      if (res.ok && res.data?.challenge) {
        const c = res.data.challenge;
        title = c.title || '';
        summary = c.summary || '';
        brief = c.brief || '';
        requirements = c.requirements || '';
        deliverables = c.deliverables || '';
        categoryId = c.category?.id ?? null;
        targetMajors = Array.isArray(c.targetMajors) ? c.targetMajors : [];
        prizeDescription = c.prizeDescription || '';
        winnerSlots = c.winnerSlots || 3;
        ipPolicy = c.ipPolicy || 'winner_only';
        statusBadge = c.status;

        if (c.coverImage) {
          existingCoverUrl = c.coverImage;
          coverPreview = c.coverImage;
        }

        if (Array.isArray(c.judgingCriteria) && c.judgingCriteria.length > 0) {
          criteria = c.judgingCriteria.map((item: any) => ({
            name: item.name || '',
            weight: Number(item.weight) || 0
          }));
        }

        if (Array.isArray(c.rewardTypes)) {
          rewardMoney = c.rewardTypes.includes('uang');
          rewardCertificate = c.rewardTypes.includes('sertifikat');
          rewardInternship = c.rewardTypes.includes('magang');
          rewardJob = c.rewardTypes.includes('kerja');
          rewardProduct = c.rewardTypes.includes('produk');
        }

        if (c.submissionDeadline) {
          const d = new Date(c.submissionDeadline);
          submissionDeadline = d.toISOString().slice(0, 16);
        }
        if (c.announcementDate) {
          const d = new Date(c.announcementDate);
          announcementDate = d.toISOString().slice(0, 16);
        }
      } else {
        toast.error('Gagal memuat rincian tantangan.');
        navigate('/tantangan');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      loadingInit = false;
    }
  }

  $effect(() => {
    loadCategories();
    if (editSlug) {
      loadExistingChallenge(editSlug);
    } else {
      // Set sensible default dates for new challenge: deadline 14 days, announcement 21 days
      const now = new Date();
      const deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const announce = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
      submissionDeadline = deadline.toISOString().slice(0, 16);
      announcementDate = announce.toISOString().slice(0, 16);
    }
  });

  function handleFileSelect(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran gambar maksimal 5 MB.');
        return;
      }
      coverFile = file;
      coverPreview = URL.createObjectURL(file);
    }
  }

  function toggleMajor(major: string) {
    if (targetMajors.includes(major)) {
      targetMajors = targetMajors.filter((m) => m !== major);
    } else {
      targetMajors = [...targetMajors, major];
    }
  }

  function addCriterion() {
    criteria = [...criteria, { name: '', weight: 10 }];
  }

  function removeCriterion(idx: number) {
    if (criteria.length <= 1) {
      toast.warning('Minimal harus ada 1 aspek penilaian.');
      return;
    }
    criteria = criteria.filter((_, i) => i !== idx);
  }

  async function saveChallenge(andSubmitReview = false) {
    // Validations
    if (!title.trim() || title.length < 5) {
      toast.error('Judul tantangan wajib diisi minimal 5 karakter.');
      return;
    }
    if (!summary.trim() || summary.length < 10) {
      toast.error('Ringkasan singkat wajib diisi minimal 10 karakter.');
      return;
    }
    if (!brief.trim() || brief.length < 20) {
      toast.error('Brief latar belakang minimal 20 karakter.');
      return;
    }
    if (!requirements.trim() || requirements.length < 10) {
      toast.error('Persyaratan peserta wajib diisi minimal 10 karakter.');
      return;
    }
    if (!deliverables.trim() || deliverables.length < 10) {
      toast.error('Format deliverables wajib diisi minimal 10 karakter.');
      return;
    }
    if (!isWeightValid) {
      toast.error(`Total bobot kriteria penilaian harus tepat 100% (saat ini ${totalWeight}%).`);
      return;
    }
    for (const c of criteria) {
      if (!c.name.trim() || c.weight <= 0) {
        toast.error('Semua aspek penilaian harus memiliki nama dan bobot lebih dari 0.');
        return;
      }
    }
    if (selectedRewards.length === 0) {
      toast.error('Pilih minimal 1 bentuk apresiasi / hadiah.');
      return;
    }
    if (!prizeDescription.trim() || prizeDescription.length < 10) {
      toast.error('Rincian hadiah wajib diisi minimal 10 karakter.');
      return;
    }
    if (!submissionDeadline || !announcementDate) {
      toast.error('Batas pengumpulan dan tanggal pengumuman wajib ditentukan.');
      return;
    }

    const deadTime = new Date(submissionDeadline).getTime();
    const annTime = new Date(announcementDate).getTime();
    if (annTime < deadTime) {
      toast.error('Tanggal pengumuman tidak boleh mendahului batas pengumpulan karya.');
      return;
    }

    submitting = true;
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('summary', summary.trim());
      fd.append('brief', brief.trim());
      fd.append('requirements', requirements.trim());
      fd.append('deliverables', deliverables.trim());
      if (categoryId) fd.append('categoryId', String(categoryId));
      fd.append('targetMajors', JSON.stringify(targetMajors));
      fd.append('judgingCriteria', JSON.stringify(criteria));
      fd.append('rewardTypes', JSON.stringify(selectedRewards));
      fd.append('prizeDescription', prizeDescription.trim());
      fd.append('winnerSlots', String(winnerSlots));
      fd.append('ipPolicy', ipPolicy);
      fd.append('submissionDeadline', new Date(submissionDeadline).toISOString());
      fd.append('announcementDate', new Date(announcementDate).toISOString());

      if (coverFile) {
        fd.append('coverImage', coverFile);
      }

      let targetSlug = editSlug;
      if (isEditMode && editSlug) {
        const updateRes = await apiFetch<{ success?: boolean; error?: string }>(
          `/api/company/challenges/${editSlug}`,
          {
            method: 'PUT',
            body: fd
          }
        );
        if (!updateRes.ok) {
          throw new Error(updateRes.data?.error || 'Gagal menyimpan pembaruan tantangan.');
        }
      } else {
        const createRes = await apiFetch<{ id?: number; slug?: string; error?: string }>(
          '/api/company/challenges',
          {
            method: 'POST',
            body: fd
          }
        );
        if (!createRes.ok || !createRes.data?.slug) {
          throw new Error(createRes.data?.error || 'Gagal membuat tantangan baru.');
        }
        targetSlug = createRes.data.slug;
      }

      if (andSubmitReview && targetSlug) {
        const reviewRes = await apiFetch<{ success?: boolean; error?: string }>(
          `/api/company/challenges/${targetSlug}/submit-review`,
          { method: 'POST' }
        );
        if (!reviewRes.ok) {
          toast.warning(
            reviewRes.data?.error ||
              'Draf berhasil disimpan, namun pengajuan review perlu dicoba kembali.'
          );
        } else {
          toast.success('Tantangan berhasil diajukan untuk ditinjau oleh Admin Platform!');
          navigate(`/tantangan/${targetSlug}`);
          return;
        }
      } else {
        toast.success(isEditMode ? 'Perubahan draf berhasil disimpan!' : 'Draf tantangan baru berhasil dibuat!');
      }

      if (targetSlug) {
        navigate(`/tantangan/${targetSlug}`);
      } else {
        navigate('/tantangan');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan tantangan.');
    } finally {
      submitting = false;
    }
  }
</script>

<div class="space-y-6">
  <!-- Back button & Breadcrumb -->
  <div class="flex items-center gap-3">
    <button
      type="button"
      onclick={() => navigate(isEditMode && editSlug ? `/tantangan/${editSlug}` : '/tantangan')}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] text-xs font-bold text-gray-700 hover:bg-gray-100 transition active:translate-y-0.5 cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4 text-gray-500" />
      Kembali ke Tantangan
    </button>
  </div>

  <!-- Role / Verification Guard Banner -->
  {#if !auth.user}
    <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-[0_4px_0_#fcd34d]">
      <div class="flex items-start gap-3">
        <ShieldAlert class="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h2 class="text-sm font-black text-amber-900">Perlu Masuk Akun Mitra Industri</h2>
          <p class="text-xs text-amber-700 mt-1">
            Untuk mempublikasikan tantangan industri bagi siswa SMK, silakan masuk dengan akun Mitra Industri terdaftar.
          </p>
          <button
            type="button"
            onclick={() => navigate('/masuk')}
            class="mt-3 inline-flex items-center px-4 py-2 bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs rounded-xl shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 cursor-pointer"
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    </div>
  {:else if auth.user.userType === 'company' && !auth.user.companyVerifiedAt && !auth.user.isAdmin}
    <div class="bg-blue-50 border-2 border-[#4285F4]/40 rounded-2xl p-5 shadow-[0_4px_0_#93c5fd]">
      <div class="flex items-start gap-3">
        <ShieldAlert class="w-6 h-6 text-[#4285F4] shrink-0 mt-0.5" />
        <div>
          <h2 class="text-sm font-black text-gray-900">Akun Perusahaan Dalam Antrean Verifikasi</h2>
          <p class="text-xs text-gray-600 mt-1">
            Anda dapat merancang dan menyimpan draf tantangan industri di bawah ini. Setelah Admin memverifikasi profil legalitas perusahaan Anda, tantangan dapat diajukan agar tayang ke publik siswa SMK.
          </p>
        </div>
      </div>
    </div>
  {/if}

  {#if loadingInit}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-12 text-center shadow-[0_5px_0_#d1d5db]">
      <div class="w-8 h-8 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-semibold text-gray-500">Memuat rincian tantangan...</p>
    </div>
  {:else}
    <!-- Form Card -->
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 lg:p-8 shadow-[0_5px_0_#d1d5db] space-y-8">
      <!-- Header -->
      <div class="border-b border-gray-200 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide bg-blue-100 text-[#1a73e8] border border-blue-200">
              <Award class="w-3.5 h-3.5" />
              Tantangan Industri
            </span>
            {#if statusBadge}
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700 border border-gray-300">
                Status: {statusBadge}
              </span>
            {/if}
          </div>
          <h1 class="text-xl lg:text-2xl font-black text-gray-900 mt-2">
            {isEditMode ? 'Edit Rincian Tantangan Industri' : 'Publikasikan Tantangan Industri Baru'}
          </h1>
          <p class="text-xs text-gray-500 mt-1">
            Berikan studi kasus nyata dari industri untuk menguji keahlian siswa SMK dan temukan talenta terbaik.
          </p>
        </div>
      </div>

      <!-- Section 1: Informasi Utama -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-black text-gray-900">
          <span class="w-6 h-6 rounded-lg bg-[#4285F4] text-white flex items-center justify-center text-xs">1</span>
          Informasi Utama Tantangan
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2 space-y-1">
            <label for="f-title" class="block text-xs font-bold text-gray-700">
              Judul Tantangan <span class="text-[#EA4335]">*</span>
            </label>
            <input
              id="f-title"
              type="text"
              bind:value={title}
              maxlength="160"
              placeholder="Contoh: Redesain Kemasan Kopi Robusta & Branding Media Sosial UMKM"
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
            />
            <span class="text-[11px] text-gray-400 font-medium">{title.length}/160 karakter</span>
          </div>

          <div class="md:col-span-2 space-y-1">
            <label for="f-summary" class="block text-xs font-bold text-gray-700">
              Ringkasan Singkat (Highlight untuk Feed / Kartu) <span class="text-[#EA4335]">*</span>
            </label>
            <input
              id="f-summary"
              type="text"
              bind:value={summary}
              maxlength="255"
              placeholder="Contoh: Buat desain kemasan ramah lingkungan dan 3 feed promosi Instagram siap cetak."
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
            />
            <span class="text-[11px] text-gray-400 font-medium">{summary.length}/255 karakter</span>
          </div>

          <div class="space-y-1">
            <label for="f-category" class="block text-xs font-bold text-gray-700">
              Kategori Bidang
            </label>
            <select
              id="f-category"
              bind:value={categoryId}
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium bg-white"
            >
              <option value={null}>-- Pilih Kategori --</option>
              {#each categories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
          </div>

          <div class="space-y-1">
            <label for="f-ip" class="block text-xs font-bold text-gray-700">
              Kebijakan Hak Cipta (IP Policy) <span class="text-[#EA4335]">*</span>
            </label>
            <select
              id="f-ip"
              bind:value={ipPolicy}
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium bg-white"
            >
              <option value="winner_only">
                Hak Cipta Tetap Milik Siswa, Perusahaan Berhak Memakai Karya Pemenang
              </option>
              <option value="none">
                Hak Cipta Sepenuhnya Milik Siswa (Eksklusif Hak Cipta Siswa)
              </option>
            </select>
          </div>
        </div>

        <!-- Target Jurusan SMK -->
        <div class="space-y-2 pt-2">
          <div class="flex items-center justify-between">
            <span class="block text-xs font-bold text-gray-700">
              Target Jurusan SMK yang Direkomendasikan
            </span>
            <span class="text-[11px] text-gray-400">Pilih satu atau lebih jurusan</span>
          </div>
          <div class="flex flex-wrap gap-1.5 p-3 rounded-xl border-2 border-gray-200 bg-gray-50/50">
            {#each SMK_MAJORS_LIST.slice(0, 16) as major}
              {@const selected = targetMajors.includes(major)}
              <button
                type="button"
                onclick={() => toggleMajor(major)}
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 {selected
                  ? 'bg-[#4285F4] text-white shadow-[0_2px_0_#1a56b0]'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-[0_1px_0_#d1d5db]'}"
              >
                {#if selected}
                  <Check class="w-3 h-3" />
                {:else}
                  <Plus class="w-3 h-3" />
                {/if}
                <span>{major}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Cover Image Upload -->
        <div class="space-y-2 pt-2">
          <span class="block text-xs font-bold text-gray-700">
            Banner / Cover Tantangan (Rekomendasi 16:9, Maks 5 MB)
          </span>
          <div class="flex flex-col sm:flex-row items-center gap-4">
            {#if coverPreview}
              <div class="relative w-full sm:w-48 h-28 rounded-xl overflow-hidden border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] shrink-0 bg-gray-100">
                <img src={coverPreview} alt="Preview Cover" class="w-full h-full object-cover" />
              </div>
            {/if}
            <label
              class="w-full sm:flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#4285F4] hover:bg-blue-50/30 transition cursor-pointer text-center"
            >
              <Upload class="w-6 h-6 text-gray-400 mb-1" />
              <span class="text-xs font-bold text-[#4285F4]">Pilih Gambar Banner</span>
              <span class="text-[11px] text-gray-400 mt-0.5">JPG, PNG, atau WebP</span>
              <input type="file" accept="image/*" onchange={handleFileSelect} class="hidden" />
            </label>
          </div>
        </div>
      </div>

      <!-- Section 2: Rincian Brief & Persyaratan -->
      <div class="space-y-4 pt-4 border-t border-gray-200">
        <div class="flex items-center gap-2 text-sm font-black text-gray-900">
          <span class="w-6 h-6 rounded-lg bg-[#FBBC05] text-white flex items-center justify-center text-xs">2</span>
          Brief Studi Kasus & Persyaratan
        </div>

        <div class="space-y-3">
          <div class="space-y-1">
            <label for="f-brief" class="block text-xs font-bold text-gray-700">
              Latar Belakang & Detail Brief Proyek <span class="text-[#EA4335]">*</span>
            </label>
            <textarea
              id="f-brief"
              bind:value={brief}
              rows="5"
              placeholder="Jelaskan profil masalah industri, tujuan proyek, target audiens, dan ekspektasi hasil dari perusahaan secara jelas..."
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
            ></textarea>
            <span class="text-[11px] text-gray-400 font-medium">Minimal 20 karakter</span>
          </div>

          <div class="space-y-1">
            <label for="f-req" class="block text-xs font-bold text-gray-700">
              Persyaratan Peserta & Batasan Teknis <span class="text-[#EA4335]">*</span>
            </label>
            <textarea
              id="f-req"
              bind:value={requirements}
              rows="3"
              placeholder="Contoh: Terbuka untuk siswa SMK jurusan DKV/Animasi/RPL. Karya harus orisinal dan bebas aset berhak cipta tanpa lisensi..."
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
            ></textarea>
          </div>

          <div class="space-y-1">
            <label for="f-deliv" class="block text-xs font-bold text-gray-700">
              Format Hasil Karya yang Dikumpulkan (Deliverables) <span class="text-[#EA4335]">*</span>
            </label>
            <textarea
              id="f-deliv"
              bind:value={deliverables}
              rows="3"
              placeholder="Contoh: 1) Mockup kemasan format PNG/WebP (maks 5 gambar). 2) Tautan drive master file AI/Figma. 3) Deskripsi konsep kemasan."
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Section 3: Kriteria Penilaian (Bobot 100%) -->
      <div class="space-y-4 pt-4 border-t border-gray-200">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-sm font-black text-gray-900">
            <span class="w-6 h-6 rounded-lg bg-[#34A853] text-white flex items-center justify-center text-xs">3</span>
            Kriteria Penilaian Juri
          </div>

          <!-- Total Weight Badge -->
          <div
            class="px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 {isWeightValid
              ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
              : 'bg-red-100 text-red-800 border-2 border-red-300 animate-pulse'}"
          >
            <Scale class="w-3.5 h-3.5" />
            Total Bobot: {totalWeight}% {isWeightValid ? '(Sesuai Standar 100%)' : '(Wajib Tepat 100%)'}
          </div>
        </div>

        <p class="text-xs text-gray-500">
          Tentukan parameter penilaian yang adil dan transparan bagi siswa. Setiap aspek harus memiliki bobot persentase positif, dan total seluruh aspek wajib tepat 100%.
        </p>

        <div class="space-y-2.5">
          {#each criteria as item, idx}
            <div class="flex items-center gap-2">
              <input
                type="text"
                bind:value={item.name}
                placeholder="Nama aspek penilaian (contoh: Kualitas Estetika & Kejelasan)"
                class="flex-1 px-4 py-2 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
              />
              <div class="relative w-24 shrink-0">
                <input
                  type="number"
                  min="1"
                  max="100"
                  bind:value={item.weight}
                  class="w-full pr-7 pl-3 py-2 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-bold text-center"
                />
                <span class="absolute right-2.5 top-2 text-xs font-black text-gray-400 pointer-events-none">%</span>
              </div>
              <button
                type="button"
                onclick={() => removeCriterion(idx)}
                aria-label="Hapus Aspek Penilaian"
                class="p-2 rounded-xl border-2 border-red-200 text-[#EA4335] hover:bg-red-50 transition active:translate-y-0.5 cursor-pointer shrink-0"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          {/each}

          <button
            type="button"
            onclick={addCriterion}
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#4285F4] text-xs font-bold text-gray-700 hover:text-[#4285F4] hover:bg-blue-50/50 transition cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            Tambah Aspek Penilaian
          </button>
        </div>
      </div>

      <!-- Section 4: Apresiasi, Hadiah & Waktu -->
      <div class="space-y-4 pt-4 border-t border-gray-200">
        <div class="flex items-center gap-2 text-sm font-black text-gray-900">
          <span class="w-6 h-6 rounded-lg bg-[#EA4335] text-white flex items-center justify-center text-xs">4</span>
          Hadiah, Kuota Pemenang & Jadwal
        </div>

        <!-- Reward Types Checkboxes -->
        <div class="space-y-2">
          <span class="block text-xs font-bold text-gray-700">
            Bentuk Apresiasi / Hadiah yang Diberikan <span class="text-[#EA4335]">*</span>
          </span>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <label class="flex items-center gap-2 p-2.5 rounded-xl border-2 {rewardMoney ? 'border-[#34A853] bg-emerald-50/50' : 'border-gray-200'} cursor-pointer">
              <input type="checkbox" bind:checked={rewardMoney} class="rounded text-[#34A853]" />
              <span class="text-xs font-bold text-gray-800">Uang Tunai</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl border-2 {rewardCertificate ? 'border-[#4285F4] bg-blue-50/50' : 'border-gray-200'} cursor-pointer">
              <input type="checkbox" bind:checked={rewardCertificate} class="rounded text-[#4285F4]" />
              <span class="text-xs font-bold text-gray-800">Sertifikat Resmi</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl border-2 {rewardInternship ? 'border-[#FBBC05] bg-amber-50/50' : 'border-gray-200'} cursor-pointer">
              <input type="checkbox" bind:checked={rewardInternship} class="rounded text-[#FBBC05]" />
              <span class="text-xs font-bold text-gray-800">Peluang Magang</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl border-2 {rewardJob ? 'border-purple-400 bg-purple-50/50' : 'border-gray-200'} cursor-pointer">
              <input type="checkbox" bind:checked={rewardJob} class="rounded text-purple-600" />
              <span class="text-xs font-bold text-gray-800">Tawaran Kerja</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl border-2 {rewardProduct ? 'border-pink-400 bg-pink-50/50' : 'border-gray-200'} cursor-pointer">
              <input type="checkbox" bind:checked={rewardProduct} class="rounded text-pink-600" />
              <span class="text-xs font-bold text-gray-800">Merchandise/Alat</span>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2 space-y-1">
            <label for="f-prize" class="block text-xs font-bold text-gray-700">
              Rincian Hadiah Lengkap & Transparan <span class="text-[#EA4335]">*</span>
            </label>
            <textarea
              id="f-prize"
              bind:value={prizeDescription}
              rows="3"
              placeholder="Contoh: Juara 1: Rp 3.500.000 + Prioritas Magang di Studio kami. Juara 2: Rp 2.000.000. Semua peserta yang mengumpulkan karya sah mendapatkan Sertifikat Digital Terverifikasi."
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
            ></textarea>
          </div>

          <div class="space-y-1">
            <label for="f-slots" class="block text-xs font-bold text-gray-700">
              Target Jumlah Pemenang Utama
            </label>
            <input
              id="f-slots"
              type="number"
              min="1"
              max="20"
              bind:value={winnerSlots}
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium"
            />
            <span class="text-[11px] text-gray-400">Contoh: 3 pemenang (Juara 1, 2, 3)</span>
          </div>

          <div class="space-y-1">
            <label for="f-deadline" class="block text-xs font-bold text-gray-700">
              Batas Akhir Pengumpulan Karya <span class="text-[#EA4335]">*</span>
            </label>
            <input
              id="f-deadline"
              type="datetime-local"
              bind:value={submissionDeadline}
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium bg-white"
            />
          </div>

          <div class="space-y-1">
            <label for="f-announcement" class="block text-xs font-bold text-gray-700">
              Tanggal Pengumuman Pemenang <span class="text-[#EA4335]">*</span>
            </label>
            <input
              id="f-announcement"
              type="datetime-local"
              bind:value={announcementDate}
              class="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] focus:outline-none text-xs font-medium bg-white"
            />
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-6 border-t border-gray-200 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          disabled={submitting}
          onclick={() => saveChallenge(false)}
          class="px-5 py-2.5 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-bold text-xs shadow-[0_3px_0_#d1d5db] hover:bg-gray-50 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan sebagai Draf'}
        </button>

        <button
          type="button"
          disabled={submitting || !isWeightValid}
          onclick={() => saveChallenge(true)}
          class="px-6 py-2.5 rounded-xl bg-[#34A853] hover:bg-[#2d9246] text-white font-black text-xs shadow-[0_3px_0_#1e6b33] active:translate-y-0.5 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          <CheckCircle2 class="w-4 h-4" />
          {submitting ? 'Memproses...' : 'Simpan & Ajukan Tinjauan Admin'}
        </button>
      </div>
    </div>
  {/if}
</div>
