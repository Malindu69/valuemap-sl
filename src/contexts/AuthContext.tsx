import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, type AuthState } from '../types';
import { generateId } from '../utils';

// ─── Mock Auth (replace with Supabase Auth later) ─────────────────────────

const USERS_KEY = 'valuemap_sl_users';
const SESSION_KEY = 'valuemap_sl_session';

interface StoredUser extends User {
  passwordHash: string; // simple base64 for demo; use Supabase Auth in production
}

function hashPassword(pw: string): string {
  return btoa(pw); // NOT secure; only for demo local auth
}

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  // Seed default admin
  const defaults: StoredUser[] = [
    {
      id: generateId(),
      email: 'admin@valuemap.lk',
      name: 'Administrator',
      role: 'admin',
      passwordHash: hashPassword('valuemap2024'),
    },
    {
      id: generateId(),
      email: 'valuer@valuemap.lk',
      name: 'Valuer Account',
      role: 'valuer',
      passwordHash: hashPassword('valuer2024'),
    },
    {
      id: generateId(),
      email: 'viewer@valuemap.lk',
      name: 'Read Only Viewer',
      role: 'viewer',
      passwordHash: hashPassword('viewer2024'),
    },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  return defaults;
}

function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ error?: string }>;
  guestLogin: () => void;
  logout: () => void;
  canEdit: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getSession(),
    isLoading: false,
  });

  useEffect(() => {
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 500)); // simulate network
    const users = getStoredUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hashPassword(password),
    );
    if (!found) {
      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'Invalid email or password' };
    }
    const user: User = { id: found.id, email: found.email, name: found.name, role: found.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setState({ user, isLoading: false });
    return {};
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setState({ user: null, isLoading: false });
  }, []);

  const guestLogin = useCallback(() => {
    const guest: User = {
      id: 'guest',
      email: 'guest@valuemap.lk',
      name: 'Guest Viewer',
      role: 'viewer',
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(guest));
    setState({ user: guest, isLoading: false });
  }, []);

  const canEdit = state.user?.role === 'admin' || state.user?.role === 'valuer';
  const canAdmin = state.user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ ...state, login, guestLogin, logout, canEdit, canAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
