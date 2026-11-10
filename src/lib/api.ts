import type {
  User,
  Category,
  Service,
  Order,
  Transaction,
  PaymentRequest,
  SupportTicket,
  TicketMessage,
  Provider,
  Announcement,
  AuditLog,
  PlatformStats,
  DatabaseStats,
  DatabaseBackupItem
} from '../types/index.ts';


const TOKEN_KEY = 'pakservices_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (body: { emailOrUsername: string; password: string }) =>
    apiRequest<{ token: string; user: User; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  register: (body: { username: string; email: string; password: string; referral_code?: string }) =>
    apiRequest<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getMe: () =>
    apiRequest<{ user: User }>('/api/auth/me'),

  logout: () =>
    apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    apiRequest<{ success: boolean; message: string; demoPinNotice?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  resetPassword: (body: { email: string; pin: string; newPassword: string }) =>
    apiRequest<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  updateProfile: (body: { timezone?: string; currency?: string; theme?: string }) =>
    apiRequest<{ success: boolean; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  updateTheme: (theme: string) =>
    apiRequest<{ success: boolean; theme: string; message: string }>('/api/user/theme', {
      method: 'PUT',
      body: JSON.stringify({ theme })
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  regenerateApiKey: () =>
    apiRequest<{ api_key: string; message: string }>('/api/auth/regenerate-api-key', {
      method: 'POST'
    }),

  // Services & Categories
  getServices: () =>
    apiRequest<{ categories: Category[]; services: Service[] }>('/api/services'),

  getFavorites: () =>
    apiRequest<{ favorites: number[] }>('/api/services/favorites'),

  toggleFavorite: (service_id: number) =>
    apiRequest<{ favorited: boolean }>('/api/services/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ service_id })
    }),

  // Orders
  getOrders: (params: { status?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return apiRequest<{ orders: Order[] }>(`/api/orders?${query.toString()}`);
  },

  createOrder: (body: { service_id: number; link: string; quantity: number }) =>
    apiRequest<{ success: boolean; order_id: number; charge: number; balance: number; message: string }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  massOrder: (mass_data: string) =>
    apiRequest<{ results: any[]; updated_balance: number }>('/api/orders/mass', {
      method: 'POST',
      body: JSON.stringify({ mass_data })
    }),

  refillOrder: (orderId: number) =>
    apiRequest<{ success: boolean; message: string }>(`/api/orders/${orderId}/refill`, {
      method: 'POST'
    }),

  cancelOrder: (orderId: number) =>
    apiRequest<{ success: boolean; message: string }>(`/api/orders/${orderId}/cancel`, {
      method: 'POST'
    }),

  // Payments / Add Funds
  getPaymentMethods: () =>
    apiRequest<Record<string, string>>('/api/payments/methods'),

  getPaymentRequests: () =>
    apiRequest<{ requests: PaymentRequest[] }>('/api/payments/requests'),

  submitPaymentRequest: (body: {
    method: string;
    network?: string;
    amount: number;
    trx_id: string;
    sender_account?: string;
    screenshot_url?: string;
  }) =>
    apiRequest<{ success: boolean; request_id: number; message: string }>('/api/payments/requests', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  // Transactions
  getTransactions: () =>
    apiRequest<{ transactions: Transaction[] }>('/api/transactions'),

  // Referrals
  getReferrals: () =>
    apiRequest<{
      referral_code: string;
      commission_rate: number;
      total_referrals: number;
      total_earnings: number;
      referred_users: { id: number; username: string; created_at: string; contribution: number }[];
    }>('/api/referrals'),

  // Support Tickets
  getTickets: () =>
    apiRequest<{ tickets: SupportTicket[] }>('/api/tickets'),

  createTicket: (body: { subject: string; category: string; priority: string; order_id?: string; message: string }) =>
    apiRequest<{ success: boolean; ticket_id: number; message: string }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getTicketDetails: (id: number) =>
    apiRequest<{ ticket: SupportTicket; messages: TicketMessage[] }>(`/api/tickets/${id}`),

  sendTicketMessage: (ticketId: number, message: string) =>
    apiRequest<{ success: boolean; message: string }>(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    }),

  closeTicket: (ticketId: number) =>
    apiRequest<{ success: boolean; message: string }>(`/api/tickets/${ticketId}/close`, {
      method: 'PUT'
    }),

  // Public Announcements & Stats
  getAnnouncements: () =>
    apiRequest<{ announcements: Announcement[] }>('/api/announcements'),

  getStats: () =>
    apiRequest<PlatformStats>('/api/stats'),

  submitContact: (body: { name: string; email: string; subject: string; message: string }) =>
    apiRequest<{ success: boolean; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  // ==========================================
  // ADMIN API CALLS
  // ==========================================
  admin: {
    getOverview: () =>
      apiRequest<{
        total_users: number;
        total_orders: number;
        pending_orders: number;
        pending_payments: number;
        open_tickets: number;
        total_revenue: number;
        total_spent: number;
        recent_orders: Order[];
        recent_payments: PaymentRequest[];
      }>('/api/admin/overview'),

    getUsers: (search?: string) =>
      apiRequest<{ users: User[] }>(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),

    updateUserBalance: (userId: number, body: { action: 'add' | 'deduct'; amount: number; reason: string }) =>
      apiRequest<{ success: boolean; new_balance: number; message: string }>(`/api/admin/users/${userId}/balance`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),

    updateUserStatus: (userId: number, body: { status?: string; role?: string }) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify(body)
      }),

    getOrders: (params: { status?: string; search?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      return apiRequest<{ orders: Order[] }>(`/api/admin/orders?${query.toString()}`);
    },

    updateOrderStatus: (orderId: number, body: { status: string; start_count?: number; remains?: number }) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify(body)
      }),

    createCategory: (body: { name: string; icon: string; sort_order: number }) =>
      apiRequest<{ success: boolean; id: number; message: string }>('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(body)
      }),

    updateCategory: (id: number, body: Partial<Category>) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      }),

    deleteCategory: (id: number) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/categories/${id}`, {
        method: 'DELETE'
      }),

    createService: (body: any) =>
      apiRequest<{ success: boolean; id: number; message: string }>('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify(body)
      }),

    updateService: (id: number, body: Partial<Service>) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      }),

    deleteService: (id: number) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/services/${id}`, {
        method: 'DELETE'
      }),

    getPayments: (filters?: { status?: string; method?: string; network?: string } | string) => {
      let query = '';
      if (typeof filters === 'string') {
        if (filters && filters !== 'all') query = `?status=${filters}`;
      } else if (filters) {
        const q = new URLSearchParams();
        if (filters.status && filters.status !== 'all') q.set('status', filters.status);
        if (filters.method && filters.method !== 'all') q.set('method', filters.method);
        if (filters.network && filters.network !== 'all') q.set('network', filters.network);
        const str = q.toString();
        if (str) query = `?${str}`;
      }
      return apiRequest<{ payments: PaymentRequest[] }>(`/api/admin/payments${query}`);
    },

    processPayment: (id: number, body: { action: 'approve' | 'reject'; notes?: string }) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/payments/${id}/process`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),

    getTickets: (status?: string) =>
      apiRequest<{ tickets: SupportTicket[] }>(`/api/admin/tickets${status ? `?status=${status}` : ''}`),

    getProviders: () =>
      apiRequest<{ providers: Provider[] }>('/api/admin/providers'),

    createProvider: (body: { name: string; api_url: string; api_key: string }) =>
      apiRequest<{ success: boolean; message: string }>('/api/admin/providers', {
        method: 'POST',
        body: JSON.stringify(body)
      }),

    testProviderBalance: (id: number) =>
      apiRequest<{ success: boolean; balance: string; currency: string; message: string }>(`/api/admin/providers/${id}/test-balance`, {
        method: 'POST'
      }),

    getSettings: () =>
      apiRequest<{ settings: Record<string, string> }>('/api/admin/settings'),

    updateSettings: (settings: Record<string, string>) =>
      apiRequest<{ success: boolean; message: string }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      }),

    createAnnouncement: (body: { title: string; content: string; type: string }) =>
      apiRequest<{ success: boolean; id: number; message: string }>('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(body)
      }),

    deleteAnnouncement: (id: number) =>
      apiRequest<{ success: boolean; message: string }>(`/api/admin/announcements/${id}`, {
        method: 'DELETE'
      }),

    getAuditLogs: () =>
      apiRequest<{ logs: AuditLog[] }>('/api/admin/audit-logs'),

    // Database Preservation & Backup APIs
    getDatabaseStatus: () =>
      apiRequest<{ stats: DatabaseStats }>('/api/admin/database/status'),

    getDatabaseBackups: () =>
      apiRequest<{ backups: DatabaseBackupItem[] }>('/api/admin/database/backups'),

    createDatabaseBackup: () =>
      apiRequest<{ success: boolean; message: string; backup: any }>('/api/admin/database/backup', {
        method: 'POST'
      }),

    restoreDatabase: (body: { filename?: string; file_base64?: string }) =>
      apiRequest<{ success: boolean; message: string }>('/api/admin/database/restore', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
  }
};

