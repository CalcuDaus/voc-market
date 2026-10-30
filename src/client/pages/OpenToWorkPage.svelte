<script lang="ts">
  import {
    ArrowLeft,
    Award,
    CheckCircle2,
    FileBadge,
    PlusCircle,
    Save,
    School,
    ShieldAlert,
    Sparkles,
    UserCheck,
    XCircle
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import SchoolAutocomplete from '../lib/components/SchoolAutocomplete.svelte';
  import {
    JOB_PREF_TYPE_LABELS,
    SMK_MAJORS_LIST,
    STUDENT_STATUS_LABELS
  } from '../../shared/constants';

  let loading = $state(true);
  let saving = $state(false);
  let errorMsg = $state('');

  let openToWork = $state(false);
  let talentScore = $state(0);
  let publishedWorksCount = $state(0);
  let checklist = $state<{
    school: boolean;
    major: boolean;
    skills: boolean;
    headline: boolean;
    publishedWorks: boolean;
  }>({
    school: false,
    major: false,
    skills: false,
    headline: false,
    publishedWorks: false
  });
  let missingFields = $state<string[]>([]);

  let schoolName = $state('');
  let schoolId = $state<number | null>(null);
  let major = $state('');
  let skillsText = $state('');
  let headline = $state('');
  let studentStatus = $state<'active' | 'final_year' | 'alumni'>('active');
  let graduationYear = $state<number | ''>('');
  let regionId = $state<number>(0);
  let selectedJobTypes = $state<string[]>(['pkl']);
  let willingToRelocate = $state(false);

  let regions = $state<any[]>([]);

  async function loadData() {
    loading = true;
    errorMsg = '';
    const [otwRes, regRes] = await Promise.all([
      apiFetch<{
        user?: any;
        publishedWorksCount?: number;
        checklist?: any;
        missingFields?: string[];
        error?: string;
      }>('/api/open-to-work'),
      apiFetch<{ items?: any[] }>('/api/regions')
    ]);

    if (regRes.ok && regRes.data?.items) regions = regRes.data.items;

    if (!otwRes.ok || !otwRes.data?.user) {
      errorMsg = otwRes.data?.error || 'Gagal memuat status Siap Kerja.';
      loading = false;
      return;
    }

    const u = otwRes.data.user;
    openToWork = Boolean(u.openToWork);
    talentScore = Number(u.talentScore || 0);
    publishedWorksCount = Number(otwRes.data.publishedWorksCount || 0);
    checklist = otwRes.data.checklist || checklist;
    missingFields = otwRes.data.missingFields || [];

    schoolName = u.schoolName || '';
    schoolId = u.schoolId || null;
    major = u.major || '';
    skillsText = Array.isArray(u.skills) ? u.skills.join(', ') : u.skills || '';
    headline = u.headline || '';
    studentStatus = u.studentStatus || 'active';
    graduationYear = u.graduationYear || '';
    regionId = u.regionId || 0;
    selectedJobTypes = u.jobPreferences?.types || ['pkl'];
    willingToRelocate = Boolean(u.jobPreferences?.willingToRelocate);

    loading = false;
  }

  $effect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      navigate('/masuk');
      return;
    }
    if (auth.user.userType !== 'smk') {
      toast.info('Fitur Status Siap Kerja khusus untuk Siswa SMK.');
      navigate('/');
      return;
    }
    loadData();
  });

  function toggleJobType(type: string) {
    // Grade X/XI Protection: cannot select 'kerja'
    if (studentStatus === 'active' && type === 'kerja') {
      toast.error('Siswa aktif (Kelas X/XI) hanya dapat memilih peluang PKL atau Freelance.');
      return;
    }
    if (selectedJobTypes.includes(type)) {
      if (selectedJobTypes.length > 1) {
        selectedJobTypes = selectedJobTypes.filter((t) => t !== type);
      }
    } else {
      selectedJobTypes = [...selectedJobTypes, type];
    }
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    errorMsg = '';

    // Active student protection
    if (studentStatus === 'active' && selectedJobTypes.includes('kerja')) {
      selectedJobTypes = selectedJobTypes.filter((t) => t !== 'kerja');
    }

    const payload = {
      openToWork,
      schoolName,
      schoolId,
      major,
      skills: skillsText,
      headline,
      studentStatus,
      graduationYear: graduationYear !== '' ? Number(graduationYear) : null,
      regionId: regionId > 0 ? regionId : null,
      jobPreferences: {
        types: selectedJobTypes,
        regionIds: regionId > 0 ? [regionId] : [],
        willingToRelocate
      }
    };

    const res = await apiFetch<{
      success?: boolean;
      user?: any;
      checklist?: any;
      missingFields?: string[];
      error?: string;
    }>('/api/open-to-work', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    saving = false;
    if (!res.ok) {
      errorMsg = res.data?.error || 'Gagal menyimpan status Siap Kerja.';
      if (res.data?.checklist) checklist = res.data.checklist;
      if (res.data?.missingFields) missingFields = res.data.missingFields;
      return;
    }

    await auth.refresh();
    toast.success(
      openToWork
        ? 'Status Siap Kerja diaktifkan! Profil Anda kini tampil di Direktori Mitra Industri.'
        : 'Pengaturan profil vokasi Anda berhasil disimpan.'
    );
    await loadData();
  }
</script>

<div class="max-w-3xl mx-auto px-2 sm:px-4 py-2">
  <button
    type="button"
    onclick={() => navigate('/peluang')}
    class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 mb-5 active:translate-y-0.5 cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Kembali ke Hub Peluang</span>
  </button>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 animate-pulse h-96 shadow-[0_5px_0_#d1d5db]"></div>
  {:else}
    <div class="space-y-6">
      <!-- Status Card with 3D Switch & Score -->
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b-2 border-gray-100">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 {openToWork
                ? 'bg-emerald-50 border-emerald-300 text-[#34A853]'
                : 'bg-gray-100 border-gray-300 text-gray-400'}"
            >
              <UserCheck class="w-6 h-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl font-black text-gray-900 leading-snug">Status "Siap Kerja"</h1>
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-black {openToWork
                    ? 'bg-emerald-50 text-[#34A853] border border-emerald-200'
                    : 'bg-gray-100 text-gray-500'}"
                >
                  {openToWork ? '● AKTIF' : 'NONAKTIF'}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-1 max-w-md">
                Ketika aktif, profil keahlian Anda dapat ditemukan oleh Mitra Industri yang mencari kandidat PKL, Magang, atau Kerja.
              </p>
            </div>
          </div>

          <!-- Score Pill -->
          <div class="text-center sm:text-right shrink-0 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200">
            <span class="block text-[10px] font-black uppercase tracking-wider text-[#34A853]">
              Skor Vokasi Anda
            </span>
            <span class="text-2xl font-black text-emerald-950">{talentScore}</span>
            <span class="text-xs font-bold text-gray-500"> / 100</span>
          </div>
        </div>

        <!-- 5-Item Checklist Box -->
        <div class="mt-5 p-4 rounded-xl bg-gray-50 border-2 border-gray-200">
          <h2 class="text-xs font-black uppercase tracking-wider text-gray-500 mb-2.5">
            Syarat Aktivasi Status Siap Kerja
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="flex items-center gap-2">
              {#if checklist.school}
                <CheckCircle2 class="w-4 h-4 text-[#34A853] shrink-0" />
                <span class="font-bold text-gray-800">Nama Sekolah Terisi</span>
              {:else}
                <XCircle class="w-4 h-4 text-[#EA4335] shrink-0" />
                <span class="text-gray-500">Nama Sekolah Belum Diisi</span>
              {/if}
            </div>

            <div class="flex items-center gap-2">
              {#if checklist.major}
                <CheckCircle2 class="w-4 h-4 text-[#34A853] shrink-0" />
                <span class="font-bold text-gray-800">Jurusan Terisi</span>
              {:else}
                <XCircle class="w-4 h-4 text-[#EA4335] shrink-0" />
                <span class="text-gray-500">Jurusan Belum Diisi</span>
              {/if}
            </div>

            <div class="flex items-center gap-2">
              {#if checklist.skills}
                <CheckCircle2 class="w-4 h-4 text-[#34A853] shrink-0" />
                <span class="font-bold text-gray-800">Minimal 1 Keahlian</span>
              {:else}
                <XCircle class="w-4 h-4 text-[#EA4335] shrink-0" />
                <span class="text-gray-500">Keahlian Masih Kosong</span>
              {/if}
            </div>

            <div class="flex items-center gap-2">
              {#if checklist.headline}
                <CheckCircle2 class="w-4 h-4 text-[#34A853] shrink-0" />
                <span class="font-bold text-gray-800">Headline Profesional (Min. 5 Karakter)</span>
              {:else}
                <XCircle class="w-4 h-4 text-[#EA4335] shrink-0" />
                <span class="text-gray-500">Headline Belum Diisi</span>
              {/if}
            </div>

            <div class="flex items-center gap-2 sm:col-span-2">
              {#if checklist.publishedWorks}
                <CheckCircle2 class="w-4 h-4 text-[#34A853] shrink-0" />
                <span class="font-bold text-gray-800">Minimal 1 Karya Terbit ({publishedWorksCount} karya ada)</span>
              {:else}
                <XCircle class="w-4 h-4 text-[#EA4335] shrink-0" />
                <span class="text-[#EA4335] font-bold">
                  Belum memiliki karya terbit.
                  <button
                    type="button"
                    onclick={() => navigate('/jual')}
                    class="text-[#4285F4] underline ml-1 cursor-pointer"
                  >
                    Unggah Karya Sekarang
                  </button>
                </span>
              {/if}
            </div>
          </div>
        </div>

        {#if errorMsg}
          <div class="mt-4 p-3 rounded-xl bg-red-50 border-2 border-red-200 text-[#EA4335] text-xs font-bold">
            {errorMsg}
          </div>
        {/if}

        <!-- Toggle Switch -->
        <div class="mt-5 flex items-center justify-between p-3.5 rounded-xl bg-blue-50/60 border-2 border-blue-200">
          <div>
            <p class="text-xs font-black text-gray-900">Aktifkan Status Siap Kerja</p>
            <p class="text-[11px] text-gray-500">Nyalakan saklar untuk membuka profil bagi pencari talenta industri.</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              bind:checked={openToWork}
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34A853]"
            ></div>
          </label>
        </div>
      </div>

      <!-- Detail Form -->
      <form onsubmit={handleSave} class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db] space-y-4">
        <h2 class="text-sm font-black text-gray-900 pb-3 border-b-2 border-gray-100">
          Data Profil Kesiapan Vokasi
        </h2>

        <!-- Headline -->
        <div>
          <label for="otw-headline" class="block text-xs font-bold text-gray-700 mb-1">
            Headline Profesional Singkat <span class="text-[#EA4335]">*</span>
          </label>
          <input
            id="otw-headline"
            type="text"
            bind:value={headline}
            required
            placeholder="Contoh: Siswa RPL Spesialis Frontend Web & Desain UI/UX Figma"
            class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
          />
        </div>

        <!-- Student Status & Graduation Year -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="otw-status" class="block text-xs font-bold text-gray-700 mb-1">
              Status Kesiswaan <span class="text-[#EA4335]">*</span>
            </label>
            <select
              id="otw-status"
              bind:value={studentStatus}
              class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
            >
              <option value="active">Siswa Aktif (Kelas X / XI)</option>
              <option value="final_year">Siswa Tingkat Akhir (Kelas XII)</option>
              <option value="alumni">Alumni SMK</option>
            </select>
            {#if studentStatus === 'active'}
              <p class="text-[10px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                <ShieldAlert class="w-3 h-3 text-[#FBBC05] shrink-0" />
                <span>Siswa aktif dilindungi dari pekerjaan penuh waktu (hanya PKL/Freelance).</span>
              </p>
            {/if}
          </div>

          <div>
            <label for="otw-grad" class="block text-xs font-bold text-gray-700 mb-1">
              Tahun Kelulusan / Target Lulus
            </label>
            <input
              id="otw-grad"
              type="number"
              min="2010"
              max="2035"
              bind:value={graduationYear}
              placeholder="Contoh: 2026"
              class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]"
            />
          </div>
        </div>

        <!-- School & Major -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span class="block text-xs font-bold text-gray-700 mb-1">
              Nama Sekolah SMK <span class="text-[#EA4335]">*</span>
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

          <div>
            <label for="otw-major" class="block text-xs font-bold text-gray-700 mb-1">
              Jurusan / Kompetensi <span class="text-[#EA4335]">*</span>
            </label>
            <input
              id="otw-major"
              type="text"
              bind:value={major}
              required
              placeholder="Contoh: Rekayasa Perangkat Lunak"
              class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]"
            />
          </div>
        </div>

        <!-- Skills -->
        <div>
          <label for="otw-skills" class="block text-xs font-bold text-gray-700 mb-1">
            Keahlian & Kemampuan Teknis (Pisahkan dengan koma) <span class="text-[#EA4335]">*</span>
          </label>
          <input
            id="otw-skills"
            type="text"
            bind:value={skillsText}
            required
            placeholder="Contoh: Svelte, TypeScript, Pemrograman Web, Desain Grafis"
            class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db]"
          />
        </div>

        <!-- Preferred Job Types -->
        <div>
          <span class="block text-xs font-bold text-gray-700 mb-1.5">
            Jenis Peluang yang Diminati <span class="text-[#EA4335]">*</span>
          </span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {#each [
              { id: 'pkl', label: 'PKL / Prakerin' },
              { id: 'magang', label: 'Magang Industri' },
              { id: 'kerja', label: 'Kerja Penuh Waktu' },
              { id: 'freelance', label: 'Proyek Lepas (Freelance)' }
            ] as jType (jType.id)}
              <button
                type="button"
                disabled={studentStatus === 'active' && (jType.id === 'kerja' || jType.id === 'magang')}
                onclick={() => toggleJobType(jType.id)}
                class="p-2.5 rounded-xl border-2 text-center text-xs font-bold transition active:translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed {selectedJobTypes.includes(
                  jType.id
                )
                  ? 'bg-emerald-50 border-emerald-300 text-[#34A853] shadow-[0_2px_0_#a7f3d0]'
                  : 'bg-white border-gray-300 text-gray-600'}"
              >
                {jType.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Region & Relocation -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label for="otw-reg" class="block text-xs font-bold text-gray-700 mb-1">
              Wilayah Domisili
            </label>
            <select
              id="otw-reg"
              bind:value={regionId}
              class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
            >
              <option value={0}>Pilih Wilayah</option>
              {#each regions as r (r.id)}
                <option value={r.id}>{r.name} ({r.province})</option>
              {/each}
            </select>
          </div>

          <div class="flex items-center pt-5">
            <label class="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={willingToRelocate}
                class="w-4 h-4 accent-[#4285F4] rounded"
              />
              <span>Bersedia ditempatkan di luar kota (Relokasi)</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          class="w-full h-11 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_4px_0_#1a56b0] active:shadow-none active:translate-y-0.5 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer mt-4"
        >
          <Save class="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Profil & Perbarui Status'}</span>
        </button>
      </form>
    </div>
  {/if}
</div>
