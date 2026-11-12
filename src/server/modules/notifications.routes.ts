import { Elysia } from 'elysia';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { db } from '../db';
import { notifications, reports, users } from '../db/schema';
import { resolveUserFromRequest } from '../middleware/auth';
import { checkRateLimit, getClientIp } from '../middleware/rate-limit';
import { getUnreadNotificationsCount, NotifyService } from '../services/notify.service';
import { REPORT_REASON_LABELS } from '../../shared/constants';

export const notificationsRoutes = new Elysia({ prefix: '/api' })
  .get('/notifications', async ({ request, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, currentUser.id))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(50);

    const unreadCount = await getUnreadNotificationsCount(currentUser.id);

    return {
      unreadCount,
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        actionUrl: n.actionUrl,
        isRead: Boolean(n.readAt),
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString()
      }))
    };
  })

  .post('/notifications/:id/read', async ({ request, params, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    const notifId = Number(params.id);
    if (!Number.isFinite(notifId) || notifId <= 0) {
      set.status = 404;
      return { error: 'Notifikasi tidak ditemukan.' };
    }

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notifId), eq(notifications.userId, currentUser.id)));

    const unreadCount = await NotifyService.pushUnreadCount(currentUser.id);
    return { success: true, unreadCount };
  })

  .post('/notifications/read-all', async ({ request, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    if (!currentUser) {
      set.status = 401;
      return { error: 'Silakan masuk terlebih dahulu.' };
    }

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, currentUser.id), isNull(notifications.readAt)));

    const unreadCount = await NotifyService.pushUnreadCount(currentUser.id);
    return { success: true, unreadCount };
  })

  .post('/reports', async ({ request, body, set }) => {
    const currentUser = await resolveUserFromRequest(request);
    const ip = getClientIp(request);
    const rl = checkRateLimit('reports', currentUser ? `u:${currentUser.id}` : ip, 10, 60_000);
    if (!rl.allowed) {
      set.status = 429;
      return { error: 'Terlalu banyak pengiriman laporan. Coba beberapa saat lagi.' };
    }

    const data = (body ?? {}) as Record<string, unknown>;
    const targetTypeRaw = String(data.targetType ?? '').trim();
    const targetId = Number(data.targetId ?? 0);
    const reasonRaw = String(data.reason ?? '').trim();
    const details = String(data.details ?? '').trim().slice(0, 1000) || null;

    if (!['post', 'request', 'challenge', 'user'].includes(targetTypeRaw)) {
      set.status = 422;
      return { error: 'Jenis konten yang dilaporkan tidak valid.' };
    }
    if (!Number.isFinite(targetId) || targetId <= 0) {
      set.status = 422;
      return { error: 'ID konten yang dilaporkan tidak valid.' };
    }
    if (!Object.keys(REPORT_REASON_LABELS).includes(reasonRaw)) {
      set.status = 422;
      return { error: 'Pilih alasan pelaporan yang valid.' };
    }

    const targetType = targetTypeRaw as 'post' | 'request' | 'challenge' | 'user';
    const reason = reasonRaw;

    const [inserted] = await db.insert(reports).values({
      reporterId: currentUser?.id ?? null,
      targetType,
      targetId,
      reason,
      details,
      status: 'open'
    });

    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.isAdmin, true), eq(users.userType, 'admin')));

    for (const adm of admins) {
      await NotifyService.send({
        userId: adm.id,
        type: 'new_report',
        title: `Laporan Konten Baru (${REPORT_REASON_LABELS[reason]})`,
        body: `Target: ${targetType} #${targetId}. Segera tinjau di Panel Admin.`,
        actionUrl: '/admin'
      });
    }

    set.status = 201;
    return {
      success: true,
      id: inserted.insertId,
      status: 'open'
    };
  });

