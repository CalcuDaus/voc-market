<script lang="ts">
  import { Flag, X } from 'lucide-svelte';
  import { apiFetch } from '../api';
  import { toast } from '../toast.svelte';
  import { REPORT_REASON_LABELS } from '../../../shared/constants';

  interface Props {
    open: boolean;
    targetType: 'post' | 'request' | 'challenge' | 'user';
    targetId: number;
    targetLabel?: string;
    onClose: () => void;
  }

  let { open, targetType, targetId, targetLabel = 'konten ini', onClose }: Props = $props();

  let reason = $state('penipuan');
  let details = $state('');
  let submitting = $state(false);

  const reasons = Object.entries(REPORT_REASON_LABELS);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    const res = await apiFetch<{ success?: boolean; error?: string }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetType,
        targetId,
        reason,
        details
      })
    });
    submitting = false;

    if (!res.ok) {
      toast.error(res.data?.error || 'Gagal mengirim laporan.');
      return;
    }

    toast.success('Laporan berhasil dikirim ke Tim Moderasi VOC-Market. Terima kasih!');
    details = '';
    onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-white border-2 border-gray-300 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-[0_6px_0_#d1d5db]"
    >
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-center gap-2.5">
          <div
            class="w-10 h-10 rounded-xl bg-red-50 border-2 border-red-200 text-[#EA4335] flex items-center justify-center shrink-0"
          >
            <Flag class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-black text-gray-900">Laporkan Demi Keamanan Siswa</h3>
            <p class="text-xs text-gray-500 truncate max-w-64">{targetLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="rep-reason" class="block text-xs font-bold text-gray-700 mb-1.5">
            Apa masalah yang Anda temukan?
          </label>
          <select
            id="rep-reason"
            bind:value={reason}
            class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4]"
          >
            {#each reasons as [key, label] (key)}
              <option value={key}>{label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="rep-details" class="block text-xs font-bold text-gray-700 mb-1.5">
            Keterangan Tambahan (Opsional)
          </label>
          <textarea
            id="rep-details"
            rows="3"
            bind:value={details}
            placeholder="Jelaskan secara singkat agar Admin dapat menindaklanjuti lebih cepat..."
            class="w-full p-2.5 text-xs border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4]"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onclick={onClose}
            class="h-10 px-4 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-bold text-xs shadow-[0_2px_0_#d1d5db] active:shadow-none active:translate-y-0.5 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            class="h-10 px-5 rounded-xl bg-[#EA4335] hover:bg-[#d93025] text-white font-bold text-xs shadow-[0_3px_0_#b3261e] active:shadow-none active:translate-y-0.5 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Mengirim...' : 'Kirim Laporan'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

