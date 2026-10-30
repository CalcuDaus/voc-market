<script lang="ts">
  import {
    Building2,
    CheckCircle2,
    Clock,
    FileBadge,
    MailCheck,
    MessageCircle,
    School,
    Send,
    User,
    X,
    XCircle
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { formatDateId } from '../lib/format';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import RightSidebar from '../lib/components/RightSidebar.svelte';

  let role = $state<'student' | 'company' | 'other'>('student');
  let items = $state<any[]>([]);
  let loading = $state(true);

  // Decline Modal State
  let declineModalOpen = $state(false);
  let selectedInvId = $state<number | null>(null);
  let declineReason = $state('');
  let declining = $state(false);

  async function loadInvitations() {
    loading = true;
    const res = await apiFetch<{ role?: string; items?: any[]; error?: string }>(
      '/api/invitations'
    );
    if (res.ok && res.data) {
      role = (res.data.role as any) || 'student';
      items = res.data.items || [];
    }
    loading = false;
  }

  $effect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      navigate('/masuk');
      return;
    }
    loadInvitations();
  });

  async function handleAccept(inv: any) {
    const res = await apiFetch<{
      success?: boolean;
      studentWhatsappUrl?: string | null;
      error?: string;
    }>(`/api/invitations/${inv.id}/accept`, { method: 'POST' });

    if (!res.ok) {
      toast.error(res.data?.error || 'Gagal menerima undangan.');
      return;
    }

    toast.success(
      'Undangan berhasil diterima! Perusahaan kini dapat menghubungi Anda melalui WhatsApp.'
    );
    await loadInvitations();
  }

  async function handleDeclineSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedInvId) return;
    declining = true;

    const res = await apiFetch(`/api/invitations/${selectedInvId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ declineReason })
    });

    declining = false;
    declineModalOpen = false;

    if (!res.ok) {
      toast.error('Gagal menanggapi penolakan.');
      return;
    }

    toast.info('Tanggapan penolakan telah dikirimkan ke perusahaan.');
    await loadInvitations();
  }
</script>

<div class="flex gap-6 items-start justify-center">
  <!-- Center Column -->
  <div class="flex-1 min-w-0 max-w-2xl w-full">
    <!-- Header Card -->
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] mb-5">
      <div class="flex items-start gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-teal-50 border-2 border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
          <MailCheck class="w-6 h-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider text-teal-700">
            {role === 'company' ? 'Rekrutmen Industri' : 'Kotak Masuk Undangan Kerja'}
          </span>
          <h1 class="text-xl font-black text-gray-900 leading-snug">
            {role === 'company' ? 'Undangan Rekrutmen Terkirim' : 'Undangan Peluang Industri'}
          </h1>
          <p class="text-xs text-gray-500 mt-0.5">
            {role === 'company'
              ? 'Pantau tanggapan siswa. Nomor WhatsApp kandidat akan terbuka otomatis saat siswa menyetujui tawaran.'
              : 'Tawaran PKL, Magang, atau Kerja langsung dari Mitra Industri yang memilih profil Anda.'}
          </p>
        </div>
      </div>
    </div>

    <!-- Invitations Feed -->
    {#if loading}
      <div class="space-y-4">
        {#each [1, 2, 3] as sk (sk)}
          <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 h-44 animate-pulse shadow-[0_5px_0_#d1d5db]"></div>
        {/each}
      </div>
    {:else if items.length === 0}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
        <MailCheck class="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h2 class="text-base font-bold text-gray-900">
          {role === 'company' ? 'Belum Ada Undangan Terkirim' : 'Belum Ada Undangan Masuk'}
        </h2>
        <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          {role === 'company'
            ? 'Cari kandidat siswa terbaik di Direktori Talenta dan kirimkan undangan kerja atau magang.'
            : 'Pastikan status "Siap Kerja" Anda telah aktif dan profil keahlian Anda lengkap.'}
        </p>
        {#if role === 'company'}
          <button
            type="button"
            onclick={() => navigate('/talenta')}
            class="mt-4 h-9 px-4 rounded-xl bg-[#4285F4] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] cursor-pointer"
          >
            Cari Talenta Siswa
          </button>
        {:else}
          <button
            type="button"
            onclick={() => navigate('/siap-kerja')}
            class="mt-4 h-9 px-4 rounded-xl bg-[#34A853] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] cursor-pointer"
          >
            Kelola Status Siap Kerja
          </button>
        {/if}
      </div>
    {:else}
      <div class="space-y-4">
        {#each items as inv (inv.id)}
          <article class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] flex flex-col justify-between gap-3">
            <div>
              <div class="flex items-start justify-between gap-3 pb-3 border-b-2 border-gray-100">
                <div class="flex items-start gap-3">
                  <img
                    src={role === 'company' ? inv.student.avatarUrl : inv.company.avatarUrl}
                    alt="Avatar"
                    class="w-10 h-10 rounded-xl object-cover border-2 border-gray-200 shrink-0"
                  />
                  <div>
                    <p class="text-xs sm:text-sm font-extrabold text-gray-900">
                      {role === 'company'
                        ? inv.student.name
                        : inv.company.companyName || inv.company.name}
                    </p>
                    <p class="text-[11px] text-gray-500">
                      {role === 'company'
                        ? inv.student.schoolName || 'Siswa SMK'
                        : inv.company.companySector || 'Mitra Industri'}
                    </p>
                  </div>
                </div>

                <div class="text-right">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-black {inv.status === 'accepted'
                      ? 'bg-emerald-50 text-[#34A853] border border-emerald-200'
                      : inv.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-gray-100 text-gray-600'}"
                  >
                    {inv.status === 'accepted'
                      ? 'Diterima'
                      : inv.status === 'pending'
                        ? 'Menunggu Tanggapan'
                        : 'Ditolak / Berakhir'}
                  </span>
                  <span class="block text-[10px] text-gray-400 mt-0.5">
                    {formatDateId(inv.createdAt)}
                  </span>
                </div>
              </div>

              <!-- Offer Details -->
              <div class="mt-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black">
                    {inv.typeLabel}
                  </span>
                  <h3 class="text-sm sm:text-base font-black text-gray-900">{inv.position}</h3>
                </div>

                {#if inv.salaryInfo}
                  <p class="text-xs font-extrabold text-[#34A853] mt-1.5">
                    Gaji / Uang Saku: {inv.salaryInfo}
                  </p>
                {/if}

                <p class="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200 mt-2.5 whitespace-pre-line leading-relaxed">
                  "{inv.message}"
                </p>

                {#if inv.declineReason}
                  <p class="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 mt-2 italic">
                    Alasan: "{inv.declineReason}"
                  </p>
                {/if}
              </div>
            </div>

            <!-- Action Row -->
            <div class="pt-3 border-t-2 border-gray-100 flex flex-wrap items-center justify-between gap-2">
              {#if role === 'student'}
                {#if inv.status === 'pending'}
                  <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onclick={() => handleAccept(inv)}
                      class="h-9 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_2px_0_#1e7e34] active:translate-y-0.5 transition cursor-pointer"
                    >
                      Terima Undangan
                    </button>
                    <button
                      type="button"
                      onclick={() => {
                        selectedInvId = inv.id;
                        declineReason = '';
                        declineModalOpen = true;
                      }}
                      class="h-9 px-3 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs active:translate-y-0.5 transition cursor-pointer"
                    >
                      Tolak Sopan
                    </button>
                  </div>
                {:else if inv.status === 'accepted'}
                  <span class="text-xs font-black text-[#34A853] flex items-center gap-1.5">
                    <CheckCircle2 class="w-4 h-4" />
                    <span>Anda telah menerima tawaran ini. Perusahaan akan menghubungi WhatsApp Anda.</span>
                  </span>
                {/if}
              {:else if role === 'company'}
                {#if inv.status === 'accepted'}
                  <div class="flex items-center gap-3">
                    {#if inv.studentWhatsappUrl}
                      <a
                        href={inv.studentWhatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="h-9 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] inline-flex items-center gap-1.5 transition"
                      >
                        <MessageCircle class="w-4 h-4" />
                        <span>Hubungi Kandidat via WhatsApp ({inv.studentPhone})</span>
                      </a>
                    {:else}
                      <span class="text-xs font-bold text-gray-600">Kontak: {inv.studentPhone}</span>
                    {/if}
                  </div>
                {:else if inv.status === 'pending'}
                  <span class="text-xs text-gray-500 font-semibold flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5" />
                    <span>Menunggu konfirmasi siswa (batas 14 hari)</span>
                  </span>
                {/if}

                <button
                  type="button"
                  onclick={() => navigate(`/paspor-kerja/${inv.student.username}`)}
                  class="h-8 px-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileBadge class="w-3.5 h-3.5 text-[#4285F4]" />
                  <span>Lihat CV Siswa</span>
                </button>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Right Sidebar -->
  <div class="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-5 self-start">
    <RightSidebar />
  </div>
</div>

<!-- Modal Tolak Sopan -->
{#if declineModalOpen}
  <div
    class="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white border-2 border-gray-300 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-[0_6px_0_#d1d5db]">
      <h3 class="text-base font-black text-gray-900 mb-1">Tolak Undangan Perusahaan</h3>
      <p class="text-xs text-gray-500 mb-4">
        Sampaikan alasan secara sopan agar hubungan baik dengan industri tetap terjaga.
      </p>

      <form onsubmit={handleDeclineSubmit} class="space-y-3.5">
        <div>
          <label for="dec-reason" class="block text-xs font-bold text-gray-700 mb-1">
            Alasan Penolakan (Opsional)
          </label>
          <textarea
            id="dec-reason"
            rows="3"
            bind:value={declineReason}
            placeholder="Contoh: Terima kasih atas tawarannya, saat ini saya sudah terikat kontrak PKL di tempat lain..."
            class="w-full p-2.5 text-xs border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onclick={() => (declineModalOpen = false)}
            class="h-9 px-4 rounded-xl border-2 border-gray-300 font-bold text-xs text-gray-700 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={declining}
            class="h-9 px-5 rounded-xl bg-[#EA4335] hover:bg-[#d93025] text-white font-bold text-xs shadow-[0_2px_0_#b3261e] disabled:opacity-60 cursor-pointer"
          >
            {declining ? 'Mengirim...' : 'Kirim Penolakan'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

