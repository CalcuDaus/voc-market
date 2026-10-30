import { Elysia } from 'elysia';
import { resolveUserFromCookieHeader } from '../middleware/auth';
import {
  getUnreadNotificationsCount,
  registerWsClient,
  unregisterWsClient
} from '../services/notify.service';

const socketUserMap = new WeakMap<object, number>();

export const wsRoutes = new Elysia().ws('/ws', {
  async open(ws) {
    const cookieHeader =
      ws.data?.request?.headers?.get('cookie') ??
      (ws.data?.headers as Record<string, string | undefined> | undefined)?.cookie ??
      null;

    const user = await resolveUserFromCookieHeader(cookieHeader);
    if (!user) {
      ws.send(JSON.stringify({ event: 'unauthorized' }));
      ws.close();
      return;
    }

    socketUserMap.set(ws.raw as object, user.id);
    registerWsClient(user.id, ws);

    const unreadCount = await getUnreadNotificationsCount(user.id);
    ws.send(
      JSON.stringify({
        event: 'connected',
        userId: user.id,
        unreadCount
      })
    );
  },

  message(ws, message) {
    if (message === 'ping' || (typeof message === 'object' && (message as { type?: string })?.type === 'ping')) {
      ws.send(JSON.stringify({ event: 'pong', ts: Date.now() }));
    }
  },

  close(ws) {
    const userId = socketUserMap.get(ws.raw as object);
    if (userId) {
      unregisterWsClient(userId, ws);
      socketUserMap.delete(ws.raw as object);
    }
  }
});

