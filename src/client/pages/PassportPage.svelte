<script lang="ts">
  import {
    ArrowLeft,
    Award,
    BadgeCheck,
    CheckCircle2,
    Copy,
    FileBadge,
    Printer,
    School,
    ShieldCheck,
    Star,
    Trophy
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { formatDateId } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import CreatorLevelCard from '../lib/components/CreatorLevelCard.svelte';
  import BadgeGrid from '../lib/components/BadgeGrid.svelte';

  interface Props {
    username: string;
  }

  let { username }: Props = $props();

  let loading = $state(true);
  let errorMsg = $state('');
  let passport = $state<any>(null);

  async function loadPassport(uname: string) {
    loading = true;
    errorMsg = '';
    const res = await apiFetch<{ passport?: any; error?: string }>(
      `/api/passport/${encodeURIComponent(uname)}`
    );

    if (!res.ok || !res.data?.passport) {
      errorMsg = res.data?.error || 'Paspor Kerja siswa tidak ditemukan.';
      passport = null;
      loading = false;
      return;
    }

    passport = res.data.passport;
    loading = false;
  }

  $effect(() => {
    loadPassport(username);
  });

  async function copyPassportLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Tautan Paspor Kerja (CV Digital) berhasil disalin!');
    } catch {
      toast.info('Salin tautan ini: ' + url);
    }
  }

  function handlePrint() {
    window.print();
  }
</script>

<div class="max-w-4xl mx-auto px-2 sm:px-4 py-2 print:max-w-none print:p-0">
  <!-- Top Action Bar (Hidden on Print) -->
  <div class="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
    <button
      type="button"
      onclick={() => navigate(`/profil/${username}`)}
      class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 active:translate-y-0.5 cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Kembali ke Profil Siswa</span>
    </button>

    {#if passport}
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onclick={copyPassportLink}
          class="h-9 px-3.5 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-[0_2px_0_#d1d5db] inline-flex items-center gap-2 active:translate-y-0.5 transition cursor-pointer"
        >
          <Copy class="w-4 h-4" />
          <span>Salin Link CV</span>
        </button>

        <button
          type="button"
          onclick={handlePrint}
          class="h-9 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] inline-flex items-center gap-2 active:shadow-none active:translate-y-0.5 transition cursor-pointer"
        >
          <Printer class="w-4 h-4" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <div class="w-9 h-9 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-bold text-gray-500 mt-3">Menyiapkan dokumen Paspor Kerja Siswa...</p>
    </div>
  {:else if errorMsg || !passport}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center max-w-md mx-auto shadow-[0_5px_0_#d1d5db]">
      <FileBadge class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h1 class="text-lg font-black text-gray-900">Paspor Kerja Tidak Tersedia</h1>
      <p class="text-xs text-gray-500 mt-1">{errorMsg}</p>
      <button
        type="button"
        onclick={() => navigate('/')}
        class="mt-6 h-10 px-5 rounded-xl bg-[#4285F4] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] cursor-pointer"
      >
        Kembali ke Katalog
      </button>
    </div>
  {:else}
    <!-- Printable A4 Passport Document Sheet -->
    <article
      class="bg-white border-2 border-gray-300 rounded-2xl p-6 sm:p-10 shadow-[0_5px_0_#d1d5db] print:shadow-none print:border-0 print:rounded-none print:p-0"
    >
      <!-- Official Document Banner -->
      <header class="pb-6 border-b-2 border-gray-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <img src="/images/voc-logo.png" alt="VOC-Market" class="w-12 h-12 object-contain shrink-0" />
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-[#4285F4]">
              VOC-Market • Dokumen Portofolio Industri Siswa SMK
            </p>
            <h1 class="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
              PASPOR KERJA & REKAM JEJAK VOKASI
            </h1>
          </div>
        </div>

        <div class="sm:text-right text-xs text-gray-600 space-y-0.5">
          <p class="font-black text-gray-900 font-mono text-sm">{passport.passportCode}</p>
          <p class="text-[11px]">Diterbitkan: {formatDateId(passport.generatedAt)}</p>
        </div>
      </header>

      <!-- Student Identity Block -->
      <section class="py-6 border-b-2 border-gray-200 flex flex-col sm:flex-row items-start justify-between gap-6">
        <div class="flex items-start gap-4 sm:gap-5">
          <img
            src={passport.student.avatarUrl}
            alt={passport.student.name}
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-gray-300 shrink-0 bg-gray-100"
          />
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
              <span>{passport.student.name}</span>
              {#if passport.student.isVerified}
                <BadgeCheck class="w-5 h-5 text-[#4285F4] shrink-0" />
              {/if}
            </h2>

            {#if passport.student.headline}
              <p class="text-xs sm:text-sm font-bold text-gray-800 mt-0.5 italic">
                "{passport.student.headline}"
              </p>
            {/if}

            <p class="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5 mt-1.5">
              <School class="w-4 h-4 text-[#4285F4] shrink-0" />
              {#if passport.student.school}
                <button
                  type="button"
                  onclick={() => navigate(`/sekolah/${passport.student.school.slug}`)}
                  class="text-[#4285F4] hover:underline cursor-pointer"
                >
                  {passport.student.school.name}
                </button>
              {:else}
                <span>{passport.student.schoolName || 'SMK'}</span>
              {/if}
              {#if passport.student.major}
                <span class="text-gray-500 font-normal">— {passport.student.major}</span>
              {/if}
            </p>

            {#if passport.student.isVerified}
              <p class="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#4285F4] text-xs font-bold">
                <ShieldCheck class="w-3.5 h-3.5" />
                <span>
                  Siswa Terverifikasi oleh {passport.student.verifierName || 'Guru Pembimbing SMK'}
                </span>
              </p>
            {/if}

            {#if passport.student.bio}
              <p class="text-xs sm:text-sm text-gray-700 mt-2.5 max-w-xl leading-relaxed">
                {passport.student.bio}
              </p>
            {/if}
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-200 sm:text-right shrink-0 w-full sm:w-auto">
          <div class="flex sm:justify-end items-center gap-1.5 text-amber-800 text-[10px] font-black uppercase">
            <Award class="w-3.5 h-3.5" />
            <span>Kesiapan Kerja</span>
          </div>
          <p class="text-sm font-black text-gray-900 mt-1">
            {passport.experienceLevel.title}
          </p>
          <p class="text-[11px] text-gray-600 mt-0.5">{passport.experienceLevel.subtitle}</p>
        </div>
      </section>

      <!-- Section 1: Verified Real-World Metrics -->
      <section class="py-6 border-b-2 border-gray-200">
        <h3 class="text-xs font-black uppercase tracking-wider text-gray-500 mb-3.5">
          1. Ringkasan Pengalaman Lapangan Terverifikasi
        </h3>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div class="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-200">
            <p class="text-[11px] font-bold text-gray-500">Proyek Selesai</p>
            <p class="text-xl font-black text-gray-900 mt-1">
              {passport.metrics.completedOrdersCount}
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-200">
            <p class="text-[11px] font-bold text-gray-500">Pelanggan Nyata</p>
            <p class="text-xl font-black text-gray-900 mt-1">
              {passport.metrics.uniqueCustomersCount}
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-200">
            <p class="text-[11px] font-bold text-gray-500">Rating Kepuasan</p>
            <p class="text-xl font-black text-amber-600 mt-1 flex items-center gap-1">
              <Star class="w-4 h-4 fill-[#FBBC05] text-[#FBBC05]" />
              <span>{passport.metrics.avgRating > 0 ? `${passport.metrics.avgRating}/5` : '-'}</span>
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-200">
            <p class="text-[11px] font-bold text-gray-500">Stempel TeFa</p>
            <p class="text-xl font-black text-[#34A853] mt-1">
              {passport.metrics.tefaApprovedWorksCount}
            </p>
          </div>
        </div>
      </section>

      <!-- Tingkat Kreator & Lencana Vokasi (#11) -->
      {#if passport.badges?.length > 0 || passport.creatorLevel}
        <section class="py-6 border-b-2 border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CreatorLevelCard level={passport.creatorLevel || 1} title={passport.creatorLevelTitle} />
            <BadgeGrid badges={passport.badges || []} />
          </div>
        </section>
      {/if}

      <!-- Section 2: Sertifikat Tantangan Industri Terverifikasi QR -->
      {#if passport.certificates?.length > 0}
        <section class="py-6 border-b-2 border-gray-200">
          <div class="flex items-center gap-2 mb-3.5">
            <Trophy class="w-4 h-4 text-[#FBBC05]" />
            <h3 class="text-xs font-black uppercase tracking-wider text-gray-500">
              2. Sertifikat Kompetisi & Tantangan Industri ({passport.certificates.length})
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each passport.certificates as cert (cert.code)}
              <div class="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
                <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-black">
                  {cert.typeLabel}
                </span>
                <p class="text-xs font-black text-gray-900 mt-1">{cert.title}</p>
                <p class="text-[11px] text-gray-600 mt-0.5">
                  Oleh: {cert.issuerName} • Kode: <span class="font-mono text-purple-700">{cert.code}</span>
                </p>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Section 3: Verified Completed Work History -->
      <section class="py-6 border-b-2 border-gray-200">
        <h3 class="text-xs font-black uppercase tracking-wider text-gray-500 mb-3.5">
          3. Riwayat Proyek & Pesanan yang Telah Diselesaikan ({passport.workHistory.length})
        </h3>

        {#if passport.workHistory.length === 0}
          <div class="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
            Siswa ini siap menerima proyek pelanggan pertama melalui VOC-Market.
          </div>
        {:else}
          <div class="space-y-3">
            {#each passport.workHistory as item (item.orderCode)}
              <div class="p-3.5 rounded-xl border border-gray-200 bg-white break-inside-avoid">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span class="text-[10px] font-black text-[#4285F4] bg-blue-50 px-2 py-0.5 rounded">
                      {item.typeLabel}
                    </span>
                    <h4 class="text-xs sm:text-sm font-black text-gray-900 mt-1">{item.title}</h4>
                    <p class="text-[11px] text-gray-500">
                      Pelanggan: {item.clientName} • Kode: {item.orderCode} • Selesai: {formatDateId(item.completedAt)}
                    </p>
                  </div>
                  <span class="text-xs font-black text-gray-900 shrink-0">
                    Nilai: {item.formattedValue}
                  </span>
                </div>
                {#if item.review}
                  <p class="text-xs text-gray-700 italic mt-2 bg-gray-50 p-2 rounded-lg">
                    "{item.review.comment}"
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Official QR Verification Footer -->
      <footer class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 break-inside-avoid">
        <div class="text-xs text-gray-600 space-y-1 text-center sm:text-left">
          <p class="font-black text-gray-900 text-xs sm:text-sm">Verifikasi Keaslian Dokumen Digital</p>
          <p class="max-w-lg text-[11px] leading-relaxed">
            Angka pesanan selesai dan ulasan pada Paspor Kerja ini berasal dari transaksi pelanggan nyata di sistem VOC-Market.
          </p>
          <p class="font-mono text-[#4285F4] text-xs font-bold break-all">{passport.passportUrl}</p>
        </div>

        <div class="flex flex-col items-center shrink-0 p-2.5 bg-white border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]">
          <div class="w-20 h-20 [&>svg]:w-full [&>svg]:h-full">
            {@html passport.qrSvg}
          </div>
          <span class="text-[9px] font-bold text-gray-400 mt-1">Pindai Verifikasi</span>
        </div>
      </footer>
    </article>
  {/if}
</div>
