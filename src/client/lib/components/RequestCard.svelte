<script lang="ts">
  import { Calendar, MapPin, MessageSquarePlus, Users, Wallet } from 'lucide-svelte';
  import { formatDateId } from '../format';
  import { navigate } from '../router.svelte';

  interface Props {
    request: any;
  }

  let { request }: Props = $props();

  let statusBadgeClass = $derived.by(() => {
    if (request.status === 'open') return 'bg-emerald-50 text-[#34A853] border-emerald-200';
    if (request.status === 'assigned') return 'bg-blue-50 text-[#4285F4] border-blue-200';
    if (request.status === 'completed') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-600 border-gray-300';
  });

  let workModeBadgeClass = $derived.by(() => {
    if (request.workMode === 'remote') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (request.workMode === 'onsite') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-teal-50 text-teal-700 border-teal-200';
  });
</script>

<article
  class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] hover:border-[#4285F4] transition flex flex-col justify-between gap-4"
>
  <div>
    <!-- Top Badges -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="px-2.5 py-0.5 rounded-full border text-[11px] font-black {statusBadgeClass}">
          {request.statusLabel}
        </span>
        <span class="px-2.5 py-0.5 rounded-full border text-[11px] font-bold {workModeBadgeClass}">
          {request.workModeLabel}
        </span>
        {#if request.categoryName}
          <span class="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-bold">
            {request.categoryName}
          </span>
        {/if}
      </div>

      <span class="text-[11px] font-mono text-gray-400 font-semibold">{request.code}</span>
    </div>

    <!-- Title & Description -->
    <button
      type="button"
      onclick={() => navigate(`/butuh-bantuan/${request.code}`)}
      class="text-left group block w-full cursor-pointer"
    >
      <h3 class="text-base sm:text-lg font-extrabold text-gray-900 group-hover:text-[#4285F4] transition leading-snug">
        {request.title}
      </h3>
    </button>

    <p class="text-xs sm:text-sm text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
      {request.description}
    </p>

    <!-- Metadata Pills -->
    <div class="flex flex-wrap items-center gap-3 mt-3.5 text-xs text-gray-600">
      <span class="inline-flex items-center gap-1.5 font-extrabold text-gray-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
        <Wallet class="w-3.5 h-3.5 text-[#b45309]" />
        <span>{request.formattedBudget}</span>
      </span>

      {#if request.regionName || request.locationDetail}
        <span class="inline-flex items-center gap-1 font-medium">
          <MapPin class="w-3.5 h-3.5 text-[#EA4335] shrink-0" />
          <span class="truncate max-w-48">
            {request.regionName || request.locationDetail}
          </span>
        </span>
      {/if}

      {#if request.neededBy}
        <span class="inline-flex items-center gap-1 font-medium">
          <Calendar class="w-3.5 h-3.5 text-[#4285F4]" />
          <span>Target: {formatDateId(request.neededBy)}</span>
        </span>
      {/if}
    </div>
  </div>

  <!-- Footer: Poster & Proposal Counter + CTA -->
  <div class="pt-3.5 border-t-2 border-gray-100 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2.5">
      <img
        src={request.poster.avatarUrl}
        alt={request.poster.name}
        class="w-8 h-8 rounded-full object-cover border border-gray-300 shrink-0"
      />
      <div>
        <p class="text-xs font-bold text-gray-900 leading-tight">
          {request.poster.businessName || request.poster.companyName || request.poster.name}
        </p>
        <p class="text-[11px] text-gray-500 flex items-center gap-1">
          <Users class="w-3 h-3" />
          <span>{request.proposalsCount}/{request.maxProposals} penawaran siswa</span>
        </p>
      </div>
    </div>

    <button
      type="button"
      onclick={() => navigate(`/butuh-bantuan/${request.code}`)}
      class="h-9 px-4 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:shadow-none active:translate-y-0.5 inline-flex items-center gap-1.5 transition cursor-pointer"
    >
      <MessageSquarePlus class="w-3.5 h-3.5" />
      <span>{request.status === 'open' ? 'Lihat & Tawarkan Diri' : 'Lihat Detail'}</span>
    </button>
  </div>
</article>

