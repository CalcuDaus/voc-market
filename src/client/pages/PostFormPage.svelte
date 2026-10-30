<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    Award,
    CheckCircle2,
    Globe,
    Home,
    MapPin,
    Package,
    Upload,
    Wrench
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import { formatRupiah } from '../lib/format';
  import HppCalculator from '../lib/components/HppCalculator.svelte';

  interface Props {
    editPostId?: number;
  }

  let { editPostId }: Props = $props();

  let isEditMode = $derived(Boolean(editPostId && editPostId > 0));
  let step = $state(1);
  let categories = $state<{ id: number; name: string }[]>([]);
  let subdistricts = $state<{ id: number; name: string; regionName: string }[]>([]);

  let type = $state<'product' | 'service' | 'portfolio'>('product');
  let name = $state('');
  let categoryId = $state<number>(0);
  let price = $state<number>(50000);
  let costPrice = $state<number>(30000);
  let priceMin = $state<number>(45000);
  let priceMax = $state<number>(120000);
  let stock = $state<number>(5);
  let projectLink = $state('');
  let description = $state('');

  // HPP Breakdown & Geo (#10, #12)
  let material = $state(0);
  let packaging = $state(0);
  let overhead = $state(0);
  let labor = $state(0);
  let serviceAreaType = $state<'delivery' | 'digital' | 'onsite' | 'workshop'>('delivery');
  let maxDistanceKm = $state<number | null>(null);
  let subdistrictId = $state<number | null>(null);
  let estimatedHours = $state<number | null>(null);

  let imageFile = $state<File | null>(null);
  let imagePreview = $state('');

  let loadingInit = $state(false);
  let submitting = $state(false);
  let errorMsg = $state('');

  let estimatedProfit = $derived(Math.max(0, (Number(price) || 0) - (Number(costPrice) || 0)));

  async function initForm() {
    const catRes = await apiFetch('/api/categories');
    if (catRes.ok && catRes.data?.items) {
      categories = catRes.data.items;
    }

    const subRes = await apiFetch<{
      subdistricts: Array<{ id: number; name: string; regionName: string }>;
    }>('/api/subdistricts');
    if (subRes.ok && subRes.data?.subdistricts) {
      subdistricts = subRes.data.subdistricts;
    }

    if (editPostId) {
      loadingInit = true;
      const res = await apiFetch(`/api/posts/${editPostId}`);
      loadingInit = false;
      if (res.ok && res.data?.post) {
        const p = res.data.post;
        type = p.type;
        name = p.name;
        categoryId = p.categoryId || 0;
        price = p.price || 0;
        costPrice = p.costPrice || 0;
        priceMin = p.priceMin || p.price || 0;
        priceMax = p.priceMax || 0;
        stock = p.stock ?? 1;
        projectLink = p.projectLink || '';
        description = p.description || '';
        imagePreview = p.imageUrl || '';

        if (p.costBreakdown) {
          material = p.costBreakdown.material || 0;
          packaging = p.costBreakdown.packaging || 0;
          overhead = p.costBreakdown.overhead || 0;
          labor = p.costBreakdown.labor || 0;
        }
        if (p.serviceAreaType) serviceAreaType = p.serviceAreaType;
        if (p.maxDistanceKm) maxDistanceKm = p.maxDistanceKm;
        if (p.subdistrictId) subdistrictId = p.subdistrictId;
        if (p.estimatedHours) estimatedHours = p.estimatedHours;
      }
    }
  }

  $effect(() => {
    initForm();
  });

  function handleImageSelect(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5 MB.');
      return;
    }

    imageFile = file;
    imagePreview = URL.createObjectURL(file);
  }

  function nextStep() {
    errorMsg = '';
    if (step === 1) {
      if (!imageFile && !imagePreview) {
        errorMsg = 'Pilih satu foto karya yang jelas terlebih dahulu.';
        return;
      }
      step = 2;
    } else if (step === 2) {
      if (!name.trim()) {
        errorMsg = 'Judul karya wajib diisi.';
        return;
      }
      if (type === 'product' && (!price || price <= 0)) {
        errorMsg = 'Tentukan harga jual produk.';
        return;
      }
      if (type === 'service' && (!priceMin || priceMin <= 0)) {
        errorMsg = 'Tentukan tarif minimal layanan.';
        return;
      }
      step = 3;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = '';

    if (!description.trim() || description.trim().length < 10) {
      errorMsg = 'Deskripsi karya minimal 10 karakter.';
      return;
    }

    submitting = true;
    const form = new FormData();
    form.append('type', type);
    form.append('name', name.trim());
    if (categoryId > 0) form.append('categoryId', String(categoryId));
    form.append('description', description.trim());

    const computedCost = Number(material || 0) + Number(packaging || 0) + Number(overhead || 0) + Number(labor || 0);
    const finalCost = computedCost > 0 ? computedCost : Number(costPrice || 0);

    if (type === 'product') {
      form.append('price', String(price));
      form.append('costPrice', String(finalCost));
      form.append('stock', String(stock || 1));
    } else if (type === 'service') {
      form.append('price', String(priceMin));
      form.append('priceMin', String(priceMin));
      if (priceMax > 0) form.append('priceMax', String(priceMax));
      form.append('costPrice', String(finalCost));
    } else if (projectLink.trim()) {
      form.append('projectLink', projectLink.trim());
    }

    if (computedCost > 0) {
      form.append(
        'costBreakdown',
        JSON.stringify({
          material: Number(material || 0),
          packaging: Number(packaging || 0),
          overhead: Number(overhead || 0),
          labor: Number(labor || 0)
        })
      );
    }

    form.append('serviceAreaType', serviceAreaType);
    if (maxDistanceKm) form.append('maxDistanceKm', String(maxDistanceKm));
    if (subdistrictId) form.append('subdistrictId', String(subdistrictId));
    if (estimatedHours) form.append('estimatedHours', String(estimatedHours));

    if (imageFile) {
      form.append('image', imageFile);
    }

    const endpoint = isEditMode ? `/api/posts/${editPostId}` : '/api/posts';
    const method = isEditMode ? 'PUT' : 'POST';

    const res = await apiFetch(endpoint, { method, body: form });
    submitting = false;

    if (!res.ok) {
      errorMsg = res.data?.error || 'Gagal menyimpan karya.';
      return;
    }

    toast.success(
      isEditMode ? 'Perubahan karya berhasil disimpan!' : 'Karya berhasil diterbitkan ke katalog!'
    );
    navigate(`/karya/${res.data.id}`);
  }
</script>

<div class="max-w-3xl mx-auto px-4 sm:px-6 py-6">
  <button
    type="button"
    onclick={() => navigate(isEditMode ? `/karya/${editPostId}` : '/')}
    class="bg-white border-2 border-gray-300 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl px-4 py-2 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 inline-flex items-center gap-2 mb-5 transition cursor-pointer"
  >
    <ArrowLeft class="w-4 h-4" />
    <span>Batal & Kembali</span>
  </button>

  {#if !auth.user || auth.user.userType !== 'smk'}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 text-center shadow-[0_5px_0_#d1d5db]">
      <h2 class="text-xl font-bold text-gray-900">Khusus Akun Siswa SMK</h2>
      <p class="text-xs text-gray-500 mt-1">
        Silakan masuk menggunakan akun Siswa SMK untuk mempublikasikan produk, jasa, atau portofolio.
      </p>
      <button
        type="button"
        onclick={() => navigate('/masuk')}
        class="mt-5 h-11 px-5 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-sm shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 cursor-pointer transition"
      >
        Masuk Sebagai Siswa SMK
      </button>
    </div>
  {:else if loadingInit}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-8 h-72 animate-pulse shadow-[0_5px_0_#d1d5db]"></div>
  {:else}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_#d1d5db]">
      <h1 class="text-xl sm:text-2xl font-black text-gray-900">
        {isEditMode ? 'Edit Karya Siswa' : 'Unggah Karya Baru (3 Langkah Mudah)'}
      </h1>

      <!-- 3-Step Indicator with 3D Pills -->
      <div class="grid grid-cols-3 gap-2.5 mt-5 mb-6">
        {#each [
          { num: 1, title: '1. Jenis & Foto' },
          { num: 2, title: '2. Nama & Harga' },
          { num: 3, title: '3. Rincian & Terbit' }
        ] as st}
          <button
            type="button"
            onclick={() => {
              if (isEditMode || st.num < step) step = st.num;
            }}
            class="p-2.5 rounded-xl text-center text-xs font-bold border-2 transition active:translate-y-0.5 cursor-pointer {step ===
            st.num
              ? 'bg-[#4285F4] text-white border-[#1a56b0] shadow-[0_3px_0_#1a56b0]'
              : step > st.num
                ? 'bg-emerald-50 text-[#34A853] border-emerald-300 shadow-[0_2px_0_#a7f3d0]'
                : 'bg-gray-50 text-gray-500 border-gray-200 shadow-[0_2px_0_#e5e7eb]'}"
          >
            {st.title}
          </button>
        {/each}
      </div>

      {#if errorMsg}
        <div class="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-[#EA4335] text-xs font-bold">
          {errorMsg}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-5">
        {#if step === 1}
          {#if !isEditMode}
            <div>
              <p class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Pilih Tipe Karya (Katalog 3D Section 6.2):
              </p>
              <!-- 3 Large 3D Vertical Cards matching Section 6.2 -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <!-- 1. Produk Fisik/Digital (Google Green) -->
                <button
                  type="button"
                  onclick={() => (type = 'product')}
                  class="p-5 rounded-2xl border-2 text-center transition flex flex-col items-center gap-2 cursor-pointer {type ===
                  'product'
                    ? 'bg-[#34A853] hover:bg-[#2d9247] shadow-[0_6px_0_#1e7e34] border-[#1e7e34] text-white active:translate-y-1.5 active:shadow-none'
                    : 'bg-white hover:bg-emerald-50/50 border-gray-300 text-gray-800 shadow-[0_4px_0_#d1d5db] active:translate-y-0.5'}"
                >
                  <Package class="w-10 h-10 {type === 'product' ? 'text-white' : 'text-[#34A853]'}" />
                  <span class="font-extrabold text-base">Produk Fisik</span>
                  <span class="text-xs {type === 'product' ? 'text-white/90' : 'text-gray-500'} leading-tight">
                    Makanan, kerajinan, alat buatanmu
                  </span>
                </button>

                <!-- 2. Jasa & Layanan (Google Blue) -->
                <button
                  type="button"
                  onclick={() => (type = 'service')}
                  class="p-5 rounded-2xl border-2 text-center transition flex flex-col items-center gap-2 cursor-pointer {type ===
                  'service'
                    ? 'bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_6px_0_#1a56b0] border-[#1a56b0] text-white active:translate-y-1.5 active:shadow-none'
                    : 'bg-white hover:bg-blue-50/50 border-gray-300 text-gray-800 shadow-[0_4px_0_#d1d5db] active:translate-y-0.5'}"
                >
                  <Wrench class="w-10 h-10 {type === 'service' ? 'text-white' : 'text-[#4285F4]'}" />
                  <span class="font-extrabold text-base">Jasa & Servis</span>
                  <span class="text-xs {type === 'service' ? 'text-white/90' : 'text-gray-500'} leading-tight">
                    Desain, servis motor, buat web, las
                  </span>
                </button>

                <!-- 3. Portofolio Karya (Google Red) -->
                <button
                  type="button"
                  onclick={() => (type = 'portfolio')}
                  class="p-5 rounded-2xl border-2 text-center transition flex flex-col items-center gap-2 cursor-pointer {type ===
                  'portfolio'
                    ? 'bg-[#EA4335] hover:bg-[#d93025] shadow-[0_6px_0_#b3261e] border-[#b3261e] text-white active:translate-y-1.5 active:shadow-none'
                    : 'bg-white hover:bg-rose-50/50 border-gray-300 text-gray-800 shadow-[0_4px_0_#d1d5db] active:translate-y-0.5'}"
                >
                  <Award class="w-10 h-10 {type === 'portfolio' ? 'text-white' : 'text-[#EA4335]'}" />
                  <span class="font-extrabold text-base">Portofolio</span>
                  <span class="text-xs {type === 'portfolio' ? 'text-white/90' : 'text-gray-500'} leading-tight">
                    Pamerkan tugas akhir / proyek juara
                  </span>
                </button>
              </div>
            </div>
          {/if}

          <div>
            <label for="post-img" class="block text-xs font-bold text-gray-700 mb-2">
              Foto Karya Jelas (Maks. 5 MB) <span class="text-[#EA4335]">*</span>
            </label>
            <label
              for="post-img"
              class="border-2 border-dashed border-gray-300 hover:border-[#4285F4] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 transition min-h-52 relative overflow-hidden shadow-inner"
            >
              {#if imagePreview}
                <img
                  src={imagePreview}
                  alt="Preview Karya"
                  class="max-h-60 rounded-xl object-contain mb-3 border-2 border-gray-200"
                />
                <span class="text-xs font-bold text-[#4285F4] bg-white px-3 py-1 rounded-full shadow-sm">
                  Klik untuk ganti foto
                </span>
              {:else}
                <Upload class="w-9 h-9 text-[#4285F4] mb-2" />
                <span class="text-sm font-bold text-gray-800">
                  Pilih Foto dari HP atau Komputer
                </span>
                <span class="text-xs text-gray-500 mt-1">
                  JPG, PNG, atau WebP (Otomatis dikonversi ke WebP)
                </span>
              {/if}
              <input
                id="post-img"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onchange={handleImageSelect}
                class="sr-only"
              />
            </label>
          </div>

          <div class="flex justify-end pt-2">
            <button
              type="button"
              onclick={nextStep}
              class="h-11 px-6 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_4px_0_#1a56b0] active:shadow-none active:translate-y-0.5 text-white font-bold text-sm inline-flex items-center gap-2 transition cursor-pointer"
            >
              <span>Lanjut ke Nama & Harga</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        {:else if step === 2}
          <div>
            <label for="post-name" class="block text-xs font-bold text-gray-700 mb-1.5">
              Judul Karya / Layanan <span class="text-[#EA4335]">*</span>
            </label>
            <input
              id="post-name"
              type="text"
              bind:value={name}
              required
              placeholder="Contoh: Nastar Keju Lumer / Servis Injeksi Motor / Desain Logo"
              class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
            />
          </div>

          <div>
            <label for="post-cat" class="block text-xs font-bold text-gray-700 mb-1.5">
              Kategori Kejuruan
            </label>
            <select
              id="post-cat"
              bind:value={categoryId}
              class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none bg-white cursor-pointer"
            >
              <option value={0}>Pilih Kategori Bidang (Opsional)</option>
              {#each categories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
          </div>

          {#if type === 'service'}
            <HppCalculator
              bind:material
              bind:packaging
              bind:overhead
              bind:labor
              bind:sellingPrice={priceMin}
              {categoryId}
              postType={type}
            />
          {:else if type === 'product'}
            <HppCalculator
              bind:material
              bind:packaging
              bind:overhead
              bind:labor
              bind:sellingPrice={price}
              {categoryId}
              postType={type}
            />
          {/if}

          {#if type === 'product'}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="post-price" class="block text-xs font-bold text-gray-700 mb-1.5">
                  Harga Jual Produk (Rp) <span class="text-[#EA4335]">*</span>
                </label>
                <input
                  id="post-price"
                  type="number"
                  min="500"
                  bind:value={price}
                  required
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>

              <div>
                <label for="post-stock" class="block text-xs font-bold text-gray-700 mb-1.5">
                  Stok Siap Jual
                </label>
                <input
                  id="post-stock"
                  type="number"
                  min="1"
                  bind:value={stock}
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>
            </div>
          {:else if type === 'service'}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="post-pmin" class="block text-xs font-bold text-gray-700 mb-1.5">
                  Tarif Minimal Layanan (Rp) <span class="text-[#EA4335]">*</span>
                </label>
                <input
                  id="post-pmin"
                  type="number"
                  min="1000"
                  bind:value={priceMin}
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>
              <div>
                <label for="post-pmax" class="block text-xs font-bold text-gray-700 mb-1.5">
                  Tarif Maksimal (Opsional)
                </label>
                <input
                  id="post-pmax"
                  type="number"
                  min="0"
                  bind:value={priceMax}
                  class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
                />
              </div>
            </div>
          {:else}
            <div>
              <label for="post-link" class="block text-xs font-bold text-gray-700 mb-1.5">
                Tautan Demo / GitHub / Figma / Video Proyek (Opsional)
              </label>
              <input
                id="post-link"
                type="url"
                bind:value={projectLink}
                placeholder="https://..."
                class="w-full p-2.5 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
              />
            </div>
          {/if}

          <!-- Cakupan Layanan & Lokasi (#12) -->
          <div class="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70 space-y-3">
            <span class="block text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin class="w-4 h-4 text-blue-600" />
              <span>Area &amp; Metode Pelaksanaan Layanan</span>
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {#each [
                { id: 'delivery', label: 'Pengantaran / COD', icon: Package },
                { id: 'digital', label: 'Online / Digital', icon: Globe },
                { id: 'onsite', label: 'Di Lokasi Klien (Panggilan)', icon: Home },
                { id: 'workshop', label: 'Di Studio / Bengkel Siswa', icon: Wrench }
              ] as mode}
                <button
                  type="button"
                  onclick={() => (serviceAreaType = mode.id as any)}
                  class="p-2.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer {serviceAreaType === mode.id
                    ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-[0_2px_0_#2563eb] font-black'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold'}"
                >
                  <mode.icon class="w-5 h-5 mb-1.5 {serviceAreaType === mode.id ? 'text-blue-600' : 'text-slate-500'}" />
                  <span class="text-[11px] leading-tight">{mode.label}</span>
                </button>
              {/each}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label for="post-subdistrict" class="block text-xs font-bold text-slate-700 mb-1">
                  Kecamatan Asal Karya / Siswa
                </label>
                <select
                  id="post-subdistrict"
                  bind:value={subdistrictId}
                  class="w-full p-2.5 text-xs font-bold border-2 border-slate-300 rounded-xl focus:border-blue-500 bg-white"
                >
                  <option value={null}>Pilih Kecamatan (Opsional)</option>
                  {#each subdistricts as sub}
                    <option value={sub.id}>Kec. {sub.name} — {sub.regionName}</option>
                  {/each}
                </select>
              </div>

              {#if serviceAreaType !== 'digital'}
                <div>
                  <label for="post-dist" class="block text-xs font-bold text-slate-700 mb-1">
                    Radius Maksimal Layanan (km)
                  </label>
                  <input
                    id="post-dist"
                    type="number"
                    min="1"
                    max="100"
                    bind:value={maxDistanceKm}
                    placeholder="Contoh: 15"
                    class="w-full p-2.5 text-xs font-bold border-2 border-slate-300 rounded-xl focus:border-blue-500 bg-white"
                  />
                </div>
              {/if}
            </div>
          </div>

          <div class="flex justify-between pt-2">
            <button
              type="button"
              onclick={() => (step = 1)}
              class="h-10 px-5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="button"
              onclick={nextStep}
              class="h-11 px-6 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_4px_0_#1a56b0] active:shadow-none active:translate-y-0.5 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Lanjut ke Deskripsi</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        {:else}
          <div>
            <label for="post-desc" class="block text-xs font-bold text-gray-700 mb-1.5">
              Jelaskan Keunggulan & Spesifikasi Karyamu <span class="text-[#EA4335]">*</span>
            </label>
            <textarea
              id="post-desc"
              rows="5"
              bind:value={description}
              required
              placeholder="Tuliskan bahan yang dipakai, lama pengerjaan, garansi, atau cara pemesanan dengan bahasa yang mudah dipahami..."
              class="w-full p-3 text-sm border-2 border-gray-300 rounded-xl shadow-[0_2px_0_#d1d5db] focus:border-[#4285F4] outline-none"
            ></textarea>
          </div>

          <div class="p-4 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center gap-4">
            {#if imagePreview}
              <img src={imagePreview} alt={name} class="w-16 h-16 rounded-xl object-cover border-2 border-gray-300" />
            {/if}
            <div>
              <p class="font-bold text-base text-gray-900">{name}</p>
              <p class="text-sm font-extrabold text-[#4285F4]">
                {type === 'portfolio'
                  ? 'Portofolio Karya'
                  : formatRupiah(type === 'service' ? priceMin : price)}
              </p>
            </div>
          </div>

          <!-- Final Submit Button (Google Color Specific from Section 6.3) -->
          <div class="flex justify-between pt-2">
            <button
              type="button"
              onclick={() => (step = 2)}
              class="h-10 px-5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 cursor-pointer"
            >
              Kembali
            </button>

            {#if type === 'product'}
              <button
                type="submit"
                disabled={submitting}
                class="h-11 px-6 rounded-xl bg-[#34A853] hover:bg-[#2d9247] shadow-[0_4px_0_#1e7e34] active:shadow-none active:translate-y-0.5 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition disabled:opacity-60"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>{submitting ? 'Menyimpan...' : 'Publikasikan Produk'}</span>
              </button>
            {:else if type === 'service'}
              <button
                type="submit"
                disabled={submitting}
                class="h-11 px-6 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] shadow-[0_4px_0_#1a56b0] active:shadow-none active:translate-y-0.5 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition disabled:opacity-60"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>{submitting ? 'Menyimpan...' : 'Publikasikan Jasa'}</span>
              </button>
            {:else}
              <button
                type="submit"
                disabled={submitting}
                class="h-11 px-6 rounded-xl bg-[#EA4335] hover:bg-[#d93025] shadow-[0_4px_0_#b3261e] active:shadow-none active:translate-y-0.5 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition disabled:opacity-60"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>{submitting ? 'Menyimpan...' : 'Publikasikan Portofolio'}</span>
              </button>
            {/if}
          </div>
        {/if}
      </form>
    </div>
  {/if}
</div>
