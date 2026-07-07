import axios, { AxiosRequestConfig } from 'axios';

const BASE_URL = '/api/v1';

export const SESSION_KEY = 'vaultflow_api_key';

export function getStoredKey(): string {
  return sessionStorage.getItem(SESSION_KEY) ?? '';
}

export function setStoredKey(key: string) {
  sessionStorage.setItem(SESSION_KEY, key);
}

export function clearStoredKey() {
  sessionStorage.removeItem(SESSION_KEY);
}

function authed(cfg: AxiosRequestConfig = {}): AxiosRequestConfig {
  return {
    ...cfg,
    headers: {
      'Content-Type': 'application/json',
      'X-VaultFlow-API-Key': getStoredKey(),
      'X-Tenant-ID': 'default',
      ...cfg.headers,
    },
  };
}

export interface Money { amount: string; currency: string; }
export interface Transaction {
  id: string; account_id: string; tenant_id: string;
  type: 'debit' | 'credit'; status: 'pending' | 'cleared' | 'failed' | 'reversed';
  amount: Money; description: string; category: string;
  tags?: string[]; occurred_at: string; created_at: string;
}
export interface CategoryTotal { category: string; total: Money; count: number; percentage: number; }
export interface ExpenseSummary {
  window: { Start: string; End: string };
  total_spend: Money; categories: CategoryTotal[];
  top_vendors: { vendor: string; total: Money; count: number }[];
  daily_totals: { date: string; total: Money }[];
}
export interface Budget {
  id: string; name: string; category: string; period: string;
  allocated: Money; spent: Money; remaining: Money;
  start_date: string; end_date: string;
}
export interface VarianceResult {
  budget: Budget; actual: Money; variance: Money;
  utilization: number; status: 'on_track' | 'warning' | 'exceeded' | 'underspend';
}
export interface ForecastResult {
  horizon: string; predicted: Money; lower_bound: Money;
  upper_bound: Money; confidence: number;
}
export interface Alert {
  id: string; severity: 'info' | 'warning' | 'critical';
  title: string; message: string; source: string;
  resolved: boolean; created_at: string;
}

export const api = {
  health: () => axios.get('/health').then(r => r.data),

  validateKey: async (key: string): Promise<boolean> => {
    try {
      await axios.get(`${BASE_URL}/transactions`, {
        headers: { 'X-VaultFlow-API-Key': key, 'X-Tenant-ID': 'default' },
        params: { start: '2000-01-01', end: '2000-01-02' },
      });
      return true;
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) return false;
      return true; // server is up, key accepted (empty response is fine)
    }
  },

  transactions: {
    list: (start?: string, end?: string) =>
      axios.get<{ transactions: Transaction[]; count: number }>(`${BASE_URL}/transactions`, authed({ params: { start, end } })).then(r => r.data),
    create: (t: Partial<Transaction>) =>
      axios.post<Transaction>(`${BASE_URL}/transactions`, t, authed()).then(r => r.data),
  },
  expenses: {
    summary: (start?: string, end?: string) =>
      axios.get<ExpenseSummary>(`${BASE_URL}/expenses/summary`, authed({ params: { start, end } })).then(r => r.data),
  },
  budgets: {
    list: () => axios.get<{ budgets: Budget[] }>(`${BASE_URL}/budgets`, authed()).then(r => r.data),
    variance: () => axios.get<{ variance: VarianceResult[] }>(`${BASE_URL}/budgets/variance`, authed()).then(r => r.data),
  },
  forecasts: {
    list: () => axios.get<{ forecasts: ForecastResult[]; horizon_months: number }>(`${BASE_URL}/forecasts`, authed()).then(r => r.data),
  },
  alerts: {
    list: () => axios.get<{ alerts: Alert[]; count: number }>(`${BASE_URL}/alerts`, authed()).then(r => r.data),
  },
  demo: {
    seed: () => axios.post(`${BASE_URL}/demo/seed`, {}, authed()).then(r => r.data),
  },
};
