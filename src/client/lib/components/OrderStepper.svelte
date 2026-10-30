<script lang="ts">
  import { Check, Clock, Wrench, PackageCheck, XCircle } from 'lucide-svelte';

  interface Props {
    status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  }

  let { status }: Props = $props();

  const steps = [
    { key: 'requested', label: '1. Pesanan Dikirim', desc: 'Menunggu siswa menerima' },
    { key: 'accepted', label: '2. Diterima Siswa', desc: 'Detail & harga disepakati' },
    { key: 'in_progress', label: '3. Sedang Dikerjakan', desc: 'Karya sedang dibuat' },
    { key: 'completed', label: '4. Selesai', desc: 'Diserahkan & siap diulas' }
  ] as const;

  const statusRank: Record<string, number> = {
    requested: 1,
    accepted: 2,
    in_progress: 3,
    completed: 4,
    cancelled: 0
  };

  let currentRank = $derived(statusRank[status] ?? 1);
</script>

{#if status === 'cancelled'}
  <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800">
    <XCircle class="w-6 h-6 text-rose-600 shrink-0" />
    <div>
      <p class="font-bold text-base">Pesanan Dibatalkan</p>
      <p class="text-sm text-rose-700">Pesanan ini tidak dilanjutkan.</p>
    </div>
  </div>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
    {#each steps as step, idx}
      {@const rank = idx + 1}
      {@const isDone = currentRank > rank || status === 'completed'}
      {@const isCurrent = currentRank === rank && status !== 'completed'}
      <div
        class="p-3.5 rounded-xl border flex sm:flex-col items-center sm:items-start gap-3 transition {isDone
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : isCurrent
            ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-100'
            : 'bg-slate-50 border-slate-200 text-slate-500'}"
      >
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm {isDone
            ? 'bg-emerald-600 text-white'
            : isCurrent
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-600'}"
        >
          {#if isDone}
            <Check class="w-5 h-5" />
          {:else if rank === 1}
            <Clock class="w-4 h-4" />
          {:else if rank === 3}
            <Wrench class="w-4 h-4" />
          {:else if rank === 4}
            <PackageCheck class="w-4 h-4" />
          {:else}
            {rank}
          {/if}
        </div>
        <div>
          <p class="text-sm font-bold leading-snug">{step.label}</p>
          <p class="text-xs opacity-80 mt-0.5">{step.desc}</p>
        </div>
      </div>
    {/each}
  </div>
{/if}

