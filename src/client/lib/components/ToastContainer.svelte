<script lang="ts">
  import { CheckCircle2, AlertCircle, Info, X } from 'lucide-svelte';
  import { toast } from '../toast.svelte';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none print:hidden">
  {#each toast.items as item (item.id)}
    <div
      class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg transition bg-white {item.type ===
      'success'
        ? 'border-emerald-200 text-slate-900'
        : item.type === 'error'
          ? 'border-rose-200 text-slate-900'
          : 'border-blue-200 text-slate-900'}"
      role="status"
    >
      {#if item.type === 'success'}
        <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
      {:else if item.type === 'error'}
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      {:else}
        <Info class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      {/if}
      <p class="text-sm font-medium leading-snug flex-1">{item.message}</p>
      <button
        type="button"
        onclick={() => toast.dismiss(item.id)}
        class="text-slate-400 hover:text-slate-700 p-0.5 rounded-lg"
        aria-label="Tutup pesan"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>

