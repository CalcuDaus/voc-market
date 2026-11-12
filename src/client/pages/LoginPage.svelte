<script lang="ts">
  import {
    ArrowLeft,
    GraduationCap,
    LogIn,
    ShieldAlert,
    UserCheck,
    Users,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate, router } from '../lib/router.svelte';
  import { sanitizeInput } from '../lib/security';
  import { sessionManager, type SavedAccount } from '../lib/session.svelte';
  import { toast } from '../lib/toast.svelte';

  let identifier = $state('');
  let password = $state('');
  let remember = $state(true);
  let loading = $state(false);
  let errorMsg = $state('');
  let savedAccount = $state<SavedAccount | null>(null);

  let isSessionExpiredAlert = $derived(
    router.search.includes('reason=session_expired')
  );

  $effect(() => {
    savedAccount = sessionManager.getSavedAccount();
    if (savedAccount && !identifier) {
      identifier = savedAccount.username;
    }
  });

  function useSavedAccount() {
    if (savedAccount) {
      identifier = savedAccount.username;
      const pwInput = document.getElementById('login-pw');
      if (pwInput) pwInput.focus();
    }
  }

  function handleRemoveSavedAccount(e: MouseEvent) {
    e.stopPropagation();
    sessionManager.clearSavedAccount();
    savedAccount = null;
    identifier = '';
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = '';
    loading = true;

    // Filter XSS on form inputs
    const cleanIdentifier = sanitizeInput(identifier);

    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: cleanIdentifier, password, remember })
    });

    loading = false;
    if (!res.ok) {
      errorMsg = res.data?.error || 'Gagal masuk. Periksa kembali akun dan password Anda.';
      return;
    }

    if (remember) {
      sessionManager.saveAccount(res.data.user);
    } else {
      sessionManager.clearSavedAccount();
    }

    auth.setAuthenticated(res.data.user, res.data.session);
    await auth.refresh();
    toast.success(`Selamat datang kembali, ${res.data.user.name}!`);

    if (res.data.user.isAdmin || res.data.user.userType === 'admin') {
      navigate('/admin');
    } else if (res.data.user.userType === 'teacher') {
      navigate('/dashboard/guru');
    } else {
      navigate('/');
    }
  }

  function fillDemo(user: string) {
    identifier = user;
    password = 'password123';
  }
</script>

<!-- Double-layer Canvas Background: Outer bg-gray-800 + Inner bg-[#EEEEEE] (Section 4) -->
<div class="fixed inset-0 z-50 bg-gray-800 flex justify-center items-center p-3 sm:p-5 overflow-auto">
  <div
    class="bg-[#EEEEEE] w-full max-w-4xl min-h-[520px] rounded-2xl p-4 sm:p-6 shadow-lg relative flex items-center justify-center"
  >
    <!-- Back to Home Button -->
    <button
      type="button"
      onclick={() => navigate('/')}
      class="absolute top-4 left-4 bg-white border border-gray-300 text-xs font-semibold text-gray-500 hover:text-gray-800 rounded-lg px-3 py-1.5 shadow-sm inline-flex items-center gap-1.5 transition active:translate-y-0.5 cursor-pointer z-20"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      <span>Kembali ke Beranda</span>
    </button>

    <!-- Card Login Surface 3D (Section 4.1) -->
    <div
      class="w-full max-w-[760px] bg-white border-2 border-gray-300 shadow-[0_5px_0_#d1d5db] rounded-2xl flex flex-col lg:flex-row overflow-hidden my-auto"
    >
      <!-- Sisi Kiri (Desktop Only lg:w-[42%]) -->
      <div
        class="bg-gray-50/50 border-b-2 lg:border-b-0 lg:border-r-2 border-gray-300 p-6 sm:p-8 flex flex-col justify-center items-center text-center lg:w-[42%]"
      >
        <img
          src="/images/skillhub-banner.png"
          alt="Skill-Hub"
          class="w-[200px] sm:w-[220px] mb-4 object-contain rounded-xl shadow-xs"
        />
        <p class="text-xs text-gray-500 leading-relaxed max-w-xs">
          Portal pameran karya nyata, prototipe 3D, dan portofolio keahlian siswa SMK Indonesia.
        </p>

        <!-- Quick Demo Accounts for Testing -->
        <div class="mt-6 pt-5 border-t-2 border-gray-200 w-full text-left">
          <p class="text-[11px] font-bold text-gray-600 mb-2 text-center uppercase tracking-wider">
            Akun Uji Coba:
          </p>
          <div class="flex flex-col gap-1.5">
            <button
              type="button"
              onclick={() => fillDemo('superadmin')}
              class="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-black text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldAlert class="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Superadmin: <strong class="font-bold text-amber-300">superadmin</strong></span>
            </button>
            <button
              type="button"
              onclick={() => fillDemo('draz_me')}
              class="w-full text-left px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 text-xs font-semibold text-gray-700 hover:text-[#4285F4] transition flex items-center gap-1.5 cursor-pointer"
            >
              <GraduationCap class="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Siswa: <strong class="font-bold">draz_me</strong></span>
            </button>
            <button
              type="button"
              onclick={() => fillDemo('guru_hendra')}
              class="w-full text-left px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 text-xs font-semibold text-gray-700 hover:text-[#4285F4] transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Guru: <strong class="font-bold">guru_hendra</strong></span>
            </button>
            <button
              type="button"
              onclick={() => fillDemo('warung_rahmat')}
              class="w-full text-left px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 text-xs font-semibold text-gray-700 hover:text-[#4285F4] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users class="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Pembeli: <strong class="font-bold">warung_rahmat</strong></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sisi Kanan (Formulir lg:w-[58%] w-full) -->
      <div class="p-6 sm:p-8 flex flex-col justify-center lg:w-[58%] w-full">
        <!-- Mobile Logo -->
        <div class="block lg:hidden text-center mb-4">
          <img
            src="/images/skillhub-banner.png"
            alt="Skill-Hub"
            class="w-[200px] mx-auto object-contain rounded-xl shadow-xs"
          />
        </div>

        <!-- 4-Color Heading (Section 4.1) -->
        <h2 class="text-xl sm:text-2xl font-black mb-1">
          <span class="text-[#34A853]">Wel</span><span class="text-[#4285F4]">come</span>,
          <span class="text-[#FBBC05]">Wari</span><span class="text-[#EA4335]">orrs</span>
        </h2>
        <p class="text-xs text-gray-500 mb-4">
          Masuk ke akun Anda untuk mulai berkarya atau memesan.
        </p>

        {#if isSessionExpiredAlert}
          <div class="mb-4 p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2 shadow-[0_2px_0_#fde68a]">
            <ShieldAlert class="w-4 h-4 text-amber-600 shrink-0" />
            <span>Sesi akun Anda telah berakhir demi keamanan. Silakan masukkan password untuk masuk kembali.</span>
          </div>
        {/if}

        {#if savedAccount}
          <!-- Saved Account Quick Login Chip (Meta / Facebook style) -->
          <div class="mb-4 p-3 rounded-2xl bg-blue-50/90 border-2 border-blue-200 shadow-[0_3px_0_#bfdbfe] flex items-center justify-between gap-3">
            <button
              type="button"
              onclick={useSavedAccount}
              class="flex items-center gap-3 text-left overflow-hidden flex-1 group cursor-pointer"
            >
              <img
                src={savedAccount.avatarUrl}
                alt={savedAccount.name}
                class="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0 group-hover:scale-105 transition"
              />
              <div class="overflow-hidden">
                <p class="text-xs font-black text-gray-900 truncate group-hover:text-[#4285F4] transition">
                  {savedAccount.name}
                </p>
                <p class="text-[11px] text-[#4285F4] font-bold truncate">
                  @{savedAccount.username}
                </p>
              </div>
            </button>

            <button
              type="button"
              onclick={handleRemoveSavedAccount}
              title="Lupakan akun tersimpan ini"
              class="h-7 px-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-500 hover:text-red-600 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X class="w-3.5 h-3.5" />
              <span>Ganti</span>
            </button>
          </div>
        {/if}

        {#if errorMsg}
          <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#EA4335] text-xs font-bold">
            {errorMsg}
          </div>
        {/if}

        <form onsubmit={handleSubmit} class="space-y-4">
          <div>
            <label for="login-id" class="block text-xs font-bold text-gray-700 mb-1.5">
              Email atau Username
            </label>
            <input
              id="login-id"
              type="text"
              bind:value={identifier}
              placeholder="nama@email.com atau username"
              required
              class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
            />
          </div>

          <div>
            <label for="login-pw" class="block text-xs font-bold text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="login-pw"
              type="password"
              bind:value={password}
              placeholder="••••••••"
              required
              class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
            />
          </div>

          <div class="flex items-center justify-between text-xs text-gray-600">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                bind:checked={remember}
                class="w-4 h-4 rounded border-2 border-gray-300 text-[#4285F4] focus:ring-[#4285F4] cursor-pointer"
              />
              <div>
                <span class="font-bold text-gray-800">Ingat Saya (Remind Me)</span>
                <span class="block text-[10px] text-gray-400">Tetap masuk selama 30 hari</span>
              </div>
            </label>

            <span class="text-[#4285F4] font-medium hidden sm:inline">Demo: password123</span>
          </div>

          <!-- Submit Button Google Blue Chunky 3D (Section 4.3) -->
          <button
            type="submit"
            disabled={loading}
            class="w-full bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_4px_0_#1a56b0] active:shadow-none active:translate-y-0.5 text-white font-bold p-3 rounded-xl text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            <LogIn class="w-4 h-4" />
            <span>{loading ? 'Memproses Masuk...' : 'Masuk ke Akun'}</span>
          </button>
        </form>

        <p class="text-center text-xs text-gray-600 mt-5">
          Belum punya akun?
          <button
            type="button"
            onclick={() => navigate('/daftar')}
            class="text-[#4285F4] font-bold hover:underline cursor-pointer ml-1"
          >
            Daftar Sekarang
          </button>
        </p>
      </div>
    </div>
  </div>
</div>
