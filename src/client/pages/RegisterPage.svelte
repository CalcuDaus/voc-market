<script lang="ts">
  import {
    ArrowLeft,
    Building2,
    GraduationCap,
    UserCheck,
    UserPlus,
    Users
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { sanitizeInput } from '../lib/security';
  import { toast } from '../lib/toast.svelte';
  import SchoolAutocomplete from '../lib/components/SchoolAutocomplete.svelte';

  let userType = $state<'smk' | 'public' | 'teacher' | 'company'>('smk');
  let firstName = $state('');
  let lastName = $state('');
  let username = $state('');
  let email = $state('');
  let phoneNumber = $state('');
  let password = $state('');
  let confirmPassword = $state('');

  let schoolName = $state('');
  let schoolId = $state<number | null>(null);
  let regionId = $state<number>(0);
  let major = $state('');
  let nisn = $state('');
  let nip = $state('');
  let skills = $state('');
  let businessName = $state('');
  let businessType = $state('');

  let companyName = $state('');
  let companySector = $state('');
  let companyWebsite = $state('');
  let companyNib = $state('');

  let regions = $state<{ id: number; name: string; province: string }[]>([]);
  let avatarFile = $state<File | null>(null);
  let avatarPreview = $state('');

  let loading = $state(false);
  let errorMsg = $state('');

  $effect(() => {
    apiFetch<{ items?: { id: number; name: string; province: string }[] }>('/api/regions').then(
      (res) => {
        if (res.ok && res.data?.items) {
          regions = res.data.items;
        }
      }
    );
  });

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0] || null;
    avatarFile = file;
    if (file) {
      avatarPreview = URL.createObjectURL(file);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = '';
    loading = true;

    const form = new FormData();
    form.append('userType', userType);
    form.append('firstName', sanitizeInput(firstName));
    form.append('lastName', sanitizeInput(lastName));
    form.append('username', sanitizeInput(username).toLowerCase());
    form.append('email', sanitizeInput(email).toLowerCase());
    form.append('phoneNumber', sanitizeInput(phoneNumber));
    form.append('password', password);
    form.append('confirmPassword', confirmPassword);
    if (regionId > 0) form.append('regionId', String(regionId));

    if (userType === 'smk' || userType === 'teacher') {
      form.append('schoolName', sanitizeInput(schoolName));
      if (schoolId) form.append('schoolId', String(schoolId));
      form.append('major', sanitizeInput(major));
    }
    if (userType === 'smk') {
      form.append('nisn', sanitizeInput(nisn));
      form.append('skills', sanitizeInput(skills));
    }
    if (userType === 'teacher') {
      form.append('nip', sanitizeInput(nip));
    }
    if (userType === 'public') {
      if (businessName) form.append('businessName', sanitizeInput(businessName));
      if (businessType) form.append('businessType', sanitizeInput(businessType));
    }
    if (userType === 'company') {
      form.append('companyName', sanitizeInput(companyName));
      if (companySector) form.append('companySector', sanitizeInput(companySector));
      if (companyWebsite) form.append('companyWebsite', sanitizeInput(companyWebsite));
      if (companyNib) form.append('companyNib', sanitizeInput(companyNib));
    }
    if (avatarFile) {
      form.append('avatar', avatarFile);
    }

    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: form
    });

    loading = false;
    if (!res.ok) {
      errorMsg = res.data?.error || 'Pendaftaran gagal. Periksa kembali isian formulir Anda.';
      return;
    }

    auth.setAuthenticated(res.data.user);
    await auth.refresh();

    if (userType === 'company') {
      toast.success(
        'Akun Mitra Industri terdaftar! Admin akan meninjau verifikasi perusahaan Anda untuk membuka Direktori Talenta.'
      );
      navigate('/tantangan');
    } else if (userType === 'teacher') {
      toast.success('Pendaftaran berhasil! Selamat datang di Panel Guru SMK.');
      navigate('/dashboard/guru');
    } else if (userType === 'smk') {
      toast.success('Pendaftaran berhasil! Selamat datang di VOC-Market.');
      navigate('/jual');
    } else {
      toast.success('Pendaftaran berhasil! Selamat datang di VOC-Market.');
      navigate('/');
    }
  }
</script>

<!-- Double-layer Canvas Background (System Design Section 5) -->
<div class="fixed inset-0 z-50 bg-gray-800 flex justify-center items-center p-3 sm:p-5 overflow-auto">
  <div
    class="bg-[#EEEEEE] w-full max-w-5xl rounded-2xl p-4 sm:p-6 shadow-lg relative flex items-center justify-center my-auto"
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

    <!-- Card Form 2 Kolom (Section 5.1) -->
    <div
      class="w-full bg-white border-2 border-gray-300 shadow-[0_5px_0_#d1d5db] rounded-2xl flex flex-col lg:flex-row overflow-hidden my-auto max-h-[88vh]"
    >
      <!-- Kolom Kiri (lg:w-1/2): Data Kredensial & Identitas Akun -->
      <div
        class="lg:w-1/2 p-6 sm:p-8 overflow-y-auto border-b-2 lg:border-b-0 lg:border-r-2 border-gray-300 flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center gap-2 mb-3 pt-4 lg:pt-0">
            <img src="/images/voc-logo.png" alt="VOC-Market" class="w-8 h-8 object-contain" />
            <h1 class="text-xl font-bold text-gray-900">Daftar Akun Baru</h1>
          </div>
          <p class="text-xs text-gray-500 mb-5">
            Lengkapi data akun untuk mulai berkarya, memesan bantuan siswa, atau merekrut talenta SMK.
          </p>

          {#if errorMsg}
            <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#EA4335] text-xs font-bold">
              {errorMsg}
            </div>
          {/if}

          <div class="space-y-3.5">
            <!-- Email -->
            <div>
              <label for="reg-email" class="block text-xs font-bold text-gray-700 mb-1">
                Alamat Email Aktif <span class="text-[#EA4335]">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                bind:value={email}
                required
                placeholder="nama@email.com"
                class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
              />
            </div>

            <!-- Nama Depan & Belakang -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="reg-fname" class="block text-xs font-bold text-gray-700 mb-1">
                  {userType === 'company' ? 'Nama PIC / Kontak' : 'Nama Depan'}
                  <span class="text-[#EA4335]">*</span>
                </label>
                <input
                  id="reg-fname"
                  type="text"
                  bind:value={firstName}
                  required
                  placeholder="Nama depan"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
                />
              </div>
              <div>
                <label for="reg-lname" class="block text-xs font-bold text-gray-700 mb-1">
                  Nama Belakang
                </label>
                <input
                  id="reg-lname"
                  type="text"
                  bind:value={lastName}
                  placeholder="Nama belakang"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
                />
              </div>
            </div>

            <!-- Username Unik (@ prefix) -->
            <div>
              <label for="reg-username" class="block text-xs font-bold text-gray-700 mb-1">
                Username Unik <span class="text-[#EA4335]">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">@</span>
                <input
                  id="reg-username"
                  type="text"
                  bind:value={username}
                  required
                  placeholder="username_anda"
                  class="w-full p-2.5 pl-8 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
                />
              </div>
            </div>

            <!-- Password & Ulangi Password -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="reg-pwd" class="block text-xs font-bold text-gray-700 mb-1">
                  Password <span class="text-[#EA4335]">*</span>
                </label>
                <input
                  id="reg-pwd"
                  type="password"
                  bind:value={password}
                  required
                  placeholder="Min. 6 karakter"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
                />
              </div>
              <div>
                <label for="reg-cpwd" class="block text-xs font-bold text-gray-700 mb-1">
                  Ulangi Password <span class="text-[#EA4335]">*</span>
                </label>
                <input
                  id="reg-cpwd"
                  type="password"
                  bind:value={confirmPassword}
                  required
                  placeholder="Ketik ulang"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
                />
              </div>
            </div>

            <!-- Nomor WhatsApp & Wilayah -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="reg-phone" class="block text-xs font-bold text-gray-700 mb-1">
                  Nomor WhatsApp <span class="text-[#EA4335]">*</span>
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  bind:value={phoneNumber}
                  required
                  placeholder="08xxxxxxxxxx"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
                />
              </div>
              <div>
                <label for="reg-region" class="block text-xs font-bold text-gray-700 mb-1">
                  Kota / Kabupaten
                </label>
                <select
                  id="reg-region"
                  bind:value={regionId}
                  class="w-full p-2.5 text-xs border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
                >
                  <option value={0}>Pilih Wilayah (Opsional)</option>
                  {#each regions as reg (reg.id)}
                    <option value={reg.id}>{reg.name} ({reg.province})</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- Foto Profil -->
            <div>
              <label for="reg-avatar" class="block text-xs font-bold text-gray-700 mb-1">
                {userType === 'company' ? 'Logo Perusahaan (Opsional)' : 'Foto Profil (Opsional)'}
              </label>
              <div class="flex items-center gap-3">
                {#if avatarPreview}
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    class="w-11 h-11 rounded-full object-cover border-2 border-gray-300 shrink-0"
                  />
                {/if}
                <input
                  id="reg-avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onchange={onFileChange}
                  class="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#4285F4] hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <p class="text-xs text-gray-500 mt-5 pt-3 border-t border-gray-200">
          Sudah punya akun?
          <button
            type="button"
            onclick={() => navigate('/masuk')}
            class="text-[#4285F4] font-bold hover:underline cursor-pointer ml-1"
          >
            Masuk ke Akun
          </button>
        </p>
      </div>

      <!-- Kolom Kanan (lg:w-1/2): Peran Pengguna & Data Vokasi/Industri Dinamis -->
      <form
        onsubmit={handleSubmit}
        class="lg:w-1/2 p-6 sm:p-8 overflow-y-auto bg-gray-50/50 flex flex-col justify-between"
      >
        <div>
          <!-- Pilihan Tipe Akun (4-Role 3D Selector) -->
          <span class="block text-xs font-bold text-gray-700 mb-2">
            Pilih Peran Akun Anda <span class="text-[#EA4335]">*</span>
          </span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {#each [
              { id: 'smk', icon: GraduationCap, label: 'Siswa SMK' },
              { id: 'teacher', icon: UserCheck, label: 'Guru SMK' },
              { id: 'public', icon: Users, label: 'Warga/UMKM' },
              { id: 'company', icon: Building2, label: 'Mitra Industri' }
            ] as role (role.id)}
              <button
                type="button"
                onclick={() => (userType = role.id as any)}
                class="p-2.5 rounded-xl border-2 text-center transition cursor-pointer active:translate-y-0.5 {userType ===
                role.id
                  ? 'bg-blue-50 border-[#4285F4] text-[#4285F4] shadow-[0_3px_0_#1a56b0] font-bold'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 shadow-[0_2px_0_#d1d5db]'}"
              >
                <div class="flex justify-center mb-1">
                  <role.icon class="w-5 h-5 {userType === role.id ? 'text-[#4285F4]' : 'text-gray-500'}" />
                </div>
                <div class="text-[11px] font-bold mt-1 leading-tight">{role.label}</div>
              </button>
            {/each}
          </div>

          <!-- Dynamic Form Section based on userType -->
          {#if userType === 'smk'}
            <div class="border-2 border-gray-200 bg-white rounded-xl p-4 shadow-[0_2px_0_#d1d5db] space-y-3.5 mb-5">
              <div class="flex items-center gap-1.5 text-xs font-bold text-[#4285F4] mb-1">
                <GraduationCap class="w-4 h-4 text-[#4285F4]" />
                <span>Data Sekolah &amp; Kompetensi Kejuruan</span>
              </div>

              <div>
                <span class="block text-xs font-bold text-gray-700 mb-1">
                  Nama SMK / Sekolah <span class="text-[#EA4335]">*</span>
                </span>
                <SchoolAutocomplete
                  {schoolName}
                  {schoolId}
                  required={true}
                  onSelect={(s) => {
                    schoolId = s.id;
                    schoolName = s.name;
                  }}
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="smk-nisn" class="block text-xs font-bold text-gray-700 mb-1">
                    NISN <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="smk-nisn"
                    type="text"
                    bind:value={nisn}
                    required
                    placeholder="Nomor Induk Siswa"
                    class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                  />
                </div>
                <div>
                  <label for="smk-major" class="block text-xs font-bold text-gray-700 mb-1">
                    Jurusan / Kompetensi <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="smk-major"
                    type="text"
                    bind:value={major}
                    required
                    placeholder="Contoh: RPL / Otomotif"
                    class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                  />
                </div>
              </div>

              <div>
                <label for="smk-skills" class="block text-xs font-bold text-gray-700 mb-1">
                  Keahlian Utama (Pisahkan dengan koma)
                </label>
                <input
                  id="smk-skills"
                  type="text"
                  bind:value={skills}
                  placeholder="Contoh: Desain Web, Servis Injeksi, Kue Kering"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>
            </div>
          {:else if userType === 'teacher'}
            <div class="border-2 border-blue-200 bg-white rounded-xl p-4 shadow-[0_2px_0_#d1d5db] space-y-3.5 mb-5">
              <div class="flex items-center gap-1.5 text-xs font-bold text-[#4285F4] mb-1">
                <UserCheck class="w-4 h-4 text-[#4285F4]" />
                <span>Data Guru Pembimbing SMK</span>
              </div>

              <div>
                <span class="block text-xs font-bold text-gray-700 mb-1">
                  Nama SMK Tempat Mengajar <span class="text-[#EA4335]">*</span>
                </span>
                <SchoolAutocomplete
                  {schoolName}
                  {schoolId}
                  required={true}
                  onSelect={(s) => {
                    schoolId = s.id;
                    schoolName = s.name;
                  }}
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="tch-nip" class="block text-xs font-bold text-gray-700 mb-1">
                    NIP / NUPTK <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="tch-nip"
                    type="text"
                    bind:value={nip}
                    required
                    placeholder="Nomor identitas guru"
                    class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                  />
                </div>
                <div>
                  <label for="tch-major" class="block text-xs font-bold text-gray-700 mb-1">
                    Jurusan Yang Dibimbing <span class="text-[#EA4335]">*</span>
                  </label>
                  <input
                    id="tch-major"
                    type="text"
                    bind:value={major}
                    required
                    placeholder="Contoh: Rekayasa Perangkat Lunak"
                    class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                  />
                </div>
              </div>
            </div>
          {:else if userType === 'company'}
            <div class="border-2 border-amber-200 bg-white rounded-xl p-4 shadow-[0_2px_0_#d1d5db] space-y-3.5 mb-5">
              <div class="flex items-center gap-1.5 text-xs font-bold text-[#b45309] mb-1">
                <Building2 class="w-4 h-4 text-[#b45309]" />
                <span>Data Mitra Industri &amp; Perusahaan</span>
              </div>
              <p class="text-[11px] text-gray-500 leading-relaxed">
                Akun perusahaan akan ditinjau oleh Admin Platform demi menjaga keamanan siswa sebelum membuka akses Direktori Talenta & Tantangan Industri.
              </p>

              <div>
                <label for="cmp-name" class="block text-xs font-bold text-gray-700 mb-1">
                  Nama Resmi Perusahaan / Instansi <span class="text-[#EA4335]">*</span>
                </label>
                <input
                  id="cmp-name"
                  type="text"
                  bind:value={companyName}
                  required
                  placeholder="Contoh: PT Teknologi Nusantara Digital"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="cmp-sec" class="block text-xs font-bold text-gray-700 mb-1">
                    Sektor Industri
                  </label>
                  <input
                    id="cmp-sec"
                    type="text"
                    bind:value={companySector}
                    placeholder="Contoh: Software / Manufaktur"
                    class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                  />
                </div>
                <div>
                  <label for="cmp-nib" class="block text-xs font-bold text-gray-700 mb-1">
                    NIB / Nomor Badan Usaha
                  </label>
                  <input
                    id="cmp-nib"
                    type="text"
                    bind:value={companyNib}
                    placeholder="Opsional (mempercepat verifikasi)"
                    class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                  />
                </div>
              </div>

              <div>
                <label for="cmp-web" class="block text-xs font-bold text-gray-700 mb-1">
                  Website Resmi Perusahaan
                </label>
                <input
                  id="cmp-web"
                  type="url"
                  bind:value={companyWebsite}
                  placeholder="https://perusahaan.co.id"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>
            </div>
          {:else}
            <div class="border-2 border-emerald-200 bg-white rounded-xl p-4 shadow-[0_2px_0_#d1d5db] space-y-3.5 mb-5">
              <div class="flex items-center gap-1.5 text-xs font-bold text-[#34A853] mb-1">
                <Users class="w-4 h-4 text-[#34A853]" />
                <span>Profil Pembeli / Warga / Mitra UMKM</span>
              </div>
              <p class="text-xs text-gray-500">
                Pesan produk & layanan siswa SMK, atau posting kebutuhan usaha Anda di Papan "Butuh Bantuan".
              </p>

              <div>
                <label for="pub-biz" class="block text-xs font-bold text-gray-700 mb-1">
                  Nama Bisnis / Usaha (Opsional)
                </label>
                <input
                  id="pub-biz"
                  type="text"
                  bind:value={businessName}
                  placeholder="Contoh: Warung Kopi Rahmat"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>

              <div>
                <label for="pub-type" class="block text-xs font-bold text-gray-700 mb-1">
                  Bidang Usaha (Opsional)
                </label>
                <input
                  id="pub-type"
                  type="text"
                  bind:value={businessType}
                  placeholder="Contoh: Kuliner UMKM / Bengkel / Ritel"
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- Submit Button Google Blue Chunky 3D -->
        <button
          type="submit"
          disabled={loading}
          class="w-full bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_4px_0_#1a56b0] active:shadow-none active:translate-y-0.5 text-white font-bold p-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 mt-4"
        >
          <UserPlus class="w-4 h-4" />
          <span>{loading ? 'Mendaftarkan Akun...' : 'Daftar & Mulai Sekarang'}</span>
        </button>
      </form>
    </div>
  </div>
</div>
