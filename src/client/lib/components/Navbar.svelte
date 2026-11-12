<script lang="ts">
  import {
    Award,
    Briefcase,
    Building2,
    ClipboardList,
    Compass,
    FileBadge,
    GraduationCap,
    HandHelping,
    Home,
    LogOut,
    MailCheck,
    PlusCircle,
    School,
    Search,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    Trophy,
    User,
    UserCheck,
    UserPlus,
    MapPin
  } from 'lucide-svelte';
  import { auth } from '../auth.svelte';
  import { locationStore } from '../location.svelte';
  import { navigate, router } from '../router.svelte';
  import { toast } from '../toast.svelte';
  import NotificationBell from './NotificationBell.svelte';

  function isActive(prefix: string): boolean {
    if (prefix === '/') return router.pathname === '/' && !router.search.includes('focus=search');
    return router.pathname === prefix || router.pathname.startsWith(prefix + '/');
  }

  async function handleLogout() {
    await auth.logout();
    toast.success('Anda berhasil keluar dari akun.');
    navigate('/');
  }

  function handleAddPost() {
    if (!auth.user) {
      toast.info('Silakan masuk dengan akun Siswa SMK untuk menambahkan karya.');
      navigate('/masuk');
      return;
    }
    if (auth.user.userType !== 'smk') {
      toast.info('Fitur unggah karya khusus untuk Siswa SMK.');
      return;
    }
    navigate('/jual');
  }

  function handleProfileClick() {
    if (auth.user) {
      navigate(`/profil/${auth.user.username}`);
    } else {
      navigate('/masuk');
    }
  }

  function handleSearchClick() {
    navigate('/?focus=search');
  }
</script>

<!-- Mobile Top Header (< lg) — Clean Centered Logo -->
<header
  class="lg:hidden fixed top-0 inset-x-0 h-15 bg-white border-b-2 border-gray-200 z-30 px-4 flex items-center justify-center shadow-xs print:hidden"
>
  <button
    type="button"
    onclick={() => navigate('/')}
    class="flex items-center gap-2 text-center focus:outline-none cursor-pointer group"
  >
    <img src="/images/skillhub-icon.png" alt="Skill-Hub" class="w-7 h-7 rounded-lg object-contain" />
    <span class="font-black text-xl tracking-wider text-gray-900 group-hover:text-[#4285F4] transition uppercase leading-none">
      SKILL-HUB
    </span>
  </button>
</header>

<!-- Desktop Left Sidebar (>= lg) — 3D Tactile Card (System Design Section 6.1) -->
<aside
  class="hidden lg:flex lg:flex-col bg-white border-2 border-gray-300 rounded-2xl shadow-[0_5px_0_#d1d5db] h-[calc(100vh-2.5rem)] max-h-[calc(100vh-2.5rem)] overflow-hidden print:hidden"
>
  <!-- Fixed Header: Logo SKILL-HUB -->
  <div class="p-4 xl:p-5 pb-3 text-center border-b-2 border-gray-100 shrink-0">
    <button
      type="button"
      onclick={() => navigate('/')}
      class="inline-block text-center focus:outline-none group cursor-pointer"
    >
      <div class="flex items-center justify-center gap-2 mb-0.5">
        <img src="/images/skillhub-icon.png" alt="Skill-Hub" class="w-7 h-7 rounded-lg object-contain" />
        <span
          class="font-black text-2xl xl:text-[25px] tracking-wider text-gray-800 uppercase block drop-shadow-xs group-hover:text-[#4285F4] transition"
        >
          SKILL-HUB
        </span>
      </div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Portofolio &amp; Pameran SMK
      </span>
    </button>
  </div>

  <!-- Scrollable Nav & Bottom Section -->
  <div class="flex-1 overflow-y-auto custom-scrollbar p-4 xl:p-5 flex flex-col justify-between space-y-4">
    <div class="space-y-4">
      <!-- Primary 4-Color Google Navigation -->
    <nav class="flex flex-col gap-2.5" aria-label="Menu Utama">
      <!-- 1. Beranda (Google Blue) -->
      <button
        type="button"
        onclick={() => navigate('/')}
        class="h-11 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
          '/'
        ) && !isActive('/pameran')
          ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0] font-black'
          : 'bg-blue-50/80 text-[#4285F4] border-2 border-blue-200 shadow-[0_2px_0_#bfdbfe] hover:bg-blue-100 font-bold'}"
      >
        <Home class="w-4 h-4 shrink-0" />
        <span>Beranda Karya</span>
      </button>

      <!-- 2. Pameran Karya (Skill-Hub 3D Showcase) -->
      <button
        type="button"
        onclick={() => navigate('/pameran')}
        class="h-11 px-3.5 rounded-xl flex items-center justify-between text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
          '/pameran'
        )
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_3px_0_#1e3a8a] font-black'
          : 'bg-indigo-50/80 text-indigo-700 border-2 border-indigo-200 shadow-[0_2px_0_#c7d2fe] hover:bg-indigo-100 font-bold'}"
      >
        <span class="flex items-center gap-3">
          <Sparkles class="w-4 h-4 shrink-0 text-cyan-500" />
          <span>Pameran Karya 3D</span>
        </span>
        <span class="text-[9px] px-1.5 py-0.5 rounded-md font-black {isActive('/pameran') ? 'bg-white/20 text-white' : 'bg-indigo-200/80 text-indigo-900'}">
          BARU
        </span>
      </button>

      <!-- 2. Cari (Google Yellow) -->
      <button
        type="button"
        onclick={handleSearchClick}
        class="h-11 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {router.search.includes(
          'focus=search'
        )
          ? 'bg-[#FBBC05] text-gray-900 shadow-[0_3px_0_#c68f00] font-black'
          : 'bg-amber-50/80 text-[#b45309] border-2 border-amber-200 shadow-[0_2px_0_#fde68a] hover:bg-amber-100 font-bold'}"
      >
        <Search class="w-4 h-4 shrink-0" />
        <span>Cari Katalog</span>
      </button>

      {#if !auth.user || auth.user.userType === 'smk'}
        <!-- 3. Tambahkan Karya (Google Green) -->
        <button
          type="button"
          onclick={handleAddPost}
          class="h-11 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
            '/jual'
          )
            ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34] font-black'
            : 'bg-emerald-50/80 text-[#34A853] border-2 border-emerald-200 shadow-[0_2px_0_#a7f3d0] hover:bg-emerald-100 font-bold'}"
        >
          <PlusCircle class="w-4 h-4 shrink-0" />
          <span>Unggah Karya</span>
        </button>
      {/if}

      <!-- 4. Profil Akun (Google Red) -->
      <button
        type="button"
        onclick={handleProfileClick}
        class="h-11 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
          '/profil'
        )
          ? 'bg-[#EA4335] text-white shadow-[0_3px_0_#b3261e] font-black'
          : 'bg-rose-50/80 text-[#EA4335] border-2 border-rose-200 shadow-[0_2px_0_#fecdd3] hover:bg-rose-100 font-bold'}"
      >
        <User class="w-4 h-4 shrink-0" />
        <span>Profil Akun</span>
      </button>

      <!-- 5. Lokasi Dekat Saya (#12) -->
      <button
        type="button"
        onclick={() => locationStore.openModal()}
        class="h-11 px-3.5 rounded-xl flex items-center justify-between text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {locationStore.isActive
          ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-[0_3px_0_#d97706] font-black'
          : 'bg-white text-gray-700 border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:border-amber-400 font-bold'}"
      >
        <span class="flex items-center gap-3 truncate">
          <MapPin class="w-4 h-4 shrink-0 text-amber-600" />
          <span class="truncate">{locationStore.displayLabel}</span>
        </span>
        {#if locationStore.isActive}
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
        {/if}
      </button>

      {#if auth.user}
        <NotificationBell />
      {/if}
    </nav>

    <!-- Tier 2: Jembatan Industri Public Navigation -->
    <div class="pt-2 border-t-2 border-gray-100">
      <p class="text-[10px] font-black uppercase tracking-wider text-gray-400 px-1 mb-2">
        Jembatan Industri
      </p>
      <div class="flex flex-col gap-2">
        <button
          type="button"
          onclick={() => navigate('/butuh-bantuan')}
          class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
            '/butuh-bantuan'
          )
            ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34] font-black'
            : 'bg-white text-gray-700 border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:border-[#34A853] font-bold'}"
        >
          <HandHelping class="w-4 h-4 shrink-0 text-[#34A853] {isActive('/butuh-bantuan') ? '!text-white' : ''}" />
          <span>Butuh Bantuan</span>
        </button>

        <button
          type="button"
          onclick={() => navigate('/tantangan')}
          class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
            '/tantangan'
          )
            ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0] font-black'
            : 'bg-white text-gray-700 border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:border-[#4285F4] font-bold'}"
        >
          <Trophy class="w-4 h-4 shrink-0 text-[#FBBC05] {isActive('/tantangan') ? '!text-white' : ''}" />
          <span>Tantangan Industri</span>
        </button>

        <button
          type="button"
          onclick={() => navigate('/sekolah')}
          class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
            '/sekolah'
          )
            ? 'bg-gray-900 text-white shadow-[0_3px_0_#000000] font-black'
            : 'bg-white text-gray-700 border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:border-gray-500 font-bold'}"
        >
          <School class="w-4 h-4 shrink-0 text-[#4285F4] {isActive('/sekolah') ? '!text-white' : ''}" />
          <span>Etalase SMK</span>
        </button>
      </div>
    </div>

    <!-- Role-Specific Tools -->
    {#if auth.user}
      <div class="pt-2 border-t-2 border-gray-100">
        <p class="text-[10px] font-black uppercase tracking-wider text-gray-400 px-1 mb-2">
          Menu Khusus Peran
        </p>
        <div class="flex flex-col gap-2">
          {#if auth.user.userType === 'smk'}
            <button
              type="button"
              onclick={() => navigate('/peluang')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/peluang'
              )
                ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0] font-black'
                : 'bg-blue-50/70 text-[#4285F4] border-2 border-blue-200 shadow-[0_2px_0_#bfdbfe] hover:bg-blue-100 font-bold'}"
            >
              <Sparkles class="w-4 h-4 shrink-0" />
              <span>Hub Peluangku</span>
            </button>

            <button
              type="button"
              onclick={() => navigate('/siap-kerja')}
              class="h-10 px-3.5 rounded-xl flex items-center justify-between text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/siap-kerja'
              )
                ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34] font-black'
                : 'bg-emerald-50/70 text-[#34A853] border-2 border-emerald-200 shadow-[0_2px_0_#a7f3d0] hover:bg-emerald-100 font-bold'}"
            >
              <span class="flex items-center gap-3">
                <UserCheck class="w-4 h-4 shrink-0" />
                <span>Status Siap Kerja</span>
              </span>
              {#if auth.user.openToWork}
                <span class="w-2.5 h-2.5 rounded-full bg-[#34A853] border border-white"></span>
              {/if}
            </button>

            <button
              type="button"
              onclick={() => navigate('/undangan')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/undangan'
              )
                ? 'bg-teal-600 text-white shadow-[0_3px_0_#0f766e] font-black'
                : 'bg-teal-50/70 text-teal-800 border-2 border-teal-200 shadow-[0_2px_0_#99f6e4] hover:bg-teal-100 font-bold'}"
            >
              <MailCheck class="w-4 h-4 shrink-0" />
              <span>Undangan Industri</span>
            </button>

            <button
              type="button"
              onclick={() => navigate('/pesanan-masuk')}
              class="h-10 px-3.5 rounded-xl flex items-center justify-between text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/pesanan-masuk'
              )
                ? 'bg-indigo-600 text-white shadow-[0_3px_0_#4338ca] font-black'
                : 'bg-indigo-50/80 text-indigo-700 border-2 border-indigo-200 shadow-[0_2px_0_#c7d2fe] hover:bg-indigo-100 font-bold'}"
            >
              <span class="flex items-center gap-3">
                <ClipboardList class="w-4 h-4 shrink-0" />
                <span>Pesanan Masuk</span>
              </span>
              {#if auth.pendingOrdersCount > 0}
                <span
                  class="bg-[#EA4335] text-white text-[11px] font-black px-2 py-0.5 rounded-full min-w-5.5 text-center"
                >
                  {auth.pendingOrdersCount}
                </span>
              {/if}
            </button>

            <button
              type="button"
              onclick={() => navigate(`/paspor-kerja/${auth.user!.username}`)}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/paspor-kerja'
              )
                ? 'bg-purple-600 text-white shadow-[0_3px_0_#7e22ce] font-black'
                : 'bg-purple-50/80 text-purple-700 border-2 border-purple-200 shadow-[0_2px_0_#e9d5ff] hover:bg-purple-100 font-bold'}"
            >
              <FileBadge class="w-4 h-4 shrink-0" />
              <span>Paspor Kerja (CV)</span>
            </button>

            <!-- Dashboard Penjual Mini / Buku Kas PKK (#13) -->
            <button
              type="button"
              onclick={() => navigate('/dashboard-penjual')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/dashboard-penjual'
              )
                ? 'bg-amber-600 text-white shadow-[0_3px_0_#b45309] font-black'
                : 'bg-amber-50/80 text-amber-800 border-2 border-amber-200 shadow-[0_2px_0_#fde68a] hover:bg-amber-100 font-bold'}"
            >
              <TrendingUp class="w-4 h-4 shrink-0" />
              <span>Dashboard Penjual (PKK)</span>
            </button>
          {:else if auth.user.userType === 'teacher'}
            <button
              type="button"
              onclick={() => navigate('/dashboard/guru')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/dashboard/guru'
              )
                ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0] font-black'
                : 'bg-blue-50/80 text-[#4285F4] border-2 border-blue-200 shadow-[0_2px_0_#bfdbfe] hover:bg-blue-100 font-bold'}"
            >
              <GraduationCap class="w-4 h-4 shrink-0" />
              <span>Panel Guru SMK</span>
            </button>

            {#if auth.schoolSlug}
              <button
                type="button"
                onclick={() =>
                  navigate(
                    auth.user?.isSchoolAdmin
                      ? `/sekolah/${auth.schoolSlug}/kelola`
                      : `/sekolah/${auth.schoolSlug}`
                  )}
                class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer bg-emerald-50/80 text-[#34A853] border-2 border-emerald-200 shadow-[0_2px_0_#a7f3d0] hover:bg-emerald-100 font-bold"
              >
                <Building2 class="w-4 h-4 shrink-0" />
                <span>{auth.user.isSchoolAdmin ? 'Kelola Etalase SMK' : 'Etalase Sekolahku'}</span>
              </button>
            {/if}
          {:else if auth.user.userType === 'company'}
            <button
              type="button"
              onclick={() => navigate('/talenta')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/talenta'
              )
                ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0] font-black'
                : 'bg-blue-50/80 text-[#4285F4] border-2 border-blue-200 shadow-[0_2px_0_#bfdbfe] hover:bg-blue-100 font-bold'}"
            >
              <Briefcase class="w-4 h-4 shrink-0" />
              <span>Cari Talenta SMK</span>
            </button>

            <button
              type="button"
              onclick={() => navigate('/tantangan/buat')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/tantangan/buat'
              )
                ? 'bg-[#34A853] text-white shadow-[0_3px_0_#1e7e34] font-black'
                : 'bg-emerald-50/80 text-[#34A853] border-2 border-emerald-200 shadow-[0_2px_0_#a7f3d0] hover:bg-emerald-100 font-bold'}"
            >
              <Award class="w-4 h-4 shrink-0" />
              <span>Buat Tantangan</span>
            </button>

            <button
              type="button"
              onclick={() => navigate('/undangan')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/undangan'
              )
                ? 'bg-teal-600 text-white shadow-[0_3px_0_#0f766e] font-black'
                : 'bg-teal-50/80 text-teal-800 border-2 border-teal-200 shadow-[0_2px_0_#99f6e4] hover:bg-teal-100 font-bold'}"
            >
              <MailCheck class="w-4 h-4 shrink-0" />
              <span>Undangan Terkirim</span>
            </button>
          {/if}

          {#if auth.user.userType === 'public' || auth.user.userType === 'company'}
            <button
              type="button"
              onclick={() => navigate('/riwayat-pesanan')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/riwayat-pesanan'
              ) || isActive('/pesanan')
                ? 'bg-indigo-600 text-white shadow-[0_3px_0_#4338ca] font-black'
                : 'bg-indigo-50/80 text-indigo-700 border-2 border-indigo-200 shadow-[0_2px_0_#c7d2fe] hover:bg-indigo-100 font-bold'}"
            >
              <ClipboardList class="w-4 h-4 shrink-0" />
              <span>Pesanan Saya</span>
            </button>
          {/if}

          {#if auth.user.isAdmin || auth.user.userType === 'admin'}
            <button
              type="button"
              onclick={() => navigate('/admin')}
              class="h-10 px-3.5 rounded-xl flex items-center gap-3 text-xs transition w-full text-left active:shadow-none active:translate-y-0.5 cursor-pointer {isActive(
                '/admin'
              )
                ? 'bg-[#EA4335] text-white shadow-[0_3px_0_#b3261e] font-black'
                : 'bg-red-50 text-[#EA4335] border-2 border-red-200 shadow-[0_2px_0_#fecdd3] hover:bg-red-100 font-bold'}"
            >
              <ShieldAlert class="w-4 h-4 shrink-0" />
              <span>Moderasi Admin</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Bottom Action Buttons: 3D Buttons -->
    <div class="pt-4 mt-4 border-t-2 border-gray-200 shrink-0">
      {#if auth.user}
        <div class="p-3 rounded-xl bg-gray-50 border-2 border-gray-300 shadow-[0_2px_0_#d1d5db]">
          <button
            type="button"
            onclick={() => navigate(`/profil/${auth.user!.username}`)}
            class="flex items-center gap-2.5 overflow-hidden text-left w-full mb-2.5 cursor-pointer"
          >
            <img
              src={auth.user.avatarUrl}
              alt={auth.user.name}
              class="w-9 h-9 rounded-full object-cover border border-gray-300 shrink-0"
            />
            <div class="overflow-hidden">
              <p class="text-xs font-extrabold text-gray-900 truncate">
                {auth.user.companyName || auth.user.name}
              </p>
              <p class="text-[11px] text-gray-500 truncate">
                {auth.user.schoolName || '@' + auth.user.username}
              </p>
            </div>
          </button>

          <button
            type="button"
            onclick={handleLogout}
            class="w-full h-9 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-[#EA4335] font-bold text-xs flex items-center justify-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      {:else}
        <div class="flex flex-col gap-2.5">
          <button
            type="button"
            onclick={() => navigate('/masuk')}
            class="h-11 w-full rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 flex items-center justify-center transition cursor-pointer"
          >
            Masuk ke Akun
          </button>
          <button
            type="button"
            onclick={() => navigate('/daftar')}
            class="h-11 w-full rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 flex items-center justify-center transition cursor-pointer"
          >
            Daftar Baru
          </button>
        </div>
      {/if}
    </div>
  </div>
</aside>

<!-- Mobile Bottom Navigation Bar (< lg) -->
<nav
  class="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t-2 border-gray-300 z-30 flex items-center justify-around px-1 shadow-lg print:hidden"
  aria-label="Navigasi Bawah"
>
  <button
    type="button"
    onclick={() => navigate('/')}
    class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
      '/'
    )
      ? 'text-[#4285F4] font-bold'
      : 'text-gray-600 font-medium'}"
  >
    <Home class="w-5 h-5" />
    <span class="text-[10px]">Beranda</span>
  </button>

  <button
    type="button"
    onclick={() => navigate('/butuh-bantuan')}
    class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
      '/butuh-bantuan'
    )
      ? 'text-[#34A853] font-bold'
      : 'text-gray-600 font-medium'}"
  >
    <HandHelping class="w-5 h-5" />
    <span class="text-[10px]">Bantuan</span>
  </button>

  <button
    type="button"
    onclick={() => navigate('/tantangan')}
    class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
      '/tantangan'
    )
      ? 'text-[#b45309] font-bold'
      : 'text-gray-600 font-medium'}"
  >
    <Trophy class="w-5 h-5" />
    <span class="text-[10px]">Tantangan</span>
  </button>

  {#if auth.user?.userType === 'smk'}
    <button
      type="button"
      onclick={() => navigate('/peluang')}
      class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
        '/peluang'
      ) || isActive('/siap-kerja')
        ? 'text-[#4285F4] font-bold'
        : 'text-gray-600 font-medium'}"
    >
      <Sparkles class="w-5 h-5" />
      <span class="text-[10px]">Peluang</span>
    </button>
  {:else if auth.user?.userType === 'company'}
    <button
      type="button"
      onclick={() => navigate('/talenta')}
      class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
        '/talenta'
      )
        ? 'text-[#4285F4] font-bold'
        : 'text-gray-600 font-medium'}"
    >
      <Briefcase class="w-5 h-5" />
      <span class="text-[10px]">Talenta</span>
    </button>
  {:else if auth.user?.isAdmin || auth.user?.userType === 'admin'}
    <button
      type="button"
      onclick={() => navigate('/admin')}
      class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
        '/admin'
      )
        ? 'text-[#EA4335] font-bold'
        : 'text-gray-600 font-medium'}"
    >
      <ShieldAlert class="w-5 h-5" />
      <span class="text-[10px]">Admin</span>
    </button>
  {:else}
    <button
      type="button"
      onclick={() => navigate('/sekolah')}
      class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
        '/sekolah'
      )
        ? 'text-[#4285F4] font-bold'
        : 'text-gray-600 font-medium'}"
    >
      <School class="w-5 h-5" />
      <span class="text-[10px]">SMK</span>
    </button>
  {/if}

  {#if auth.user}
    <button
      type="button"
      onclick={() => navigate(`/profil/${auth.user!.username}`)}
      class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
        '/profil'
      )
        ? 'text-[#EA4335] font-bold'
        : 'text-gray-600 font-medium'}"
    >
      <User class="w-5 h-5" />
      <span class="text-[10px]">Profil</span>
    </button>
  {:else}
    <button
      type="button"
      onclick={() => navigate('/daftar')}
      class="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl min-w-14 cursor-pointer {isActive(
        '/daftar'
      )
        ? 'text-[#34A853] font-bold'
        : 'text-gray-600 font-medium'}"
    >
      <UserPlus class="w-5 h-5" />
      <span class="text-[10px]">Daftar</span>
    </button>
  {/if}
</nav>
