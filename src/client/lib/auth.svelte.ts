import { apiFetch } from './api';
import { wsClient } from './ws.svelte';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string;
  userType: 'smk' | 'public' | 'teacher' | 'company' | 'admin';
  schoolName: string | null;
  schoolId: number | null;
  regionId: number | null;
  isSchoolAdmin: boolean;
  isAdmin: boolean;
  nisn: string | null;
  nip: string | null;
  major: string | null;
  skills: string[];
  businessName: string | null;
  businessType: string | null;
  companyName: string | null;
  companySector: string | null;
  companyWebsite: string | null;
  companyNib: string | null;
  isCompanyVerified: boolean;
  companyVerifiedAt: string | null;
  studentStatus: 'active' | 'final_year' | 'alumni' | null;
  graduationYear: number | null;
  openToWork: boolean;
  headline: string | null;
  talentScore: number;
  bio: string | null;
  acceptingOrders: boolean;
  isVerified: boolean;
}

class AuthState {
  user = $state<AuthUser | null>(null);
  pendingOrdersCount = $state(0);
  schoolSlug = $state<string | null>(null);
  ready = $state(false);

  async refresh(): Promise<void> {
    const res = await apiFetch<{
      user: AuthUser | null;
      pendingOrdersCount: number;
      unreadNotificationsCount?: number;
      schoolSlug?: string | null;
    }>('/api/auth/me');

    if (res.ok && res.data?.user) {
      this.user = res.data.user;
      this.pendingOrdersCount = res.data.pendingOrdersCount || 0;
      this.schoolSlug = res.data.schoolSlug ?? null;
      wsClient.setUnreadCount(res.data.unreadNotificationsCount || 0);
      wsClient.connect();
    } else {
      this.user = null;
      this.pendingOrdersCount = 0;
      this.schoolSlug = null;
      wsClient.disconnect();
    }
    this.ready = true;
  }

  setAuthenticated(user: AuthUser) {
    this.user = user;
    this.ready = true;
    wsClient.connect();
  }

  async logout(): Promise<void> {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    this.user = null;
    this.pendingOrdersCount = 0;
    this.schoolSlug = null;
    wsClient.disconnect();
  }
}

export const auth = new AuthState();
