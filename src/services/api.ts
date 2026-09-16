/**
 * SafeDrive AI - Client API Service Layer
 */

import type { 
  User, 
  DriverProfile, 
  Trip, 
  SystemSettings, 
  NotificationItem, 
  FatigueEvent, 
  PhoneEvent, 
  DistractionEvent, 
  SafetyAlert, 
  TelemetryPoint,
  MLModelEvaluation 
} from '../types';

const TOKEN_KEY = 'safedrive_auth_token';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errData: any = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // --- Auth ---
  public async getMe(): Promise<{ user: User; profile: DriverProfile }> {
    return this.request('/auth/me');
  }

  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  public async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    this.setToken(data.token);
    return data;
  }

  public logout() {
    this.setToken(null);
  }

  // --- Profile ---
  public async getProfile(): Promise<DriverProfile> {
    return this.request('/profile');
  }

  public async updateProfile(updates: Partial<DriverProfile>): Promise<DriverProfile> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // --- Settings ---
  public async getSettings(): Promise<SystemSettings> {
    return this.request('/settings');
  }

  public async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // --- Trips ---
  public async getTrips(): Promise<Trip[]> {
    return this.request('/trips');
  }

  public async getActiveTrip(): Promise<Trip | null> {
    const trips = await this.getTrips();
    return trips.find(t => t.status === 'ACTIVE') || null;
  }

  public async getTripById(id: string): Promise<Trip> {
    return this.request(`/trips/${id}`);
  }

  public async startTrip(): Promise<Trip> {
    return this.request('/trips', { method: 'POST' });
  }

  public async completeTrip(id: string, summary: Partial<Trip>): Promise<Trip> {
    return this.request(`/trips/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(summary)
    });
  }

  public async deleteTrip(id: string): Promise<{ success: boolean }> {
    return this.request(`/trips/${id}`, { method: 'DELETE' });
  }

  public async clearAllTrips(): Promise<{ success: boolean }> {
    return this.request('/trips', { method: 'DELETE' });
  }

  public async appendTelemetry(tripId: string, point: TelemetryPoint): Promise<{ success: boolean }> {
    return this.request(`/trips/${tripId}/telemetry`, {
      method: 'POST',
      body: JSON.stringify(point)
    });
  }

  // --- Events ---
  public async logFatigueEvent(event: Partial<FatigueEvent>): Promise<FatigueEvent> {
    return this.request('/events/fatigue', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  public async logPhoneEvent(event: Partial<PhoneEvent>): Promise<PhoneEvent> {
    return this.request('/events/phone', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  public async logDistractionEvent(event: Partial<DistractionEvent>): Promise<DistractionEvent> {
    return this.request('/events/distraction', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  public async logAlert(alert: Partial<SafetyAlert>): Promise<SafetyAlert> {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alert)
    });
  }

  // --- Notifications ---
  public async getNotifications(): Promise<NotificationItem[]> {
    return this.request('/notifications');
  }

  public async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  public async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request('/notifications/mark-all-read', { method: 'POST' });
  }

  public async deleteNotification(id: string): Promise<{ success: boolean }> {
    return this.request(`/notifications/${id}`, { method: 'DELETE' });
  }

  // --- Analytics ---
  public async getAnalytics(): Promise<any> {
    return this.request('/analytics');
  }

  // --- ML Benchmarks ---
  public async getMLBenchmarks(): Promise<{
    dataset: string;
    targetMetric: string;
    models: MLModelEvaluation[];
  }> {
    return this.request('/ml/benchmarks');
  }

  public async getBenchmarks(): Promise<MLModelEvaluation[]> {
    const data = await this.getMLBenchmarks();
    return data.models || [];
  }

  public async getMLWorkflow(): Promise<{
    framework: string;
    steps: Array<{ step: number; name: string; details: string }>;
  }> {
    return this.request('/ml/workflow');
  }

  public async predictML(features: any): Promise<any> {
    return this.request('/ml/predict', {
      method: 'POST',
      body: JSON.stringify(features)
    });
  }

  // --- Database Download & Export ---
  public async getDatabaseJSON(): Promise<any> {
    return this.request('/database/export');
  }

  public async downloadDatabase(filename = 'safedrive.json'): Promise<void> {
    try {
      // Fetch fresh data from backend
      const res = await fetch(`/api/download/${filename}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch database (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Direct blob download failed, trying window navigation fallback:', err);
      window.location.href = `/api/download/${filename}`;
    }
  }
}

export const api = new ApiService();
