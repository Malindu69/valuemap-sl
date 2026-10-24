import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, type AuthState } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const SESSION_KEY = 'valuemap_sl_session_v4';
const CACHED_USERS_KEY = 'valuemap_sl_cached_users_v4';

export interface StoredUser extends User {
  username: string;
  createdAt?: string;
}

function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCachedUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(CACHED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCachedUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(CACHED_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Could not cache users:', err);
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  users: StoredUser[];
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  guestLogin: () => void;
  logout: () => void;
  createUser: (data: { username: string; name: string; email?: string; role: 'admin' | 'valuer'; password: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;
  canEdit: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getSession(),
    isLoading: false,
  });
  const [users, setUsers] = useState<StoredUser[]>(() => getCachedUsers());

  // Fetch users directly from Supabase DB
  const refreshUsers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, name, email, role, created_at')
        .order('created_at', { ascending: true });

      if (!error && data) {
        const mapped: StoredUser[] = data.map((row: any) => ({
          id: String(row.id),
          username: row.username,
          name: row.name || row.username,
          email: row.email || `${row.username.toLowerCase()}@valuemap.lk`,
          role: row.role === 'admin' ? 'admin' : 'valuer',
          createdAt: row.created_at,
        }));
        setUsers(mapped);
        setCachedUsers(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch app_users from Supabase:', err);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const login = useCallback(async (identifier: string, password: string): Promise<{ error?: string }> => {
    setState((s) => ({ ...s, isLoading: true }));
    const cleanId = identifier.trim();

    if (!cleanId || !password) {
      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'Please enter both username and password' };
    }

    try {
      if (isSupabaseConfigured) {
        // Query Supabase app_users table directly
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .or(`username.ilike.${cleanId},email.ilike.${cleanId}`)
          .limit(1);

        if (error) {
          setState((s) => ({ ...s, isLoading: false }));
          return { error: `Database error: ${error.message}` };
        }

        if (!data || data.length === 0) {
          setState((s) => ({ ...s, isLoading: false }));
          return { error: 'Invalid username/email or password' };
        }

        const userRow = data[0];
        // Validate password directly against DB
        if (userRow.password !== password) {
          setState((s) => ({ ...s, isLoading: false }));
          return { error: 'Invalid username/email or password' };
        }

        const user: User = {
          id: String(userRow.id),
          name: userRow.name || userRow.username,
          email: userRow.email || `${userRow.username.toLowerCase()}@valuemap.lk`,
          role: userRow.role === 'admin' ? 'admin' : 'valuer',
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        setState({ user, isLoading: false });
        return {};
      }

      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'Supabase database is not configured' };
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'An unexpected error occurred during login' };
    }
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

  const createUser = useCallback(async (data: {
    username: string;
    name: string;
    email?: string;
    role: 'admin' | 'valuer';
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = data.username.trim();
    if (!cleanUsername) return { success: false, error: 'Username is required' };
    if (!data.password) return { success: false, error: 'Password is required' };

    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { error } = await supabase.from('app_users').insert([{
        username: cleanUsername,
        name: data.name.trim() || cleanUsername,
        email: data.email?.trim() || `${cleanUsername.toLowerCase()}@valuemap.lk`,
        role: data.role,
        password: data.password,
      }]);

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: `Username "${cleanUsername}" is already taken` };
        }
        return { success: false, error: error.message };
      }

      await refreshUsers();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, [refreshUsers]);

  const deleteUser = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }

      await refreshUsers();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, [refreshUsers]);

  const canEdit = state.user?.role === 'admin' || state.user?.role === 'valuer';
  const canAdmin = state.user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      ...state,
      users,
      login,
      guestLogin,
      logout,
      createUser,
      deleteUser,
      refreshUsers,
      canEdit,
      canAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
