<script lang="ts">
  import { BadgeCheck, School } from 'lucide-svelte';
  import { apiFetch } from '../api';

  interface SchoolOption {
    id: number;
    name: string;
    slug: string;
    regionName: string | null;
    isVerified: boolean;
  }

  interface Props {
    schoolName: string;
    schoolId?: number | null;
    required?: boolean;
    onSelect: (school: { id: number | null; name: string }) => void;
  }

  let { schoolName, schoolId = null, required = false, onSelect }: Props = $props();

  let inputVal = $state('');
  let options = $state<SchoolOption[]>([]);
  let showDropdown = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    inputVal = schoolName;
  });

  async function fetchSchools(q: string) {
    const res = await apiFetch<{ items: SchoolOption[] }>(
      `/api/schools?q=${encodeURIComponent(q)}&limit=8`
    );
    if (res.ok && res.data?.items) {
      options = res.data.items;
    }
  }

  function handleInput(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value;
    inputVal = val;
    onSelect({ id: null, name: val });
    showDropdown = true;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchSchools(val.trim());
    }, 180);
  }

  function handleFocus() {
    showDropdown = true;
    if (options.length === 0) {
      fetchSchools(inputVal.trim());
    }
  }

  function pickOption(opt: SchoolOption) {
    inputVal = opt.name;
    onSelect({ id: opt.id, name: opt.name });
    showDropdown = false;
  }

  function handleBlur() {
    setTimeout(() => {
      showDropdown = false;
    }, 180);
  }
</script>

<div class="relative">
  <div class="relative">
    <School class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="text"
      value={inputVal}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      {required}
      placeholder="Ketik atau pilih SMK (contoh: SMKN 1 Cibinong)"
      class="w-full p-2.5 pl-9 text-sm border-2 border-gray-300 rounded-xl bg-white shadow-[0_2px_0_#d1d5db] focus:outline-none focus:border-[#4285F4] transition"
    />
  </div>

  {#if schoolId}
    <p class="text-[11px] font-bold text-[#34A853] mt-1 flex items-center gap-1">
      <BadgeCheck class="w-3.5 h-3.5" />
      <span>Terhubung ke Etalase Sekolah Resmi</span>
    </p>
  {/if}

  {#if showDropdown && options.length > 0}
    <div
      class="absolute z-30 left-0 right-0 mt-1.5 bg-white border-2 border-gray-300 rounded-xl shadow-[0_5px_0_#d1d5db] max-h-52 overflow-y-auto divide-y divide-gray-100"
    >
      {#each options as opt (opt.id)}
        <button
          type="button"
          onmousedown={() => pickOption(opt)}
          class="w-full px-3.5 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between gap-2 transition cursor-pointer"
        >
          <div class="overflow-hidden">
            <p class="text-xs font-bold text-gray-900 flex items-center gap-1 truncate">
              <span class="truncate">{opt.name}</span>
              {#if opt.isVerified}
                <BadgeCheck class="w-3.5 h-3.5 text-[#4285F4] shrink-0" />
              {/if}
            </p>
            {#if opt.regionName}
              <p class="text-[11px] text-gray-500 truncate">{opt.regionName}</p>
            {/if}
          </div>
          <span class="text-[10px] font-bold text-[#4285F4] bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
            Pilih
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>

