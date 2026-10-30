<script lang="ts">
  import {
    Award,
    Bell,
    BellOff,
    Briefcase,
    Check,
    CheckCheck,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    Handshake,
    MessageSquare,
    ShieldAlert,
    ShieldCheck
  } from 'lucide-svelte';
  import { apiFetch } from '../lib/api';
  import { auth } from '../lib/auth.svelte';
  import { navigate } from '../lib/router.svelte';
  import { toast } from '../lib/toast.svelte';
  import { formatRelativeTime } from '../lib/format';

  interface NotificationItem {
    id: number;
    type: string;
    title: string;
    body: string;
    actionUrl: string | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
  }

  let loading = $state(true);
  let notifications = $state<NotificationItem[]>([]);
  let unreadCount = $state(0);
  let filter = $state<'all' | 'unread'>('all');
  let markingAll = $state(false);

  async function loadNotifications() {
    loading = true;
    try {
      const res = await apiFetch<{
        items?: NotificationItem[];
        unreadCount?: number;
      }>('/api/notifications');

      if (res.ok && res.data) {
        notifications = res.data.items || [];
        unreadCount = res.data.unreadCount || 0;
      }
    } catch (err: any) {
      toast.error('Gagal memuat daftar notifikasi.');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (auth.user) {
      loadNotifications();
    } else if (auth.ready) {
      loading = false;
    }
  });

  let displayedNotifications = $derived.by(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  });

  async function markAsRead(item: NotificationItem) {
    if (!item.isRead) {
      item.isRead = true;
      unreadCount = Math.max(0, unreadCount - 1);
      try {
        await apiFetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
      } catch {
        // Silently tolerate
      }
    }

    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;
    markingAll = true;
    try {
      const res = await apiFetch<{ success?: boolean; unreadCount?: number }>(
        '/api/notifications/read-all',
        { method: 'POST' }
      );
      if (res.ok) {
        notifications = notifications.map((n) => ({ ...n, isRead: true }));
        unreadCount = 0;
        toast.success('Semua notifikasi ditandai telah dibaca.');
      }
    } catch {
      toast.error('Gagal memperbarui status notifikasi.');
    } finally {
      markingAll = false;
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'hiring_invitation':
      case 'invitation_accepted':
      case 'invitation_declined':
        return Briefcase;
      case 'certificate_issued':
      case 'certificate_revoked':
        return Award;
      case 'proposal_accepted':
      case 'proposal_received':
        return Handshake;
      case 'company_verified':
      case 'school_verified':
      case 'challenge_approved':
        return CheckCircle2;
      case 'challenge_rejected':
        return ShieldAlert;
      default:
        return Bell;
    }
  }

  function getNotificationColor(type: string) {
    switch (type) {
      case 'hiring_invitation':
      case 'challenge_approved':
        return 'bg-blue-100 text-[#4285F4] border-blue-200';
      case 'certificate_issued':
        return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'proposal_accepted':
      case 'company_verified':
      case 'invitation_accepted':
        return 'bg-emerald-100 text-[#34A853] border-emerald-200';
      case 'challenge_rejected':
      case 'certificate_revoked':
      case 'invitation_declined':
        return 'bg-red-100 text-[#EA4335] border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }
</script>

<div class="space-y-6">
  <!-- Header Card -->
  <div class="bg-white border-2 border-gray-300 rounded-2xl p-6 shadow-[0_5px_0_#d1d5db] flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-[#4285F4] shadow-sm">
        <Bell class="w-6 h-6" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-black text-gray-900">Pusat Notifikasi</h1>
          {#if unreadCount > 0}
            <span class="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#EA4335] text-white">
              {unreadCount} baru
            </span>
          {/if}
        </div>
        <p class="text-xs text-gray-500 mt-0.5">
          Pemberitahuan resmi seputar order, undangan industri, sertifikat, dan tantangan.
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        disabled={markingAll || unreadCount === 0}
        onclick={markAllAsRead}
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold shadow-[0_2px_0_#d1d5db] active:translate-y-0.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCheck class="w-4 h-4 text-gray-500" />
        Tandai Semua Dibaca
      </button>
    </div>
  </div>

  {#if !auth.user && auth.ready}
    <div class="bg-white border-2 border-gray-300 rounded-2xl p-10 text-center shadow-[0_5px_0_#d1d5db]">
      <Bell class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <h2 class="text-base font-black text-gray-900">Silakan Masuk Terlebih Dahulu</h2>
      <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
        Masuk dengan akun Anda untuk melihat seluruh pemberitahuan proyek, pesanan, dan verifikasi.
      </p>
      <button
        type="button"
        onclick={() => navigate('/masuk')}
        class="mt-4 px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-[#1a73e8] text-white font-bold text-xs shadow-[0_3px_0_#1a56b0] active:translate-y-0.5 cursor-pointer"
      >
        Masuk ke Akun
      </button>
    </div>
  {:else}
    <!-- Filter Tabs -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => (filter = 'all')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer {filter === 'all'
          ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Semua ({notifications.length})
      </button>

      <button
        type="button"
        onclick={() => (filter = 'unread')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer {filter === 'unread'
          ? 'bg-[#4285F4] text-white shadow-[0_3px_0_#1a56b0]'
          : 'bg-white border-2 border-gray-300 text-gray-700 shadow-[0_2px_0_#d1d5db] hover:bg-gray-50'}"
      >
        Belum Dibaca ({unreadCount})
      </button>
    </div>

    {#if loading}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-12 text-center shadow-[0_5px_0_#d1d5db]">
        <div class="w-8 h-8 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-xs font-semibold text-gray-500">Memuat pemberitahuan...</p>
      </div>
    {:else if displayedNotifications.length === 0}
      <div class="bg-white border-2 border-gray-300 rounded-2xl p-12 text-center shadow-[0_5px_0_#d1d5db]">
        <BellOff class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 class="text-base font-black text-gray-900">
          {filter === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Notifikasi'}
        </h3>
        <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          {filter === 'unread'
            ? 'Semua pemberitahuan sudah Anda baca. Kerja bagus!'
            : 'Pemberitahuan aktivitas pesanan dan tawaran industri akan muncul di sini.'}
        </p>
      </div>
    {:else}
      <!-- Notifications List -->
      <div class="space-y-2.5">
        {#each displayedNotifications as notif (notif.id)}
          {@const Icon = getNotificationIcon(notif.type)}
          {@const iconColorClass = getNotificationColor(notif.type)}
          <div
            role="button"
            tabindex="0"
            onclick={() => markAsRead(notif)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') markAsRead(notif);
            }}
            class="w-full text-left bg-white border-2 rounded-2xl p-4 transition cursor-pointer {notif.isRead
              ? 'border-gray-200 hover:border-gray-300 shadow-[0_2px_0_#e5e7eb]'
              : 'border-[#4285F4]/50 bg-blue-50/20 hover:border-[#4285F4] shadow-[0_4px_0_#93c5fd]'} flex items-start gap-3.5 group"
          >
            <!-- Type Icon -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border {iconColorClass}">
              <Icon class="w-5 h-5" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <h4 class="text-xs font-black text-gray-900 group-hover:text-[#4285F4] transition truncate">
                  {notif.title}
                </h4>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[10px] font-semibold text-gray-400">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                  {#if !notif.isRead}
                    <span class="w-2.5 h-2.5 rounded-full bg-[#4285F4] animate-pulse"></span>
                  {/if}
                </div>
              </div>
              <p class="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                {notif.body}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

