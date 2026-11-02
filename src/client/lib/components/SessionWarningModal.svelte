<script lang="ts">
  import { Clock, LogOut, ShieldAlert } from 'lucide-svelte';
  import { sessionManager } from '../session.svelte';
  import { auth } from '../auth.svelte';

  let remaining = $derived(sessionManager.remainingSeconds ?? 120);
  let minutes = $derived(Math.floor(remaining / 60));
  let seconds = $derived(String(remaining % 60).padStart(2, '0'));
  let extending = $state(false);

  async function handleExtend() {
    extending = true;
    await sessionManager.extendSession();
    extending = false;
  }

  async function handleLogout() {
    await auth.logout();
    sessionManager.notifyLogout();
  }
</script>

{#if sessionManager.showWarningModal && auth.user}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      class="w-full max-w-md bg-white border-2 border-gray-300 rounded-2xl p-6 shadow-[0_8px_0_#d1d5db] flex flex-col gap-4 text-center"
    >
      <div class="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-[0_3px_0_#fde68a]">
        <Clock class="w-6 h-6 animate-pulse" />
      </div>

      <div>
        <h3 id="session-warning-title" class="text-lg font-black text-gray-900 leading-snug">
          Sesi Akun Akan Berakhir
        </h3>
        <p class="text-xs text-gray-500 mt-1 leading-relaxed">
          Demi keamanan akun Anda, sesi akan otomatis keluar dalam:
        </p>
        <div class="mt-2 text-2xl font-black text-[#EA4335] tracking-widest font-mono">
          {minutes}:{seconds}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-2.5 mt-2">
        <button
          type="button"
          onclick={handleExtend}
          disabled={extending}
          class="flex-1 h-11 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <ShieldAlert class="w-4 h-4" />
          <span>{extending ? 'Memperpanjang...' : 'Tetap Masuk (Perpanjang)'}</span>
        </button>

        <button
          type="button"
          onclick={handleLogout}
          class="h-11 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-700 font-bold text-xs shadow-[0_2px_0_#d1d5db] active:shadow-none active:translate-y-0.5 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut class="w-4 h-4 text-gray-500" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  </div>
{/if}

