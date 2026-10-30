<script lang="ts">
  import { AlertTriangle } from 'lucide-svelte';

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    open,
    title,
    message,
    confirmLabel = 'Ya, Lanjutkan',
    cancelLabel = 'Batal',
    danger = false,
    loading = false,
    onConfirm,
    onCancel
  }: Props = $props();
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
      <div class="flex items-start gap-3.5">
        <div
          class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 {danger
            ? 'bg-rose-50 text-rose-600'
            : 'bg-blue-50 text-blue-600'}"
        >
          <AlertTriangle class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900">{title}</h3>
          <p class="text-sm text-slate-600 mt-1 leading-relaxed">{message}</p>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onclick={onCancel}
          disabled={loading}
          class="h-11 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onclick={onConfirm}
          disabled={loading}
          class="h-11 px-5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 {danger
            ? 'bg-rose-600 hover:bg-rose-700'
            : 'bg-blue-600 hover:bg-blue-700'}"
        >
          {loading ? 'Memproses...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

