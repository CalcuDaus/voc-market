<script lang="ts">
  import {
    Award,
    Calculator,
    Clock,
    Heart,
    Info,
    Medal,
    Rocket,
    ShieldCheck,
    Star
  } from 'lucide-svelte';

  let {
    badges = [],
    title = 'Koleksi Lencana Vokasi',
    emptyMessage = 'Belum ada lencana yang diraih. Selesaikan pesanan riil untuk membuka lencana!'
  }: {
    badges: Array<{
      id: number;
      slug: string;
      name: string;
      description: string;
      icon: string;
      color: string;
      category: string;
      contextNote?: string | null;
      awardedAt?: string;
    }>;
    title?: string;
    emptyMessage?: string;
  } = $props();

  function getBadgeIcon(iconName: string) {
    switch (iconName) {
      case 'rocket':
        return Rocket;
      case 'clock':
        return Clock;
      case 'award':
        return Award;
      case 'star':
        return Star;
      case 'heart':
        return Heart;
      case 'calculator':
        return Calculator;
      case 'shield-check':
        return ShieldCheck;
      default:
        return Medal;
    }
  }

  function getColorTheme(color: string) {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50/60',
          border: 'border-emerald-600',
          badge: 'bg-emerald-100 text-emerald-800',
          shadow: 'shadow-[0_3px_0_#059669]',
          iconChip: 'bg-emerald-100/90 text-emerald-700 border-emerald-300'
        };
      case 'amber':
        return {
          bg: 'bg-amber-50/60',
          border: 'border-amber-600',
          badge: 'bg-amber-100 text-amber-800',
          shadow: 'shadow-[0_3px_0_#d97706]',
          iconChip: 'bg-amber-100/90 text-amber-700 border-amber-300'
        };
      case 'violet':
        return {
          bg: 'bg-violet-50/60',
          border: 'border-violet-600',
          badge: 'bg-violet-100 text-violet-800',
          shadow: 'shadow-[0_3px_0_#7c3aed]',
          iconChip: 'bg-violet-100/90 text-violet-700 border-violet-300'
        };
      case 'blue':
      default:
        return {
          bg: 'bg-blue-50/60',
          border: 'border-blue-600',
          badge: 'bg-blue-100 text-blue-800',
          shadow: 'shadow-[0_3px_0_#2563eb]',
          iconChip: 'bg-blue-100/90 text-blue-700 border-blue-300'
        };
    }
  }
</script>

<div class="rounded-3xl border-2 border-slate-900 bg-white p-5 shadow-[0_5px_0_#0f172a]">
  <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
    <div class="flex items-center gap-2.5">
      <span
        class="w-8 h-8 rounded-xl bg-amber-100 border-2 border-amber-500 text-amber-700 flex items-center justify-center font-black"
      >
        <Award class="w-4 h-4" strokeWidth={2.2} />
      </span>
      <div>
        <h4 class="font-black text-slate-900 text-sm">{title}</h4>
        <p class="text-[11px] font-semibold text-slate-500">
          Bukti nyata etos kerja, kualitas, dan kewirausahaan
        </p>
      </div>
    </div>
    <span
      class="px-2.5 py-1 text-xs font-black rounded-lg bg-slate-100 border border-slate-300 text-slate-700"
    >
      {badges.length} Diraih
    </span>
  </div>

  {#if badges.length === 0}
    <div
      class="text-center py-6 px-4 bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200"
    >
      <p class="text-xs font-semibold text-slate-500">{emptyMessage}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each badges as b (b.id)}
        {@const theme = getColorTheme(b.color)}
        {@const IconComp = getBadgeIcon(b.icon)}
        <div
          class="relative p-3.5 rounded-2xl border-2 {theme.border} {theme.bg} {theme.shadow} flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <span
                class="w-10 h-10 rounded-xl border flex items-center justify-center {theme.iconChip}"
              >
                <IconComp class="w-5 h-5" strokeWidth={2.2} />
              </span>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider {theme.badge}"
              >
                {b.category.replace('_', ' ')}
              </span>
            </div>
            <h5 class="text-xs font-black text-slate-900 leading-snug">{b.name}</h5>
            <p class="text-[11px] font-medium text-slate-600 mt-1 leading-snug">
              {b.description}
            </p>
          </div>

          {#if b.contextNote}
            <div
              class="mt-2.5 pt-2 border-t border-slate-900/10 text-[10px] font-bold text-slate-600 flex items-center gap-1"
            >
              <Info class="w-3 h-3 text-slate-400 shrink-0" />
              <span class="truncate">{b.contextNote}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
