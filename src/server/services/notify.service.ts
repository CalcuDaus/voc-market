import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { notifications } from '../db/schema';

export interface WsConnectionHandle {
  send: (payload: string) => unknown;
}

const wsConnections = new Map<number, Set<WsConnectionHandle>>();

export function registerWsClient(userId: number, ws: WsConnectionHandle): void {
  let set = wsConnections.get(userId);
  if (!set) {
    set = new Set();
    wsConnections.set(userId, set);
  }
  set.add(ws);
}

export function unregisterWsClient(userId: number, ws: WsConnectionHandle): void {
  const set = wsConnections.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    wsConnections.delete(userId);
  }
}

export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(cnt || 0);
}

export class NotifyService {
  static async send(params: {
    userId: number;
    type: string;
    title: string;
    body: string;
    actionUrl?: string | null;
  }) {
    const cleanTitle = params.title.trim().slice(0, 160);
    const cleanBody = params.body.trim().slice(0, 255);
    const cleanUrl = params.actionUrl ? params.actionUrl.trim().slice(0, 255) : null;

    const [inserted] = await db.insert(notifications).values({
      userId: params.userId,
      type: params.type.slice(0, 50),
      title: cleanTitle,
      body: cleanBody,
      actionUrl: cleanUrl
    });

    const unreadCount = await getUnreadNotificationsCount(params.userId);
    const notificationDto = {
      id: inserted.insertId,
      type: params.type,
      title: cleanTitle,
      body: cleanBody,
      actionUrl: cleanUrl,
      readAt: null,
      createdAt: new Date().toISOString()
    };

    const sockets = wsConnections.get(params.userId);
    if (sockets && sockets.size > 0) {
      const msg = JSON.stringify({
        event: 'notification',
        notification: notificationDto,
        unreadCount
      });
      for (const sock of sockets) {
        try {
          sock.send(msg);
        } catch {
          sockets.delete(sock);
        }
      }
    }

    return notificationDto;
  }

  static async pushUnreadCount(userId: number): Promise<number> {
    const unreadCount = await getUnreadNotificationsCount(userId);
    const sockets = wsConnections.get(userId);
    if (sockets && sockets.size > 0) {
      const msg = JSON.stringify({
        event: 'unread_count',
        unreadCount
      });
      for (const sock of sockets) {
        try {
          sock.send(msg);
        } catch {
          sockets.delete(sock);
        }
      }
    }
    return unreadCount;
  }
}

