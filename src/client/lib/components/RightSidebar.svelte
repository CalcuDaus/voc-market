<script lang="ts">
  import { apiFetch } from '../api';
  import { auth } from '../auth.svelte';
  import { navigate } from '../router.svelte';

  interface Creator {
    id: number;
    name: string;
    username: string;
    avatarUrl: string;
    schoolName: string | null;
    major: string | null;
    isVerified?: boolean;
  }

  interface Props {
    creators?: Creator[];
  }

  let { creators }: Props = $props();
  let fetchedCreators = $state<Creator[]>([]);
  let loadedFallback = $state(false);

  // Strictly limited to top 3 creators as requested
  let displayCreators = $derived(
    (creators && creators.length > 0 ? creators : fetchedCreators).slice(0, 3)
  );

  $effect(() => {
    if ((!creators || creators.length === 0) && !loadedFallback) {
      loadedFallback = true;
      apiFetch<{ suggestedCreators?: Creator[] }>('/api/posts?limit=1').then((res) => {
        if (res.ok && res.data?.suggestedCreators) {
          fetchedCreators = res.data.suggestedCreators;
        }
      });
    }
  });
</script>

<aside class="space-y-4 print:hidden">
  <!-- Top Widget: Guest Call to Action OR Clean User Profile Card (Photo + Username only) -->
  {#if !auth.user}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 xl:p-5 shadow-[0_5px_0_#d1d5db]">
      <h2 class="text-sm font-extrabold text-gray-900 leading-snug">
        Bergabung dengan VOC-Market!
      </h2>
      <p class="text-xs text-gray-500 mt-1 leading-relaxed">
        Buat akun sekarang untuk memamerkan dan menjual karyamu.
      </p>

      <div class="flex items-center gap-2.5 mt-3.5">
        <button
          type="button"
          onclick={() => navigate('/masuk')}
          class="h-9 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 flex-1 text-center transition cursor-pointer"
        >
          Masuk
        </button>
        <button
          type="button"
          onclick={() => navigate('/daftar')}
          class="h-9 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 flex-1 text-center transition cursor-pointer"
        >
          Daftar
        </button>
      </div>
    </div>
  {:else}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_5px_0_#d1d5db]">
      <button
        type="button"
        onclick={() => navigate(`/profil/${auth.user!.username}`)}
        class="flex items-center gap-3 w-full text-left group cursor-pointer"
      >
        <img
          src={auth.user.avatarUrl}
          alt={auth.user.name}
          class="w-12 h-12 rounded-full object-cover border-2 border-gray-300 shadow-[0_2px_0_#d1d5db] shrink-0 group-hover:border-[#4285F4] transition"
        />
        <div class="overflow-hidden">
          <p class="font-bold text-sm text-gray-900 group-hover:text-[#4285F4] truncate transition">
            {auth.user.name}
          </p>
          <p class="text-xs text-gray-500 font-medium truncate">
            @{auth.user.username}
          </p>
        </div>
      </button>
    </div>
  {/if}

  <!-- Kreator SMK Terpopuler Widget (Strictly Top 3 Creators) -->
  {#if displayCreators.length > 0}
    <div>
      <h3 class="text-xs font-black uppercase tracking-wider text-gray-500 px-1 mb-2.5">
        KREATOR SMK TERPOPULER
      </h3>

      <div class="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-[0_5px_0_#d1d5db] divide-y divide-gray-100">
        {#each displayCreators as creator (creator.id)}
          <div class="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onclick={() => navigate(`/profil/${creator.username}`)}
              class="flex items-center gap-2.5 text-left group overflow-hidden flex-1 cursor-pointer"
            >
              <img
                src={creator.avatarUrl}
                alt={creator.name}
                class="w-9 h-9 rounded-full object-cover border-2 border-gray-300 shrink-0"
              />
              <div class="overflow-hidden">
                <p class="text-xs font-bold text-gray-900 group-hover:text-[#4285F4] truncate transition">
                  {creator.name}
                </p>
                <p class="text-[11px] text-gray-500 truncate">
                  {creator.schoolName || 'Siswa SMK'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onclick={() => navigate(`/profil/${creator.username}`)}
              class="h-7 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#4285F4] border border-blue-200 font-bold text-xs shrink-0 transition active:translate-y-0.5 cursor-pointer"
            >
              Lihat
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</aside>
