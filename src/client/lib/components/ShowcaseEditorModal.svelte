<script lang="ts">
  import {
    Box,
    Check,
    Film,
    Globe,
    Image as ImageIcon,
    Plus,
    Trash2,
    Upload,
    X
  } from 'lucide-svelte';
  import { apiFetch } from '../api';
  import { toast } from '../toast.svelte';

  interface Props {
    postId: number;
    initialDetails?: any;
    initialMedia?: any[];
    isOpen: boolean;
    onClose: () => void;
    onUpdated?: () => void;
  }

  let {
    postId,
    initialDetails = null,
    initialMedia = [],
    isOpen,
    onClose,
    onUpdated
  }: Props = $props();

  let activeTab = $state<'study' | 'media'>('study');

  // Study Case Fields
  let tagline = $state('');
  let major = $state('');
  let problem = $state('');
  let process = $state('');
  let result = $state('');
  let role = $state('');
  let toolsInput = $state('');
  let demoUrl = $state('');
  let repoUrl = $state('');
  let savingDetails = $state(false);

  // Media Upload State
  let mediaList = $state<any[]>([]);
  let mediaKind = $state<'model3d' | 'video' | 'embed'>('model3d');
  let mediaFile = $state<File | null>(null);
  let embedUrl = $state('');
  let mediaTitle = $state('');
  let uploadingMedia = $state(false);

  $effect(() => {
    if (isOpen) {
      tagline = initialDetails?.tagline || '';
      major = initialDetails?.major || '';
      problem = initialDetails?.problem || '';
      process = initialDetails?.process || '';
      result = initialDetails?.result || '';
      role = initialDetails?.role || '';
      toolsInput = Array.isArray(initialDetails?.tools) ? initialDetails.tools.join(', ') : '';
      demoUrl = initialDetails?.demoUrl || '';
      repoUrl = initialDetails?.repoUrl || '';
      mediaList = initialMedia || [];
    }
  });

  async function handleSaveDetails() {
    try {
      savingDetails = true;
      const tools = toolsInput
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const res = await apiFetch(`/api/showcase/${postId}/details`, {
        method: 'PUT',
        body: {
          tagline,
          major,
          problem,
          process,
          result,
          role,
          tools,
          demoUrl,
          repoUrl
        }
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Studi kasus karya berhasil disimpan!');
      if (onUpdated) onUpdated();
    } catch {
      toast.error('Gagal menyimpan detail studi kasus');
    } finally {
      savingDetails = false;
    }
  }

  async function handleUploadMedia() {
    try {
      uploadingMedia = true;

      if (mediaKind === 'embed') {
        if (!embedUrl.trim()) {
          toast.error('Masukkan tautan demo atau embed');
          return;
        }

        const res = await apiFetch<any>(`/api/showcase/${postId}/media`, {
          method: 'POST',
          body: {
            kind: 'embed',
            url: embedUrl.trim(),
            title: mediaTitle.trim() || 'Demo Aplikasi'
          }
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success('Embed demo berhasil ditambahkan!');
        mediaList = [...mediaList, res.data.media];
        embedUrl = '';
        mediaTitle = '';
        if (onUpdated) onUpdated();
        return;
      }

      // File upload
      if (!mediaFile) {
        toast.error('Pilih file terlebih dahulu');
        return;
      }

      const form = new FormData();
      form.append('file', mediaFile);
      form.append('kind', mediaKind);
      form.append('title', mediaTitle.trim());

      const res = await apiFetch<any>(`/api/showcase/${postId}/media`, {
        method: 'POST',
        body: form
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`File ${mediaKind === 'model3d' ? 'Model 3D' : 'Video'} berhasil diunggah!`);
      mediaList = [...mediaList, res.data.media];
      mediaFile = null;
      mediaTitle = '';
      if (onUpdated) onUpdated();
    } catch {
      toast.error('Gagal mengunggah media');
    } finally {
      uploadingMedia = false;
    }
  }

  async function handleDeleteMedia(mediaId: number) {
    if (!confirm('Hapus media ini dari karya?')) return;
    try {
      const res = await apiFetch(`/api/showcase/${postId}/media/${mediaId}`, {
        method: 'DELETE'
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      mediaList = mediaList.filter((m) => m.id !== mediaId);
      toast.success('Media berhasil dihapus');
      if (onUpdated) onUpdated();
    } catch {
      toast.error('Gagal menghapus media');
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
    <div class="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
      <!-- Modal Header -->
      <div class="p-5 sm:p-6 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <h3 class="text-lg font-black text-slate-900">Kelola Showcase &amp; Media Interaktif</h3>
          <p class="text-xs text-slate-500 mt-0.5">Lengkapi studi kasus, model 3D, dan video prototipe karyamu.</p>
        </div>
        <button
          type="button"
          onclick={onClose}
          aria-label="Tutup Modal"
          class="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Tab Switcher -->
      <div class="flex border-b-2 border-slate-100 px-6 pt-3 bg-white gap-4">
        <button
          type="button"
          onclick={() => (activeTab = 'study')}
          class="pb-3 text-xs font-bold transition border-b-2 cursor-pointer {activeTab === 'study'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'}"
        >
          1. Cerita &amp; Studi Kasus
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'media')}
          class="pb-3 text-xs font-bold transition border-b-2 cursor-pointer {activeTab === 'media'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'}"
        >
          2. Media 3D, Video &amp; Demo ({mediaList.length})
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {#if activeTab === 'study'}
          <form onsubmit={(e) => { e.preventDefault(); handleSaveDetails(); }} class="space-y-4">
            <div>
              <label for="sc-tagline" class="block text-xs font-bold text-slate-700 mb-1">Tagline Ringkas Karya</label>
              <input
                id="sc-tagline"
                type="text"
                bind:value={tagline}
                placeholder="Contoh: Helm Pintar Sensor IoT &amp; Notifikasi Darurat Berbasis ESP32"
                class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="sc-major" class="block text-xs font-bold text-slate-700 mb-1">Jurusan / Bidang Keahlian</label>
                <input
                  id="sc-major"
                  type="text"
                  bind:value={major}
                  placeholder="Contoh: Rekayasa Perangkat Lunak (RPL)"
                  class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="sc-role" class="block text-xs font-bold text-slate-700 mb-1">Peran Kamu di Proyek</label>
                <input
                  id="sc-role"
                  type="text"
                  bind:value={role}
                  placeholder="Contoh: Lead 3D Modeler &amp; UI Designer"
                  class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label for="sc-tools" class="block text-xs font-bold text-slate-700 mb-1">Alat &amp; Software yang Digunakan (Pisahkan Koma)</label>
              <input
                id="sc-tools"
                type="text"
                bind:value={toolsInput}
                placeholder="Contoh: Blender, Figma, Svelte 5, Three.js, Arduino IDE"
                class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label for="sc-problem" class="block text-xs font-bold text-slate-700 mb-1">1. Masalah &amp; Latar Belakang</label>
              <textarea
                id="sc-problem"
                rows="3"
                bind:value={problem}
                placeholder="Apa masalah yang melatarbelakangi pembuatan karya ini?"
                class="w-full p-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              ></textarea>
            </div>

            <div>
              <label for="sc-process" class="block text-xs font-bold text-slate-700 mb-1">2. Proses Pengerjaan &amp; Solusi Teknis</label>
              <textarea
                id="sc-process"
                rows="3"
                bind:value={process}
                placeholder="Ceritakan tahapan pembuatan, riset, atau kendala yang berhasil diselesaikan..."
                class="w-full p-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              ></textarea>
            </div>

            <div>
              <label for="sc-result" class="block text-xs font-bold text-slate-700 mb-1">3. Hasil Akhir &amp; Dampak</label>
              <textarea
                id="sc-result"
                rows="3"
                bind:value={result}
                placeholder="Bagaimana hasil akhir dan manfaat karya ini?"
                class="w-full p-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="sc-demo" class="block text-xs font-bold text-slate-700 mb-1">Tautan Demo Langsung</label>
                <input
                  id="sc-demo"
                  type="url"
                  bind:value={demoUrl}
                  placeholder="https://proyek-kamu.vercel.app"
                  class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label for="sc-repo" class="block text-xs font-bold text-slate-700 mb-1">Tautan Repositori GitHub / Drive</label>
                <input
                  id="sc-repo"
                  type="url"
                  bind:value={repoUrl}
                  placeholder="https://github.com/..."
                  class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div class="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={savingDetails}
                class="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {savingDetails ? 'Menyimpan...' : 'Simpan Cerita Studi Kasus'}
              </button>
            </div>
          </form>
        {:else}
          <!-- Tab Media -->
          <div class="space-y-6">
            <!-- Upload Box -->
            <div class="bg-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 space-y-4">
              <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Tambah Media Baru</h4>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onclick={() => (mediaKind = 'model3d')}
                  class="flex-1 h-9 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 {mediaKind === 'model3d'
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white text-slate-600 border-slate-200'}"
                >
                  <Box class="w-3.5 h-3.5" />
                  <span>Model 3D (.glb)</span>
                </button>
                <button
                  type="button"
                  onclick={() => (mediaKind = 'video')}
                  class="flex-1 h-9 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 {mediaKind === 'video'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-200'}"
                >
                  <Film class="w-3.5 h-3.5" />
                  <span>Video (.mp4)</span>
                </button>
                <button
                  type="button"
                  onclick={() => (mediaKind = 'embed')}
                  class="flex-1 h-9 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 {mediaKind === 'embed'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200'}"
                >
                  <Globe class="w-3.5 h-3.5" />
                  <span>Embed / YouTube</span>
                </button>
              </div>

              {#if mediaKind === 'embed'}
                <div>
                  <label for="sc-embed-url" class="block text-xs font-bold text-slate-700 mb-1">Tautan Embed (YouTube, Figma, Canva, Vercel)</label>
                  <input
                    id="sc-embed-url"
                    type="url"
                    bind:value={embedUrl}
                    placeholder="https://www.youtube.com/watch?v=... atau https://figma.com/..."
                    class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none bg-white"
                  />
                </div>
              {:else}
                <div>
                  <label for="sc-file-upload" class="block text-xs font-bold text-slate-700 mb-1">
                    {mediaKind === 'model3d' ? 'File 3D Binary glTF (.glb, Maks 25MB)' : 'File Video (.mp4 / .webm, Maks 50MB)'}
                  </label>
                  <input
                    id="sc-file-upload"
                    type="file"
                    accept={mediaKind === 'model3d' ? '.glb' : 'video/mp4,video/webm'}
                    onchange={(e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files[0]) mediaFile = files[0];
                    }}
                    class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
              {/if}

              <div>
                <label for="sc-media-title" class="block text-xs font-bold text-slate-700 mb-1">Judul / Label Media (Opsional)</label>
                <input
                  id="sc-media-title"
                  type="text"
                  bind:value={mediaTitle}
                  placeholder="Contoh: Render Prototipe 3D Mesin / Video Demo Penggunaan"
                  class="w-full h-10 px-3 rounded-xl border-2 border-slate-200 text-xs focus:border-blue-500 focus:outline-none bg-white"
                />
              </div>

              <button
                type="button"
                onclick={handleUploadMedia}
                disabled={uploadingMedia}
                class="w-full h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload class="w-4 h-4" />
                <span>{uploadingMedia ? 'Mengunggah...' : 'Unggah & Tambahkan ke Showcase'}</span>
              </button>
            </div>

            <!-- Existing Media Items List -->
            <div class="space-y-3">
              <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Media yang Terpasang ({mediaList.length})</h4>

              {#if mediaList.length === 0}
                <p class="text-xs text-slate-400 italic">Belum ada media interaktif tambahan.</p>
              {:else}
                <div class="divide-y divide-slate-100 border-2 border-slate-100 rounded-xl overflow-hidden">
                  {#each mediaList as item}
                    <div class="p-3 bg-white flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2.5 min-w-0">
                        {#if item.kind === 'model3d'}
                          <Box class="w-4 h-4 text-cyan-600 shrink-0" />
                        {:else if item.kind === 'video'}
                          <Film class="w-4 h-4 text-rose-600 shrink-0" />
                        {:else if item.kind === 'embed'}
                          <Globe class="w-4 h-4 text-indigo-600 shrink-0" />
                        {:else}
                          <ImageIcon class="w-4 h-4 text-emerald-600 shrink-0" />
                        {/if}
                        <div class="min-w-0">
                          <p class="text-xs font-bold text-slate-800 truncate">{item.title || item.kind}</p>
                          <p class="text-[10px] text-slate-400 truncate">{item.url}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onclick={() => handleDeleteMedia(item.id)}
                        aria-label="Hapus Media"
                        class="w-7 h-7 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center justify-center transition shrink-0 cursor-pointer"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
