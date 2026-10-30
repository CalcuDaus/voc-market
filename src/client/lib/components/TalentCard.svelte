<script lang="ts">
  import {
    Award,
    BadgeCheck,
    Bookmark,
    CheckCircle2,
    FileBadge,
    MapPin,
    School,
    Send,
    Star
  } from 'lucide-svelte';
  import { navigate } from '../router.svelte';
  import { JOB_PREF_TYPE_LABELS, STUDENT_STATUS_LABELS } from '../../../shared/constants';

  interface Props {
    student: any;
    onInvite?: (student: any) => void;
    onToggleSave?: (student: any) => void;
  }

  let { student, onInvite, onToggleSave }: Props = $props();
</script>

<article
  class="bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-[0_5px_0_#d1d5db] flex flex-col justify-between gap-4"
>
  <div>
    <!-- Top Identity Row + Talent Score -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <img
          src={student.avatarUrl}
          alt={student.name}
          class="w-14 h-14 rounded-2xl object-cover border-2 border-gray-300 shrink-0"
        />
        <div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onclick={() => navigate(`/profil/${student.username}`)}
              class="text-base font-extrabold text-gray-900 hover:text-[#4285F4] transition text-left cursor-pointer"
            >
              {student.name}
            </button>
            {#if student.isVerified}
              <BadgeCheck class="w-4 h-4 text-[#4285F4] shrink-0" />
            {/if}
          </div>

          {#if student.headline}
            <p class="text-xs font-bold text-gray-700 mt-0.5 line-clamp-1">
              {student.headline}
            </p>
          {/if}

          <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-gray-500 mt-1">
            {#if student.schoolName}
              <span class="inline-flex items-center gap-1 font-semibold text-gray-700">
                <School class="w-3.5 h-3.5 text-[#4285F4]" />
                <span>{student.schoolName}</span>
              </span>
            {/if}
            {#if student.regionName}
              <span class="inline-flex items-center gap-1">
                <MapPin class="w-3 h-3 text-[#EA4335]" />
                <span>{student.regionName}</span>
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Score Pill -->
      <div class="text-right shrink-0">
        <div
          class="px-2.5 py-1 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-[#34A853] text-center"
        >
          <span class="block text-[10px] font-black uppercase tracking-wider">Skor Vokasi</span>
          <span class="text-sm font-black">{Number(student.talentScore || 0).toFixed(0)}</span>
        </div>
      </div>
    </div>

    <!-- Major & Student Status Badges -->
    <div class="flex flex-wrap items-center gap-1.5 mt-3">
      {#if student.major}
        <span class="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[#4285F4] text-[11px] font-bold">
          {student.major}
        </span>
      {/if}
      {#if student.studentStatus}
        <span class="px-2.5 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold">
          {STUDENT_STATUS_LABELS[student.studentStatus as 'active' | 'final_year' | 'alumni'] || student.studentStatus}
        </span>
      {/if}
      {#each student.jobPreferences?.types || [] as prefType}
        <span class="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-extrabold">
          {JOB_PREF_TYPE_LABELS[prefType as 'pkl' | 'magang' | 'kerja' | 'freelance'] || prefType}
        </span>
      {/each}
    </div>

    <!-- Verified Track Record Stats -->
    <div class="grid grid-cols-3 gap-2 mt-3.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-center">
      <div>
        <p class="text-[10px] font-bold text-gray-500 uppercase">Proyek Selesai</p>
        <p class="text-sm font-black text-gray-900 flex items-center justify-center gap-1 mt-0.5">
          <CheckCircle2 class="w-3.5 h-3.5 text-[#34A853]" />
          <span>{student.statCompletedOrders || 0}</span>
        </p>
      </div>
      <div>
        <p class="text-[10px] font-bold text-gray-500 uppercase">Rating</p>
        <p class="text-sm font-black text-gray-900 flex items-center justify-center gap-1 mt-0.5">
          <Star class="w-3.5 h-3.5 fill-[#FBBC05] text-[#FBBC05]" />
          <span>{Number(student.statAvgRating) > 0 ? student.statAvgRating : '-'}</span>
        </p>
      </div>
      <div>
        <p class="text-[10px] font-bold text-gray-500 uppercase">Sertifikat</p>
        <p class="text-sm font-black text-gray-900 flex items-center justify-center gap-1 mt-0.5">
          <Award class="w-3.5 h-3.5 text-purple-600" />
          <span>{student.statCertificatesCount || 0}</span>
        </p>
      </div>
    </div>

    <!-- Skills -->
    {#if student.skills?.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-3">
        {#each student.skills.slice(0, 5) as sk}
          <span class="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold">
            {sk}
          </span>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Action Buttons -->
  <div class="pt-3 border-t-2 border-gray-100 flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => navigate(`/paspor-kerja/${student.username}`)}
        class="h-9 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs inline-flex items-center gap-1.5 transition active:translate-y-0.5 cursor-pointer"
      >
        <FileBadge class="w-3.5 h-3.5" />
        <span>Paspor Kerja</span>
      </button>

      {#if onToggleSave}
        <button
          type="button"
          onclick={() => onToggleSave?.(student)}
          title={student.isSaved ? 'Tersimpan di Favorit' : 'Simpan Kandidat'}
          class="h-9 w-9 rounded-xl border-2 flex items-center justify-center transition active:translate-y-0.5 cursor-pointer {student.isSaved
            ? 'bg-amber-50 border-[#FBBC05] text-[#b45309]'
            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
        >
          <Bookmark class="w-4 h-4 {student.isSaved ? 'fill-[#FBBC05]' : ''}" />
        </button>
      {/if}
    </div>

    {#if onInvite}
      <button
        type="button"
        onclick={() => onInvite?.(student)}
        class="h-9 px-4 rounded-xl bg-[#34A853] hover:bg-[#2d9247] text-white font-bold text-xs shadow-[0_3px_0_#1e7e34] active:shadow-none active:translate-y-0.5 inline-flex items-center gap-1.5 transition cursor-pointer"
      >
        <Send class="w-3.5 h-3.5" />
        <span>Undang Kandidat</span>
      </button>
    {/if}
  </div>
</article>

