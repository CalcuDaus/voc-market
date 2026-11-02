import { apiFetch, onUnauthorized } from './api';
import { auth, type AuthUser } from './auth.svelte';
import { navigate, router } from './router.svelte';
import { toast } from './toast.svelte';

export interface SavedAccount {
  name: string;
  username: string;
  avatarUrl: string;
  email: string;
  userType: string;
  lastUsedAt: string;
}

const SAVED_ACCOUNT_KEY = 'voc_saved_account';
const BROADCAST_CHANNEL_NAME = 'voc_session_sync';

class SessionManager {
  remainingSeconds = $state<number | null>(null);
  isRemembered = $state(false);
  showWarningModal = $state(false);
  lastActivityAt = $state(Date.now());
  initialized = false;

  private channel: BroadcastChannel | null = null;
  private intervalId: any = null;

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // 1. BroadcastChannel for cross-tab synchronization
    try {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data);
      };
    } catch {
      // Fallback for environments where BroadcastChannel is restricted
      window.addEventListener('storage', (e) => {
        if (e.key === 'voc_auth_event' && e.newValue) {
          try {
            this.handleBroadcastMessage(JSON.parse(e.newValue));
          } catch {
            // Ignore parse errors
          }
        }
      });
    }

    // 2. User activity tracking (throttled to update at most once every 10 seconds)
    let lastRecord = Date.now();
    const markActive = () => {
      const now = Date.now();
      if (now - lastRecord > 10_000) {
        lastRecord = now;
        this.lastActivityAt = now;
      }
    };

    window.addEventListener('mousemove', markActive, { passive: true });
    window.addEventListener('keydown', markActive, { passive: true });
    window.addEventListener('click', markActive, { passive: true });
    window.addEventListener('scroll', markActive, { passive: true });
    window.addEventListener('touchstart', markActive, { passive: true });

    // 3. Heartbeat & expiration tick (every 5 seconds)
    this.intervalId = setInterval(() => {
      this.tick();
    }, 5_000);
  }

  private broadcast(payload: any): void {
    if (this.channel) {
      this.channel.postMessage(payload);
    }
    try {
      localStorage.setItem('voc_auth_event', JSON.stringify({ ...payload, _t: Date.now() }));
    } catch {
      // Ignore storage errors
    }
  }

  private handleBroadcastMessage(data: any): void {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'SESSION_EXPIRED' || data.type === 'LOGOUT') {
      auth.user = null;
      this.remainingSeconds = null;
      this.showWarningModal = false;
      if (router.pathname.startsWith('/dashboard') || router.pathname.startsWith('/jual')) {
        navigate('/masuk?reason=session_expired');
      }
    } else if (data.type === 'LOGIN' && data.user) {
      auth.setAuthenticated(data.user);
      this.remainingSeconds = data.session?.maxAgeSec ?? 7200;
      this.isRemembered = data.session?.isRemembered ?? false;
      this.showWarningModal = false;
    }
  }

  updateSessionInfo(info: {
    remainingSeconds?: number | null;
    isRemembered?: boolean;
  }): void {
    if (typeof info.remainingSeconds === 'number') {
      this.remainingSeconds = info.remainingSeconds;
    }
    if (typeof info.isRemembered === 'boolean') {
      this.isRemembered = info.isRemembered;
    }
  }

  private tick(): void {
    if (!auth.user) {
      this.remainingSeconds = null;
      this.showWarningModal = false;
      return;
    }

    // Decrement remaining seconds
    if (this.remainingSeconds !== null) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - 5);

      // Check session expiration
      if (this.remainingSeconds <= 0) {
        this.triggerAutoLogout('Sesi Anda telah berakhir demi keamanan. Silakan masuk kembali.');
        return;
      }

      // Show warning modal when 2 minutes remain (unless 30-day remembered session)
      if (this.remainingSeconds <= 120 && !this.isRemembered) {
        this.showWarningModal = true;
      } else {
        this.showWarningModal = false;
      }
    }

    // Idle session timeout check:
    // If not a 30-day remembered session, 20 minutes (1200s) of complete inactivity prompts auto-logout
    if (!this.isRemembered) {
      const idleSec = (Date.now() - this.lastActivityAt) / 1000;
      if (idleSec >= 1200) {
        this.triggerAutoLogout('Anda telah tidak aktif selama lebih dari 20 menit. Akun dikeluarkan otomatis demi keamanan.');
      }
    }
  }

  async extendSession(): Promise<boolean> {
    const res = await apiFetch('/api/auth/ping', { method: 'POST' });
    if (res.ok) {
      this.showWarningModal = false;
      this.remainingSeconds = 7200;
      this.lastActivityAt = Date.now();
      toast.success('Sesi Anda berhasil diperpanjang.');
      return true;
    } else {
      this.triggerAutoLogout('Sesi Anda telah berakhir.');
      return false;
    }
  }

  triggerAutoLogout(reason?: string): void {
    auth.user = null;
    this.remainingSeconds = null;
    this.showWarningModal = false;

    this.broadcast({ type: 'SESSION_EXPIRED', reason });

    const message = reason || 'Sesi akun Anda telah berakhir demi keamanan. Silakan masuk kembali.';
    toast.error(message);

    navigate('/masuk?reason=session_expired');
  }

  notifyLogin(user: AuthUser, session?: { maxAgeSec: number; isRemembered: boolean }): void {
    this.remainingSeconds = session?.maxAgeSec ?? 7200;
    this.isRemembered = session?.isRemembered ?? false;
    this.lastActivityAt = Date.now();
    this.showWarningModal = false;

    this.broadcast({
      type: 'LOGIN',
      user,
      session
    });
  }

  notifyLogout(): void {
    this.remainingSeconds = null;
    this.showWarningModal = false;
    this.broadcast({ type: 'LOGOUT' });
  }

  // Saved Account (Remind Me / Ingat Akun Saya sekelas Meta)
  getSavedAccount(): SavedAccount | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveAccount(user: AuthUser): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const account: SavedAccount = {
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        email: user.email,
        userType: user.userType,
        lastUsedAt: new Date().toISOString()
      };
      localStorage.setItem(SAVED_ACCOUNT_KEY, JSON.stringify(account));
    } catch {
      // Ignore storage errors
    }
  }

  clearSavedAccount(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(SAVED_ACCOUNT_KEY);
    } catch {
      // Ignore
    }
  }
}

export const sessionManager = new SessionManager();

// Intercept 401s across the application for immediate clean auto-logout
onUnauthorized((data) => {
  if (auth.user) {
    sessionManager.triggerAutoLogout(
      data?.error || 'Sesi akun Anda telah berakhir demi keamanan. Silakan masuk kembali.'
    );
  }
});
