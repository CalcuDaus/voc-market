<script lang="ts">
  import { Bell } from 'lucide-svelte';
  import { navigate, router } from '../router.svelte';
  import { wsClient } from '../ws.svelte';

  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();
  let isActive = $derived(router.pathname === '/notifikasi');
</script>

{#if compact}
  <button
    type="button"
    onclick={() => navigate('/notifikasi')}
    aria-label="Notifikasi"
    class="relative w-9 h-9 rounded-xl border-2 flex items-center justify-center transition active:translate-y-0.5 cursor-pointer {isActive
      ? 'bg-[#FBBC05] border-[#c68f00] text-gray-900 shadow-[0_2px_0_#c68f00]'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-[0_2px_0_#d1d5db]'}"
  >
    <Bell class="w-4 h-4" />
    {#if wsClient.unreadCount > 0}
      <span
        class="absolute -top-1.5 -right-1.5 bg-[#EA4335] text-white text-[10px] font-black px-1.5 min-w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white"
      >
        {wsClient.unreadCount > 99 ? '99+' : wsClient.unreadCount}
      </span>
    {/if}
  </button>
{:else}
  <button
    type="button"
    onclick={() => navigate('/notifikasi')}
    class="h-11 px-4 rounded-xl flex items-center justify-between text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive
      ? 'bg-[#FBBC05] text-gray-900 shadow-[0_3px_0_#c68f00] font-black'
      : 'bg-amber-50/70 text-amber-900 border-2 border-amber-200 shadow-[0_2px_0_#fde68a] hover:bg-amber-100 font-bold'}"
  >
    <span class="flex items-center gap-3">
      <Bell class="w-4 h-4 shrink-0" />
      <span>Notifikasi</span>
    </span>
    {#if wsClient.unreadCount > 0}
      <span
        class="bg-[#EA4335] text-white text-[11px] font-black px-2 py-0.5 rounded-full min-w-5.5 text-center"
      >
        {wsClient.unreadCount > 99 ? '99+' : wsClient.unreadCount}
      </span>
    {/if}
  </button>
{/if}

