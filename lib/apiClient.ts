import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type {
  BackendLinkedAccount,
  BackendPortfolioSummary,
  BackendCategoryBreakdown,
  SyncJob,
} from '../types/models';

/**
 * Dynamically resolves the API base URL for zero-config networking across
 * all platforms: Web, iOS Simulator, Android Emulator, and Physical Devices.
 */
function resolveApiBase(): string {
  // 1. Explicit override in .env takes highest priority if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Web browser: use the current browser hostname
  if (Platform.OS === 'web') {
    const host =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : 'localhost';
    return `http://${host}:3001/api`;
  }

  // 3. Physical mobile device running via Expo:
  // Constants.expoConfig?.hostUri or debuggerHost holds the computer's current LAN IP (e.g. 172.20.10.3:8081)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3001/api`;
    }
  }

  // 4. Emulators & Simulators fallback:
  // Android emulator uses 10.0.2.2 to access host; iOS simulator uses localhost
  const defaultHost = Platform.select({
    android: '10.0.2.2',
    default: 'localhost',
  });

  return `http://${defaultHost}:3001/api`;
}

const API_BASE = resolveApiBase();

const TOKEN_STORAGE_KEY = 'pointzplus_auth_token';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } catch {}
    } else {
      SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token).catch(() => {});
    }
  }

  clearToken() {
    this.token = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
    } else {
      SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch(() => {});
    }
  }

  /** Load the persisted token into memory (call once on app startup or before authenticated requests). */
  async restoreToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (stored) this.token = stored;
        return this.token;
      }
      const stored = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (stored) this.token = stored;
      return this.token;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (!this.token) {
      await this.restoreToken();
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (err) {
      // A transport failure is almost always a wrong/unreachable API host.
      // Say so explicitly instead of surfacing an opaque "Network request
      // failed", which is impossible to diagnose from the UI.
      const reason = err instanceof Error ? err.message : 'unknown transport error';
      throw new Error(
        `Cannot reach the PointzPlus API at ${API_BASE} (${reason}). ` +
          `Android emulator: use http://10.0.2.2:3001/api. ` +
          `Physical device: use your computer's LAN IP. ` +
          `iOS simulator / web: use http://localhost:3001/api.`
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const message =
        typeof error.error === 'string'
          ? error.error
          : (error.error?.message ?? `Request failed (HTTP ${response.status})`);
      throw new Error(message);
    }

    return response.json();
  }

  // ─── Auth ──────────────────────────────────────────────
  async register(email: string, password: string, fullName?: string, phone?: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, phoneNumber: phone }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async verifyToken() {
    try {
      const user = await this.request<any>('/auth/verify');
      return user;
    } catch {
      this.clearToken();
      return null;
    }
  }

  async logout() {
    try {
      return await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      return null;
    } finally {
      this.clearToken();
    }
  }

  /** Permanently delete the signed-in user's account and all linked data. */
  async deleteCurrentUser() {
    return this.request<{ message: string }>('/auth/account', {
      method: 'DELETE',
    });
  }

  async getProfile() {
    return this.request<any>('/auth/profile');
  }

  async updateProfile(data: { fullName?: string; phoneNumber?: string; avatarUrl?: string }) {
    return this.request<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Accounts ─────────────────────────────────────────
  async getAccounts() {
    return this.request<BackendLinkedAccount[]>('/accounts');
  }

  async getAccount(id: string) {
    return this.request<any>(`/accounts/${id}`);
  }

  async addAccount(account: {
    programId: string;
    accountNumberMasked: string;
    currentBalance: number;
    expiringPoints?: number;
    expiryDate?: string;
  }) {
    return this.request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  }

  async updateAccount(id: string, data: any) {
    return this.request<any>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: string) {
    return this.request<any>(`/accounts/${id}`, { method: 'DELETE' });
  }

  // ─── Programs ─────────────────────────────────────────
  async getPrograms(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/programs${query}`);
  }

  async searchPrograms(term: string) {
    return this.request<any[]>(`/programs/search/${term}`);
  }

  async getCategories() {
    return this.request<any[]>('/programs/meta/categories');
  }

  // ─── Email Sync ──────────────────────────────────────
  async getEmailAuthUrl(provider: 'google') {
    return this.request<{ url: string }>(`/email-sync/${provider}/url`, {
      method: 'GET',
    });
  }

  /**
   * Queue a mailbox scan and return immediately (HTTP 202).
   * The heavy Gmail fetch + parse runs server-side as a job, so the request
   * never blocks the UI. Poll `getSyncJob` for completion.
   */
  async queueEmailScan(provider: string) {
    return this.request<{ jobId: string; status: 'queued'; message: string }>('/email-sync/scan', {
      method: 'POST',
      body: JSON.stringify({ provider, wait: false }),
    });
  }

  async getSyncJob(jobId: string) {
    return this.request<SyncJob>(`/email-sync/jobs/${jobId}`);
  }

  async enableGmailWatch() {
    return this.request<any>('/email-sync/google/watch', { method: 'POST' });
  }

  async getEmailAccounts() {
    return this.request<any[]>('/email-sync/accounts');
  }

  /** Disconnect one mailbox. Pass the email_sync_accounts row id, not the provider. */
  async disconnectEmail(accountId: string) {
    return this.request<{ message: string; email?: string }>(
      `/email-sync/accounts/${encodeURIComponent(accountId)}`,
      { method: 'DELETE' }
    );
  }

  // ─── SMS Detection ───────────────────────────────────
  async detectSMS(smsList: { body: string; sender: string; timestamp: string }[]) {
    return this.request<any>('/sms/detect', {
      method: 'POST',
      body: JSON.stringify({ smsList }),
    });
  }

  async autoAddFromSMS(programId: string, points: number, accountNumber?: string) {
    return this.request<any>('/sms/auto-add', {
      method: 'POST',
      body: JSON.stringify({ programId, points, accountNumber }),
    });
  }

  async getSMSHistory() {
    return this.request<any[]>('/sms/history');
  }

  async getSMSSettings() {
    return this.request<any>('/sms/settings');
  }

  async updateSMSSettings(data: any) {
    return this.request<any>('/sms/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Analytics ──────────────────────────────────────
  /**
   * Server-side portfolio rollup. Includes the current-month credit/debit
   * totals, which cannot be derived client-side because the transactions
   * endpoint is per-account and paginated.
   */
  async getPortfolioSummary() {
    return this.request<{
      summary: BackendPortfolioSummary;
      categories: BackendCategoryBreakdown[];
    }>('/analytics/portfolio');
  }

  async getExpiringAlerts() {
    return this.request<any[]>('/alerts/expiring');
  }

  // ─── Notifications ─────────────────────────────────
  async getNotificationSettings() {
    return this.request<any>('/notifications/settings');
  }

  async updateNotificationSettings(data: any) {
    return this.request<any>('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async registerPushToken(token: string) {
    return this.request<any>('/notifications/token', {
      method: 'POST',
      body: JSON.stringify({ pushToken: token }),
    });
  }

  async getExpiryAlerts(days?: number) {
    const query = days !== undefined ? `?days=${Math.max(1, Math.min(days, 365))}` : '';
    return this.request<any[]>(`/notifications/expiry${query}`);
  }

  async getNotificationHistory(params?: { limit?: number; cursor?: string }) {
    const search = new URLSearchParams();
    if (params?.limit !== undefined) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString();
    return this.request<{ items: any[]; nextCursor: string | null }>(
      `/notifications/history${qs ? `?${qs}` : ''}`
    );
  }

  async acknowledgeAlert(alertId: string) {
    return this.request<any>(`/notifications/acknowledge/${alertId}`, {
      method: 'PUT',
    });
  }

  /** Record a locally-fired expiry alert so server history stays complete. */
  async recordExpiryAlert(alert: {
    accountId: string;
    alertType: string;
    pointsAtRisk: number;
  }) {
    return this.request<{ success: boolean; id?: string | null; duplicate?: boolean }>(
      '/notifications/alert',
      {
        method: 'POST',
        body: JSON.stringify(alert),
      }
    );
  }

  // ─── Deals & Coupons ──────────────────────────────────
  async getDeals(params?: { category?: string; q?: string; type?: string; featured?: boolean }) {
    const search = new URLSearchParams();
    if (params?.category && params.category !== 'all') search.set('category', params.category);
    if (params?.q) search.set('q', params.q);
    if (params?.type) search.set('type', params.type);
    if (params?.featured) search.set('featured', 'true');
    const qs = search.toString();
    return this.request<{ total: number; deals: any[] }>(`/deals${qs ? `?${qs}` : ''}`);
  }

  async getDealCategories() {
    return this.request<{ id: string; name: string; icon: string }[]>('/deals/categories');
  }
}

export const apiClient = new ApiClient();
export default apiClient;