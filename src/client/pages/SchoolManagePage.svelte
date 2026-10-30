<script lang="ts">
  import { ArrowLeft, Building2, Save, School, Upload } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';

  interface Props {
    slug: string;
  }

  let { slug }: Props = $props();

  let school = $state<any | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let errorMsg = $state('');

  let npsn = $state('');
  let regionId = $state<number>(0);
  let address = $state('');
  let description = $state('');
  let majorsText = $state('');
  let hasTefa = $state(false);
  let tefaDescription = $state('');
  let officialPhone = $state('');
  let website = $state('');

  let logoFile = $state<File | null>(null);
  let logoPreview = $state('');
  let coverFile = $state<File | null>(null);
  let coverPreview = $state('');

  let regions = $state<any[]>([]);

  async function loadSchoolData(s: string) {
    loading = true;
    errorMsg = '';
    const [scRes, regRes] = await Promise.all([
      apiFetch<{ school?: any; error?: string }>(`/api/schools/${s}`),
      apiFetch<{ items?: any[] }>('/api/regions')
    ]);

    if (regRes.ok && regRes.data?.items) regions = regRes.data.items;

    if (!scRes.ok || !scRes.data?.school) {
      errorMsg = scRes.data?.error || 'Sekolah tidak ditemukan.';
      loading = false;
      return;
    }

    const sc = scRes.data.school;
    if (!sc.canManage) {
      toast.error('Anda tidak memiliki hak akses untuk mengelola etalase sekolah ini.');
      navigate(`/sekolah/${s}`);
      return;
    }

    school = sc;
    npsn = sc.npsn || '';
    regionId = sc.regionId || 0;
    address = sc.address || '';
    description = sc.description || '';
    majorsText = Array.isArray(sc.majors) ? sc.majors.join(', ') : '';
    hasTefa = Boolean(sc.hasTefa);
    tefaDescription = sc.tefaDescription || '';
    officialPhone = sc.officialPhone || '';
    website = sc.website || '';
    logoPreview = sc.logoUrl || '';
    coverPreview = sc.coverImageUrl || '';

    loading = false;
  }

  $effect(() => {
    loadSchoolData(slug);
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    errorMsg = '';

    const form = new FormData();
    if (npsn) form.append('npsn', npsn);
    if (regionId > 0) form.append('regionId', String(regionId));
    if (address) form.append('address', address);
    if (description) form.append('description', description);
    form.append('majors', majorsText);
    form.append('hasTefa', hasTefa ? 'true' : 'false');
    if (tefaDescription) form.append('tefaDescription', tefaDescription);
    if (officialPhone) form.append('officialPhone', officialPhone);
    if (website) form.append('website', website);
    if (logoFile) form.append('logo', logoFile);
    if (coverFile) form.append('coverImage', coverFile);

    const res = await apiFetch<{ success?: boolean; error?: string }>(
      `/api/schools/${slug}/manage`,
      {
        method: 'PUT',
        body: form
      }
    );

    saving = false;
    if (!res.ok) {
      errorMsg = res.data?.error || 'Gagal menyimpan pembaruan etalase sekolah.';
      return;
    }

    toast.success('Informasi Etalase SMK berhasil diperbarui!');
    navigate(`/sekolah/${slug}`);
  }
</script>

<div class="max-w-2xl mx-auto px-2 sm:px-4 py-2">
  <button
    type="button"
    onclick={() => navigate(`/sekolah/${slug}`)}
    class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 mb-5 active:translate-y-0.5 cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Kembali ke Etalase {school?.name || 'SMK'}</span>
  </button>

  {#if loading}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 animate-pulse h-96 shadow-[0_5px_0_#d1d5db]"></div>
  {:else if errorMsg && !school}
    <div class="bg-white border-2 border-red-200 rounded-2xl p-10 text-center shadow-[0_5px_0_#fecdd3]">
      <p class="text-sm font-bold text-[#EA4335]">{errorMsg}</p>
    </div>
  {:else if school}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db]">
      <div class="flex items-center gap-3 pb-4 mb-5 border-b-2 border-gray-100">
        <div class="w-11 h-11 rounded-2xl bg-blue-50 border-2 border-blue-200 text-[#4285F4] flex items-center justify-center shrink-0">
          <School class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-black text-gray-900 leading-tight">
            Kelola Etalase Sekolah Resmi
          </h1>
          <p class="text-xs text-gray-500 mt-0.5">{school.name}</p>
        </div>
      </div>

      {#if errorMsg}
        <div class="mb-5 p-3 rounded-xl bg-red-50 border-2 border-red-200 text-[#EA4335] text-xs font-bold">
          {errorMsg}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-4">
        <!-- NPSN & Wilayah -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="sc-npsn" class="block text-xs font-bold text-gray-700 mb-1">
              Nomor Pokok Sekolah Nasional (NPSN)
            </label>
            <input
              id="sc-npsn"
              type="text"
              bind:value={npsn}
              placeholder="Contoh: 20231415"
              class="w-full p-2.5 text-xs font-mono border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
            />
          </div>

          <div>
            <label for="sc-reg" class="block text-xs font-bold text-gray-700 mb-1">
              Kota / Kabupaten
            </label>
            <select
              id="sc-reg"
              bind:value={regionId}
              class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
            >
              <option value={0}>Pilih Wilayah</option>
              {#each regions as r (r.id)}
                <option value={r.id}>{r.name} ({r.province})</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Alamat Lengkap -->
        <div>
          <label for="sc-addr" class="block text-xs font-bold text-gray-700 mb-1">
            Alamat Lengkap Sekolah
          </label>
          <input
            id="sc-addr"
            type="text"
            bind:value={address}
            placeholder="Jl. Karadenan No. 7, Cibinong, Kab. Bogor"
            class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
          />
        </div>

        <!-- Deskripsi Sekolah -->
        <div>
          <label for="sc-desc" class="block text-xs font-bold text-gray-700 mb-1">
            Deskripsi Singkat / Profil Sekolah
          </label>
          <textarea
            id="sc-desc"
            rows="3"
            bind:value={description}
            placeholder="Jelaskan keunggulan dan visi praktik industri sekolah Anda..."
            class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
          ></textarea>
        </div>

        <!-- Jurusan / Kompetensi -->
        <div>
          <label for="sc-majors" class="block text-xs font-bold text-gray-700 mb-1">
            Daftar Jurusan / Kompetensi Keahlian (Pisahkan dengan koma)
          </label>
          <input
            id="sc-majors"
            type="text"
            bind:value={majorsText}
            placeholder="RPL, TKJ, DKV, Teknik Pemesinan, Tata Boga"
            class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
          />
        </div>

        <!-- Unit Produksi TeFa -->
        <div class="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-200 space-y-3">
          <label class="inline-flex items-center gap-2 text-xs font-black text-emerald-950 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={hasTefa}
              class="w-4 h-4 accent-[#34A853] rounded"
            />
            <span>Memiliki Unit Produksi Teaching Factory (TeFa)</span>
          </label>

          {#if hasTefa}
            <div>
              <label for="sc-tefadesc" class="block text-[11px] font-bold text-emerald-900 mb-1">
                Deskripsi Unit Produksi TeFa & Layanan Terbuka untuk Umum
              </label>
              <textarea
                id="sc-tefadesc"
                rows="2"
                bind:value={tefaDescription}
                placeholder="Contoh: Unit TeFa melayani pemesanan konveksi seragam, jasa servis mesin, dan pembuatan aplikasi web..."
                class="w-full p-2.5 text-xs border-2 border-emerald-300 rounded-xl bg-white"
              ></textarea>
            </div>
          {/if}
        </div>

        <!-- Kontak Resmi Sekolah -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="sc-phone" class="block text-xs font-bold text-gray-700 mb-1">
              Nomor WhatsApp Resmi Humas / TeFa
            </label>
            <input
              id="sc-phone"
              type="tel"
              bind:value={officialPhone}
              placeholder="08xxxxxxxxxx"
              class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
            />
          </div>

          <div>
            <label for="sc-web" class="block text-xs font-bold text-gray-700 mb-1">
              Website Resmi Sekolah
            </label>
            <input
              id="sc-web"
              type="url"
              bind:value={website}
              placeholder="https://smkn1cibinong.sch.id"
              class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
            />
          </div>
        </div>

        <!-- Logo & Cover Upload -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label for="sc-logo" class="block text-xs font-bold text-gray-700 mb-1">
              Logo Sekolah (WebP/PNG/JPG)
            </label>
            <div class="flex items-center gap-3">
              {#if logoPreview}
                <img src={logoPreview} alt="Logo" class="w-12 h-12 rounded-xl object-contain border-2 border-gray-300 p-1 bg-white shrink-0" />
              {/if}
              <input
                id="sc-logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onchange={(e) => {
                  const f = (e.currentTarget as HTMLInputElement).files?.[0] || null;
                  logoFile = f;
                  if (f) logoPreview = URL.createObjectURL(f);
                }}
                class="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#4285F4] cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label for="sc-cover" class="block text-xs font-bold text-gray-700 mb-1">
              Foto Sampul Etalase (Banner)
            </label>
            <div class="flex items-center gap-3">
              {#if coverPreview}
                <img src={coverPreview} alt="Cover" class="w-16 h-10 rounded-lg object-cover border-2 border-gray-300 shrink-0" />
              {/if}
              <input
                id="sc-cover"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onchange={(e) => {
                  const f = (e.currentTarget as HTMLInputElement).files?.[0] || null;
                  coverFile = f;
                  if (f) coverPreview = URL.createObjectURL(f);
                }}
                class="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#4285F4] cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          class="w-full h-11 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_4px_0_#1a56b0] active:shadow-none active:translate-y-0.5 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer mt-5"
        >
          <Save class="w-4 h-4" />
          <span>{saving ? 'Menyimpan Perubahan...' : 'Simpan Etalase Sekolah'}</span>
        </button>
      </form>
    </div>
  {/if}
</div>

