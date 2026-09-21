// lib/apiClient.ts – Local PostgreSQL API Client
import { useAuthStore } from '../store/authStore';

// Local server URL (defaults to localhost:3001 for web & simulator)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
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
    return this.request<any[]>('/accounts');
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

  async scanEmails(provider: string) {
    return this.request<any>('/email-sync/scan', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  }

  async getEmailAccounts() {
    return this.request<any[]>('/email-sync/accounts');
  }

  async disconnectEmail(provider: string) {
    return this.request<any>(`/email-sync/accounts/${provider}`, {
      method: 'DELETE',
    });
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
  async getPortfolioSummary(userId: string) {
    return this.request<any>(`/analytics/portfolio/${userId}`);
  }

  async getExpiringAlerts(userId: string) {
    return this.request<any[]>(`/alerts/expiring/${userId}`);
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

  async getExpiryAlerts() {
    return this.request<any[]>('/notifications/expiry');
  }

  async getNotificationHistory() {
    return this.request<any[]>('/notifications/history');
  }

  async acknowledgeAlert(alertId: string) {
    return this.request<any>(`/notifications/acknowledge/${alertId}`, {
      method: 'PUT',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;