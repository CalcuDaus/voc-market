import { toast } from './toast.svelte';

type NotificationListener = (payload: {
  id: number;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  createdAt: string;
}) => void;

class RealtimeWsClient {
  connected = $state(false);
  unreadCount = $state(0);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = false;
  private retryAttempt = 0;
  private listeners = new Set<NotificationListener>();

  onNotification(fn: NotificationListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  setUnreadCount(count: number) {
    this.unreadCount = Math.max(0, count);
  }

  connect() {
    if (typeof window === 'undefined') return;
    this.shouldReconnect = true;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.clearTimers();

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        this.connected = true;
        this.retryAttempt = 0;
        this.pingTimer = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send('ping');
          }
        }, 30_000);
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data));
          if (data.event === 'connected' || data.event === 'unread_count') {
            if (typeof data.unreadCount === 'number') {
              this.unreadCount = data.unreadCount;
            }
          } else if (data.event === 'notification') {
            if (typeof data.unreadCount === 'number') {
              this.unreadCount = data.unreadCount;
            } else {
              this.unreadCount += 1;
            }
            if (data.notification?.title) {
              toast.info(data.notification.title);
              for (const fn of this.listeners) {
                fn(data.notification);
              }
            }
          } else if (data.event === 'unauthorized') {
            this.shouldReconnect = false;
            ws.close();
          }
        } catch {
          // Ignore malformed WS frames
        }
      };

      ws.onclose = () => {
        this.connected = false;
        this.socket = null;
        if (this.pingTimer) {
          clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        if (this.shouldReconnect) {
          const delay = Math.min(15_000, 1500 * Math.pow(1.6, this.retryAttempt));
          this.retryAttempt += 1;
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };

      ws.onerror = () => {
        // Handled by onclose
      };
    } catch {
      // Ignore connection errors offline
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearTimers();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignore
      }
      this.socket = null;
    }
    this.connected = false;
    this.unreadCount = 0;
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

export const wsClient = new RealtimeWsClient();

