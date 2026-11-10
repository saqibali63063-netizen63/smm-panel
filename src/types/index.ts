export type ThemeMode = 'midnight' | 'crystal' | 'neon';

export interface User {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
  balance: number;
  spent: number;
  status: string;
  api_key: string;
  referral_code: string;
  created_at: string;
  timezone?: string;
  currency?: string;
  theme?: ThemeMode;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: string;
}

export interface Service {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  type: string;
  rate_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  description: string;
  provider_id?: number;
  provider_service_id?: string;
  refill_supported: number;
  cancel_supported: number;
  dripfeed_supported?: number;
  status: string;
}

export interface Order {
  id: number;
  user_id: number;
  service_id: number;
  service_name?: string;
  category_name?: string;
  username?: string;
  email?: string;
  link: string;
  quantity: number;
  charge: number;
  start_count: number;
  remains: number;
  status: 'Pending' | 'In progress' | 'Completed' | 'Processing' | 'Partial' | 'Canceled';
  mode: string;
  provider_order_id?: string;
  refill_status?: string;
  refill_supported?: number;
  cancel_supported?: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  username?: string;
  type: 'deposit' | 'order' | 'refund' | 'referral' | 'admin_adjustment';
  amount: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface PaymentRequest {
  id: number;
  user_id: number;
  username?: string;
  email?: string;
  current_user_balance?: number;
  method: 'Easypaisa' | 'JazzCash' | 'Bank Transfer' | 'USDT' | string;
  network?: string;
  amount: number;
  trx_id: string;
  sender_account?: string;
  screenshot_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
}

export interface PaymentMethodsConfig {
  // Easypaisa
  easypaisa_enabled?: string;
  easypaisa_number?: string;
  easypaisa_title?: string;
  easypaisa_qr?: string;
  easypaisa_instructions?: string;

  // JazzCash
  jazzcash_enabled?: string;
  jazzcash_number?: string;
  jazzcash_title?: string;
  jazzcash_qr?: string;
  jazzcash_instructions?: string;

  // Bank Transfer
  bank_enabled?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_title?: string;
  bank_iban?: string;
  bank_branch?: string;
  bank_qr?: string;
  bank_instructions?: string;

  // USDT Independent Networks
  usdt_enabled?: string;
  usdt_bep20_enabled?: string;
  usdt_bep20_address?: string;
  usdt_bep20_qr?: string;
  usdt_bep20_instructions?: string;

  usdt_trc20_enabled?: string;
  usdt_trc20_address?: string;
  usdt_trc20_qr?: string;
  usdt_trc20_instructions?: string;

  // Rates
  usd_pkr_rate?: string;
  min_deposit_pkr?: string;
  currency_code?: string;
}

export interface SupportTicket {
  id: number;
  user_id: number;
  username?: string;
  email?: string;
  subject: string;
  category: string;
  priority: 'low' | 'normal' | 'high';
  order_id?: number;
  status: 'open' | 'answered' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_role: 'user' | 'admin';
  sender_username?: string;
  message: string;
  created_at: string;
}

export interface Provider {
  id: number;
  name: string;
  api_url: string;
  api_key?: string;
  api_key_masked?: string;
  status: string;
  balance: string;
  currency: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning';
  active: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  admin_username?: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: string;
  created_at: string;
}

export interface PlatformStats {
  total_orders_served: number;
  registered_users: number;
  active_services: number;
  satisfaction_rate: string;
}

export interface DatabaseStats {
  exists: boolean;
  path: string;
  size_bytes: number;
  size_formatted: string;
  is_custom_path: boolean;
  storage_type: string;
  users_count: number;
  orders_count: number;
  transactions_count: number;
  payments_count: number;
  services_count: number;
  settings_count: number;
  total_revenue: number;
  total_backups: number;
  latest_backup?: {
    filename: string;
    size: number;
    sizeFormatted: string;
    createdAt: string;
  } | null;
  error?: string;
}

export interface DatabaseBackupItem {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
}

