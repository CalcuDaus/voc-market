<script lang="ts">
  import { ArrowLeft, HandHelping, Lock, PlusCircle, ShieldCheck } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';

  let title = $state('');
  let description = $state('');
  let categoryId = $state<number>(0);
  let budgetType = $state<'negotiable' | 'fixed' | 'range'>('negotiable');
  let budgetMin = $state<number | ''>('');
  let budgetMax = $state<number | ''>('');
  let workMode = $state<'remote' | 'onsite' | 'dropoff'>('remote');
  let regionId = $state<number>(0);
  let locationDetail = $state('');
  let fullAddress = $state('');
  let neededBy = $state('');
  let maxProposals = $state(10);
  let expiresInDays = $state(14);

  let imageFile = $state<File | null>(null);
  let imagePreview = $state('');
  let categories = $state<any[]>([]);
  let regions = $state<any[]>([]);

  let submitting = $state(false);
  let errorMsg = $state('');

  $effect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      toast.info('Silakan masuk terlebih dahulu untuk memposting permintaan bantuan.');
      navigate('/masuk');
      return;
    }
    if (auth.user.regionId) {
      regionId = auth.user.regionId;
    }

    Promise.all([apiFetch('/api/categories'), apiFetch('/api/regions')]).then(
      ([catRes, regRes]) => {
        if (catRes.ok && catRes.data?.items) categories = catRes.data.items;
        if (regRes.ok && regRes.data?.items) regions = regRes.data.items;
      }
    );
  });

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0] || null;
    imageFile = file;
    if (file) {
      imagePreview = URL.createObjectURL(file);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = '';
    submitting = true;

    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    if (categoryId > 0) form.append('categoryId', String(categoryId));
    form.append('budgetType', budgetType);
    if (budgetMin !== '') form.append('budgetMin', String(budgetMin));
    if (budgetMax !== '') form.append('budgetMax', String(budgetMax));
    form.append('workMode', workMode);
    if (regionId > 0) form.append('regionId', String(regionId));
    if (locationDetail) form.append('locationDetail', locationDetail);
    if (fullAddress) form.append('fullAddress', fullAddress);
    if (neededBy) form.append('neededBy', neededBy);
    form.append('maxProposals', String(maxProposals));
    form.append('expiresInDays', String(expiresInDays));
    if (imageFile) form.append('image', imageFile);

    const res = await apiFetch<{ id?: number; code?: string; error?: string }>('/api/requests', {
      method: 'POST',
      body: form
    });

    submitting = false;
    if (!res.ok || !res.data?.code) {
      errorMsg = res.data?.error || 'Gagal memposting permintaan bantuan.';
      return;
    }

    toast.success('Permintaan berhasil diposting ke Papan Butuh Bantuan!');
    navigate(`/butuh-bantuan/${res.data.code}`);
  }
</script>

<div class="max-w-2xl mx-auto px-2 sm:px-4 py-2">
  <button
    type="button"
    onclick={() => navigate('/butuh-bantuan')}
    class="h-9 px-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50 inline-flex items-center gap-2 text-xs font-bold text-gray-700 mb-5 active:translate-y-0.5 cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Kembali ke Papan Butuh Bantuan</span>
  </button>

  <div class="bg-white border-2 border-gray-300 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_#d1d5db]">
    <div class="flex items-center gap-3 pb-4 mb-5 border-b-2 border-gray-100">
      <div class="w-11 h-11 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-[#34A853] flex items-center justify-center shrink-0">
        <HandHelping class="w-6 h-6" />
      </div>
      <div>
        <h1 class="text-lg sm:text-xl font-black text-gray-900 leading-tight">
          Posting Kebutuhan Proyek / Bantuan
        </h1>
        <p class="text-xs text-gray-500 mt-0.5">
          Jelaskan kebutuhan Anda, siswa SMK yang terampil akan mengajukan penawaran terbaik.
        </p>
      </div>
    </div>

    {#if errorMsg}
      <div class="mb-5 p-3 rounded-xl bg-red-50 border-2 border-red-200 text-[#EA4335] text-xs font-bold">
        {errorMsg}
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- 1. Judul Kebutuhan -->
      <div>
        <label for="req-title" class="block text-xs font-bold text-gray-700 mb-1">
          Judul Singkat Kebutuhan <span class="text-[#EA4335]">*</span>
        </label>
        <input
          id="req-title"
          type="text"
          bind:value={title}
          required
          placeholder="Contoh: Butuh Desain Logo Warung Kopi / Servis 2 Motor Honda Beat"
          class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4]"
        />
      </div>

      <!-- Kategori & Mode Kerja -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="req-cat" class="block text-xs font-bold text-gray-700 mb-1">
            Kategori Bidang
          </label>
          <select
            id="req-cat"
            bind:value={categoryId}
            class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
          >
            <option value={0}>Pilih Kategori (Opsional)</option>
            {#each categories as c (c.id)}
              <option value={c.id}>{c.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="req-mode" class="block text-xs font-bold text-gray-700 mb-1">
            Mode Pengerjaan <span class="text-[#EA4335]">*</span>
          </label>
          <select
            id="req-mode"
            bind:value={workMode}
            class="w-full p-2.5 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4]"
          >
            <option value="remote">Kerja Jarak Jauh (Online / File)</option>
            <option value="onsite">Datang ke Lokasi</option>
            <option value="dropoff">Antar / Titip Barang</option>
          </select>
        </div>
      </div>

      <!-- 2. Rincian Penjelasan -->
      <div>
        <label for="req-desc" class="block text-xs font-bold text-gray-700 mb-1">
          Rincian Penjelasan Kebutuhan <span class="text-[#EA4335]">*</span>
        </label>
        <textarea
          id="req-desc"
          rows="4"
          bind:value={description}
          required
          placeholder="Jelaskan spesifikasi, kendala, atau hasil akhir yang diharapkan agar siswa SMK dapat memperkirakan biaya dan waktu pengerjaan..."
          class="w-full p-2.5 text-xs sm:text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4]"
        ></textarea>
      </div>

      <!-- Foto Contoh / Lampiran -->
      <div>
        <label for="req-img" class="block text-xs font-bold text-gray-700 mb-1">
          Foto Contoh / Foto Kondisi (Opsional)
        </label>
        <div class="flex items-center gap-3">
          {#if imagePreview}
            <img
              src={imagePreview}
              alt="Preview"
              class="w-14 h-14 rounded-xl object-cover border-2 border-gray-300 shrink-0"
            />
          {/if}
          <input
            id="req-img"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onchange={handleFileChange}
            class="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#4285F4] hover:file:bg-blue-100 cursor-pointer"
          />
        </div>
      </div>

      <!-- Anggaran -->
      <div class="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-200 space-y-3">
        <span class="block text-xs font-bold text-gray-800">
          Anggaran yang Disediakan
        </span>
        <div class="grid grid-cols-3 gap-2">
          {#each [
            { id: 'negotiable', label: 'Bisa Nego' },
            { id: 'fixed', label: 'Harga Pasti' },
            { id: 'range', label: 'Kisaran' }
          ] as bTab}
            <button
              type="button"
              onclick={() => (budgetType = bTab.id as any)}
              class="h-8 rounded-lg text-xs font-bold border-2 transition cursor-pointer {budgetType ===
              bTab.id
                ? 'bg-amber-50 border-[#FBBC05] text-[#b45309] font-black'
                : 'bg-white border-gray-300 text-gray-600'}"
            >
              {bTab.label}
            </button>
          {/each}
        </div>

        {#if budgetType === 'fixed'}
          <div>
            <label for="b-fix" class="block text-[11px] font-bold text-gray-600 mb-1">
              Nominal Anggaran (Rp) <span class="text-[#EA4335]">*</span>
            </label>
            <input
              id="b-fix"
              type="number"
              min="0"
              bind:value={budgetMin}
              required
              placeholder="Contoh: 150000"
              class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl bg-white"
            />
          </div>
        {:else if budgetType === 'range'}
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="b-min" class="block text-[11px] font-bold text-gray-600 mb-1">
                Minimal (Rp)
              </label>
              <input
                id="b-min"
                type="number"
                min="0"
                bind:value={budgetMin}
                placeholder="100000"
                class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl bg-white"
              />
            </div>
            <div>
              <label for="b-max" class="block text-[11px] font-bold text-gray-600 mb-1">
                Maksimal (Rp)
              </label>
              <input
                id="b-max"
                type="number"
                min="0"
                bind:value={budgetMax}
                placeholder="250000"
                class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl bg-white"
              />
            </div>
          </div>
        {/if}
      </div>

      <!-- Lokasi & Privasi Alamat -->
      {#if workMode === 'onsite' || workMode === 'dropoff'}
        <div class="p-3.5 rounded-xl bg-blue-50/60 border-2 border-blue-200 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label for="req-reg" class="block text-xs font-bold text-gray-700 mb-1">
                Kota / Kabupaten <span class="text-[#EA4335]">*</span>
              </label>
              <select
                id="req-reg"
                bind:value={regionId}
                required
                class="w-full p-2 text-xs font-semibold border-2 border-gray-300 rounded-xl bg-white"
              >
                <option value={0}>Pilih Kota/Kabupaten</option>
                {#each regions as r (r.id)}
                  <option value={r.id}>{r.name} ({r.province})</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="req-loc" class="block text-xs font-bold text-gray-700 mb-1">
                Patokan Lokasi Publik
              </label>
              <input
                id="req-loc"
                type="text"
                bind:value={locationDetail}
                placeholder="Contoh: Sekitar Alun-Alun / Dekat Stasiun"
                class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl bg-white"
              />
            </div>
          </div>

          <div>
            <label for="req-faddr" class="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <Lock class="w-3.5 h-3.5 text-[#34A853]" />
              <span>Alamat Lengkap Rahasia (Hanya Dibuka untuk Siswa yang Anda Pilih)</span>
            </label>
            <textarea
              id="req-faddr"
              rows="2"
              bind:value={fullAddress}
              placeholder="Contoh: Jl. Merdeka No. 12 RT 02/05, Kelurahan..."
              class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl bg-white"
            ></textarea>
            <p class="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
              <ShieldCheck class="w-3.5 h-3.5 text-[#34A853]" />
              <span>Alamat lengkap tidak akan pernah tampil di publik sebelum Anda menyetujui tawaran siswa.</span>
            </p>
          </div>
        </div>
      {/if}

      <!-- Target Tanggal & Batas Penawaran -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="req-date" class="block text-xs font-bold text-gray-700 mb-1">
            Dibutuhkan Sebelum Tanggal
          </label>
          <input
            id="req-date"
            type="date"
            bind:value={neededBy}
            class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          />
        </div>
        <div>
          <label for="req-maxprop" class="block text-xs font-bold text-gray-700 mb-1">
            Maks. Kuota Penawaran Siswa
          </label>
          <input
            id="req-maxprop"
            type="number"
            min="1"
            max="30"
            bind:value={maxProposals}
            class="w-full p-2 text-xs border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="w-full h-11 rounded-xl bg-[#34A853] hover:bg-[#2d9247] shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer mt-4"
      >
        <PlusCircle class="w-4 h-4" />
        <span>{submitting ? 'Memposting Kebutuhan...' : 'Publikasikan Permintaan'}</span>
      </button>
    </form>
  </div>
</div>
