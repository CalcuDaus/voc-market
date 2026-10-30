<script lang="ts">
  import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Eye,
    Flag,
    HandHelping,
    Lock,
    MapPin,
    MessageSquare,
    Send,
    ShieldCheck,
    Users,
    Wallet,
    XCircle
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId, formatRupiah } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import ConfirmModal from '../lib/components/ConfirmModal.svelte';
  import ReportModal from '../lib/components/ReportModal.svelte';

  interface Props {
    code: string;
  }

  let { code }: Props = $props();

  let req = $state<any | null>(null);
  let loading = $state(true);
  let notFound = $state(false);

  // SMK Proposal Form State
  let proposalMessage = $state('');
  let offeredPrice = $state<number | ''>('');
  let estimatedDays = $state<number>(3);
  let selectedPortfolioId = $state<number | null>(null);
  let submittingProposal = $state(false);

  // Accept Proposal Modal State
  let confirmAcceptOpen = $state(false);
  let selectedProposal = $state<any | null>(null);
  let accepting = $state(false);

  // Close Request
  let confirmCloseOpen = $state(false);
  let closing = $state(false);

  // Report Modal
  let reportModalOpen = $state(false);

  async function loadDetail(c: string) {
    loading = true;
    notFound = false;
    const res = await apiFetch<{ request?: any; error?: string }>(`/api/requests/${c}`);
    if (!res.ok || !res.data?.request) {
      notFound = true;
      loading = false;
      return;
    }
    req = res.data.request;
    if (req.budgetMin && offeredPrice === '') {
      offeredPrice = req.budgetMin;
    }
    loading = false;
  }

  $effect(() => {
    loadDetail(code);
  });

  async function handleSubmitProposal(e: SubmitEvent) {
    e.preventDefault();
    if (!req) return;
    submittingProposal = true;

    const res = await apiFetch<{ success?: boolean; id?: number; error?: string }>(
      `/api/requests/${req.code}/proposals`,
      {
        method: 'POST',
        body: JSON.stringify({
          message: proposalMessage,
          offeredPrice: Number(offeredPrice) || 0,
          estimatedDays: Number(estimatedDays) || 1,
          portfolioProductId: selectedPortfolioId
        })
      }
    );

    submittingProposal = false;
    if (!res.ok || !res.data?.success) {
      toast.error(res.data?.error || 'Gagal mengajukan penawaran.');
      return;
    }

    toast.success('Penawaran Anda berhasil diajukan ke pemosting!');
    proposalMessage = '';
    await loadDetail(req.code);
  }

  async function handleWithdrawProposal() {
    if (!req?.myProposal) return;
    const res = await apiFetch(`/api/proposals/${req.myProposal.id}/withdraw`, {
      method: 'POST'
    });
    if (!res.ok) {
      toast.error('Gagal menarik penawaran.');
      return;
    }
    toast.success('Penawaran ditarik kembali.');
    await loadDetail(req.code);
  }

  async function handleConfirmAccept() {
    if (!selectedProposal) return;
    accepting = true;
    const res = await apiFetch<{
      success?: boolean;
      orderCode?: string;
      whatsappUrl?: string | null;
      error?: string;
    }>(`/api/proposals/${selectedProposal.id}/accept`, {
      method: 'POST'
    });

    accepting = false;
    confirmAcceptOpen = false;

    if (!res.ok || !res.data?.success) {
      toast.error(res.data?.error || 'Gagal memilih siswa ini.');
      return;
    }

    toast.success(
      `Siswa ${selectedProposal.student.name} berhasil dipilih! Pesanan resmi telah dibuat.`
    );

    if (res.data.whatsappUrl) {
      window.open(res.data.whatsappUrl, '_blank');
    }
    await loadDetail(req.code);
  }

  async function handleConfirmClose() {
    if (!req) return;
    closing = true;
    const res = await apiFetch(`/api/requests/${req.code}/close`, { method: 'PATCH' });
    closing = false;
    confirmCloseOpen = false;

    if (!res.ok) {
      toast.error('Gagal menutup permintaan.');
      return;
    }
    toast.success('Permintaan telah ditutup.');
    await loadDetail(req.code);
  }
</script>

<div class="max-w-4xl mx-auto px-2 sm:px-4 py-2">
  <button
    type="button"
    onclick={() => navigate('/butuh-bantuan')}
    class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 mb-5 active:translate-y-0.5 cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Kembali ke Papan Butuh Bantuan</span>
  </button>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 animate-pulse h-96 shadow-[0_5px_0_#d1d5db]"></div>
  {:else if notFound || !req}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <h2 class="text-xl font-black text-gray-900">Permintaan Tidak Ditemukan</h2>
      <p class="text-xs text-gray-500 mt-1">Permintaan bantuan ini mungkin sudah ditutup atau dihapus.</p>
      <button
        type="button"
        onclick={() => navigate('/butuh-bantuan')}
        class="mt-5 h-9 px-5 rounded-xl bg-[#34A853] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] cursor-pointer"
      >
        Lihat Permintaan Lain
      </button>
    </div>
  {:else}
    <div class="space-y-6">
      <!-- Main Request Card -->
      <article class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db]">
        <!-- Top Status Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b-2 border-gray-100">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="px-3 py-1 rounded-full text-xs font-black {req.status === 'open'
                ? 'bg-emerald-50 text-[#34A853] border border-emerald-300'
                : req.status === 'assigned'
                  ? 'bg-blue-50 text-[#4285F4] border border-blue-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'}"
            >
              {req.statusLabel}
            </span>
            <span class="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#4285F4] text-xs font-bold">
              {req.workModeLabel}
            </span>
            {#if req.categoryName}
              <span class="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                {req.categoryName}
              </span>
            {/if}
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs font-mono text-gray-400 font-bold">{req.code}</span>
            <span class="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <Eye class="w-3.5 h-3.5" />
              <span>{req.viewsCount}x</span>
            </span>
          </div>
        </div>

        <!-- Poster Row -->
        <div class="flex items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <img
              src={req.poster.avatarUrl}
              alt={req.poster.name}
              class="w-10 h-10 rounded-full object-cover border-2 border-gray-300 shrink-0"
            />
            <div>
              <p class="text-xs font-black text-gray-900">
                {req.poster.businessName || req.poster.companyName || req.poster.name}
              </p>
              <p class="text-[11px] text-gray-500">
                Diposting {formatDateId(req.createdAt)}
              </p>
            </div>
          </div>

          {#if !req.isOwner}
            <button
              type="button"
              onclick={() => (reportModalOpen = true)}
              class="h-8 px-2.5 rounded-lg border-2 border-gray-200 hover:border-red-200 text-gray-400 hover:text-[#EA4335] text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
            >
              <Flag class="w-3 h-3" />
              <span>Laporkan</span>
            </button>
          {:else if req.status === 'open'}
            <button
              type="button"
              onclick={() => (confirmCloseOpen = true)}
              class="h-8 px-3 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 text-[#EA4335] text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
            >
              <XCircle class="w-3.5 h-3.5" />
              <span>Tutup Permintaan</span>
            </button>
          {/if}
        </div>

        <h1 class="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{req.title}</h1>

        {#if req.imageUrl}
          <div class="mt-4 rounded-xl overflow-hidden border-2 border-gray-200 max-h-96 bg-gray-50">
            <img src={req.imageUrl} alt={req.title} class="w-full h-full object-cover" />
          </div>
        {/if}

        <p class="text-sm text-gray-700 mt-4 whitespace-pre-line leading-relaxed">
          {req.description}
        </p>

        <!-- Meta Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t-2 border-gray-100">
          <div class="p-3 rounded-xl bg-amber-50 border-2 border-amber-200">
            <span class="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
              <Wallet class="w-3.5 h-3.5" />
              <span>Anggaran</span>
            </span>
            <p class="text-sm font-black text-gray-900 mt-1">{req.formattedBudget}</p>
            <p class="text-[10px] text-gray-500">{req.budgetTypeLabel}</p>
          </div>

          <div class="p-3 rounded-xl bg-blue-50 border-2 border-blue-200">
            <span class="text-[10px] font-black uppercase text-[#4285F4] flex items-center gap-1">
              <MapPin class="w-3.5 h-3.5" />
              <span>Lokasi</span>
            </span>
            <p class="text-sm font-black text-gray-900 mt-1 truncate">
              {req.regionName || req.locationDetail || 'Online / Bebas Lokasi'}
            </p>
            <p class="text-[10px] text-gray-500 truncate">{req.province || req.workModeLabel}</p>
          </div>

          <div class="p-3 rounded-xl bg-purple-50 border-2 border-purple-200">
            <span class="text-[10px] font-black uppercase text-purple-700 flex items-center gap-1">
              <Users class="w-3.5 h-3.5" />
              <span>Penawaran Masuk</span>
            </span>
            <p class="text-sm font-black text-gray-900 mt-1">
              {req.proposalsCount} / {req.maxProposals} Siswa
            </p>
            {#if req.neededBy}
              <p class="text-[10px] text-gray-500">Target: {formatDateId(req.neededBy)}</p>
            {/if}
          </div>
        </div>

        <!-- Secret Full Address (Unlocked for selected student/owner) -->
        {#if req.fullAddress}
          <div class="mt-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300">
            <p class="text-xs font-black text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4 text-[#34A853]" />
              <span>Alamat Lengkap Dibuka untuk Anda:</span>
            </p>
            <p class="text-xs sm:text-sm font-bold text-gray-900 mt-1">{req.fullAddress}</p>
          </div>
        {:else if req.workMode === 'onsite' || req.workMode === 'dropoff'}
          <div class="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2 text-xs text-gray-500">
            <Lock class="w-4 h-4 text-gray-400 shrink-0" />
            <span>Alamat lengkap terlindungi dan hanya dibuka saat pemosting memilih penawaran Anda.</span>
          </div>
        {/if}

        {#if req.linkedOrder}
          <div class="mt-5 p-4 rounded-xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-black text-indigo-950">Pesanan Terkait Telah Berjalan</p>
              <p class="text-[11px] text-indigo-700">Kode Pesanan: {req.linkedOrder.orderCode}</p>
            </div>
            <button
              type="button"
              onclick={() => navigate(req.linkedOrder.trackPath)}
              class="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-[0_2px_0_#4338ca] cursor-pointer"
            >
              Lihat Progres Pesanan
            </button>
          </div>
        {/if}
      </article>

      <!-- SMK Student: My Proposal or Proposal Form -->
      {#if auth.user?.userType === 'smk' && !req.isOwner}
        {#if req.myProposal}
          <div class="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-[0_5px_0_#bfdbfe]">
            <div class="flex items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-gray-100">
              <span class="text-xs font-black text-[#4285F4] uppercase">Penawaran Anda</span>
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-bold {req.myProposal.status === 'accepted'
                  ? 'bg-emerald-50 text-[#34A853]'
                  : req.myProposal.status === 'pending'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-gray-100 text-gray-600'}"
              >
                {req.myProposal.status === 'accepted'
                  ? 'Diterima Pemosting'
                  : req.myProposal.status === 'pending'
                    ? 'Menunggu Tanggapan'
                    : 'Tidak Terpilih'}
              </span>
            </div>

            <p class="text-xs sm:text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              "{req.myProposal.message}"
            </p>

            <div class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 text-xs">
              <span class="font-extrabold text-[#4285F4] text-sm">
                Tawaran: {req.myProposal.formattedOfferedPrice} ({req.myProposal.estimatedDays} hari kerja)
              </span>

              {#if req.myProposal.status === 'pending' && req.status === 'open'}
                <button
                  type="button"
                  onclick={handleWithdrawProposal}
                  class="h-8 px-3 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 text-[#EA4335] font-bold text-xs cursor-pointer"
                >
                  Tarik Penawaran
                </button>
              {/if}
            </div>
          </div>
        {:else if req.status === 'open'}
          <!-- Proposal Form -->
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#d1d5db]">
            <div class="flex items-center gap-2 mb-3">
              <MessageSquare class="w-5 h-5 text-[#34A853]" />
              <h2 class="text-base font-black text-gray-900">Tawarkan Diri Anda untuk Kebutuhan Ini</h2>
            </div>
            <p class="text-xs text-gray-500 mb-4">
              Jelaskan keahlian Anda, rencana pengerjaan, dan estimasi waktu terbaik.
            </p>

            <form onsubmit={handleSubmitProposal} class="space-y-3.5">
              <div>
                <label for="prop-msg" class="block text-xs font-bold text-gray-700 mb-1">
                  Pesan Penawaran & Rencana Pengerjaan <span class="text-[#EA4335]">*</span>
                </label>
                <textarea
                  id="prop-msg"
                  rows="3"
                  bind:value={proposalMessage}
                  required
                  placeholder="Halo, saya siswa SMK jurusan... terbiasa menangani proyek serupa. Saya dapat menyelesaikan pekerjaan ini dalam..."
                  class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#34A853]"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="prop-price" class="block text-xs font-bold text-gray-700 mb-1">
                    Harga Penawaran Anda (Rp) <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="prop-price"
                    type="number"
                    min="1000"
                    bind:value={offeredPrice}
                    required
                    placeholder="Contoh: 150000"
                    class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#34A853]"
                  />
                </div>

                <div>
                  <label for="prop-days" class="block text-xs font-bold text-gray-700 mb-1">
                    Estimasi Selesai (Hari Kerja) <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="prop-days"
                    type="number"
                    min="1"
                    max="180"
                    bind:value={estimatedDays}
                    required
                    class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#34A853]"
                  />
                </div>
              </div>

              <!-- Portfolio Work Picker -->
              {#if req.myPublishedWorks?.length > 0}
                <div>
                  <label for="prop-port" class="block text-xs font-bold text-gray-700 mb-1">
                    Lampirkan Contoh Karya Terbaik Anda (Opsional)
                  </label>
                  <select
                    id="prop-port"
                    bind:value={selectedPortfolioId}
                    class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
                  >
                    <option value={null}>Pilih Karya dari Etalase Anda</option>
                    {#each req.myPublishedWorks as pw (pw.id)}
                      <option value={pw.id}>{pw.name} ({pw.typeLabel})</option>
                    {/each}
                  </select>
                </div>
              {/if}

              <button
                type="submit"
                disabled={submittingProposal}
                class="w-full h-11 rounded-xl bg-[#34A853] hover:bg-[#2d9247] shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer mt-2"
              >
                <Send class="w-4 h-4" />
                <span>{submittingProposal ? 'Mengirim Penawaran...' : 'Kirim Penawaran ke Pemosting'}</span>
              </button>
            </form>
          </div>
        {/if}
      {/if}

      <!-- Owner / Admin: Received Proposals List -->
      {#if req.isOwner || auth.user?.isAdmin || auth.user?.userType === 'admin'}
        <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_#d1d5db]">
          <h2 class="text-sm sm:text-base font-black text-gray-900 mb-3">
            Daftar Penawaran Siswa SMK ({req.proposals.length})
          </h2>

          {#if req.proposals.length === 0}
            <p class="text-xs text-gray-500 py-3">
              Belum ada siswa yang mengajukan penawaran. Permintaan Anda sedang tampil di Papan Butuh Bantuan.
            </p>
          {:else}
            <div class="space-y-3.5">
              {#each req.proposals as prop (prop.id)}
                <div class="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 flex flex-col justify-between gap-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <img
                        src={prop.student.avatarUrl}
                        alt={prop.student.name}
                        class="w-10 h-10 rounded-xl object-cover border-2 border-gray-300 shrink-0"
                      />
                      <div>
                        <button
                          type="button"
                          onclick={() => navigate(`/profil/${prop.student.username}`)}
                          class="text-xs sm:text-sm font-extrabold text-gray-900 hover:text-[#4285F4] text-left cursor-pointer"
                        >
                          {prop.student.name}
                        </button>
                        <p class="text-[11px] text-gray-500">
                          {prop.student.schoolName || 'Siswa SMK'} • {prop.student.major || '-'}
                        </p>
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="text-xs font-black text-[#4285F4] block">
                        {prop.formattedOfferedPrice}
                      </span>
                      <span class="text-[10px] text-gray-500 font-semibold">
                        {prop.estimatedDays} hari kerja
                      </span>
                    </div>
                  </div>

                  <p class="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200 leading-relaxed whitespace-pre-line">
                    "{prop.message}"
                  </p>

                  {#if prop.portfolio}
                    <div class="flex items-center gap-2.5 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <img
                        src={prop.portfolio.imageUrl}
                        alt={prop.portfolio.name}
                        class="w-8 h-8 rounded object-cover shrink-0"
                      />
                      <div class="overflow-hidden">
                        <p class="font-bold text-gray-900 truncate">{prop.portfolio.name}</p>
                        <p class="text-[10px] text-gray-500">{prop.portfolio.formattedPrice}</p>
                      </div>
                    </div>
                  {/if}

                  <div class="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span class="text-[10px] text-gray-400">{formatDateId(prop.createdAt)}</span>

                    {#if req.status === 'open' && req.isOwner}
                      <button
                        type="button"
                        onclick={() => {
                          selectedProposal = prop;
                          confirmAcceptOpen = true;
                        }}
                        class="h-8 px-3 rounded-lg bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_2px_0_#1e7e34] active:translate-y-0.5 transition cursor-pointer"
                      >
                        Pilih Siswa Ini
                      </button>
                    {:else if prop.status === 'accepted'}
                      <span class="text-xs font-black text-[#34A853] flex items-center gap-1">
                        <CheckCircle2 class="w-4 h-4" />
                        <span>Siswa Terpilih</span>
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if selectedProposal}
  <ConfirmModal
    open={confirmAcceptOpen}
    title="Pilih Siswa Ini?"
    message={`Anda akan memilih ${selectedProposal.student.name} dengan harga tawaran ${selectedProposal.formattedOfferedPrice}. Pesanan resmi akan dibuat dan kontak WhatsApp siswa akan dibuka.`}
    confirmLabel="Ya, Pilih & Mulai Pesanan"
    loading={accepting}
    onConfirm={handleConfirmAccept}
    onCancel={() => (confirmAcceptOpen = false)}
  />
{/if}

<ConfirmModal
  open={confirmCloseOpen}
  title="Tutup Permintaan Bantuan?"
  message="Permintaan ini tidak akan menerima penawaran siswa baru lagi."
  confirmLabel="Ya, Tutup"
  danger={true}
  loading={closing}
  onConfirm={handleConfirmClose}
  onCancel={() => (confirmCloseOpen = false)}
/>

{#if req}
  <ReportModal
    open={reportModalOpen}
    targetType="request"
    targetId={req.id}
    targetLabel={req.title}
    onClose={() => (reportModalOpen = false)}
  />
{/if}

