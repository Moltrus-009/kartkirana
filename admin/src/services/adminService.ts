import { getToken as getAppCheckToken } from 'firebase/app-check';
import { auth, appCheck } from '../lib/firebase';

const configuredApiOrigin = String(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
).trim().replace(/\/$/, '');
const productionApiOrigin = configuredApiOrigin || 'https://api-lna3kdnwxq-el.a.run.app';

if (import.meta.env.PROD && !productionApiOrigin.startsWith('https://')) {
  throw new Error('The production admin API URL must use HTTPS.');
}

const browserFetch = globalThis.fetch.bind(globalThis);
const fetch: typeof globalThis.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/v1/') && import.meta.env.PROD) {
    return browserFetch(`${productionApiOrigin}${input}`, init);
  }
  return browserFetch(input, init);
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  if (auth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      const appCheckResult = appCheck ? await getAppCheckToken(appCheck, false) : null;
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(appCheckResult ? { 'X-Firebase-AppCheck': appCheckResult.token } : {})
      };
    } catch (e) {
      console.warn('[adminService] Failed to obtain Firebase ID token:', e);
    }
  }
  throw new Error('Administrative session expired. Please log in again.');
};

export const adminService = {
  // Collection Retrievals
  async getUsers() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/users', { headers });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to retrieve users registry.');
    return res.json();
  },

  async getShops() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/shops', { headers });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to retrieve merchant shops.');
    return res.json();
  },

  async getProducts() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/products', { headers });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to retrieve products catalogue.');
    return res.json();
  },

  // User Management
  async updateUserStatus(uid: string, disabled: boolean, ban: boolean, reason?: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/admin/users/${uid}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ disabled, ban, reason })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to update user status.');
    return res.json();
  },

  async resetUserPassword(uid: string, newPassword: string, reason?: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/admin/users/${uid}/reset-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ newPassword, reason })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to reset password.');
    return res.json();
  },

  async deleteUserAccount(uid: string, reason?: string) {
    const headers = await getAuthHeaders();
    const url = reason ? `/v1/admin/users/${uid}?reason=${encodeURIComponent(reason)}` : `/v1/admin/users/${uid}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to delete user.');
    return res.json();
  },

  // Notifications Broadcast
  async sendNotification(payload: { target: string; title: string; body: string; areaId?: string }) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/notifications/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to send notification.');
    return res.json();
  },

  // Complaints Tickets Helpdesk
  async getComplaints() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/complaints', { headers });
    if (!res.ok) throw new Error('Failed to fetch complaints list.');
    return res.json();
  },

  async createComplaint(payload: any) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/complaints', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to file complaint.');
    return res.json();
  },

  async updateComplaint(id: string, updates: { status?: string; reply?: string; assignedTo?: string }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/admin/complaints/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update complaint.');
    return res.json();
  },

  // Zone Geofencing
  async getZones() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/zones', { headers });
    if (!res.ok) throw new Error('Failed to retrieve zones.');
    return res.json();
  },

  async saveZone(zone: { id?: string; name: string; polygon: any[]; pricing?: any; isActive?: boolean }) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/zones', {
      method: 'POST',
      headers,
      body: JSON.stringify(zone)
    });
    if (!res.ok) throw new Error('Failed to save zone.');
    return res.json();
  },

  async deleteZone(id: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/admin/zones/${id}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Failed to delete zone.');
    return res.json();
  },

  // Settings & Feature Flags
  async getSettings() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/settings', { headers });
    if (!res.ok) throw new Error('Failed to fetch configuration settings.');
    return res.json();
  },

  async saveSettings(settings: { featureFlags?: any; versionControl?: any }) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to save configuration settings.');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/logs', { headers });
    if (!res.ok) throw new Error('Failed to retrieve audit logs.');
    return res.json();
  },

  // System Diagnostics
  async getSystemHealth() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/health', { headers });
    if (!res.ok) throw new Error('Failed to retrieve system health telemetry.');
    return res.json();
  },

  // Fraud / Risk Scanner
  async getFraudEvents() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/fraud', { headers });
    if (!res.ok) throw new Error('Failed to load risk events.');
    return res.json();
  },

  async recordFraudEvent(payload: any) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/fraud', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save fraud flag.');
    return res.json();
  },

  // Financial summary
  async getFinancialSummary() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/financials', { headers });
    if (!res.ok) throw new Error('Failed to fetch financial ledger summary.');
    return res.json();
  },

  // Internal chats
  async getInternalChats(userId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/admin/chats?userId=${encodeURIComponent(userId)}`, { headers });
    if (!res.ok) throw new Error('Failed to retrieve chat messages.');
    return res.json();
  },

  async sendChatMessage(payload: { senderId: string; senderRole: string; receiverId: string; receiverRole: string; message: string }) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/chats', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to dispatch internal message.');
    return res.json();
  },

  // Razorpay Payments refund
  async refundOrder(orderId: string, amount: number, reason: string) {
    const headers = await getAuthHeaders();
    headers['Idempotency-Key'] = `refund_${crypto.randomUUID().replace(/-/g, '')}`;
    const res = await fetch('/v1/payments/refund', {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId, amount, reason })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to execute payment refund.');
    return res.json();
  },

  async cancelOrder(orderId: string, reason: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to cancel the order safely.');
    return res.json();
  },

  // Disaster Recovery Console
  async triggerBackup() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/backup', {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error('Backup creation failed.');
    return res.json();
  },

  async triggerRestore(backupPayload: any) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/restore', {
      method: 'POST',
      headers,
      body: JSON.stringify(backupPayload)
    });
    if (!res.ok) throw new Error('Restore action failed.');
    return res.json();
  },

  // Admin Role Management
  async getAdmins() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/admins', { headers });
    if (!res.ok) throw new Error('Failed to retrieve administrators directory.');
    return res.json();
  },

  async assignAdminRole(phone: string, role: string) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/admins/assign', {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone, role })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to promote user to administrator.');
    return res.json();
  },

  async changeAdminRole(uid: string, role: string) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/admins/change-role', {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid, role })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to update administrator role.');
    return res.json();
  },

  async removeAdminRole(uid: string) {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/admins/remove', {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Failed to revoke administrator access.');
    return res.json();
  },

  // Centralized Financial calculations
  async getShopsFinancials() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/financials/shops', { headers });
    if (!res.ok) throw new Error('Failed to retrieve shops financials.');
    return res.json();
  },

  async getShopFinancials(shopId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/admin/financials/shops/${shopId}`, { headers });
    if (!res.ok) throw new Error('Failed to retrieve shop financials.');
    return res.json();
  },

  async getRiderFinancials(riderId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/v1/admin/financials/riders/${riderId}`, { headers });
    if (!res.ok) throw new Error('Failed to retrieve rider financials.');
    return res.json();
  },

  async getPlatformFinancials() {
    const headers = await getAuthHeaders();
    const res = await fetch('/v1/admin/financials/platform', { headers });
    if (!res.ok) throw new Error('Failed to retrieve platform financials.');
    return res.json();
  }
};
