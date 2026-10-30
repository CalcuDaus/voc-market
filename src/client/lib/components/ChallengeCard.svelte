<script lang="ts">
  import {
    Award,
    BadgeCheck,
    Briefcase,
    Building2,
    Clock,
    Coins,
    FileCheck,
    Gift,
    Trophy,
    Users
  } from 'lucide-svelte';
  import { formatDateId } from '../format';
  import { navigate } from '../router.svelte';

  interface Props {
    challenge: any;
  }

  let { challenge }: Props = $props();

  let daysLeft = $derived.by(() => {
    const diff = new Date(challenge.submissionDeadline).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  });

  let statusClass = $derived.by(() => {
    if (challenge.status === 'open') return 'bg-emerald-50 text-[#34A853] border-emerald-200';
    if (challenge.status === 'judging') return 'bg-amber-50 text-amber-800 border-amber-200';
    if (challenge.status === 'finished') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  });

  const REWARD_LABELS: Record<string, string> = {
    uang: 'Uang Pembinaan',
    sertifikat: 'Sertifikat QR',
    magang: 'Tiket Magang',
    kerja: 'Rekrutmen Kerja',
    produk: 'Hadiah Produk'
  };
</script>

<article
  class="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-[0_5px_0_#d1d5db] hover:border-[#4285F4] transition flex flex-col justify-between"
>
  <div>
    {#if challenge.coverImageUrl}
      <button
        type="button"
        onclick={() => navigate(`/tantangan/${challenge.slug}`)}
        class="block w-full h-44 bg-gray-100 overflow-hidden cursor-pointer"
      >
        <img
          src={challenge.coverImageUrl}
          alt={challenge.title}
          class="w-full h-full object-cover hover:scale-105 transition duration-300"
        />
      </button>
    {/if}

    <div class="p-5">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span class="px-2.5 py-0.5 rounded-full border text-[11px] font-black {statusClass}">
          {challenge.statusLabel}
        </span>

        {#if challenge.status === 'open' && daysLeft > 0}
          <span class="inline-flex items-center gap-1 text-[11px] font-bold text-[#EA4335] bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
            <Clock class="w-3 h-3" />
            <span>{daysLeft} hari lagi</span>
          </span>
        {:else}
          <span class="text-[11px] text-gray-500 font-semibold">
            Batas: {formatDateId(challenge.submissionDeadline)}
          </span>
        {/if}
      </div>

      <!-- Company Host -->
      <div class="flex items-center gap-2 mb-2">
        <img
          src={challenge.company.avatarUrl}
          alt={challenge.company.companyName || challenge.company.name}
          class="w-6 h-6 rounded-full object-cover border border-gray-300 shrink-0"
        />
        <span class="text-xs font-bold text-gray-700 truncate">
          {challenge.company.companyName || challenge.company.name}
        </span>
        {#if challenge.company.isCompanyVerified}
          <BadgeCheck class="w-3.5 h-3.5 text-[#4285F4] shrink-0" />
        {/if}
      </div>

      <!-- Challenge Title & Summary -->
      <button
        type="button"
        onclick={() => navigate(`/tantangan/${challenge.slug}`)}
        class="text-left group block w-full cursor-pointer"
      >
        <h3 class="text-base sm:text-lg font-extrabold text-gray-900 group-hover:text-[#4285F4] transition leading-snug">
          {challenge.title}
        </h3>
      </button>

      <p class="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
        {challenge.summary}
      </p>

      <!-- Reward Badges -->
      <div class="flex flex-wrap gap-1.5 mt-3.5">
        {#each challenge.rewardTypes || [] as rt}
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold"
          >
            {#if rt === 'uang'}
              <Coins class="w-3.5 h-3.5 text-amber-700 shrink-0" />
            {:else if rt === 'sertifikat'}
              <FileCheck class="w-3.5 h-3.5 text-amber-700 shrink-0" />
            {:else if rt === 'magang'}
              <Building2 class="w-3.5 h-3.5 text-amber-700 shrink-0" />
            {:else if rt === 'kerja'}
              <Briefcase class="w-3.5 h-3.5 text-amber-700 shrink-0" />
            {:else}
              <Gift class="w-3.5 h-3.5 text-amber-700 shrink-0" />
            {/if}
            <span>{REWARD_LABELS[rt] || rt}</span>
          </span>
        {/each}
      </div>

      <p class="text-xs font-bold text-gray-800 mt-2.5 bg-gray-50 border border-gray-200 rounded-xl p-2.5 line-clamp-2">
        <Trophy class="w-3.5 h-3.5 text-[#FBBC05] inline mr-1 -mt-0.5" />
        {challenge.prizeDescription}
      </p>
    </div>
  </div>

  <div class="px-5 py-3.5 bg-gray-50/70 border-t-2 border-gray-100 flex items-center justify-between gap-3">
    <span class="text-xs font-semibold text-gray-600 inline-flex items-center gap-1.5">
      <Users class="w-3.5 h-3.5 text-[#4285F4]" />
      <span>{challenge.submissionsCount} karya siswa</span>
    </span>

    <button
      type="button"
      onclick={() => navigate(`/tantangan/${challenge.slug}`)}
      class="h-9 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 inline-flex items-center gap-1.5 transition cursor-pointer"
    >
      <Award class="w-3.5 h-3.5" />
      <span>{challenge.status === 'finished' ? 'Lihat Pemenang' : 'Baca Brief'}</span>
    </button>
  </div>
</article>

