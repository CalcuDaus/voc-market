<script lang="ts">
  import {
    Award,
    CheckCircle2,
    Circle,
    Compass,
    Crown,
    Sparkles,
    Sprout,
    Target,
    Trophy
  } from 'lucide-svelte';

  let {
    level = 1,
    title,
    nextLevelRequirements = [],
    compact = false
  }: {
    level: number;
    title?: string;
    nextLevelRequirements?: Array<{
      label: string;
      achieved: boolean;
      current: number | string | boolean;
      target: number | string | boolean;
    }>;
    compact?: boolean;
  } = $props();

  const levelInfo = $derived.by(() => {
    switch (level) {
      case 4:
        return {
          title: title || 'Profesional Vokasi',
          icon: Crown,
          bgClass: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white',
          borderClass: 'border-purple-900',
          shadowClass: 'shadow-[0_4px_0_#3b0764]',
          tag: 'Tingkat Tertinggi',
          desc: 'Terbukti menyelesaikan banyak pesanan dengan kepuasan pelanggan istimewa.'
        };
      case 3:
        return {
          title: title || 'Mitra Terpercaya',
          icon: Trophy,
          bgClass: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
          borderClass: 'border-amber-800',
          shadowClass: 'shadow-[0_4px_0_#78350f]',
          tag: 'Rekomendasi Utama',
          desc: 'Terverifikasi guru pembimbing dengan rekam jejak pesanan selesai konsisten.'
        };
      case 2:
        return {
          title: title || 'Kreator Aktif',
          icon: Sparkles,
          bgClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
          borderClass: 'border-emerald-800',
          shadowClass: 'shadow-[0_4px_0_#064e3b]',
          tag: 'Pesanan Perdana Selesai',
          desc: 'Telah berhasil menyelesaikan pesanan riil dan siap menerima proyek baru.'
        };
      case 1:
      default:
        return {
          title: title || 'Kreator Pemula',
          icon: Sprout,
          bgClass: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white',
          borderClass: 'border-blue-800',
          shadowClass: 'shadow-[0_4px_0_#1e3a8a]',
          tag: 'Memulai Perjalanan',
          desc: 'Kreator siswa SMK yang baru bergabung untuk memamerkan karya dan jasanya.'
        };
    }
  });
</script>

{#if compact}
  <div
    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 {levelInfo.borderClass} {levelInfo.bgClass} shadow-xs font-black text-xs"
  >
    <levelInfo.icon class="w-4 h-4 shrink-0" strokeWidth={2.2} />
    <span>Level {level}: {levelInfo.title}</span>
  </div>
{:else}
  <div
    class="rounded-3xl border-2 {levelInfo.borderClass} overflow-hidden {levelInfo.shadowClass} bg-white"
  >
    <!-- Header Banner -->
    <div class="p-5 {levelInfo.bgClass} flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span
          class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-inner"
        >
          <levelInfo.icon class="w-6 h-6" strokeWidth={2.2} />
        </span>
        <div>
          <span class="text-[11px] font-black tracking-wider uppercase opacity-90 block">
            Tingkat Reputasi Siswa
          </span>
          <h3 class="text-xl font-black leading-tight">Level {level} — {levelInfo.title}</h3>
        </div>
      </div>
      <span
        class="hidden sm:inline-block px-3 py-1 text-xs font-black rounded-full bg-white/20 border border-white/30"
      >
        {levelInfo.tag}
      </span>
    </div>

    <!-- Description & Progress -->
    <div class="p-5 text-slate-800 space-y-4">
      <p class="text-xs font-medium text-slate-600 leading-relaxed">
        {levelInfo.desc}
      </p>

      {#if nextLevelRequirements && nextLevelRequirements.length > 0 && level < 4}
        <div class="pt-3 border-t border-slate-100">
          <div class="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-2.5">
            <Target class="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <h4>Syarat Menuju Level {level + 1}</h4>
          </div>
          <div class="space-y-2">
            {#each nextLevelRequirements as req}
              <div
                class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
              >
                <div class="flex items-center gap-2">
                  {#if req.achieved}
                    <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                  {:else}
                    <Circle class="w-4 h-4 text-slate-300 shrink-0" />
                  {/if}
                  <span
                    class="{req.achieved ? 'font-bold text-slate-900 line-through opacity-70' : 'font-semibold text-slate-700'}"
                  >
                    {req.label}
                  </span>
                </div>
                <span
                  class="text-[11px] font-black {req.achieved ? 'text-emerald-700' : 'text-slate-500'}"
                >
                  {req.current} / {req.target}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
