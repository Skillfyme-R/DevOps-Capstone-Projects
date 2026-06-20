import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export interface VVUser {
  id:       string;
  email:    string;
  name:     string;
  role:     'customer' | 'vendor' | 'admin';
  avatar?:  string;
  vendorId?: string;
  storeName?: string;
}

// ── Demo accounts seeded in localStorage ────────────────────────────────────
const DEMO_ACCOUNTS: Array<VVUser & { password: string }> = [
  { id: 'u-admin',    email: 'admin@vendorvault.io',      password: 'Password123!', name: 'Platform Admin',   role: 'admin' },
  { id: 'u-sound',    email: 'soundwave@vendorvault.io',  password: 'Password123!', name: 'SoundWave Owner',  role: 'vendor',   vendorId: 'v1', storeName: 'SoundWave Store' },
  { id: 'u-eco',      email: 'ecothreads@vendorvault.io', password: 'Password123!', name: 'EcoThreads Owner', role: 'vendor',   vendorId: 'v2', storeName: 'EcoThreads' },
  { id: 'u-customer', email: 'customer@vendorvault.io',   password: 'Password123!', name: 'Alex Johnson',     role: 'customer' },
];

const ACCOUNTS_KEY = 'vv-accounts';

function getAccounts(): Array<VVUser & { password: string }> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    // Merge demo accounts (demo accounts always win by id)
    const demoIds = new Set(DEMO_ACCOUNTS.map(a => a.id));
    const userCreated = saved.filter((a: { id: string }) => !demoIds.has(a.id));
    return [...DEMO_ACCOUNTS, ...userCreated];
  } catch {
    return [...DEMO_ACCOUNTS];
  }
}

function saveAccount(account: VVUser & { password: string }) {
  const current = getAccounts();
  const demoIds = new Set(DEMO_ACCOUNTS.map(a => a.id));
  const userCreated = current.filter(a => !demoIds.has(a.id) && a.id !== account.id);
  userCreated.push(account);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(userCreated));
}

function loadStoredUser(): VVUser | null {
  try {
    const raw = localStorage.getItem('vv-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser]       = useState<VVUser | null>(loadStoredUser);
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    // Simulate network delay for realism
    await new Promise(r => setTimeout(r, 600));
    try {
      const accounts = getAccounts();
      const match = accounts.find(
        a => a.email.toLowerCase() === email.toLowerCase() && a.password === password
      );
      if (!match) {
        toast.error('Invalid email or password. Please try again.');
        throw new Error('Invalid credentials');
      }
      const safeUser = Object.fromEntries(
        Object.entries(match).filter(([k]) => k !== 'password')
      ) as VVUser;
      localStorage.setItem('vv-token', `mock-token-${safeUser.id}`);
      localStorage.setItem('vv-user', JSON.stringify(safeUser));
      setUser(safeUser);
      toast.success(`Welcome back, ${safeUser.name.split(' ')[0]}! 🎉`);
      navigate(safeUser.role === 'vendor' ? '/vendor/dashboard' : '/dashboard');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const register = useCallback(async (formData: Record<string, unknown>) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    try {
      const email    = (formData.email as string).toLowerCase().trim();
      const password = formData.password as string;
      const name     = formData.name as string;
      const role     = (formData.role as string) ?? 'customer';
      const storeName = formData.storeName as string | undefined;

      const accounts = getAccounts();
      if (accounts.find(a => a.email.toLowerCase() === email)) {
        toast.error('That email is already registered. Please sign in instead.');
        throw new Error('Email taken');
      }

      const newUser: VVUser & { password: string } = {
        id:        `u-${Date.now()}`,
        email,
        password,
        name,
        role:      role as VVUser['role'],
        storeName: role === 'vendor' ? storeName : undefined,
        vendorId:  role === 'vendor' ? `v-${Date.now()}` : undefined,
      };
      saveAccount(newUser);

      const safeUser = Object.fromEntries(
        Object.entries(newUser).filter(([k]) => k !== 'password')
      ) as VVUser;
      localStorage.setItem('vv-token', `mock-token-${safeUser.id}`);
      localStorage.setItem('vv-user', JSON.stringify(safeUser));
      setUser(safeUser);
      toast.success('Account created! Welcome to VendorVault 🚀');
      navigate(role === 'vendor' ? '/vendor/dashboard' : '/dashboard');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('vv-token');
    localStorage.removeItem('vv-user');
    setUser(null);
    navigate('/login');
    toast.info('You have been signed out.');
  }, [navigate]);

  const isAuthenticated = !!user;
  const isVendor        = user?.role === 'vendor';
  const isAdmin         = user?.role === 'admin';

  return { user, loading, isAuthenticated, isVendor, isAdmin, login, register, logout };
}
