<script lang="ts">
  import {
    Award,
    CheckCircle2,
    Copy,
    Download,
    ExternalLink,
    Printer,
    School,
    ShieldAlert,
    ShieldCheck,
    User
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import { formatDateId } from '../lib/format';

  interface Props {
    certificateCode: string;
  }

  let { certificateCode }: Props = $props();

  let loading = $state(true);
  let errorMsg = $state('');
  let certificate = $state<any>(null);

  async function loadCertificate(code: string) {
    if (!code) return;
    loading = true;
    errorMsg = '';
    try {
      const res = await apiFetch<{ certificate?: any; error?: string }>(
        `/api/certificates/${code.toUpperCase()}`
      );
      if (res.ok && res.data?.certificate) {
        certificate = res.data.certificate;
      } else {
        errorMsg = res.data?.error || 'Sertifikat tidak ditemukan dalam pangkalan data VOC-Market.';
      }
    } catch (err: any) {
      errorMsg = err.message || 'Gagal memverifikasi sertifikat.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadCertificate(certificateCode);
  });

  function handlePrint() {
    window.print();
  }

  function copyVerifyLink() {
    if (!certificate) return;
    const url = certificate.verifyUrl || window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Tautan verifikasi sertifikat berhasil disalin!');
  }
</script>

<div class="space-y-6 max-w-4xl mx-auto print:max-w-none print:m-0 print:p-0">
  <!-- Screen Navigation & Action Bar (Hidden in Print) -->
  <div class="flex flex-wrap items-center justify-between gap-3 print:hidden">
    <div>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide bg-blue-100 text-[#1a73e8] border border-blue-200">
          <ShieldCheck class="w-3.5 h-3.5" />
          Verifikasi Sertifikat Digital
        </span>
        <span class="text-xs font-mono font-bold text-gray-500">#{certificateCode}</span>
      </div>
      <h1 class="text-xl font-black text-gray-900 mt-1">Pangkalan Data Sertifikat VOC-Market</h1>
    </div>

    {#if certificate}
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={copyVerifyLink}
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] text-xs font-bold text-gray-700 hover:bg-gray-100 transition active:translate-y-0.5 cursor-pointer"
        >
          <Copy class="w-4 h-4 text-gray-500" />
          Salin Tautan
        </button>

        <button
          type="button"
          onclick={handlePrint}
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-black text-xs shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 transition cursor-pointer"
        >
          <Printer class="w-4 h-4" />
          Cetak / Simpan PDF
        </button>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-12 text-center shadow-[0_5px_0_#d1d5db]">
      <div class="w-8 h-8 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-semibold text-gray-500">Memeriksa keaslian sertifikat di basis data resmi...</p>
    </div>
  {:else if errorMsg || !certificate}
    <div class="bg-white border-2 border-red-300 rounded-2xl p-8 text-center shadow-[0_5px_0_#fca5a5]">
      <ShieldAlert class="w-12 h-12 text-[#EA4335] mx-auto mb-3" />
      <h2 class="text-lg font-black text-gray-900">Sertifikat Tidak Ditemukan</h2>
      <p class="text-xs text-gray-600 mt-2 max-w-md mx-auto">
        {errorMsg || 'Nomor seri sertifikat ini tidak cocok dengan data apapun yang terdaftar di VOC-Market.'}
      </p>
      <button
        type="button"
        onclick={() => navigate('/tantangan')}
        class="mt-5 inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-[0_3px_0_#374151] active:translate-y-0.5 cursor-pointer"
      >
        Lihat Tantangan Industri
      </button>
    </div>
  {:else}
    <!-- Status Verification Banner (Screen only) -->
    <div class="print:hidden">
      {#if certificate.isValid}
        <div class="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-[0_3px_0_#a7f3d0] flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs font-black text-emerald-900">Sertifikat Resmi & Terverifikasi Asli</p>
              <p class="text-[11px] text-emerald-700">
                Diterbitkan secara sah melalui ekosistem Tantangan Industri VOC-Market pada {formatDateId(certificate.issuedAt)}.
              </p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 border border-emerald-300">
            Valid
          </span>
        </div>
      {:else}
        <div class="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-[0_3px_0_#fca5a5] flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-[#EA4335] text-white flex items-center justify-center shrink-0">
              <ShieldAlert class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs font-black text-red-900">Sertifikat Telah Dicabut oleh Administrator</p>
              <p class="text-[11px] text-red-700">
                Sertifikat ini dibatalkan pada {formatDateId(certificate.revokedAt)} dan tidak lagi sah.
              </p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-200 text-red-900 border border-red-300">
            Dicabut
          </span>
        </div>
      {/if}
    </div>

    <!-- Official Certificate Frame (Screen + Print) -->
    <div
      class="bg-white border-8 border-double border-amber-400/80 rounded-2xl p-6 sm:p-10 lg:p-12 shadow-[0_8px_0_#d1d5db] print:shadow-none print:border-4 print:border-black print:rounded-none relative overflow-hidden text-center"
      style="background-image: radial-gradient(#fef3c7 0.75px, transparent 0.75px); background-size: 24px 24px;"
    >
      <!-- Watermark / Stamp Seal -->
      <div class="absolute right-4 bottom-4 opacity-10 pointer-events-none select-none">
        <Award class="w-64 h-64 text-amber-600" />
      </div>

      <!-- Certificate Header -->
      <div class="space-y-1 mb-6">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300">
            VOC-MARKET INDONESIA • TALENTA VOKASI
          </span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-wider">
          Sertifikat Penghargaan
        </h2>
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Nomor Registrasi Resmi: <span class="font-mono text-gray-800">{certificate.code}</span>
        </p>
      </div>

      <!-- Awardee Text -->
      <div class="my-6 space-y-2">
        <p class="text-xs sm:text-sm text-gray-600 italic">Diberikan secara terhormat kepada:</p>
        <h3 class="text-2xl sm:text-3xl font-black text-[#1a73e8] underline decoration-amber-400 decoration-4 underline-offset-8">
          {certificate.student.name}
        </h3>
        <p class="text-xs font-bold text-gray-700">
          {certificate.student.major || 'Siswa Berprestasi'}
          {#if certificate.student.schoolName}
            • {certificate.student.schoolName}
          {/if}
        </p>
      </div>

      <!-- Achievement Description -->
      <div class="my-6 max-w-2xl mx-auto space-y-3">
        <p class="text-xs sm:text-sm text-gray-700 leading-relaxed">
          Atas pencapaian luar biasa dan kompetensi teruji sebagai
        </p>
        <div class="inline-block px-4 py-1.5 rounded-xl bg-amber-400 text-gray-900 font-black text-sm uppercase tracking-wide shadow-sm border border-amber-500">
          {certificate.typeLabel || certificate.title}
        </div>
        <p class="text-xs sm:text-sm text-gray-700 leading-relaxed">
          dalam ajang Tantangan Industri Kejuruan:
          {#if certificate.challenge}
            <span class="font-black text-gray-900 block mt-1">"{certificate.challenge.title}"</span>
          {:else}
            <span class="font-black text-gray-900 block mt-1">"{certificate.title}"</span>
          {/if}
        </p>
      </div>

      <!-- Submission Info & Feedback -->
      {#if certificate.submission}
        <div class="my-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 max-w-xl mx-auto text-left space-y-1.5">
          <div class="flex items-center justify-between text-xs font-black text-amber-950">
            <span>Judul Karya: {certificate.submission.title}</span>
            {#if certificate.submission.totalScore}
              <span class="px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                Nilai Juri: {certificate.submission.totalScore}/100
              </span>
            {/if}
          </div>
          {#if certificate.submission.feedback}
            <p class="text-[11px] text-amber-900/80 italic leading-relaxed">
              "{certificate.submission.feedback}"
            </p>
          {/if}
        </div>
      {/if}

      <!-- Signatures & QR Code Section -->
      <div class="mt-10 pt-6 border-t border-amber-300/80 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
        <!-- Issuer Left -->
        <div class="text-center sm:text-left space-y-1">
          <p class="text-[11px] text-gray-500 font-semibold uppercase">Penyelenggara Industri</p>
          <div class="h-12 flex items-center justify-center sm:justify-start">
            <span class="font-serif text-lg font-black text-gray-900 italic">
              {certificate.issuerName}
            </span>
          </div>
          <div class="border-t border-gray-400 w-36 mx-auto sm:mx-0"></div>
          <p class="text-[11px] font-bold text-gray-800">{certificate.issuerName}</p>
          <p class="text-[10px] text-gray-500">Mitra Industri Terverifikasi</p>
        </div>

        <!-- Center QR Verification -->
        <div class="flex flex-col items-center justify-center space-y-1.5">
          {#if certificate.qrSvg}
            <div class="w-24 h-24 p-1.5 bg-white border-2 border-gray-300 rounded-xl shadow-sm flex items-center justify-center">
              {@html certificate.qrSvg}
            </div>
          {/if}
          <p class="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">
            Pindai untuk Verifikasi Asli
          </p>
        </div>

        <!-- Platform Authority Right -->
        <div class="text-center sm:text-right space-y-1">
          <p class="text-[11px] text-gray-500 font-semibold uppercase">Platform Penjamin Mutu</p>
          <div class="h-12 flex items-center justify-center sm:justify-end">
            <span class="font-serif text-lg font-black text-gray-900 italic">
              VOC-Market Indonesia
            </span>
          </div>
          <div class="border-t border-gray-400 w-36 mx-auto sm:ml-auto sm:mr-0"></div>
          <p class="text-[11px] font-bold text-gray-800">Direktorat Penjamin Mutu</p>
          <p class="text-[10px] text-gray-500">Diterbitkan {formatDateId(certificate.issuedAt)}</p>
        </div>
      </div>
    </div>

    <!-- Related Links Bar (Screen Only) -->
    <div class="print:hidden flex flex-wrap items-center justify-between gap-3 p-4 bg-white border-2 border-gray-300 rounded-2xl shadow-[0_4px_0_#d1d5db]">
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => navigate(`/profil/${certificate.student.username}`)}
          class="inline-flex items-center gap-1.5 text-xs font-bold text-[#4285F4] hover:underline"
        >
          <User class="w-4 h-4" />
          Lihat Profil {certificate.student.name}
        </button>

        {#if certificate.student.schoolSlug}
          <span class="text-gray-300">•</span>
          <button
            type="button"
            onclick={() => navigate(`/sekolah/${certificate.student.schoolSlug}`)}
            class="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#4285F4] hover:underline"
          >
            <School class="w-4 h-4" />
            Etalase {certificate.student.schoolName || 'Sekolah'}
          </button>
        {/if}
      </div>

      {#if certificate.challenge}
        <button
          type="button"
          onclick={() => navigate(`/tantangan/${certificate.challenge.slug}`)}
          class="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900"
        >
          Lihat Halaman Tantangan
          <ExternalLink class="w-3.5 h-3.5" />
        </button>
      {/if}
    </div>
  {/if}
</div>

