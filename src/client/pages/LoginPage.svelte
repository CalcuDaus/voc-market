<script lang="ts">
  import {
    ArrowLeft,
    GraduationCap,
    LogIn,
    UserCheck,
    Users
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';

  let identifier = $state('');
  let password = $state('');
  let remember = $state(true);
  let loading = $state(false);
  let errorMsg = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = '';
    loading = true;

    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, remember })
    });

    loading = false;
    if (!res.ok) {
      errorMsg = res.data?.error || 'Gagal masuk. Periksa kembali akun dan password Anda.';
      return;
    }

    auth.setAuthenticated(res.data.user);
    await auth.refresh();
    toast.success(`Selamat datang kembali, ${res.data.user.name}!`);

    if (res.data.user.userType === 'teacher') {
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
          src="/images/voc-market-logo-login.png"
          alt="VOC-Market"
          class="w-[170px] sm:w-[190px] mb-4 object-contain"
        />
        <p class="text-xs text-gray-500 leading-relaxed max-w-xs">
          Platform showcase dan jual-beli karya anak SMK & vokasi Indonesia.
        </p>

        <!-- Quick Demo Accounts for Testing -->
        <div class="mt-6 pt-5 border-t-2 border-gray-200 w-full text-left">
          <p class="text-[11px] font-bold text-gray-600 mb-2 text-center uppercase tracking-wider">
            Akun Uji Coba:
          </p>
          <div class="flex flex-col gap-1.5">
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
            src="/images/voc-market-logo-mobile.png"
            alt="VOC-Market"
            class="w-[180px] mx-auto object-contain"
          />
        </div>

        <!-- 4-Color Heading (Section 4.1) -->
        <h2 class="text-xl sm:text-2xl font-black mb-1">
          <span class="text-[#34A853]">Wel</span><span class="text-[#4285F4]">come</span>,
          <span class="text-[#FBBC05]">Wari</span><span class="text-[#EA4335]">orrs</span>
        </h2>
        <p class="text-xs text-gray-500 mb-5">
          Masuk ke akun Anda untuk mulai berkarya atau memesan.
        </p>

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
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={remember}
                class="rounded border-gray-300 text-[#4285F4] focus:ring-[#4285F4]"
              />
              <span>Ingat Saya</span>
            </label>

            <span class="text-[#4285F4] font-medium">Password demo: password123</span>
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
